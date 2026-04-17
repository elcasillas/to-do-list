import { useState } from "react";
import { CheckSquare, ChevronDown } from "lucide-react";
import { Toolbar } from "./components/Toolbar";
import { TaskTable } from "./components/TaskTable";
import { TaskModal } from "./components/TaskModal";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { useTaskStore } from "./store/useTaskStore";
import type { Task } from "./types";

export default function App() {
  const deleteTask = useTaskStore((s) => s.deleteTask);

  const [modalState, setModalState] = useState<{
    open: boolean;
    task?: Task | null;
    defaultGroupId?: string;
  }>({ open: false });

  const [deleteState, setDeleteState] = useState<{
    open: boolean;
    taskId?: string;
  }>({ open: false });

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
      {/* App header */}
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
              <span className="hidden sm:inline text-xs text-slate-400">
                Auto-saved
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300" />
            </div>
          </div>

          {/* Sub-navigation */}
          <div className="flex items-center -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 border-t border-slate-100">
            <button className="px-4 py-2 text-xs font-semibold text-blue-600 border-b-2 border-blue-600 -mb-px transition-colors">
              Main table
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Toolbar onAddTask={openAddTask} />
        <TaskTable
          onEditTask={openEditTask}
          onDeleteTask={openDeleteTask}
          onAddTask={openAddTask}
        />
      </main>

      {/* Task modal */}
      {modalState.open && (
        <TaskModal
          task={modalState.task}
          defaultGroupId={modalState.defaultGroupId}
          onClose={closeModal}
        />
      )}

      {/* Confirm delete */}
      {deleteState.open && (
        <ConfirmDialog
          title="Delete task"
          message="This action cannot be undone. The task will be permanently removed."
          confirmLabel="Delete task"
          onConfirm={handleConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
