import { useEffect, useRef, useState } from 'react';
import { addComment, getComments } from '../api/tasksApi';

const ROLE_NAMES = {
  student: 'Студент',
  mentor: 'Ментор',
};

function formatDateTime(value) {
  // SQLite отдаёт UTC в формате "YYYY-MM-DD HH:MM:SS" — нормализуем в ISO.
  const parsed = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toLocaleString('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CommentsModal({ task, role, authorName, onClose }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const listEndRef = useRef(null);
  const displayName = authorName || ROLE_NAMES[role];

  useEffect(() => {
    let isActive = true;

    getComments(task.id)
      .then((data) => {
        if (isActive) {
          setComments(data);
        }
      })
      .catch(() => {
        if (isActive) {
          setError('Не удалось загрузить комментарии.');
        }
      });

    return () => {
      isActive = false;
    };
  }, [task.id]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' });
  }, [comments]);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) {
      return;
    }

    setIsSending(true);
    try {
      const created = await addComment(task.id, {
        author_role: role,
        author_name: displayName,
        text: trimmed,
      });
      setComments((current) => [...current, created]);
      setText('');
      setError('');
    } catch (currentError) {
      setError('Не удалось отправить комментарий.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="comments-window" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Комментарии</h2>
            <p className="comments-task-title">{task.title}</p>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="comments-list">
          {comments.length === 0 && (
            <p className="muted-text">Пока нет комментариев. Начните обсуждение.</p>
          )}

          {comments.map((comment) => (
            <div key={comment.id} className={`comment comment-${comment.author_role}`}>
              <div className="comment-head">
                <span className="comment-author">{comment.author_name}</span>
                {comment.author_role === 'mentor' && (
                  <span className="mentor-badge">Ментор</span>
                )}
                <span className="comment-time">{formatDateTime(comment.created_at)}</span>
              </div>
              <p className="comment-text">{comment.text}</p>
            </div>
          ))}
          <div ref={listEndRef} />
        </div>

        {error && <div className="error-message">{error}</div>}

        <form className="comment-form" onSubmit={handleSubmit}>
          <div className="comment-form-meta">
            Вы пишете как:{' '}
            <span className={`author-chip author-chip-${role}`}>{displayName}</span>
          </div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Напишите комментарий…"
            maxLength={1000}
          />
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Закрыть
            </button>
            <button type="submit" className="primary-button" disabled={!text.trim() || isSending}>
              Отправить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CommentsModal;
