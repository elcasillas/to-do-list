export type TaskStatus = "not_started" | "working" | "done" | "stuck";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface TaskOwner {
  name: string;
  avatar?: string;
  initials: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  owner?: TaskOwner | null;
  status: TaskStatus;
  dueDate?: string | null;
  priority: TaskPriority;
  notes?: string;
  completed: boolean;
  groupId: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface Group {
  id: string;
  name: string;
  color: string;
  collapsed: boolean;
  order: number;
}

export interface FilterState {
  search: string;
  owner: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
}

export type SortField = "title" | "status" | "dueDate" | "priority" | "owner" | "";
export type SortDirection = "asc" | "desc";

export interface SortState {
  field: SortField;
  direction: SortDirection;
}

export interface HiddenColumns {
  owner: boolean;
  status: boolean;
  dueDate: boolean;
  priority: boolean;
  notes: boolean;
}

export interface TaskUpdate {
  id: string;
  taskId: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ── User management ───────────────────────────────────────────
export type UserRole = "admin" | "manager" | "member";
export type UserStatus = "active" | "invited" | "disabled";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  invitedBy: string | null;
  createdAt: string;
}
