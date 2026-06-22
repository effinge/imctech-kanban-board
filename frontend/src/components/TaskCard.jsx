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
  if (task.status === 'done') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(task.deadline);
  deadline.setHours(0, 0, 0, 0);
  return deadline < today;
}

function getDeadlineInfo(deadline, status) {
  if (!deadline) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (status === 'done') return { text: d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }), type: 'done' };
  if (diff < 0) return { text: `просрочено ${Math.abs(diff)} дн.`, type: 'overdue' };
  if (diff === 0) return { text: 'дедлайн сегодня!', type: 'today' };
  if (diff === 1) return { text: 'завтра', type: 'soon' };
  if (diff <= 3) return { text: `через ${diff} дн.`, type: 'soon' };
  if (diff <= 7) return { text: `через ${diff} дн.`, type: 'week' };
  return { text: d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' }), type: 'far' };
}

function assigneeInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
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
  const deadlineInfo = getDeadlineInfo(task.deadline, task.status);

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
        {deadlineInfo && (
          <span className={`deadline-text deadline-${deadlineInfo.type}`}>
            ⏱ {deadlineInfo.text}
          </span>
        )}
        <div className="assignee-row">
          <span className="card-assignee-avatar">{assigneeInitials(task.assignee)}</span>
          <span>{task.assignee}</span>
        </div>
      </div>

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
