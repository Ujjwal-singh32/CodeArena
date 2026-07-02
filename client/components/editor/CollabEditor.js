"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { Awareness } from "y-protocols/awareness";
import * as awarenessProtocol from 'y-protocols/awareness';
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
const USER_COLORS = ["#00ff88", "#ff6b6b", "#4ecdc4", "#ffe66d", "#a78bfa"];

export default function CollabEditor({ socket, roomCode, language = "javascript", username = "guest", userId = "guest", className }) {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const bindingRef = useRef(null);
  const cursorDisposableRef = useRef(null);
  const styleElRef = useRef(null);

  const [editorHeight, setEditorHeight] = useState(400);
  const [mounted, setMounted] = useState(false);
  // Only used for an optional "who's online" list now — NOT for positioning cursors.
  const [onlineUsers, setOnlineUsers] = useState([]);

  // 1. Initialize Yjs safely using useState so it doesn't crash on hot-reloads
  const [yjs] = useState(() => {
    const doc = new Y.Doc();
    const aware = new Awareness(doc);
    return { ydoc: doc, awareness: aware };
  });
  const { ydoc, awareness } = yjs;

  // Auto-resize container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.getBoundingClientRect().height > 0) setEditorHeight(el.getBoundingClientRect().height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Injects/updates a <style> tag with per-user colors + name labels for
  // the decorations that y-monaco renders natively (.yRemoteSelection-<id>,
  // .yRemoteSelectionHead-<id>). This is what makes the cursor show the
  // right color and the username floating above it.
  const updateRemoteStyles = () => {
    let styleEl = document.getElementById("y-remote-cursor-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "y-remote-cursor-styles";
      document.head.appendChild(styleEl);
    }
    let css = "";
    const users = [];
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID || !state?.user) return;
      const { color, name } = state.user;
      users.push({ clientId, name, color });
      css += `
        .yRemoteSelection-${clientId} { background-color: ${color}33; }
        .yRemoteSelectionHead-${clientId} {
          position: relative;
          border-left: 2px solid ${color};
        }
        .yRemoteSelectionHead-${clientId}::after {
          content: '${name}';
          position: absolute;
          top: -1.1em;
          left: -2px;
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 2px;
          background: ${color};
          color: #000;
          white-space: nowrap;
          pointer-events: none;
          z-index: 30;
        }
      `;
    });
    styleEl.textContent = css;
    styleElRef.current = styleEl;
    setOnlineUsers(users);
  };

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const color = USER_COLORS[Math.abs(String(userId).split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % USER_COLORS.length];
    awareness.setLocalStateField('user', { name: username || "Guest", color });

    const ytext = ydoc.getText('monaco');

    bindingRef.current = new MonacoBinding(
      ytext,
      editor.getModel(),
      new Set([editor]),
      awareness
    );

    // Broadcast our own selection/cursor as a real Yjs RelativePosition,
    // which is what y-monaco's built-in decoration renderer reads from
    // awareness.state.selection. This is what makes the cursor land
    // exactly on the character being edited, with correct scroll/wrap handling.
    cursorDisposableRef.current = editor.onDidChangeCursorSelection(() => {
      const sel = editor.getSelection();
      const model = editor.getModel();
      if (!sel || !model) return;
      const anchor = Y.createRelativePositionFromTypeIndex(
        ytext,
        model.getOffsetAt({ lineNumber: sel.selectionStartLineNumber, column: sel.selectionStartColumn })
      );
      const head = Y.createRelativePositionFromTypeIndex(
        ytext,
        model.getOffsetAt({ lineNumber: sel.positionLineNumber, column: sel.positionColumn })
      );
      awareness.setLocalStateField("selection", { anchor, head });
    });

    setMounted(true);
  };

  // Main Socket & Sync Logic
  useEffect(() => {
    if (!mounted || !socket) return;

    const onSync = ({ update }) => {
      // TAG AS NETWORK: Prevents the editor from bouncing the code back to the server!
      Y.applyUpdate(ydoc, new Uint8Array(update), "network");
    };

    const onDocUpdate = (update, origin) => {
      // ONLY send updates to the server if the user actually typed them locally
      if (origin !== "network") {
        socket.emit("collab:update", { roomCode, update: Array.from(update) });
      }
    };

    const onRemoteAwareness = ({ update }) => {
      if (update) awarenessProtocol.applyAwarenessUpdate(awareness, new Uint8Array(update), null);
    };

    const onAwarenessUpdate = ({ added, updated, removed }) => {
      const changed = added.concat(updated, removed);
      if (changed.length) {
        const update = awarenessProtocol.encodeAwarenessUpdate(awareness, changed);
        socket.emit("collab:awareness", { roomCode, update: Array.from(update) });
      }
    };

    // Just refreshes the injected CSS (colors/names) — the actual cursor
    // positioning is handled internally by MonacoBinding's decorations.
    const onAwarenessChange = () => {
      updateRemoteStyles();
    };

    socket.on("collab:sync", onSync);
    socket.on("collab:awareness", onRemoteAwareness);
    ydoc.on("update", onDocUpdate);
    awareness.on("update", onAwarenessUpdate);
    awareness.on("change", onAwarenessChange);

    // Fetch code from the server now that the editor has safely mounted
    const color = USER_COLORS[Math.abs(String(userId).split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % USER_COLORS.length];
    socket.emit("collab:join", { roomCode, userId, username, color });

    return () => {
      socket.off("collab:sync", onSync);
      socket.off("collab:awareness", onRemoteAwareness);
      ydoc.off("update", onDocUpdate);
      awareness.off("update", onAwarenessUpdate);
      awareness.off("change", onAwarenessChange);
    };
  }, [mounted, socket, roomCode, userId, username, ydoc, awareness]);

  // Language Switcher
  useEffect(() => {
    if (mounted && editorRef.current && monacoRef.current) {
      monacoRef.current.editor.setModelLanguage(editorRef.current.getModel(), language);
    }
  }, [language, mounted]);

  // Destroy Yjs memory + cursor listener + injected style only when leaving the page entirely
  useEffect(() => {
    return () => {
      cursorDisposableRef.current?.dispose();
      bindingRef.current?.destroy();
      awareness.destroy();
      ydoc.destroy();
      document.getElementById("y-remote-cursor-styles")?.remove();
    };
  }, [yjs]);

  return (
    <div className={cn("relative h-full w-full min-h-[200px]", className)}>
      {/* Optional: small presence list, no longer used for cursor positioning */}
      {onlineUsers.length > 0 && (
        <div className="absolute top-1 right-1 z-20 flex gap-1 pointer-events-none">
          {onlineUsers.map((u) => (
            <span
              key={u.clientId}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ backgroundColor: u.color, color: "#000" }}
            >
              {u.name}
            </span>
          ))}
        </div>
      )}
      <div ref={containerRef} className="h-full w-full">
        <MonacoEditor
          height={editorHeight}
          language={language}
          theme="vs-dark"
          onMount={handleMount}
          options={{ minimap: { enabled: false }, fontSize: 14, automaticLayout: true }}
        />
      </div>
    </div>
  );
}