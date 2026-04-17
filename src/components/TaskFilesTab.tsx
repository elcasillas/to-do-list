import { Paperclip } from "lucide-react";
import type { Task } from "../types";

interface TaskFilesTabProps {
  task: Task;
}

export function TaskFilesTab({ task: _ }: TaskFilesTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Paperclip className="w-6 h-6 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700 mb-1">No files attached</p>
      <p className="text-xs text-slate-400 mb-5 max-w-[200px]">
        Attach files to keep everything related to this task in one place.
      </p>
      <button
        disabled
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed select-none"
      >
        <Paperclip className="w-3.5 h-3.5" />
        Attach file
        <span className="ml-1 text-[10px] bg-slate-200 text-slate-500 rounded px-1.5 py-0.5 font-semibold">
          Soon
        </span>
      </button>
    </div>
  );
}
