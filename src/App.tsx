import { useEffect, useState } from "react";
import { CheckSquare, ChevronDown, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Toolbar } from "./components/Toolbar";
import { TaskTable } from "./components/TaskTable";
import { TaskModal } from "./components/TaskModal";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { useTaskStore } from "./store/useTaskStore";
import type { Task } from "./types";

export default function App() {
  const { loadData, loading, error, deleteTask } = useTaskStore();

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
    loadData();
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
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <CheckSquare className="w-4 h-4 text-white" />
              </div>
              <button className="flex items-center gap-1 group">
                <h1 className="text-base font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors">
                  To Do List
                </h1>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {loading ? (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Syncing…
                </span>
              ) : error ? (
                <span className="flex items-center gap-1.5 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Offline
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span className="hidden sm:inline">Saved to Supabase</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300" />
                </span>
              )}
            </div>
          </div>

          {/* Sub-nav */}
          <div className="flex items-center -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-t border-slate-100">
            <button className="px-4 py-2 text-xs font-semibold text-blue-600 border-b-2 border-blue-600 -mb-px">
              Main table
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      </main>

      {/* ── Modals ──────────────────────────────────────────────── */}
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
    </div>
  );
}
