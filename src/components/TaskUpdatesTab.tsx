import { TaskUpdateComposer } from "./TaskUpdateComposer";
import { TaskUpdateList } from "./TaskUpdateList";
import { useTaskStore } from "../store/useTaskStore";
import type { Task, TaskUpdate } from "../types";

interface TaskUpdatesTabProps {
  task: Task;
  updates: TaskUpdate[];
  loading: boolean;
}

export function TaskUpdatesTab({ task, updates, loading }: TaskUpdatesTabProps) {
  const { addTaskUpdate } = useTaskStore();

  return (
    <div className="flex flex-col">
      <TaskUpdateComposer onSubmit={(content) => addTaskUpdate(task.id, content)} />
      <TaskUpdateList updates={updates} loading={loading} />
    </div>
  );
}
