import { useEffect, useMemo, useState } from 'react';
import {
  createTask,
  deleteTask,
  getProjectMembers,
  getProjects,
  getTasks,
  getUsers,
  reviewTask,
  updateTask,
  updateTaskStatus,
} from './api/tasksApi';
import { accountRoleLabel, SPECIALTY_LABELS } from './constants/roles';
import CommentsModal from './components/CommentsModal';
import KanbanBoard from './components/KanbanBoard';
import LoginScreen from './components/LoginScreen';
import ProgressBlock from './components/ProgressBlock';
import ProgressBubble from './components/ProgressBubble';
import ProjectSwitcher from './components/ProjectSwitcher';
import TaskModal from './components/TaskModal';
import TaskDetails from './components/TaskDetails';
import TeamMembers from './components/TeamMembers';
import {
  BriefcaseIcon,
  BuildingIcon,
  CalendarIcon,
  HomeIcon,
  KanbanIcon,
  MenuIcon,
  UserIcon,
  UsersIcon,
} from './components/icons';

function App() {
  const [tasks, setTasks] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [commentsTask, setCommentsTask] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const role = currentUser?.system_role || 'student';
  const isMentor = role === 'mentor';

  function openComments(task) {
    setCommentsTask(task);
  }

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  }

  function applyTaskUpdate(updatedTask) {
    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
    setSelectedTask((current) =>
      current && current.id === updatedTask.id ? updatedTask : current
    );
  }

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (currentUser && activeProjectId) {
      loadBoard(activeProjectId);
    }
  }, [currentUser, activeProjectId]);

  async function loadAccounts() {
    try {
      const [usersData, projectsData] = await Promise.all([getUsers(), getProjects()]);
      setUsers(usersData);
      setProjects(projectsData);
      if (projectsData.length > 0) {
        setActiveProjectId(projectsData[0].id);
      }
      setError('');
    } catch (currentError) {
      setError('Не удалось загрузить данные. Проверь, запущен ли backend.');
    }
  }

  async function loadBoard(projectId) {
    try {
      const [tasksData, membersData] = await Promise.all([
        getTasks(projectId),
        getProjectMembers(projectId),
      ]);
      setTasks(tasksData);
      setProjectMembers(membersData);
      setError('');
    } catch (currentError) {
      setError('Не удалось загрузить данные проекта.');
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    setSelectedTask(null);
    setCommentsTask(null);
    setIsTaskModalOpen(false);
    setEditingTask(null);
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
        const newTask = await createTask({ ...taskData, project_id: activeProjectId });
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
    if (!task) {
      return;
    }

    // Киллер-фича: студент не закрывает задачу сам — перенос в «Выполнено»
    // отправляет её ментору на проверку.
    const targetStatus = newStatus === 'done' ? 'review' : newStatus;
    if (task.status === targetStatus) {
      return;
    }

    try {
      const updatedTask = await updateTaskStatus(taskId, targetStatus);
      applyTaskUpdate(updatedTask);
      if (targetStatus === 'review') {
        showNotice('Задача отправлена ментору на проверку.');
      }
    } catch (currentError) {
      setError('Не удалось изменить статус задачи.');
    }
  }

  async function handleApproveTask(taskId) {
    try {
      const updatedTask = await reviewTask(taskId, 'approve');
      applyTaskUpdate(updatedTask);
      showNotice('Задача подтверждена и перенесена в «Выполнено».');
    } catch (currentError) {
      setError('Не удалось подтвердить задачу.');
    }
  }

  async function handleReturnTask(task) {
    const comment = window.prompt('Комментарий для студента: что доработать?');
    if (comment === null) {
      return;
    }
    if (!comment.trim()) {
      setError('Чтобы вернуть задачу, нужен комментарий.');
      return;
    }

    try {
      const updatedTask = await reviewTask(task.id, 'return', comment.trim());
      applyTaskUpdate(updatedTask);
      showNotice('Задача возвращена студенту с комментарием.');
    } catch (currentError) {
      setError('Не удалось вернуть задачу.');
    }
  }

  const projectProgress = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === 'done').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, done, percent };
  }, [tasks]);

  const activeProject = projects.find((project) => project.id === activeProjectId);

  const myMembership =
    projectMembers.find((member) => member.user_id === currentUser?.id) || null;

  function projectRoleLine() {
    if (!myMembership) {
      return 'Вы не участник этого проекта';
    }
    if (myMembership.system_role === 'mentor') {
      return 'Вы — ментор проекта';
    }
    const specialty = SPECIALTY_LABELS[myMembership.specialty] || 'без добавочной роли';
    return myMembership.is_lead
      ? `Руководитель · ${specialty}`
      : `Участник · ${specialty}`;
  }

  // В форме задачи исполнитель выбирается из студентов проекта.
  const assignableMembers = projectMembers
    .filter((member) => member.system_role === 'student')
    .map((member) => ({ id: member.user_id, name: member.name }));

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={setCurrentUser} error={error} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo"><MenuIcon size={20} /></div>
        <nav className="sidebar-nav">
          <a href="#" className="nav-item"><HomeIcon /> <span>Главная</span></a>
          <a href="#" className="nav-item"><CalendarIcon /> <span>Мероприятия</span></a>
          <a href="#" className="nav-item"><UsersIcon /> <span>Пользователи</span></a>
          <a href="#" className="nav-item"><BuildingIcon /> <span>Компании</span></a>
          <a href="#" className="nav-item"><BriefcaseIcon /> <span>Кейсы</span></a>
          <a href="#" className="nav-item active"><KanbanIcon /> <span>Проекты</span></a>
        </nav>
      </aside>

      <main className="page">
        <header className="topbar">
          <div className="topbar-title">Проекты</div>
          <div className="topbar-account">
            <div className="topbar-account-info">
              <span className="topbar-account-name">{currentUser.name}</span>
              <span className="topbar-account-role">{accountRoleLabel(currentUser)}</span>
            </div>
            <div className="topbar-user"><UserIcon size={22} /></div>
            <button className="logout-button" onClick={handleLogout}>Выйти</button>
          </div>
        </header>

        <section className="project-layout">
          <div className="project-header">
            <div>
              <ProgressBubble percent={projectProgress.percent} />
              <h1>{activeProject?.name || 'Проект'}</h1>
              <p className="project-role-line">{projectRoleLine()}</p>
            </div>
            <ProjectSwitcher
              projects={projects}
              activeProjectId={activeProjectId}
              onChange={setActiveProjectId}
            />
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

              {notice && <div className="notice-message">{notice}</div>}
              {error && <div className="error-message">{error}</div>}

              <KanbanBoard
                tasks={tasks}
                isMentor={isMentor}
                onDropTask={handleDropTask}
                onOpenTask={setSelectedTask}
                onEditTask={openEditModal}
                onDeleteTask={handleDeleteTask}
                onApproveTask={handleApproveTask}
                onReturnTask={handleReturnTask}
              />
            </section>

            <aside className="workspace-sidebar">
              <ProgressBlock progress={projectProgress} />
              <TeamMembers members={projectMembers} />
            </aside>
          </div>
        </section>
      </main>

      {isTaskModalOpen && (
        <TaskModal
          task={editingTask}
          members={assignableMembers}
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
          onApprove={handleApproveTask}
          onReturn={handleReturnTask}
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
