import { supabase } from "./supabase";
import type { Task, Group, TaskUpdate, UserProfile, UserRole, UserStatus, PendingInvite } from "../types";

// ─── Type mappers ────────────────────────────────────────────

function dbToGroup(row: Record<string, unknown>): Group {
  return {
    id: row.id as string,
    name: row.name as string,
    color: row.color as string,
    collapsed: row.collapsed as boolean,
    order: row.sort_order as number,
  };
}

function groupToDb(g: Group) {
  return {
    id: g.id,
    name: g.name,
    color: g.color,
    collapsed: g.collapsed,
    sort_order: g.order,
  };
}

function dbToTask(row: Record<string, unknown>): Task {
  const ownerName = row.owner_name as string | null;
  return {
    id: row.id as string,
    title: row.title as string,
    owner: ownerName
      ? {
          name: ownerName,
          initials: (row.owner_initials as string) || "",
          color: (row.owner_color as string) || "#3b82f6",
          avatar: (row.owner_avatar as string) || undefined,
        }
      : null,
    status: row.status as Task["status"],
    dueDate: (row.due_date as string) || null,
    priority: row.priority as Task["priority"],
    notes: (row.notes as string) || "",
    completed: row.completed as boolean,
    groupId: row.group_id as string,
    order: row.sort_order as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function taskToDb(t: Task) {
  return {
    id: t.id,
    title: t.title,
    owner_name: t.owner?.name ?? null,
    owner_initials: t.owner?.initials ?? null,
    owner_color: t.owner?.color ?? null,
    owner_avatar: t.owner?.avatar ?? null,
    status: t.status,
    due_date: t.dueDate ?? null,
    priority: t.priority,
    notes: t.notes ?? "",
    completed: t.completed,
    group_id: t.groupId,
    sort_order: t.order,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

// ─── Data loading ─────────────────────────────────────────────

export async function loadAllData(): Promise<{
  tasks: Task[];
  groups: Group[];
}> {
  const [{ data: gData, error: gErr }, { data: tData, error: tErr }] =
    await Promise.all([
      supabase.from("groups").select("*").order("sort_order"),
      supabase.from("tasks").select("*").order("sort_order"),
    ]);

  if (gErr) throw gErr;
  if (tErr) throw tErr;

  return {
    groups: (gData ?? []).map(dbToGroup),
    tasks: (tData ?? []).map(dbToTask),
  };
}

export async function seedData(
  groups: Group[],
  tasks: Task[]
): Promise<void> {
  const { error: gErr } = await supabase
    .from("groups")
    .insert(groups.map(groupToDb));
  if (gErr) throw gErr;

  const { error: tErr } = await supabase
    .from("tasks")
    .insert(tasks.map(taskToDb));
  if (tErr) throw tErr;
}

// ─── Group operations ─────────────────────────────────────────

export async function dbInsertGroup(g: Group): Promise<void> {
  const { error } = await supabase.from("groups").insert(groupToDb(g));
  if (error) throw error;
}

export async function dbUpdateGroup(
  id: string,
  updates: Partial<Group>
): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.color !== undefined) patch.color = updates.color;
  if (updates.collapsed !== undefined) patch.collapsed = updates.collapsed;
  if (updates.order !== undefined) patch.sort_order = updates.order;
  const { error } = await supabase.from("groups").update(patch).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from("groups").delete().eq("id", id);
  if (error) throw error;
}

// ─── Task operations ──────────────────────────────────────────

export async function dbInsertTask(t: Task): Promise<void> {
  const { error } = await supabase.from("tasks").insert(taskToDb(t));
  if (error) throw error;
}

export async function dbUpdateTask(
  id: string,
  updates: Partial<Task>
): Promise<void> {
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.title !== undefined) patch.title = updates.title;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.dueDate !== undefined) patch.due_date = updates.dueDate ?? null;
  if (updates.priority !== undefined) patch.priority = updates.priority;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  if (updates.completed !== undefined) patch.completed = updates.completed;
  if (updates.groupId !== undefined) patch.group_id = updates.groupId;
  if (updates.order !== undefined) patch.sort_order = updates.order;
  if (updates.owner !== undefined) {
    patch.owner_name = updates.owner?.name ?? null;
    patch.owner_initials = updates.owner?.initials ?? null;
    patch.owner_color = updates.owner?.color ?? null;
    patch.owner_avatar = updates.owner?.avatar ?? null;
  }
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

// ─── Task update operations ───────────────────────────────────

function dbToTaskUpdate(row: Record<string, unknown>): TaskUpdate {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    authorName: (row.author_name as string) || "",
    authorInitials: (row.author_initials as string) || "",
    authorColor: (row.author_color as string) || "#64748b",
    content: row.content as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// Fetches only task_id from every update row — lightweight count aggregation.
// Returns a map of taskId → update count for the full task list.
export async function loadUpdateCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("task_updates")
    .select("task_id");
  if (error) throw error;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((row: { task_id: string }) => {
    counts[row.task_id] = (counts[row.task_id] ?? 0) + 1;
  });
  return counts;
}

export async function loadTaskUpdates(taskId: string): Promise<TaskUpdate[]> {
  const { data, error } = await supabase
    .from("task_updates")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(dbToTaskUpdate);
}

export async function dbInsertTaskUpdate(u: TaskUpdate): Promise<void> {
  const { error } = await supabase.from("task_updates").insert({
    id: u.id,
    task_id: u.taskId,
    author_name: u.authorName,
    author_initials: u.authorInitials,
    author_color: u.authorColor,
    content: u.content,
    created_at: u.createdAt,
    updated_at: u.updatedAt,
  });
  if (error) throw error;
}

export async function dbUpdateTaskUpdate(id: string, content: string): Promise<void> {
  const { error } = await supabase
    .from("task_updates")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function dbDeleteTaskUpdate(id: string): Promise<void> {
  const { error } = await supabase.from("task_updates").delete().eq("id", id);
  if (error) throw error;
}

// ─── Profile operations ───────────────────────────────────────

function dbToProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    fullName: (row.full_name as string) || "",
    email: row.email as string,
    avatarUrl: (row.avatar_url as string) || null,
    role: row.role as UserRole,
    status: row.status as UserStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function loadProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToProfile);
}

export async function dbUpdateProfile(
  id: string,
  updates: Partial<Pick<UserProfile, "fullName" | "role" | "status" | "avatarUrl">>
): Promise<void> {
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.fullName !== undefined) patch.full_name = updates.fullName;
  if (updates.role !== undefined) patch.role = updates.role;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.avatarUrl !== undefined) patch.avatar_url = updates.avatarUrl;
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw error;
}

export async function dbDeleteProfile(id: string): Promise<void> {
  // Deleting the profile cascades via FK — auth.users row persists
  // (full account deletion requires service role; this removes app access)
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) throw error;
}

export async function dbAdminCount(): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw error;
  return count ?? 0;
}

// ─── Pending invite operations ────────────────────────────────

function dbToInvite(row: Record<string, unknown>): PendingInvite {
  return {
    id: row.id as string,
    email: row.email as string,
    fullName: (row.full_name as string) || "",
    role: row.role as UserRole,
    invitedBy: (row.invited_by as string) || null,
    createdAt: row.created_at as string,
  };
}

export async function loadPendingInvites(): Promise<PendingInvite[]> {
  const { data, error } = await supabase
    .from("pending_invites")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToInvite);
}

export async function dbCreateInvite(
  invite: Omit<PendingInvite, "id" | "createdAt">
): Promise<PendingInvite> {
  const { data, error } = await supabase
    .from("pending_invites")
    .insert({
      email: invite.email.toLowerCase().trim(),
      full_name: invite.fullName,
      role: invite.role,
      invited_by: invite.invitedBy,
    })
    .select()
    .single();
  if (error) throw error;
  return dbToInvite(data);
}

export async function dbDeleteInvite(id: string): Promise<void> {
  const { error } = await supabase.from("pending_invites").delete().eq("id", id);
  if (error) throw error;
}

// ─── Admin user management (via Edge Functions) ───────────────

// Supabase JS puts non-2xx edge function bodies on error.context (a Response).
// This helper extracts the real message so the UI can show it.
async function invokeEdgeFn(name: string, body: unknown): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.functions.invoke(name, { body: body as Record<string, unknown> });
  if (error) {
    let message = error.message ?? "Edge function error";
    try {
      const ctx = (error as unknown as { context?: Response }).context;
      const parsed = await ctx?.json();
      if (parsed?.error) message = String(parsed.error);
    } catch { /* ignore parse failures */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(String(data.error));
  return data as Record<string, unknown>;
}

export async function dbCreateUser(params: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  status?: "active" | "disabled";
}): Promise<UserProfile> {
  const result = await invokeEdgeFn("admin-create-user", params);

  // Fetch the freshly created profile row
  const { data: row, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", result.id)
    .single();
  if (profileErr) throw profileErr;
  return dbToProfile(row);
}

export async function dbAdminUpdatePassword(
  userId: string,
  password: string
): Promise<void> {
  await invokeEdgeFn("admin-update-password", { userId, password });
}

// ─── Batch order update (tasks) ───────────────────────────────

export async function dbBatchUpdateOrders(
  items: { id: string; order: number }[]
): Promise<void> {
  await Promise.all(
    items.map(({ id, order }) =>
      supabase
        .from("tasks")
        .update({ sort_order: order, updated_at: new Date().toISOString() })
        .eq("id", id)
    )
  );
}

// ─── Batch order update (groups) ──────────────────────────────

export async function dbBatchUpdateGroupOrders(
  items: { id: string; order: number }[]
): Promise<void> {
  await Promise.all(
    items.map(({ id, order }) =>
      supabase.from("groups").update({ sort_order: order }).eq("id", id)
    )
  );
}
