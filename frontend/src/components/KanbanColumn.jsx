import TaskCard from './TaskCard';

function KanbanColumn({
  column,
  tasks,
  isMentor,
  onDropTask,
  onOpenTask,
  onEditTask,
  onDeleteTask,
  onApproveTask,
  onReturnTask,
}) {
  function handleDragOver(event) {
    if (!isMentor) {
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
            isMentor={isMentor}
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
