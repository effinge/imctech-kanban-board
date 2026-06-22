import TaskCard from './TaskCard';

function KanbanColumn({
  column,
  tasks,
  canDrag,
  canManageTasks,
  canReview,
  assigneeSpecialtyMap,
  onDropTask,
  onOpenTask,
  onEditTask,
  onDeleteTask,
  onApproveTask,
  onReturnTask,
}) {
  function handleDragOver(event) {
    if (canDrag) {
      event.preventDefault();
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    const taskId = Number(event.dataTransfer.getData('taskId'));
    if (taskId) {
      onDropTask(taskId, column.key);
    }
  }

  return (
    <section
      className={`kanban-column column-${column.key}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <span className="status-dot"></span>
        <h2>{column.title}</h2>
        <span className="column-count">{tasks.length}</span>
      </div>

      <div className="task-list">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            canDrag={canDrag}
            canManageTasks={canManageTasks}
            canReview={canReview}
            assigneeSpecialtyMap={assigneeSpecialtyMap}
            onOpenTask={onOpenTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onApproveTask={onApproveTask}
            onReturnTask={onReturnTask}
          />
        ))}
      </div>
    </section>
  );
}

export default KanbanColumn;
