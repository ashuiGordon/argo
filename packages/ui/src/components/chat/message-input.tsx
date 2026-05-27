import { useState, useRef, useCallback, useEffect } from "react";
import { useChatContextStore } from "../../stores/chat-context";
import { getFileName, detectLanguage } from "./artifacts/utils";
import { MentionPopup, type MentionItem } from "./mention-popup";
import { useFileSearch } from "./use-file-search";
import { api } from "../../services/api-client";
import { getAgentLogo } from "../../lib/agent-logos";

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  workspace?: string;
}

interface AgentOption {
  id: string;
  name: string;
  type: string;
  avatarColor: string;
}

interface AttachedFile {
  name: string;
  content: string;
}

export function MessageInput({ onSend, disabled, workspace }: MessageInputProps) {
  const [value, setValue] = useState("");
  const [referencedFiles, setReferencedFiles] = useState<string[]>([]);
  const [mentionedAgents, setMentionedAgents] = useState<AgentOption[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [popup, setPopup] = useState<{ type: "file" | "agent"; query: string } | null>(null);
  const [popupIndex, setPopupIndex] = useState(0);
  const [agents, setAgents] = useState<AgentOption[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingContext = useChatContextStore((s) => s.pendingContext);
  const clearContext = useChatContextStore((s) => s.clearContext);
  const { search: searchFiles } = useFileSearch(workspace);

  useEffect(() => {
    api.agents.list().then((res) => setAgents(res.agents as AgentOption[]));
  }, []);

  const getPopupItems = useCallback((): MentionItem[] => {
    if (!popup) return [];
    if (popup.type === "file") {
      return searchFiles(popup.query).map((f) => ({
        id: f.path,
        label: f.name,
        detail: f.path,
      }));
    }
    const lower = popup.query.toLowerCase();
    return agents
      .filter((a) => !popup.query || a.name.toLowerCase().includes(lower))
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        label: a.name,
        detail: a.type,
        iconColor: a.avatarColor,
      }));
  }, [popup, searchFiles, agents]);

  const popupItems = getPopupItems();

  function detectTrigger(text: string, cursorPos: number) {
    const before = text.slice(0, cursorPos);
    const hashMatch = before.match(/#([^\s#@]*)$/);
    if (hashMatch && workspace) {
      setPopup({ type: "file", query: hashMatch[1] });
      setPopupIndex(0);
      return;
    }
    const atMatch = before.match(/@([^\s#@]*)$/);
    if (atMatch) {
      setPopup({ type: "agent", query: atMatch[1] });
      setPopupIndex(0);
      return;
    }
    setPopup(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value;
    setValue(newVal);
    const cursorPos = e.target.selectionStart ?? newVal.length;
    detectTrigger(newVal, cursorPos);
  }

  function handleSelect(item: MentionItem) {
    if (popup?.type === "file") {
      if (!referencedFiles.includes(item.id)) {
        setReferencedFiles((prev) => [...prev, item.id]);
      }
    } else if (popup?.type === "agent") {
      const agent = agents.find((a) => a.id === item.id);
      if (agent && !mentionedAgents.find((a) => a.id === item.id)) {
        setMentionedAgents((prev) => [...prev, agent]);
      }
    }

    // Remove trigger text from value (only if popup was triggered by typing)
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPos = textarea.selectionStart;
      const before = value.slice(0, cursorPos);
      const trigger = popup?.type === "file" ? "#" : "@";
      const triggerMatch = before.match(new RegExp(`${trigger === "#" ? "#" : "@"}([^\\s#@]*)$`));
      if (triggerMatch) {
        const start = before.length - triggerMatch[0].length;
        const newValue = value.slice(0, start) + value.slice(cursorPos);
        setValue(newValue);
        setTimeout(() => {
          textarea.selectionStart = start;
          textarea.selectionEnd = start;
        }, 0);
      }
    }
    setPopup(null);
  }

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed && referencedFiles.length === 0 && attachedFiles.length === 0) return;
    if (disabled) return;

    let message = "";

    // Prepend context from code selection
    if (pendingContext) {
      const lang = detectLanguage(pendingContext.filePath);
      message += `修改以下代码（文件: ${pendingContext.filePath}）:\n\`\`\`${lang.toLowerCase()}\n${pendingContext.selectedCode}\n\`\`\`\n\n`;
      clearContext();
    }

    // Prepend referenced files
    if (referencedFiles.length > 0) {
      message += `[Referenced files: ${referencedFiles.join(", ")}]\n\n`;
    }

    // Prepend mentioned agents
    if (mentionedAgents.length > 0) {
      message += mentionedAgents.map((a) => `@${a.name}`).join(" ") + " ";
    }

    // Prepend attached file contents
    for (const file of attachedFiles) {
      message += `[Attached: ${file.name}]\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
    }

    message += trimmed;

    onSend(message);
    setValue("");
    setReferencedFiles([]);
    setMentionedAgents([]);
    setAttachedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend, pendingContext, clearContext, referencedFiles, mentionedAgents, attachedFiles]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (popup && popupItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setPopupIndex((i) => (i + 1) % popupItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setPopupIndex((i) => (i - 1 + popupItems.length) % popupItems.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        handleSelect(popupItems[popupIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPopup(null);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024) {
      setReferencedFiles((prev) => [...prev, file.name]);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        setAttachedFiles((prev) => [...prev, { name: file.name, content }]);
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  }

  function removeFile(path: string) {
    setReferencedFiles((prev) => prev.filter((f) => f !== path));
  }

  function removeAgent(id: string) {
    setMentionedAgents((prev) => prev.filter((a) => a.id !== id));
  }

  function removeAttached(name: string) {
    setAttachedFiles((prev) => prev.filter((f) => f.name !== name));
  }

  const contextLines = pendingContext?.selectedCode.split("\n").length || 0;
  const contextFileName = pendingContext ? getFileName(pendingContext.filePath) : "";
  const hasChips = referencedFiles.length > 0 || mentionedAgents.length > 0 || attachedFiles.length > 0;

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mx-auto max-w-4xl">
        {/* Code selection context */}
        {pendingContext && (
          <div className="mb-2 rounded-[10px] border border-blue-100 bg-blue-50/60 px-3.5 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-blue-600 font-medium">
                Selection from <span className="font-mono">{contextFileName}</span> ({contextLines} lines)
              </span>
              <button
                onClick={clearContext}
                className="flex h-4 w-4 items-center justify-center rounded-full text-blue-400 hover:bg-blue-100 hover:text-blue-600 transition-colors cursor-pointer"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <pre className="mt-1 max-h-16 overflow-hidden text-[10px] text-blue-600/70 font-mono leading-4">
              {pendingContext.selectedCode.slice(0, 200)}
              {pendingContext.selectedCode.length > 200 && "..."}
            </pre>
          </div>
        )}

        {/* Reference/attach chips */}
        {hasChips && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {referencedFiles.map((path) => (
              <span key={path} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="max-w-[200px] truncate font-mono">{path.split("/").pop()}</span>
                <button onClick={() => removeFile(path)} className="ml-0.5 text-gray-400 hover:text-gray-600 cursor-pointer">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {mentionedAgents.map((agent) => (
              <span key={agent.id} className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] text-purple-700">
                {(() => {
                  const logo = getAgentLogo(agent.type);
                  return logo ? (
                    <img src={logo} alt="" className="h-3 w-3 rounded-full" />
                  ) : (
                    <div
                      className="flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-bold text-white"
                      style={{ backgroundColor: agent.avatarColor }}
                    >
                      {agent.name[0]}
                    </div>
                  );
                })()}
                <span className="font-medium">@{agent.name}</span>
                <button onClick={() => removeAgent(agent.id)} className="ml-0.5 text-purple-400 hover:text-purple-600 cursor-pointer">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            {attachedFiles.map((file) => (
              <span key={file.name} className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[11px] text-green-700">
                <svg className="h-3 w-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <span className="max-w-[200px] truncate font-mono">{file.name}</span>
                <button onClick={() => removeAttached(file.name)} className="ml-0.5 text-green-400 hover:text-green-600 cursor-pointer">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input area with popup */}
        <div className="relative">
          {popup && (
            <MentionPopup
              items={popupItems}
              activeIndex={popupIndex}
              onSelect={handleSelect}
              onClose={() => setPopup(null)}
              type={popup.type}
            />
          )}
          <div className="rounded-2xl border border-gray-200/80 bg-gray-50 shadow-[0_-1px_6px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.04)] transition-all focus-within:border-gray-300 focus-within:bg-white focus-within:shadow-[0_-1px_8px_rgba(0,0,0,0.06),0_2px_12px_rgba(0,0,0,0.06)]">
            {/* Textarea */}
            <div className="px-4 pt-3 pb-2">
              <textarea
                ref={textareaRef}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onInput={handleInput}
                placeholder={pendingContext ? "Describe the modification..." : "Message…"}
                disabled={disabled}
                rows={2}
                className="w-full max-h-[200px] resize-none bg-transparent text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none leading-6"
              />
            </div>
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 pb-2.5">
              <div className="flex items-center gap-0.5">
                {/* Attach button */}
                <button
                  onClick={handleAttachClick}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-600 cursor-pointer"
                  title="Attach file"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                  </svg>
                </button>
                {/* @ mention agent button */}
                <button
                  onClick={() => {
                    if (popup?.type === "agent") {
                      setPopup(null);
                    } else {
                      setPopup({ type: "agent", query: "" });
                      setPopupIndex(0);
                    }
                    textareaRef.current?.focus();
                  }}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${
                    popup?.type === "agent"
                      ? "bg-purple-100 text-purple-600"
                      : "text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                  }`}
                  title="Mention agent (@)"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 10-2.636 6.364M16.5 12V8.25" />
                  </svg>
                </button>
                {/* # reference file button */}
                {workspace && (
                  <button
                    onClick={() => {
                      if (popup?.type === "file") {
                        setPopup(null);
                      } else {
                        setPopup({ type: "file", query: "" });
                        setPopupIndex(0);
                      }
                      textareaRef.current?.focus();
                    }}
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors cursor-pointer ${
                      popup?.type === "file"
                        ? "bg-blue-100 text-blue-600"
                        : "text-gray-400 hover:bg-gray-200 hover:text-gray-600"
                    }`}
                    title="Reference file (#)"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
                    </svg>
                  </button>
                )}
              </div>
              {/* Send button */}
              <button
                onClick={handleSubmit}
                disabled={disabled || (!value.trim() && referencedFiles.length === 0 && attachedFiles.length === 0)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white transition-all hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                </svg>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".ts,.tsx,.js,.jsx,.json,.md,.py,.rs,.go,.txt,.yaml,.yml,.toml,.css,.html,.sql,.sh,.bash,.xml,.svg,.graphql,.prisma"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
