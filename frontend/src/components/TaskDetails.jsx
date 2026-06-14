const STATUS_LABELS = {
  backlog: 'Бэклог',
  todo: 'Нужно сделать',
  in_progress: 'В процессе',
  done: 'Выполнено',
};

const PRIORITY_LABELS = {
  low: 'низкий',
  medium: 'средний',
  high: 'высокий',
};

function TaskDetails({ task, isMentor, onClose, onEdit, onDelete }) {
  return (
    <div className="details-overlay" onClick={onClose}>
      <aside className="task-details" onClick={(event) => event.stopPropagation()}>
        <button className="details-menu">☰</button>
        <button className="close-button details-close" onClick={onClose}>×</button>

        <h2>{task.title}</h2>

        <div className="details-meta">
          <span>◉ {STATUS_LABELS[task.status]}</span>
          <span>● Приоритет</span>
          <span>▣ Дедлайн</span>
          <span>● Исполнитель</span>
        </div>

        <div className="details-badges">
          <span className="tag">учебный проект</span>
          <span className={`priority priority-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span>
          <span>{new Date(task.deadline).toLocaleDateString('ru-RU')}</span>
          <span>● {task.assignee}</span>
        </div>

        <h3>Описание</h3>
        <p className="details-description">{task.description}</p>

        {!isMentor && (
          <div className="details-actions">
            <button className="secondary-button" onClick={() => onEdit(task)}>Редактировать</button>
            <button className="danger-button" onClick={() => onDelete(task.id)}>Удалить</button>
          </div>
        )}

        {isMentor && (
          <p className="muted-text">Ментор просматривает задачу без редактирования.</p>
        )}
      </aside>
    </div>
  );
}

export default TaskDetails;
