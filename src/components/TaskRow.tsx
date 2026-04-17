import { useRef, useState, useCallback } from "react";
import {
  GripVertical,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit2,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StatusPill, STATUS_CONFIG } from "./ui/StatusPill";
import { PriorityPill, PRIORITY_CONFIG } from "./ui/PriorityPill";
import { Avatar } from "./ui/Avatar";
import { useTaskStore } from "../store/useTaskStore";
import { useClickOutside } from "../hooks/useClickOutside";
import { formatDate, isOverdue, cn } from "../lib/utils";
import type { Task, TaskStatus, TaskPriority, HiddenColumns } from "../types";

interface TaskRowProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  hiddenColumns: HiddenColumns;
  groups: { id: string; name: string }[];
}

function Dropdown({
  children,
  open,
  onClose,
  align = "left",
}: {
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose, open);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute top-full mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-[160px]",
        align === "right" ? "right-0" : "left-0"
      )}
    >
      {children}
    </div>
  );
}

export function TaskRow({
  task,
  onEdit,
  onDelete,
  hiddenColumns,
  groups,
}: TaskRowProps) {
  const { updateTask, duplicateTask, moveBetweenGroups } = useTaskStore();

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);
  const [showMenu, setShowMenu] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [showPriority, setShowPriority] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [editingDate, setEditingDate] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: isDragging ? ("relative" as const) : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  const commitTitle = useCallback(() => {
    setEditingTitle(false);
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) {
      updateTask(task.id, { title: trimmed });
    } else {
      setTitleDraft(task.title);
    }
  }, [titleDraft, task.title, task.id, updateTask]);

  const handleCheckbox = () => {
    const completed = !task.completed;
    updateTask(task.id, {
      completed,
      status: completed ? "done" : task.status === "done" ? "not_started" : task.status,
    });
  };

  const handleStatusChange = (status: TaskStatus) => {
    updateTask(task.id, {
      status,
      completed: status === "done",
    });
    setShowStatus(false);
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    updateTask(task.id, { priority });
    setShowPriority(false);
  };

  const overdue = isOverdue(task.dueDate) && !task.completed;
  const otherGroups = groups.filter((g) => g.id !== task.groupId);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/row border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors",
        isDragging && "bg-blue-50 shadow-lg rounded"
      )}
    >
      {/* Drag + Checkbox */}
      <td className="w-10 pl-2 pr-1 py-2">
        <div className="flex items-center gap-0.5">
          <button
            {...attributes}
            {...listeners}
            className="opacity-0 group-hover/row:opacity-100 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing transition-opacity p-0.5 rounded"
            tabIndex={-1}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <input
            type="checkbox"
            checked={task.completed}
            onChange={handleCheckbox}
            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-500 cursor-pointer accent-blue-500"
          />
        </div>
      </td>

      {/* Title */}
      <td className="py-2 px-3 min-w-[140px]">
        {editingTitle ? (
          <input
            ref={titleRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                setTitleDraft(task.title);
                setEditingTitle(false);
              }
            }}
            autoFocus
            className="w-full text-sm text-slate-900 bg-white border border-blue-400 rounded-md px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        ) : (
          <span
            onClick={() => {
              setTitleDraft(task.title);
              setEditingTitle(true);
            }}
            className={cn(
              "text-sm cursor-text hover:text-blue-600 transition-colors block truncate max-w-[240px]",
              task.completed
                ? "line-through text-slate-400"
                : "text-slate-800 font-medium"
            )}
            title={task.title}
          >
            {task.title}
          </span>
        )}
      </td>

      {/* Owner */}
      {!hiddenColumns.owner && (
        <td className="py-2 px-3 w-[72px]">
          <div className="flex justify-center">
            <Avatar owner={task.owner} />
          </div>
        </td>
      )}

      {/* Status */}
      {!hiddenColumns.status && (
        <td className="py-2 px-2 w-36 relative">
          <StatusPill status={task.status} onClick={() => setShowStatus(!showStatus)} />
          <Dropdown open={showStatus} onClose={() => setShowStatus(false)}>
            {(Object.keys(STATUS_CONFIG) as TaskStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    STATUS_CONFIG[s].dotClass
                  )}
                />
                {STATUS_CONFIG[s].label}
                {task.status === s && (
                  <span className="ml-auto text-blue-500 text-xs">✓</span>
                )}
              </button>
            ))}
          </Dropdown>
        </td>
      )}

      {/* Due date */}
      {!hiddenColumns.dueDate && (
        <td className="py-2 px-3 w-28 text-center relative">
          {editingDate ? (
            <input
              type="date"
              defaultValue={task.dueDate || ""}
              autoFocus
              onBlur={(e) => {
                updateTask(task.id, { dueDate: e.target.value || null });
                setEditingDate(false);
              }}
              onChange={(e) => {
                if (e.target.value) {
                  updateTask(task.id, { dueDate: e.target.value });
                  setEditingDate(false);
                }
              }}
              className="w-full text-xs border border-blue-400 rounded px-1 py-0.5 outline-none"
            />
          ) : (
            <button
              onClick={() => setEditingDate(true)}
              className={cn(
                "text-xs font-medium w-full text-center transition-colors hover:text-blue-600",
                overdue ? "text-red-500" : "text-slate-500",
                !task.dueDate && "text-slate-300 hover:text-blue-400"
              )}
            >
              {task.dueDate ? (
                <span className="flex items-center justify-center gap-1">
                  {overdue && "⚠ "}
                  {formatDate(task.dueDate)}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1 opacity-0 group-hover/row:opacity-100">
                  <CalendarDays className="w-3 h-3" />
                  Set date
                </span>
              )}
            </button>
          )}
        </td>
      )}

      {/* Priority */}
      {!hiddenColumns.priority && (
        <td className="py-2 px-2 w-28 relative">
          <PriorityPill
            priority={task.priority}
            onClick={() => setShowPriority(!showPriority)}
          />
          <Dropdown open={showPriority} onClose={() => setShowPriority(false)}>
            {(Object.keys(PRIORITY_CONFIG) as TaskPriority[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePriorityChange(p)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <span
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    PRIORITY_CONFIG[p].dotClass
                  )}
                />
                {PRIORITY_CONFIG[p].label}
                {task.priority === p && (
                  <span className="ml-auto text-blue-500 text-xs">✓</span>
                )}
              </button>
            ))}
          </Dropdown>
        </td>
      )}

      {/* Notes */}
      {!hiddenColumns.notes && (
        <td className="py-2 px-3 min-w-[100px]">
          <span
            className="text-xs text-slate-400 truncate block max-w-[160px] cursor-default"
            title={task.notes}
          >
            {task.notes || ""}
          </span>
        </td>
      )}

      {/* Actions */}
      <td className="py-2 px-1.5 w-9 relative">
        <div className="opacity-0 group-hover/row:opacity-100 transition-opacity">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <Dropdown open={showMenu} onClose={() => setShowMenu(false)} align="right">
            <button
              onClick={() => {
                onEdit(task);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-400" />
              Edit task
            </button>
            <button
              onClick={() => {
                duplicateTask(task.id);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              Duplicate
            </button>
            {otherGroups.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowMove(!showMove)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  Move to…
                </button>
                {showMove && (
                  <div className="absolute right-full top-0 mr-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden min-w-[160px]">
                    {otherGroups.map((g) => (
                      <button
                        key={g.id}
                        onClick={() => {
                          moveBetweenGroups(task.id, g.id);
                          setShowMenu(false);
                          setShowMove(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <hr className="border-slate-100 my-0.5" />
            <button
              onClick={() => {
                onDelete(task.id);
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          </Dropdown>
        </div>
      </td>
    </tr>
  );
}
