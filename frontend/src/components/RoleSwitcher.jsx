function RoleSwitcher({ role, onRoleChange }) {
  return (
    <div className="role-switcher">
      <span>Роль:</span>
      <button
        className={role === 'student' ? 'role-button active' : 'role-button'}
        onClick={() => onRoleChange('student')}
      >
        Студент
      </button>
      <button
        className={role === 'mentor' ? 'role-button active' : 'role-button'}
        onClick={() => onRoleChange('mentor')}
      >
        Ментор
      </button>
    </div>
  );
}

export default RoleSwitcher;
