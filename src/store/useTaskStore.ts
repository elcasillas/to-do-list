import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import { generateInitials, getAvatarColor } from "../lib/utils";
import type {
  Task,
  Group,
  FilterState,
  SortState,
  HiddenColumns,
  TaskPriority,
  SortField,
} from "../types";

function makeOwner(name: string) {
  return { name, initials: generateInitials(name), color: getAvatarColor(name) };
}

const NOW = new Date().toISOString();

const DEFAULT_GROUPS: Group[] = [
  { id: "group-todo", name: "To-Do", color: "#3b82f6", collapsed: false, order: 0 },
  { id: "group-completed", name: "Completed", color: "#22c55e", collapsed: false, order: 1 },
];

const SEED_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Test 1",
    owner: makeOwner("Ed Casillas"),
    status: "working",
    dueDate: "2026-04-15",
    priority: "low",
    notes: "Action items to follow up on",
    completed: false,
    groupId: "group-todo",
    createdAt: NOW,
    updatedAt: NOW,
    order: 0,
  },
  {
    id: "task-2",
    title: "Test 2",
    owner: null,
    status: "done",
    dueDate: "2026-04-16",
    priority: "high",
    notes: "Meeting notes reviewed",
    completed: true,
    groupId: "group-todo",
    createdAt: NOW,
    updatedAt: NOW,
    order: 1,
  },
  {
    id: "task-3",
    title: "Task 3",
    owner: null,
    status: "stuck",
    dueDate: "2026-04-17",
    priority: "medium",
    notes: "Blocked on external dependency",
    completed: false,
    groupId: "group-todo",
    createdAt: NOW,
    updatedAt: NOW,
    order: 2,
  },
  {
    id: "task-4",
    title: "Review project proposal",
    owner: makeOwner("Alex Morgan"),
    status: "not_started",
    dueDate: "2026-04-20",
    priority: "urgent",
    notes: "Due before end of sprint",
    completed: false,
    groupId: "group-todo",
    createdAt: NOW,
    updatedAt: NOW,
    order: 3,
  },
  {
    id: "task-5",
    title: "Update documentation",
    owner: makeOwner("Sam Rivera"),
    status: "done",
    dueDate: "2026-04-10",
    priority: "low",
    notes: "",
    completed: true,
    groupId: "group-completed",
    createdAt: NOW,
    updatedAt: NOW,
    order: 0,
  },
];

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface TaskStore {
  tasks: Task[];
  groups: Group[];
  filter: FilterState;
  sort: SortState;
  hiddenColumns: HiddenColumns;

  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt" | "order">) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  duplicateTask: (id: string) => void;
  reorderTasks: (groupId: string, activeId: string, overId: string) => void;
  moveBetweenGroups: (
    taskId: string,
    toGroupId: string,
    overId?: string
  ) => void;

  addGroup: (name: string) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  toggleGroup: (id: string) => void;

  setFilter: (filter: Partial<FilterState>) => void;
  clearFilters: () => void;
  setSort: (field: SortField) => void;
  toggleColumn: (col: keyof HiddenColumns) => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: SEED_TASKS,
      groups: DEFAULT_GROUPS,
      filter: { search: "", owner: "", status: "", priority: "" },
      sort: { field: "", direction: "asc" },
      hiddenColumns: {
        owner: false,
        status: false,
        dueDate: false,
        priority: false,
        notes: false,
      },

      addTask: (taskData) => {
        const { tasks } = get();
        const groupTasks = tasks.filter((t) => t.groupId === taskData.groupId);
        const id = uuidv4();
        set({
          tasks: [
            ...tasks,
            {
              ...taskData,
              id,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              order: groupTasks.length,
            },
          ],
        });
        return id;
      },

      updateTask: (id, updates) => {
        set({
          tasks: get().tasks.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        });
      },

      deleteTask: (id) => {
        set({ tasks: get().tasks.filter((t) => t.id !== id) });
      },

      duplicateTask: (id) => {
        const { tasks } = get();
        const task = tasks.find((t) => t.id === id);
        if (!task) return;
        const groupTasks = tasks.filter((t) => t.groupId === task.groupId);
        set({
          tasks: [
            ...tasks,
            {
              ...task,
              id: uuidv4(),
              title: `${task.title} (copy)`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              order: groupTasks.length,
            },
          ],
        });
      },

      reorderTasks: (groupId, activeId, overId) => {
        const { tasks } = get();
        const groupTasks = tasks
          .filter((t) => t.groupId === groupId)
          .sort((a, b) => a.order - b.order);

        const activeIdx = groupTasks.findIndex((t) => t.id === activeId);
        const overIdx = groupTasks.findIndex((t) => t.id === overId);
        if (activeIdx === -1 || overIdx === -1) return;

        const reordered = [...groupTasks];
        const [moved] = reordered.splice(activeIdx, 1);
        reordered.splice(overIdx, 0, moved);

        const orderMap = Object.fromEntries(reordered.map((t, i) => [t.id, i]));
        set({
          tasks: tasks.map((t) =>
            orderMap[t.id] !== undefined ? { ...t, order: orderMap[t.id] } : t
          ),
        });
      },

      moveBetweenGroups: (taskId, toGroupId, overId) => {
        const { tasks } = get();
        const task = tasks.find((t) => t.id === taskId);
        if (!task || task.groupId === toGroupId) return;

        const toGroupTasks = tasks
          .filter((t) => t.groupId === toGroupId)
          .sort((a, b) => a.order - b.order);

        let insertAt = toGroupTasks.length;
        if (overId) {
          const overIdx = toGroupTasks.findIndex((t) => t.id === overId);
          if (overIdx !== -1) insertAt = overIdx;
        }

        set({
          tasks: tasks.map((t) => {
            if (t.id === taskId) {
              return {
                ...t,
                groupId: toGroupId,
                order: insertAt,
                updatedAt: new Date().toISOString(),
              };
            }
            if (t.groupId === toGroupId) {
              const idx = toGroupTasks.findIndex((tt) => tt.id === t.id);
              return { ...t, order: idx >= insertAt ? idx + 1 : idx };
            }
            return t;
          }),
        });
      },

      addGroup: (name) => {
        const { groups } = get();
        const palette = [
          "#6366f1",
          "#f59e0b",
          "#10b981",
          "#8b5cf6",
          "#f43f5e",
          "#06b6d4",
        ];
        set({
          groups: [
            ...groups,
            {
              id: uuidv4(),
              name,
              color: palette[groups.length % palette.length],
              collapsed: false,
              order: groups.length,
            },
          ],
        });
      },

      updateGroup: (id, updates) => {
        set({
          groups: get().groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        });
      },

      deleteGroup: (id) => {
        set({
          groups: get().groups.filter((g) => g.id !== id),
          tasks: get().tasks.filter((t) => t.groupId !== id),
        });
      },

      toggleGroup: (id) => {
        set({
          groups: get().groups.map((g) =>
            g.id === id ? { ...g, collapsed: !g.collapsed } : g
          ),
        });
      },

      setFilter: (filter) => {
        set({ filter: { ...get().filter, ...filter } });
      },

      clearFilters: () => {
        set({ filter: { search: "", owner: "", status: "", priority: "" } });
      },

      setSort: (field) => {
        const { sort } = get();
        if (sort.field === field) {
          if (sort.direction === "asc") {
            set({ sort: { field, direction: "desc" } });
          } else {
            set({ sort: { field: "", direction: "asc" } });
          }
        } else {
          set({ sort: { field, direction: "asc" } });
        }
      },

      toggleColumn: (col) => {
        set({
          hiddenColumns: {
            ...get().hiddenColumns,
            [col]: !get().hiddenColumns[col],
          },
        });
      },
    }),
    { name: "todo-list-v1" }
  )
);

export function getFilteredGroupTasks(
  tasks: Task[],
  groupId: string,
  filter: FilterState,
  sort: SortState
): Task[] {
  let filtered = tasks.filter((t) => t.groupId === groupId);

  const { search, owner, status, priority } = filter;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.owner?.name.toLowerCase().includes(q)
    );
  }
  if (owner) {
    filtered = filtered.filter((t) =>
      t.owner?.name.toLowerCase().includes(owner.toLowerCase())
    );
  }
  if (status) filtered = filtered.filter((t) => t.status === status);
  if (priority) filtered = filtered.filter((t) => t.priority === priority);

  const { field, direction } = sort;
  if (field) {
    filtered = [...filtered].sort((a, b) => {
      let av = "";
      let bv = "";
      if (field === "title") {
        av = a.title;
        bv = b.title;
      } else if (field === "status") {
        av = a.status;
        bv = b.status;
      } else if (field === "priority") {
        av = String(PRIORITY_ORDER[a.priority]);
        bv = String(PRIORITY_ORDER[b.priority]);
      } else if (field === "dueDate") {
        av = a.dueDate || "";
        bv = b.dueDate || "";
      } else if (field === "owner") {
        av = a.owner?.name || "";
        bv = b.owner?.name || "";
      }
      const cmp = av.localeCompare(bv);
      return direction === "asc" ? cmp : -cmp;
    });
  } else {
    filtered = [...filtered].sort((a, b) => a.order - b.order);
  }

  return filtered;
}
