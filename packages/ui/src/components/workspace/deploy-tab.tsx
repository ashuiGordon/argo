import { useState } from "react";
import { Rocket, Globe, Server, Package, Download } from "lucide-react";
import { api } from "../../services/api-client";

interface DeployTabProps {
  conversationId?: string;
  workspace?: string;
}

const DEPLOY_OPTIONS = [
  {
    type: "preview" as const,
    target: "local",
    label: "本地预览",
    description: "启动本地开发服务器，生成可分享的预览链接",
    Icon: Globe,
  },
  {
    type: "static" as const,
    target: "vercel",
    label: "Vercel",
    description: "部署静态站点到 Vercel，获取公网访问地址",
    Icon: Rocket,
  },
  {
    type: "static" as const,
    target: "netlify",
    label: "Netlify",
    description: "部署静态站点到 Netlify",
    Icon: Rocket,
  },
  {
    type: "container" as const,
    target: "docker",
    label: "Docker 容器",
    description: "构建 Docker 镜像并运行容器",
    Icon: Server,
  },
  {
    type: "package" as const,
    target: "zip",
    label: "下载 ZIP",
    description: "将项目源码打包为 ZIP 归档文件下载",
    Icon: Download,
  },
];

export function DeployTab({ conversationId, workspace }: DeployTabProps) {
  const [deploying, setDeploying] = useState<string | null>(null);

  async function handleDeploy(type: string, target: string) {
    if (!conversationId || !workspace) return;
    setDeploying(target);
    try {
      await api.deployments.create({
        conversationId,
        type: type as "preview" | "static" | "container" | "package",
        target,
        workspace,
      });
    } catch {
      // handle error
    } finally {
      setDeploying(null);
    }
  }

  if (!workspace || !conversationId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        请先选择一个包含工作区的对话
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-4">
        <h3 className="text-[14px] font-semibold text-gray-900">部署项目</h3>
        <p className="text-[12px] text-gray-400 mt-1">选择部署方式将项目发布到目标环境</p>
      </div>

      <div className="space-y-2">
        {DEPLOY_OPTIONS.map((opt) => (
          <button
            key={opt.target}
            onClick={() => handleDeploy(opt.type, opt.target)}
            disabled={deploying !== null}
            className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:border-blue-300 hover:bg-blue-50/30 transition-colors cursor-pointer disabled:opacity-50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
              <opt.Icon className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-gray-900">
                {opt.label}
                {deploying === opt.target && <span className="ml-2 text-[11px] text-blue-500">部署中...</span>}
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5">{opt.description}</div>
            </div>
            <svg className="h-4 w-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
