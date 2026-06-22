const API_URL = 'http://localhost:8000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Ошибка запроса к серверу');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function getTasks(projectId) {
  const query = projectId ? `?project_id=${projectId}` : '';
  return request(`/tasks${query}`);
}

export function createTask(task) {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

export function updateTask(id, task) {
  return request(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(task),
  });
}

export function updateTaskStatus(id, status) {
  return request(`/tasks/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function reviewTask(id, action, comment = '') {
  return request(`/tasks/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ action, comment }),
  });
}

export function deleteTask(id) {
  return request(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

export function getMembers() {
  return request('/members');
}

export function getProjects() {
  return request('/projects');
}

export function getUsers() {
  return request('/users');
}

export function getProjectMembers(projectId) {
  return request(`/projects/${projectId}/members`);
}

export function assignLead(projectId, userId) {
  return request(`/projects/${projectId}/lead`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: userId }),
  });
}

export function assignSpecialty(projectId, userId, specialty) {
  return request(`/projects/${projectId}/specialty`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: userId, specialty }),
  });
}

export function addProjectMember(projectId, userId) {
  return request(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export function getComments(taskId) {
  return request(`/tasks/${taskId}/comments`);
}

export function addComment(taskId, comment) {
  return request(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify(comment),
  });
}

export function getTelegramStatus(userId) {
  return request(`/users/${userId}/telegram`);
}

export function confirmTelegram(code, userId) {
  return request('/telegram/confirm', {
    method: 'POST',
    body: JSON.stringify({ code, user_id: userId }),
  });
}

export function unlinkTelegram(userId) {
  return request(`/telegram/link/${userId}`, {
    method: 'DELETE',
  });
}
