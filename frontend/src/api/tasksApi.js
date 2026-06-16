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

export function getTasks() {
  return request('/tasks');
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

export function deleteTask(id) {
  return request(`/tasks/${id}`, {
    method: 'DELETE',
  });
}

export function getMembers() {
  return request('/members');
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
