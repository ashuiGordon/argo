import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { wsClient } from "../../services/ws-client";
import "@xterm/xterm/css/xterm.css";

interface TerminalViewProps {
  sessionId: string;
}

export function TerminalView({ sessionId }: TerminalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      theme: {
        background: "#1f2937",
        foreground: "#f9fafb",
        cursor: "#f9fafb",
        selectionBackground: "#4b5563",
      },
      fontFamily: "JetBrains Mono, Menlo, Monaco, monospace",
      fontSize: 13,
      lineHeight: 1.3,
      cursorBlink: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    term.onData((data) => {
      wsClient.send({ type: "pty_input", sessionId, data });
    });

    const cleanup = wsClient.onPtyOutput(sessionId, (data) => {
      term.write(data);
    });

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      cleanup();
      resizeObserver.disconnect();
      term.dispose();
    };
  }, [sessionId]);

  return <div ref={containerRef} className="h-full w-full rounded-[var(--radius-sm)]" />;
}
