import KanbanColumn from './KanbanColumn';

const COLUMNS = [
  { key: 'backlog', title: 'Бэклог' },
  { key: 'todo', title: 'Нужно сделать' },
  { key: 'in_progress', title: 'В процессе' },
  { key: 'review', title: 'На проверке' },
  { key: 'done', title: 'Выполнено' },
];

function KanbanBoard({
  tasks,
  canDrag,
  canManageTasks,
  canReview,
  onDropTask,
  onOpenTask,
  onEditTask,
  onDeleteTask,
  onApproveTask,
  onReturnTask,
}) {
  return (
    <div className="kanban-board">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.key);

        return (
          <KanbanColumn
            key={column.key}
            column={column}
            tasks={columnTasks}
            canDrag={canDrag}
            canManageTasks={canManageTasks}
            canReview={canReview}
            onDropTask={onDropTask}
            onOpenTask={onOpenTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onApproveTask={onApproveTask}
            onReturnTask={onReturnTask}
          />
        );
      })}
    </div>
  );
}

export default KanbanBoard;
