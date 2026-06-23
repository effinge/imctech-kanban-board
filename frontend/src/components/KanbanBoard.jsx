import KanbanColumn from './KanbanColumn';

// Дедлайн карточки попадает в одну из «корзин» по числу дней до срока.
// Просроченные задачи в раздел не попадают вовсе (возвращаем null — карточка
// не совпадёт ни с одной колонкой), задачи без дедлайна — в «В течении месяца».
function deadlineBucket(task) {
  if (!task.deadline) {
    return 'month';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);

  const days = Math.round((deadline - today) / 86400000);

  if (days < 0 && task.status !== 'done') return null;
  if (days < 7) return 'week';
  if (days < 14) return 'next_week';
  if (days < 21) return 'two_weeks';
  return 'month';
}

// Раздел — это чисто визуализация: одни и те же карточки группируются по
// разным полям. Перетаскивание меняет данные только в разделе «Статусы».
const SECTIONS = {
  status: {
    draggable: true,
    columns: [
      { key: 'backlog', title: 'Бэклог' },
      { key: 'todo', title: 'Нужно сделать' },
      { key: 'in_progress', title: 'В процессе' },
      { key: 'review', title: 'На проверке' },
      { key: 'done', title: 'Выполнено' },
    ],
    getColumnKey: (task) => task.status,
  },
  priority: {
    draggable: false,
    columns: [
      { key: 'low', title: 'Низкий' },
      { key: 'medium', title: 'Средний' },
      { key: 'high', title: 'Высокий' },
    ],
    getColumnKey: (task) => task.priority,
  },
  deadline: {
    draggable: false,
    columns: [
      { key: 'week', title: 'На этой неделе' },
      { key: 'next_week', title: 'Через неделю' },
      { key: 'two_weeks', title: 'Через две недели' },
      { key: 'month', title: 'В течении месяца' },
    ],
    getColumnKey: deadlineBucket,
  },
};

function KanbanBoard({
  section = 'status',
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
  const activeSection = SECTIONS[section] ?? SECTIONS.status;
  const { columns, getColumnKey, draggable } = activeSection;
  const columnCanDrag = draggable && canDrag;

  return (
    <div
      className="kanban-board"
      style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(196px, 1fr))` }}
    >
      {columns.map((column) => {
        const columnTasks = tasks.filter((task) => getColumnKey(task) === column.key);

        return (
          <KanbanColumn
            key={column.key}
            column={column}
            tasks={columnTasks}
            canDrag={columnCanDrag}
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
