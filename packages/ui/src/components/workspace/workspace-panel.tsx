import { useWorkspacePanelStore, type PanelTab } from "../../stores/workspace-panel";
import { PreviewTab } from "./preview-tab";
import { FilesTab } from "./files-tab";
import { GitTab } from "./git-tab";
import { DeployTab } from "./deploy-tab";

function TabBtn({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative px-3 py-2.5 text-[12px] font-medium cursor-pointer transition-colors ${
        active ? "text-gray-900" : "text-gray-400 hover:text-gray-600"
      }`}
    >
      {label}
      {active && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-blue-600" />}
    </button>
  );
}

interface WorkspacePanelProps {
  workspace?: string;
  conversationId?: string;
}

export function WorkspacePanel({ workspace, conversationId }: WorkspacePanelProps) {
  const { activeTab, setTab, close } = useWorkspacePanelStore();

  return (
    <div className="flex h-full flex-col min-h-0">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-gray-200 px-2 shrink-0">
        <div className="flex items-center">
          <TabBtn active={activeTab === "preview"} label="预览" onClick={() => setTab("preview")} />
          <TabBtn active={activeTab === "files"} label="文件" onClick={() => setTab("files")} />
          <TabBtn active={activeTab === "deploy"} label="部署" onClick={() => setTab("deploy")} />
          <TabBtn active={activeTab === "git"} label="版本" onClick={() => setTab("git")} />
        </div>
        <button onClick={close} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === "preview" && <PreviewTab />}
        {activeTab === "files" && <FilesTab workspace={workspace} />}
        {activeTab === "deploy" && <DeployTab conversationId={conversationId} workspace={workspace} />}
        {activeTab === "git" && <GitTab workspace={workspace} />}
      </div>
    </div>
  );
}
