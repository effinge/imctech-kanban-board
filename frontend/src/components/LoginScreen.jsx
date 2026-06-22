import { accountRoleLabel, SYSTEM_ROLE_LABELS } from '../constants/roles';
import Logo from './Logo';

// Экран входа для защиты проекта: вход по выбору демо-аккаунта (без пароля).
function LoginScreen({ users, onLogin, error }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-head">
          <Logo height={38} />
          <h1>Канбан-доски проектов</h1>
          <p>Выберите демо-аккаунт для входа</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="account-grid">
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              className="account-card"
              onClick={() => onLogin(user)}
            >
              <span
                className={
                  user.system_role === 'mentor'
                    ? 'account-avatar account-avatar-mentor'
                    : 'account-avatar'
                }
              >
                {user.name[0]}
              </span>
              <span className="account-info">
                <span className="account-name">{user.name}</span>
                <span className="account-role">{accountRoleLabel(user)}</span>
                <span className="account-sub">{SYSTEM_ROLE_LABELS[user.system_role]}</span>
              </span>
            </button>
          ))}
        </div>

        <p className="login-hint">Демо-режим: вход без пароля для защиты проекта.</p>
      </div>
    </div>
  );
}

export default LoginScreen;
