import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { addComment, getComments } from '../api/tasksApi';

const ROLE_NAMES = {
  student: 'Студент',
  mentor: 'Ментор',
};

const IMAGE_MAX_PX = 900;
const IMAGE_QUALITY = 0.82;

const TOOLBAR_ITEMS = [
  { label: 'B',   title: 'Жирный',      wrap: ['**', '**'],       block: false },
  { label: 'I',   title: 'Курсив',       wrap: ['*', '*'],         block: false },
  { label: 'S',   title: 'Зачёркнутый', wrap: ['~~', '~~'],       block: false },
  { label: '`',   title: 'Код (строка)', wrap: ['`', '`'],         block: false },
  { label: '```', title: 'Блок кода',    wrap: ['```\n', '\n```'], block: true  },
  { label: '≡',   title: 'Цитата',       wrap: ['> ', ''],         block: true  },
  { label: '🔗',  title: 'Ссылка',       wrap: ['[', '](url)'],    block: false },
];

function applyWrap(textarea, wrap, block) {
  const { selectionStart: start, selectionEnd: end, value } = textarea;
  const selected = value.slice(start, end) || (block ? 'текст' : 'текст');
  const [before, after] = wrap;
  const inserted = before + selected + after;
  const next = value.slice(0, start) + inserted + value.slice(end);
  const cursor = start + before.length + selected.length + after.length;
  return { next, cursor };
}

function resizeToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > IMAGE_MAX_PX) { h = Math.round(h * IMAGE_MAX_PX / w); w = IMAGE_MAX_PX; }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function formatDateTime(value) {
  const parsed = new Date(`${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(parsed.getTime())) return '';
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
  const [isPreview, setIsPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const listEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const displayName = authorName || ROLE_NAMES[role];

  useEffect(() => {
    let isActive = true;
    getComments(task.id)
      .then((data) => { if (isActive) setComments(data); })
      .catch(() => { if (isActive) setError('Не удалось загрузить комментарии.'); });
    return () => { isActive = false; };
  }, [task.id]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: 'end' });
  }, [comments]);

  function insertMarkdown(snippet) {
    const ta = textareaRef.current;
    if (!ta) { setText((prev) => prev + snippet); return; }
    const { selectionStart: start, selectionEnd: end, value } = ta;
    const next = value.slice(0, start) + snippet + value.slice(end);
    const cursor = start + snippet.length;
    setText(next);
    window.requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  }

  function handleToolbar(item) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { next, cursor } = applyWrap(ta, item.wrap, item.block);
    setText(next);
    window.requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setIsUploading(true);
    setIsPreview(false);
    try {
      const dataUrl = await resizeToDataUrl(file);
      const name = file.name.replace(/\.[^.]+$/, '');
      insertMarkdown(`![${name}](${dataUrl})`);
    } catch {
      setError('Не удалось обработать изображение.');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

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
      setIsPreview(false);
    } catch {
      setError('Не удалось отправить комментарий.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="comments-window">
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
              <div className="comment-body comment-markdown">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {comment.text}
                </ReactMarkdown>
              </div>
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

          <div className="comment-editor">
            <div className="editor-tabs">
              <button
                type="button"
                className={`editor-tab${!isPreview ? ' active' : ''}`}
                onClick={() => setIsPreview(false)}
              >
                Написать
              </button>
              <button
                type="button"
                className={`editor-tab${isPreview ? ' active' : ''}`}
                onClick={() => setIsPreview(true)}
              >
                Предпросмотр
              </button>

              <div className="editor-toolbar">
                {TOOLBAR_ITEMS.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    title={item.title}
                    className="toolbar-btn"
                    onClick={() => { setIsPreview(false); handleToolbar(item); }}
                  >
                    {item.label}
                  </button>
                ))}

                <button
                  type="button"
                  title="Вставить изображение с устройства"
                  className="toolbar-btn"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? '⏳' : '🖼'}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
            </div>

            {isPreview ? (
              <div className="editor-preview comment-markdown">
                {text.trim()
                  ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                  : <p className="muted-text">Ничего нет — напишите что-нибудь.</p>}
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder=""
                maxLength={100000}
              />
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Закрыть
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={!text.trim() || isSending || isUploading}
            >
              Отправить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CommentsModal;
