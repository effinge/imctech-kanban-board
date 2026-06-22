import { useEffect, useMemo, useState } from 'react';
import {
  addProjectMember,
  assignLead,
  assignSpecialty,
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
import DashboardModal from './components/DashboardModal';
import KanbanBoard from './components/KanbanBoard';
import LoginScreen from './components/LoginScreen';
import ProgressBlock from './components/ProgressBlock';
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

const PROJECT_TITLE_STORAGE_PREFIX = 'imctech_project_title_';
const PRIORITY_WEIGHT = { high: 0, medium: 1, low: 2 };

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
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);

  const [titleOverrides, setTitleOverrides] = useState({});
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [sortOption, setSortOption] = useState('default');

  const role = currentUser?.system_role || 'student';
  const isMentor = role === 'mentor';

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4000);
  }

  function openComments(task) {
    setCommentsTask(task);
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
      setIsEditingTitle(false);
      const savedTitle = localStorage.getItem(
        `${PROJECT_TITLE_STORAGE_PREFIX}${activeProjectId}`
      );
      if (savedTitle) {
        setTitleOverrides((current) => ({ ...current, [activeProjectId]: savedTitle }));
      }
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

  function startEditingTitle() {
    if (!canEditProjectTitle) {
      return;
    }
    setTitleDraft(displayedProjectTitle);
    setIsEditingTitle(true);
  }

  function commitTitleChange() {
    const trimmedTitle = titleDraft.trim();
    const finalTitle = trimmedTitle === '' ? activeProject?.name || 'Проект' : trimmedTitle;

    setTitleOverrides((current) => ({ ...current, [activeProjectId]: finalTitle }));
    localStorage.setItem(`${PROJECT_TITLE_STORAGE_PREFIX}${activeProjectId}`, finalTitle);
    setIsEditingTitle(false);
  }

  function handleTitleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitTitleChange();
    } else if (event.key === 'Escape') {
      setTitleDraft(displayedProjectTitle);
      setIsEditingTitle(false);
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
    if (!canDrag) {
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

  async function handleAssignLead(userId) {
    try {
      const updatedMembers = await assignLead(activeProjectId, userId);
      setProjectMembers(updatedMembers);
      showNotice('Назначен руководитель проекта.');
    } catch (currentError) {
      setError('Не удалось назначить руководителя.');
    }
  }

  async function handleAssignSpecialty(userId, specialty) {
    try {
      const updatedMembers = await assignSpecialty(activeProjectId, userId, specialty);
      setProjectMembers(updatedMembers);
      showNotice('Добавочная роль обновлена.');
    } catch (currentError) {
      setError('Не удалось изменить роль участника.');
    }
  }

  async function handleAddParticipant(userId) {
    try {
      const updatedMembers = await addProjectMember(activeProjectId, userId);
      setProjectMembers(updatedMembers);
      showNotice('Участник добавлен в проект.');
    } catch (currentError) {
      setError('Не удалось добавить участника.');
    }
  }

  const projectProgress = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((task) => task.status === 'done').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, done, percent };
  }, [tasks]);

  const personalProgress = useMemo(() => {
    const mine = tasks.filter((task) => task.assignee === currentUser?.name);
    const total = mine.length;
    const done = mine.filter((task) => task.status === 'done').length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, done, percent };
  }, [tasks, currentUser]);

  const activeProject = projects.find((project) => project.id === activeProjectId);

  const displayedProjectTitle =
    titleOverrides[activeProjectId] ?? activeProject?.name ?? 'Проект';

  const myMembership =
    projectMembers.find((member) => member.user_id === currentUser?.id) || null;
  const isStudent = role === 'student';
  const isMember = Boolean(myMembership);
  const isLead = Boolean(myMembership?.is_lead);

  // Права по ролям внутри активного проекта.
  const canReview = isMentor;
  const canDrag = isStudent && isMember;
  const canManageTasks = isStudent && isLead; // создание/редактирование/удаление задач
  const canAssignLead = isMentor;
  const canManageRoles = isStudent && isLead;
  const canAddParticipant = isMentor || (isStudent && isLead);
  const canEditProjectTitle = isStudent;

  // Руководитель и ментор видят все задачи проекта; обычный участник —
  // только назначенные ему карточки.
  const canSeeAllTasks = isMentor || isLead;
  const visibleTasks = canSeeAllTasks
    ? tasks
    : tasks.filter((task) => task.assignee === currentUser?.name);
  
  const sortedTasks = useMemo(() => {
    const list = [...visibleTasks];
    if (sortOption === 'priority') {
      list.sort((a, b) => (PRIORITY_WEIGHT[a.priority] ?? 99) - (PRIORITY_WEIGHT[b.priority] ?? 99));
    } else if (sortOption === 'deadline') {
      list.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
    } else {
      list.sort((a, b) => b.id - a.id);
    }
    return list;
  }, [visibleTasks, sortOption]);

  const sidebarProgress = canSeeAllTasks ? projectProgress : personalProgress;
  const sidebarProgressTitle = canSeeAllTasks ? 'Прогресс проекта' : 'Мой прогресс';

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

  function boardNote() {
    if (isMentor) {
      return 'Режим ментора: просмотр доски, проверка задач (подтвердить / вернуть), назначение руководителя и добавление участников.';
    }
    if (!isMember) {
      return 'Вы не участник этого проекта — доступен только просмотр.';
    }
    if (isLead) {
      return 'Вы руководитель проекта: можно создавать и редактировать задачи, назначать добавочные роли и добавлять участников.';
    }
    return 'Вы участник проекта: можно перемещать карточки и комментировать. Создание и редактирование задач — у руководителя.';
  }

  // Исполнитель в форме задачи выбирается из студентов проекта.
  const assignableMembers = projectMembers
    .filter((member) => member.system_role === 'student')
    .map((member) => ({ id: member.user_id, name: member.name }));

  // Кого можно добавить в проект — студенты, которых там ещё нет.
  const addableUsers = users.filter(
    (user) =>
      user.system_role === 'student' &&
      !projectMembers.some((member) => member.user_id === user.id)
  );

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
              {isEditingTitle ? (
                <input
                  type="text"
                  className="project-title-input"
                  value={titleDraft}
                  autoFocus
                  onChange={(event) => setTitleDraft(event.target.value)}
                  onBlur={commitTitleChange}
                  onKeyDown={handleTitleKeyDown}
                  maxLength={120}
                />
              ) : (
                <h1
                  className={`project-title ${canEditProjectTitle ? 'project-title-editable' : ''}`}
                  onClick={startEditingTitle}
                  title={canEditProjectTitle ? 'Нажмите, чтобы переименовать проект' : ''}
                >
                  {displayedProjectTitle}
                  {canEditProjectTitle && <span className="project-title-edit-icon">✎</span>}
                </h1>
              )}

              <p className="project-role-line">{projectRoleLine()}</p>
            </div>
            <ProjectSwitcher
              projects={projects}
              activeProjectId={activeProjectId}
              onChange={setActiveProjectId}
            />
          </div>

          <div className="project-tabs">
            <button className={`tab ${sortOption === 'default' ? 'active' : ''}`} onClick={() => setSortOption('default')}>Статусы →</button>
            <button className={`tab ${sortOption === 'priority' ? 'active' : ''}`} onClick={() => setSortOption('priority')}>↑ Приоритеты</button>
            <button className={`tab ${sortOption === 'deadline' ? 'active' : ''}`} onClick={() => setSortOption('deadline')}>⏱︎ Дедлайны</button>
          </div>

          <div className="workspace-grid">
            <section className="workspace-main">
              <div className="toolbar">
                <div className="search-field">⌕ Поиск по задачам</div>
                <select className="sort-select" value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)} aria-label="Сортировка задач">
                  <option value="default">Сортировка: по умолчанию</option>
                  <option value="priority">По приоритету</option>
                  <option value="deadline">По дедлайну</option>
                </select>
                {(isMentor || isLead) && (
                  <button
                    className="secondary-button"
                    onClick={() => setIsDashboardOpen(true)}
                  >
                    Дашборд
                  </button>
                )}
                <button
                  className="primary-button"
                  onClick={openCreateModal}
                  disabled={!canManageTasks}
                  title={
                    canManageTasks
                      ? ''
                      : 'Создавать задачи может только руководитель проекта'
                  }
                >
                  Создать +
                </button>
              </div>

              <div className="mentor-note">{boardNote()}</div>

              {notice && <div className="notice-message">{notice}</div>}
              {error && <div className="error-message">{error}</div>}

              <KanbanBoard
                tasks={sortedTasks}
                canDrag={canDrag}
                canManageTasks={canManageTasks}
                canReview={canReview}
                onDropTask={handleDropTask}
                onOpenTask={setSelectedTask}
                onEditTask={openEditModal}
                onDeleteTask={handleDeleteTask}
                onApproveTask={handleApproveTask}
                onReturnTask={handleReturnTask}
              />
            </section>

            <aside className="workspace-sidebar">
              <ProgressBlock progress={sidebarProgress} title={sidebarProgressTitle} />
              <TeamMembers
                members={projectMembers}
                currentUserId={currentUser.id}
                canAssignLead={canAssignLead}
                canManageRoles={canManageRoles}
                canAddParticipant={canAddParticipant}
                addableUsers={addableUsers}
                onAssignLead={handleAssignLead}
                onAssignSpecialty={handleAssignSpecialty}
                onAddParticipant={handleAddParticipant}
              />
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
          canManageTasks={canManageTasks}
          canReview={canReview}
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
          authorName={currentUser.name}
          onClose={() => setCommentsTask(null)}
        />
      )}

      {isDashboardOpen && (
        <DashboardModal
          tasks={tasks}
          members={projectMembers}
          projectTitle={displayedProjectTitle}
          onClose={() => setIsDashboardOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
