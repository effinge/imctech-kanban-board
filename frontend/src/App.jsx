import { useEffect, useMemo, useState } from 'react';
import {
  createTask,
  deleteTask,
  getMembers,
  getTasks,
  updateTask,
  updateTaskStatus,
} from './api/tasksApi';
import CommentsModal from './components/CommentsModal';
import KanbanBoard from './components/KanbanBoard';
import ProgressBlock from './components/ProgressBlock';
import ProgressBubble from './components/ProgressBubble';
import RoleSwitcher from './components/RoleSwitcher';
import TaskModal from './components/TaskModal';
import TaskDetails from './components/TaskDetails';
import TeamMembers from './components/TeamMembers';

function App() {
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [role, setRole] = useState('student');
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentsTask, setCommentsTask] = useState(null);
  const [error, setError] = useState('');
  const isMentor = role === 'mentor';

  function openComments(task) {
    setCommentsTask(task);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tasksData, membersData] = await Promise.all([getTasks(), getMembers()]);
      setTasks(tasksData);
      setMembers(membersData);
      setError('');
    } catch (currentError) {
      setError('Не удалось загрузить данные. Проверь, запущен ли backend.');
    }
  }

  function openCreateModal() {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  }

  function openEditModal(task) {
    setSelectedTask(null);
    setEditingTask(task);
    setIsTaskModalOpen(true);
  }

  async function handleSaveTask(taskData) {
    try {
      if (editingTask) {
        const updatedTask = await updateTask(editingTask.id, taskData);
        setTasks((currentTasks) =>
          currentTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
        );
      } else {
        const newTask = await createTask(taskData);
        setTasks((currentTasks) => [newTask, ...currentTasks]);
      }
      setIsTaskModalOpen(false);
      setEditingTask(null);
    } catch (currentError) {
      setError('Не удалось сохранить задачу. Проверь поля формы.');
    }
  }

  async function handleDeleteTask(taskId) {
    const isConfirmed = window.confirm('Удалить эту задачу?');
    if (!isConfirmed) {
      return;
    }

    try {
      await deleteTask(taskId);
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
      setSelectedTask(null);
    } catch (currentError) {
      setError('Не удалось удалить задачу.');
    }
  }

  async function handleDropTask(taskId, newStatus) {
    if (isMentor) {
      return;
    }

    const task = tasks.find((currentTask) => currentTask.id === taskId);
    if (!task || task.status === newStatus) {
      return;
    }

    try {
      const updatedTask = await updateTaskStatus(taskId, newStatus);
      setTasks((currentTasks) =>
        currentTasks.map((currentTask) =>
          currentTask.id === updatedTask.id ? updatedTask : currentTask
        )
      );
    } catch (currentError) {
      setError('Не удалось изменить статус задачи.');
    }
  }

  const projectProgress = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === 'done').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, done, percent };
  }, [tasks]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">☰</div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item">▦ <span>Главная</span></a>
          <a href="#" className="nav-item">◴ <span>Мероприятия</span></a>
          <a href="#" className="nav-item">● <span>Пользователи</span></a>
          <a href="#" className="nav-item">▦ <span>Компании</span></a>
          <a href="#" className="nav-item">▣ <span>Кейсы</span></a>
          <a href="#" className="nav-item active">▤ <span>Проекты</span></a>
        </nav>
      </aside>

      <main className="page">
        <header className="topbar">
          <div className="topbar-title">Проекты</div>
          <div className="topbar-user">●</div>
        </header>

        <section className="project-layout">
          <div className="project-header">
            <div>
              <ProgressBubble percent={projectProgress.percent} />
              <h1>Название проекта</h1>
            </div>
            <RoleSwitcher role={role} onRoleChange={setRole} />
          </div>

          <div className="project-tabs">
            <button className="tab active">Статусы →</button>
            <button className="tab">↑ Приоритеты</button>
            <button className="tab">★ Категории</button>
            <button className="tab">▣ Дедлайны</button>
          </div>

          <div className="workspace-grid">
            <section className="workspace-main">
              <div className="toolbar">
                <div className="search-field">⌕ Поиск по задачам</div>
                <button
                  className="primary-button"
                  onClick={openCreateModal}
                  disabled={isMentor}
                  title={isMentor ? 'Ментор просматривает проект без редактирования' : ''}
                >
                  Создать +
                </button>
              </div>

              {isMentor && (
                <div className="mentor-note">
                  Режим ментора: можно просматривать доску, прогресс и участников. Изменение задач ограничено.
                </div>
              )}

              {error && <div className="error-message">{error}</div>}

              <KanbanBoard
                tasks={tasks}
                isMentor={isMentor}
                onDropTask={handleDropTask}
                onOpenTask={setSelectedTask}
                onEditTask={openEditModal}
                onDeleteTask={handleDeleteTask}
              />
            </section>

            <aside className="workspace-sidebar">
              <ProgressBlock progress={projectProgress} />
              <TeamMembers members={members} />
            </aside>
          </div>
        </section>
      </main>

      {isTaskModalOpen && (
        <TaskModal
          task={editingTask}
          members={members}
          onClose={() => setIsTaskModalOpen(false)}
          onSave={handleSaveTask}
        />
      )}

      {selectedTask && (
        <TaskDetails
          task={selectedTask}
          isMentor={isMentor}
          onClose={() => setSelectedTask(null)}
          onEdit={openEditModal}
          onDelete={handleDeleteTask}
          onOpenComments={openComments}
        />
      )}

      {commentsTask && (
        <CommentsModal
          task={commentsTask}
          role={role}
          onClose={() => setCommentsTask(null)}
        />
      )}
    </div>
  );
}

export default App;
