"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

const USER_COLORS = ["#00ff88", "#ff6b6b", "#4ecdc4", "#ffe66d", "#a78bfa"];

export default function CollabEditor({
  socket,
  roomCode,
  language = "javascript",
  username = "guest",
  userId = "guest",
  className,
}) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const cleanupRef = useRef(null);
  const [editorHeight, setEditorHeight] = useState(400);
  const [remoteCursors, setRemoteCursors] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateHeight = () => {
      const h = el.getBoundingClientRect().height;
      if (h > 0) setEditorHeight(h);
    };
    updateHeight();
    const ro = new ResizeObserver(updateHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setupCollab = useCallback(() => {
    if (!editorRef.current || !monacoRef.current || !roomCode || !socket) return;

    cleanupRef.current?.();

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("monaco");
    const awareness = new Awareness(ydoc);
    const color =
      USER_COLORS[
        Math.abs(String(userId).split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
          USER_COLORS.length
      ];

    awareness.setLocalStateField("user", { name: username, color, id: String(userId) });

    const onSync = ({ update }) => {
      if (update) Y.applyUpdate(ydoc, new Uint8Array(update));
    };
    socket.on("collab:sync", onSync);

    const onDocUpdate = (update) => {
      socket.emit("collab:update", { roomCode, update: Array.from(update) });
    };
    ydoc.on("update", onDocUpdate);

    const onAwarenessChange = () => {
      const states = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        if (state?.user) states.push({ clientId, ...state.user, cursor: state.cursor });
      });
      setRemoteCursors(states);
    };
    awareness.on("change", onAwarenessChange);

    const onRemoteAwareness = ({ update }) => {
      if (update) awareness.applyUpdate(new Uint8Array(update));
    };
    socket.on("collab:awareness", onRemoteAwareness);

    const onAwarenessUpdate = ({ added, updated, removed }) => {
      const changed = added.concat(updated, removed);
      if (changed.length) {
        const update = awareness.encodeUpdate(changed);
        socket.emit("collab:awareness", { roomCode, update: Array.from(update) });
      }
    };
    awareness.on("update", onAwarenessUpdate);

    const binding = new MonacoBinding(
      ytext,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      awareness
    );
    bindingRef.current = binding;

    const cursorDisposable = editorRef.current.onDidChangeCursorPosition((e) => {
      awareness.setLocalStateField("cursor", {
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    cleanupRef.current = () => {
      cursorDisposable.dispose();
      binding.destroy();
      awareness.destroy();
      ydoc.destroy();
      socket.off("collab:sync", onSync);
      socket.off("collab:awareness", onRemoteAwareness);
      bindingRef.current = null;
    };
  }, [roomCode, username, userId, socket]);

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setMounted(true);
    editor.focus();
  };

  useEffect(() => {
    if (mounted && socket?.connected) setupCollab();
    else if (mounted && socket) {
      const onConnect = () => setupCollab();
      socket.on("connect", onConnect);
      return () => socket.off("connect", onConnect);
    }
    return () => cleanupRef.current?.();
  }, [mounted, setupCollab, socket, language]);

  return (
    <div className={cn("relative h-full w-full min-h-[200px]", className)}>
      {remoteCursors.map((c) => (
        <div
          key={c.clientId}
          className="absolute z-10 text-[10px] px-1 pointer-events-none whitespace-nowrap"
          style={{
            color: c.color,
            top: `${Math.min(90, 8 + (c.cursor?.line || 1) * 1.2)}%`,
            left: `${Math.min(80, 4 + (c.cursor?.column || 1) * 0.5)}%`,
          }}
        >
          ▼ {c.name}
        </div>
      ))}

      <div ref={containerRef} className="h-full w-full">
        <MonacoEditor
          height={editorHeight}
          language={language}
          theme="vs-dark"
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
}
