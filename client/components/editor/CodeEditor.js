"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-muted text-sm">
      Loading editor...
    </div>
  ),
});

export default function CodeEditor({
  value,
  onChange,
  language = "javascript",
  height = "100%",
  readOnly = false,
  className,
  onMount: onMountProp,
}) {
  const containerRef = useRef(null);
  const [editorHeight, setEditorHeight] = useState(400);

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

  const handleMount = (editor, monaco) => {
    editor.focus();
    onMountProp?.(editor, monaco);
  };

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full min-h-[200px] overflow-hidden", className)}
      style={height !== "100%" ? { height } : undefined}
    >
      <MonacoEditor
        height={editorHeight}
        language={language}
        value={value}
        onChange={(val) => onChange?.(val ?? "")}
        onMount={handleMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          readOnly,
          padding: { top: 12 },
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          smoothScrolling: true,
          wordWrap: "on",
        }}
      />
    </div>
  );
}
