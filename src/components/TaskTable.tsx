import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { GroupSection } from "./GroupSection";
import { StatusPill } from "./ui/StatusPill";
import { PriorityPill } from "./ui/PriorityPill";
import { useTaskStore, getFilteredGroupTasks } from "../store/useTaskStore";
import { cn } from "../lib/utils";
import type { Task } from "../types";

interface TaskTableProps {
  onEditTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onAddTask: (groupId?: string) => void;
}

function DragOverlayContent({ task }: { task: Task }) {
  return (
    <div className="bg-white shadow-2xl rounded-xl border border-blue-300 px-4 py-3 flex items-center gap-3 opacity-95 max-w-md">
      <input type="checkbox" checked={task.completed} readOnly className="w-3.5 h-3.5" />
      <span
        className={cn(
          "text-sm font-medium flex-1 truncate",
          task.completed ? "line-through text-slate-400" : "text-slate-800"
        )}
      >
        {task.title}
      </span>
      <StatusPill status={task.status} compact />
      <PriorityPill priority={task.priority} compact />
    </div>
  );
}

export function TaskTable({ onEditTask, onDeleteTask, onAddTask }: TaskTableProps) {
  const { tasks, groups, filter, sort, hiddenColumns, showDoneTasks, reorderTasks, moveBetweenGroups, addGroup } =
    useTaskStore();

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const sortedGroups = [...groups].sort((a, b) => a.order - b.order);

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task || null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    if (activeId === overId) return;

    const activeTask = tasks.find((t) => t.id === activeId);
    if (!activeTask) return;

    const overGroup = groups.find((g) => g.id === overId);
    if (overGroup) {
      if (activeTask.groupId !== overGroup.id) {
        moveBetweenGroups(activeId, overGroup.id);
      }
      return;
    }

    const overTask = tasks.find((t) => t.id === overId);
    if (!overTask) return;

    if (activeTask.groupId === overTask.groupId) {
      reorderTasks(activeTask.groupId, activeId, overId);
    } else {
      moveBetweenGroups(activeId, overTask.groupId, overId);
    }
  }

  const handleAddGroup = () => {
    const name = newGroupName.trim();
    if (name) {
      addGroup(name);
      setNewGroupName("");
      setAddingGroup(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {sortedGroups.map((group) => {
        const groupTasks = getFilteredGroupTasks(tasks, group.id, filter, sort, showDoneTasks);
        return (
          <GroupSection
            key={group.id}
            group={group}
            tasks={groupTasks}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onAddTask={onAddTask}
            hiddenColumns={hiddenColumns}
            allGroups={sortedGroups}
          />
        );
      })}

      {/* Add group */}
      <div className="mt-2">
        {addingGroup ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddGroup();
                if (e.key === "Escape") {
                  setAddingGroup(false);
                  setNewGroupName("");
                }
              }}
              placeholder="Group name…"
              autoFocus
              className="px-3 py-1.5 text-sm border border-blue-400 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 w-48"
            />
            <button
              onClick={handleAddGroup}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setAddingGroup(false);
                setNewGroupName("");
              }}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAddingGroup(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add group
          </button>
        )}
      </div>

      <DragOverlay>
        {activeTask ? <DragOverlayContent task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
