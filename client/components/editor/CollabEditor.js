"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";
import { io } from "socket.io-client";
import { getSocketUrl } from "@/services/api";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

const USER_COLORS = ["#00ff88", "#ff6b6b", "#4ecdc4", "#ffe66d", "#a78bfa"];

export default function CollabEditor({
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
  const [editorHeight, setEditorHeight] = useState(400);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState([]);

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

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText("monaco");
    const awareness = new Awareness(ydoc);
    const color = USER_COLORS[Math.abs(userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % USER_COLORS.length];

    awareness.setLocalStateField("user", { name: username, color, id: userId });

    const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] });

    socket.emit("collab:join", { roomCode, userId, username, color });

    socket.on("collab:sync", ({ update }) => {
      if (update) Y.applyUpdate(ydoc, new Uint8Array(update));
    });

    ydoc.on("update", (update) => {
      socket.emit("collab:update", { roomCode, update: Array.from(update) });
    });

    awareness.on("change", () => {
      const states = [];
      awareness.getStates().forEach((state, clientId) => {
        if (clientId === awareness.clientID) return;
        if (state?.user) states.push({ clientId, ...state.user, cursor: state.cursor });
      });
      setRemoteCursors(states);
    });

    socket.on("collab:awareness", ({ update }) => {
      if (update) awareness.applyUpdate(new Uint8Array(update));
    });

    awareness.on("update", ({ added, updated, removed }) => {
      const changed = added.concat(updated, removed);
      if (changed.length) {
        const update = awareness.encodeUpdate(changed);
        socket.emit("collab:awareness", { roomCode, update: Array.from(update) });
      }
    });

    socket.on("collab:users", (users) => setOnlineUsers(users));

    socket.on("collab:chat", () => {});

    const binding = new MonacoBinding(
      ytext,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      awareness
    );
    bindingRef.current = binding;

    editorRef.current.onDidChangeCursorPosition((e) => {
      awareness.setLocalStateField("cursor", {
        line: e.position.lineNumber,
        column: e.position.column,
      });
    });

    return () => {
      binding.destroy();
      awareness.destroy();
      ydoc.destroy();
      socket.emit("collab:leave", { roomCode, userId });
      socket.disconnect();
    };
  }, [roomCode, username, userId, language]);

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.focus();
  };

  return (
    <div className={cn("relative h-full w-full min-h-[200px]", className)}>
      {onlineUsers.length > 0 && (
        <div className="absolute top-2 right-2 z-10 flex flex-wrap gap-2 max-w-[50%]">
          {onlineUsers.map((u) => (
            <span
              key={u.id}
              className="text-[10px] px-2 py-0.5 rounded-full border"
              style={{ borderColor: u.color, color: u.color }}
            >
              {u.name}
            </span>
          ))}
        </div>
      )}

      {remoteCursors.map((c) => (
        <div
          key={c.clientId}
          className="absolute z-10 text-[10px] px-1 pointer-events-none"
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
