import { useEffect, useState } from 'react';

const defaultTask = {
  title: '',
  description: '',
  assignee: 'Иван Петров',
  deadline: '2026-06-20',
  status: 'backlog',
  priority: 'medium',
};

function TaskModal({ task, members, onClose, onSave }) {
  const [form, setForm] = useState(defaultTask);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description,
        assignee: task.assignee,
        deadline: task.deadline,
        status: task.status,
        priority: task.priority,
      });
    } else {
      setForm({
        ...defaultTask,
        assignee: members[0]?.name || defaultTask.assignee,
      });
    }
  }, [task, members]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(form);
  }

  return (
    <div className="modal-overlay">
      <div className="modal-window">
        <div className="modal-header">
          <h2>{task ? 'Редактирование задачи' : 'Создание задачи'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form className="task-form" onSubmit={handleSubmit}>
          <label>
            Название
            <input name="title" value={form.title} onChange={handleChange} required />
          </label>

          <label>
            Описание
            <textarea name="description" value={form.description} onChange={handleChange} required />
          </label>

          <div className="form-grid">
            <label>
              Ответственный
              <select name="assignee" value={form.assignee} onChange={handleChange}>
                {members.map((member) => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </label>

            <label>
              Дедлайн
              <input name="deadline" type="date" value={form.deadline} onChange={handleChange} required />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Статус
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="backlog">Бэклог</option>
                <option value="todo">Нужно сделать</option>
                <option value="in_progress">В процессе</option>
                <option value="review">На проверке</option>
                <option value="done">Выполнено</option>
              </select>
            </label>

            <label>
              Приоритет
              <select name="priority" value={form.priority} onChange={handleChange}>
                <option value="low">Низкий</option>
                <option value="medium">Средний</option>
                <option value="high">Высокий</option>
              </select>
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>Отмена</button>
            <button type="submit" className="primary-button">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskModal;
