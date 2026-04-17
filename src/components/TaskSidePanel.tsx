import { useState } from "react";
import { X, MoreHorizontal } from "lucide-react";
import { TaskUpdatesTab } from "./TaskUpdatesTab";
import { TaskFilesTab } from "./TaskFilesTab";
import { TaskActivityLogTab } from "./TaskActivityLogTab";
import { StatusPill } from "./ui/StatusPill";
import { PriorityPill } from "./ui/PriorityPill";
import { Avatar } from "./ui/Avatar";
import { cn, formatDate } from "../lib/utils";
import type { Task, TaskUpdate } from "../types";

type PanelTab = "updates" | "files" | "activity";

interface TaskSidePanelProps {
  task: Task;
  updates: TaskUpdate[];
  updatesLoading: boolean;
  onClose: () => void;
}

export function TaskSidePanel({
  task,
  updates,
  updatesLoading,
  onClose,
}: TaskSidePanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("updates");

  const tabs: { id: PanelTab; label: string; count?: number }[] = [
    { id: "updates", label: "Updates", count: updates.length || undefined },
    { id: "files", label: "Files" },
    { id: "activity", label: "Activity Log" },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 flex-shrink-0">
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
        <h2 className="flex-1 text-sm font-bold text-slate-900 truncate min-w-0">
          {task.title}
        </h2>
        <Avatar owner={task.owner} size="sm" className="flex-shrink-0" />
        <button className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* ── Task meta ── */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center gap-2 flex-shrink-0">
        <StatusPill status={task.status} compact />
        <PriorityPill priority={task.priority} compact />
        {task.dueDate && (
          <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">
            Due {formatDate(task.dueDate)}
          </span>
        )}
        {task.owner && (
          <span className="text-xs text-slate-500">{task.owner.name}</span>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="flex border-b border-slate-200 flex-shrink-0 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap",
              activeTab === tab.id
                ? "text-blue-600 border-blue-600"
                : "text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-200"
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 rounded-full px-1.5 py-px leading-none">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content (scrollable) ── */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "updates" && (
          <TaskUpdatesTab
            task={task}
            updates={updates}
            loading={updatesLoading}
          />
        )}
        {activeTab === "files" && <TaskFilesTab task={task} />}
        {activeTab === "activity" && (
          <TaskActivityLogTab task={task} updates={updates} />
        )}
      </div>
    </div>
  );
}
