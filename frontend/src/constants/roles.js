export const SYSTEM_ROLE_LABELS = {
  mentor: 'Ментор',
  student: 'Студент',
};

// Добавочные роли студента внутри проекта.
export const SPECIALTY_LABELS = {
  backend: 'Backend-разработчик',
  frontend: 'Frontend-разработчик',
  designer: 'Дизайнер',
  analyst: 'Аналитик',
};

export const SPECIALTY_OPTIONS = ['backend', 'frontend', 'designer', 'analyst'];

// Подпись роли аккаунта для экрана входа и шапки.
export function accountRoleLabel(user) {
  if (!user) {
    return '';
  }
  if (user.system_role === 'mentor') {
    return SYSTEM_ROLE_LABELS.mentor;
  }
  return SPECIALTY_LABELS[user.specialty] || SYSTEM_ROLE_LABELS.student;
}
