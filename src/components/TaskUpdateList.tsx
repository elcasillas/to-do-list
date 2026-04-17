import { Loader2, MessageSquare } from "lucide-react";
import { Avatar } from "./ui/Avatar";
import { formatRelativeTime } from "../lib/utils";
import type { TaskUpdate } from "../types";

interface TaskUpdateListProps {
  updates: TaskUpdate[];
  loading: boolean;
}

export function TaskUpdateList({ updates, loading }: TaskUpdateListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <MessageSquare className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-700 mb-1">No updates yet</p>
        <p className="text-xs text-slate-400">
          Be the first to post an update for this task.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {updates.map((u) => (
        <UpdateItem key={u.id} update={u} />
      ))}
    </div>
  );
}

function UpdateItem({ update }: { update: TaskUpdate }) {
  return (
    <div className="flex gap-3 px-4 py-4">
      <Avatar
        owner={{
          name: update.authorName,
          initials: update.authorInitials,
          color: update.authorColor,
        }}
        className="flex-shrink-0 mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-sm font-semibold text-slate-800">
            {update.authorName}
          </span>
          <span className="text-xs text-slate-400">
            {formatRelativeTime(update.createdAt)}
          </span>
        </div>
        <p className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
          {update.content}
        </p>
      </div>
    </div>
  );
}
