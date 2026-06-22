const PRIORITY_LABELS = {
  low: 'низкий',
  medium: 'средний',
  high: 'высокий',
};

const SPECIALTY_TAG_LABELS = {
  backend: 'Backend',
  frontend: 'Frontend',
  designer: 'Дизайн',
  analyst: 'Аналитика',
};

function isTaskOverdue(task) {
  if (task.status === 'done') {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);

  return deadline < today;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function TaskCard({
  task,
  canDrag,
  canManageTasks,
  canReview,
  assigneeSpecialtyMap,
  onOpenTask,
  onEditTask,
  onDeleteTask,
  onApproveTask,
  onReturnTask,
}) {
  const overdue = isTaskOverdue(task);
  const isUnderReview = task.status === 'review';

  function handleDragStart(event) {
    event.dataTransfer.setData('taskId', task.id);
  }

  function stopClick(event) {
    event.stopPropagation();
  }

  return (
    <article
      className={overdue ? 'task-card overdue' : 'task-card'}
      draggable={canDrag}
      onDragStart={handleDragStart}
      onClick={() => onOpenTask(task)}
    >
      <div className="task-title-row">
        <span className="drag-icon">☰</span>
        <h3>{task.title}</h3>
      </div>

      <p>{task.description}</p>

      <div className="badges">
        <span className={`priority priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
        {assigneeSpecialtyMap?.[task.assignee] && (
          <span className="tag">{SPECIALTY_TAG_LABELS[assigneeSpecialtyMap[task.assignee]] ?? 'проект'}</span>
        )}
      </div>

      <div className="task-meta">
        <span>{formatDate(task.deadline)}</span>
        <span>● {task.assignee}</span>
      </div>

      {overdue && <div className="overdue-text">Просрочено</div>}

      {task.mentor_comment && (
        <div className="mentor-comment">
          <span className="mentor-comment-label">↩ Комментарий ментора</span>
          {task.mentor_comment}
        </div>
      )}

      {isUnderReview && canReview && (
        <div className="review-actions" onClick={stopClick}>
          <button className="review-approve" onClick={() => onApproveTask(task.id)}>
            ✓ Подтвердить
          </button>
          <button className="review-return" onClick={() => onReturnTask(task)}>
            ↩ Вернуть
          </button>
        </div>
      )}

      {isUnderReview && !canReview && (
        <div className="review-pending">⏳ Ждёт проверки ментора</div>
      )}

      {canManageTasks && (
        <div className="task-actions" onClick={stopClick}>
          <button onClick={() => onEditTask(task)}>Изменить</button>
          <button onClick={() => onDeleteTask(task.id)}>Удалить</button>
        </div>
      )}
    </article>
  );
}

export default TaskCard;
