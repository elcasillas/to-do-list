import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  AlertCircle,
  RefreshCw,
  LogOut,
  Users,
  LayoutList,
} from "lucide-react";
import { Toolbar } from "./components/Toolbar";
import { TaskTable } from "./components/TaskTable";
import { TaskModal } from "./components/TaskModal";
import { TaskSidePanel } from "./components/TaskSidePanel";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { Avatar } from "./components/ui/Avatar";
import { AuthPage, ResetPasswordPage } from "./components/auth/AuthPage";
import { UsersPage } from "./pages/UsersPage";
import { useTaskStore } from "./store/useTaskStore";
import { useAuthStore, isAdmin } from "./store/useAuthStore";
import { useClickOutside } from "./hooks/useClickOutside";
import { generateInitials, getAvatarColor, cn } from "./lib/utils";
import type { Task } from "./types";

type AppPage = "tasks" | "users";

// ── User account dropdown ─────────────────────────────────────

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const { profile } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false), open);

  if (!profile) return null;

  const owner = {
    name: profile.fullName,
    initials: generateInitials(profile.fullName),
    color: getAvatarColor(profile.fullName),
    avatar: profile.avatarUrl ?? undefined,
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full hover:ring-2 hover:ring-slate-200 transition-all p-0.5"
        title={profile.fullName}
      >
        <Avatar owner={owner} size="sm" />
        <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-slate-200 min-w-[220px] py-1 overflow-hidden">
          {/* Profile summary */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <Avatar owner={owner} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{profile.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{profile.email}</p>
              </div>
            </div>
            <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
              {profile.role}
            </span>
          </div>

          {/* Actions */}
          <button
            onClick={() => { setOpen(false); onSignOut(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tasks view (the existing app content) ─────────────────────

function TasksView() {
  const {
    loadData, loading, error, deleteTask,
    tasks, selectedTaskId, updates, updatesLoading, selectTask,
  } = useTaskStore();

  const selectedTask = selectedTaskId
    ? (tasks.find((t) => t.id === selectedTaskId) ?? null)
    : null;

  const [modalState, setModalState] = useState<{
    open: boolean;
    task?: Task | null;
    defaultGroupId?: string;
  }>({ open: false });

  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    taskId?: string;
  }>({ open: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await useAuthStore.getState().ensureSession();
      // If !ok, signOut() was called and the component will unmount via auth state change
      if (!cancelled && ok) loadData();
    })();
    return () => { cancelled = true; };
  }, []);

  const openAddTask = (groupId?: string) => {
    setModalState({ open: true, task: null, defaultGroupId: groupId });
  };
  const openEditTask = (task: Task) => {
    setModalState({ open: true, task });
  };
  const openDeleteTask = (taskId: string) => {
    setDeleteState({ open: true, taskId });
  };
  const closeModal = () => setModalState((s) => ({ ...s, open: false }));
  const closeDelete = () => setDeleteState({ open: false });
  const handleConfirmDelete = () => {
    if (deleteState.taskId) deleteTask(deleteState.taskId);
    closeDelete();
  };

  return (
    <>
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-slate-500">Loading your tasks…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    Could not connect to database
                  </p>
                  <pre className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 max-w-sm text-left whitespace-pre-wrap break-words">
                    {error}
                  </pre>
                  <p className="text-xs text-slate-400 mb-4">
                    Check the browser console for full details.
                  </p>
                  <button
                    onClick={() => loadData()}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors mx-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Toolbar onAddTask={openAddTask} />
                <TaskTable
                  onEditTask={openEditTask}
                  onDeleteTask={openDeleteTask}
                  onAddTask={openAddTask}
                />
              </>
            )}
          </div>
        </main>

        {selectedTask && (
          <aside
            className="
              fixed inset-0 z-40 bg-white flex flex-col
              sm:relative sm:inset-auto sm:z-auto
              sm:w-[460px] sm:flex-shrink-0 sm:border-l sm:border-slate-200
              sm:overflow-y-auto
            "
          >
            <TaskSidePanel
              task={selectedTask}
              updates={updates[selectedTask.id] ?? []}
              updatesLoading={updatesLoading}
              onClose={() => selectTask(null)}
            />
          </aside>
        )}
      </div>

      {modalState.open && (
        <TaskModal
          task={modalState.task}
          defaultGroupId={modalState.defaultGroupId}
          onClose={closeModal}
        />
      )}

      {deleteState.open && (
        <ConfirmDialog
          title="Delete task"
          message="This action cannot be undone. The task will be permanently removed from Supabase."
          confirmLabel="Delete task"
          onConfirm={handleConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </>
  );
}

// ── Loading screen ────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
    </div>
  );
}

// ── Authenticated app shell ───────────────────────────────────

function AuthenticatedApp() {
  const { profile, signOut } = useAuthStore();
  const [currentPage, setCurrentPage] = useState<AppPage>("tasks");
  const admin = isAdmin(profile);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo + page nav */}
            <div className="flex items-center gap-4">
              <img
                src="/To-Do-List-logo.png"
                alt="To Do List logo"
                className="h-8 w-auto flex-shrink-0"
              />

              <nav className="flex items-center gap-0.5">
                <button
                  onClick={() => setCurrentPage("tasks")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                    currentPage === "tasks"
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                  )}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tasks</span>
                </button>

                {admin && (
                  <button
                    onClick={() => setCurrentPage("users")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                      currentPage === "users"
                        ? "bg-blue-50 text-blue-700"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                    )}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Users</span>
                  </button>
                )}
              </nav>
            </div>

            {/* Right: sync status + user menu */}
            <div className="flex items-center gap-3">
              {currentPage === "tasks" && <TaskSyncStatus />}
              <UserMenu onSignOut={handleSignOut} />
            </div>
          </div>

          {/* Sub-nav (tasks page only) */}
          {currentPage === "tasks" && (
            <div className="flex items-center -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-t border-slate-100">
              <button className="px-4 py-2 text-xs font-semibold text-blue-600 border-b-2 border-blue-600 -mb-px">
                Main table
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ── Page content ────────────────────────────────────────── */}
      {currentPage === "tasks" ? (
        <TasksView />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <UsersPage />
        </div>
      )}
    </div>
  );
}

// ── Task sync status indicator (moved out of App for clarity) ─

function TaskSyncStatus() {
  const { loading, error } = useTaskStore();
  if (loading) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Syncing…
      </span>
    );
  }
  if (error) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-red-500">
        <AlertCircle className="w-3.5 h-3.5" />
        Offline
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      <span className="hidden sm:inline">Saved to Supabase</span>
      <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300" />
    </span>
  );
}

// ── Root ──────────────────────────────────────────────────────

export default function App() {
  const { loading, session, recoveryMode, initialize } = useAuthStore();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    initialize().then((fn) => {
      cleanup = fn;
    });
    return () => cleanup?.();
  }, []);

  if (loading) return <LoadingScreen />;
  if (recoveryMode) return <ResetPasswordPage />;
  if (!session) return <AuthPage />;

  return <AuthenticatedApp />;
}
