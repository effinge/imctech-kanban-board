import { useEffect, useState } from 'react';
import { confirmTelegram, getTelegramStatus, unlinkTelegram } from '../api/tasksApi';

function TelegramModal({ user, onClose }) {
  const [link, setLink] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getTelegramStatus(user.id)
      .then((data) => active && setLink(data))
      .catch(() => active && setLink(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user.id]);

  async function handleLink() {
    setError('');
    const value = code.trim().toUpperCase();
    if (value.length < 4) {
      setError('Введите код, который выдал бот.');
      return;
    }
    try {
      const data = await confirmTelegram(value, user.id);
      setLink(data);
      setCode('');
    } catch (currentError) {
      setError('Код недействителен или истёк. Получите новый в боте командой /start.');
    }
  }

  async function handleUnlink() {
    setError('');
    try {
      await unlinkTelegram(user.id);
      setLink(null);
    } catch (currentError) {
      setError('Не удалось отвязать Telegram.');
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-window telegram-window"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Telegram</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <p className="muted-text">Загрузка…</p>
        ) : link ? (
          <div className="telegram-form">
            <p className="muted-text">
              Аккаунт привязан к Telegram
              {link.username ? ` (@${link.username})` : ''}.
            </p>
            <p className="muted-text">
              В боте доступны команды: <b>/mytasks</b>, <b>/deadlines</b>, <b>/board</b>.
            </p>
            {error && <div className="error-message">{error}</div>}
            <button className="danger-button" onClick={handleUnlink}>Отвязать</button>
          </div>
        ) : (
          <div className="telegram-form">
            <ol className="telegram-steps">
              <li>Откройте бота в Telegram и отправьте <b>/start</b>.</li>
              <li>Введите ниже код, который он выдаст.</li>
            </ol>
            <input
              className="telegram-code-input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleLink()}
              placeholder="Код из бота"
              maxLength={12}
              autoFocus
            />
            {error && <div className="error-message">{error}</div>}
            <button className="primary-button" onClick={handleLink}>Привязать</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TelegramModal;
