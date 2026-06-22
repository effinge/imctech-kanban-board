import { useMemo } from 'react';

const STATUSES = ['backlog', 'todo', 'in_progress', 'review', 'done'];

const STATUS_LABELS = {
  backlog: 'Бэклог',
  todo: 'К выполнению',
  in_progress: 'В процессе',
  review: 'На проверке',
  done: 'Выполнено',
};

const STATUS_COLORS = {
  backlog: '#4a4b55',
  todo: '#5e5afe',
  in_progress: '#cfa425',
  review: '#4f9dff',
  done: '#20a56e',
};

const PRIORITY_COLORS = {
  high: '#c05555',
  medium: '#c09030',
  low: '#5a8c3a',
};

const PRIORITY_LABELS = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

function MiniBar({ percent, color }) {
  return (
    <div style={{ height: 6, borderRadius: 99, background: '#2b2c30', overflow: 'hidden', width: '100%', minWidth: 50 }}>
      <div
        style={{
          height: '100%',
          width: `${percent}%`,
          background: color,
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }}
      />
    </div>
  );
}

function DashboardModal({ tasks, members, projectTitle, onClose }) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const byStatus = Object.fromEntries(STATUSES.map(s => [s, 0]));
    tasks.forEach(t => { if (t.status in byStatus) byStatus[t.status]++; });

    const byPriority = { high: 0, medium: 0, low: 0 };
    tasks.forEach(t => { if (t.priority in byPriority) byPriority[t.priority]++; });

    const overdue = tasks.filter(t =>
      t.deadline &&
      t.status !== 'done' &&
      new Date(t.deadline) < now
    ).length;

    const done = byStatus.done;
    const completionPercent = total === 0 ? 0 : Math.round((done / total) * 100);

    const studentMembers = members.filter(m => m.system_role === 'student');
    const memberStats = studentMembers.map(member => {
      const memberByStatus = Object.fromEntries(STATUSES.map(s => [s, 0]));
      tasks.filter(t => t.assignee === member.name)
        .forEach(t => { if (t.status in memberByStatus) memberByStatus[t.status]++; });
      const memberDone = memberByStatus.done;
      const memberTotal = Object.values(memberByStatus).reduce((a, b) => a + b, 0);
      return {
        ...member,
        byStatus: memberByStatus,
        total: memberTotal,
        done: memberDone,
        percent: memberTotal === 0 ? 0 : Math.round((memberDone / memberTotal) * 100),
      };
    });

    const unassigned = tasks.filter(t => !t.assignee).length;

    return { total, done, completionPercent, byStatus, byPriority, overdue, memberStats, unassigned };
  }, [tasks, members]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-window dashboard-window" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Дашборд · {projectTitle}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="dash-stats-row">
          <div className="dash-stat-card">
            <div className="dash-stat-value">{stats.total}</div>
            <div className="dash-stat-label">Всего задач</div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-value" style={{ color: '#20a56e' }}>{stats.done}</div>
            <div className="dash-stat-label">Выполнено</div>
            <div className="dash-stat-sub">{stats.completionPercent}%</div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-value" style={{ color: '#4f9dff' }}>{stats.byStatus.review}</div>
            <div className="dash-stat-label">На проверке</div>
          </div>
          <div className="dash-stat-card">
            <div className="dash-stat-value" style={{ color: '#cfa425' }}>{stats.byStatus.in_progress}</div>
            <div className="dash-stat-label">В процессе</div>
          </div>
          <div className="dash-stat-card">
            <div
              className="dash-stat-value"
              style={{ color: stats.overdue > 0 ? '#e05555' : '#555560' }}
            >
              {stats.overdue}
            </div>
            <div className="dash-stat-label">Просрочено</div>
          </div>
        </div>

        <div className="dash-two-col">
          <div className="dash-section">
            <div className="dash-section-title">Общий прогресс</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <MiniBar percent={stats.completionPercent} color="#20a56e" />
              </div>
              <span style={{ color: '#20a56e', fontWeight: 800, fontSize: 15, minWidth: 36 }}>
                {stats.completionPercent}%
              </span>
            </div>
            <div className="dash-section-title" style={{ marginBottom: 10 }}>Приоритеты</div>
            <div className="dash-priority-list">
              {['high', 'medium', 'low'].map(p => (
                <div key={p} className="dash-priority-row">
                  <span className="dash-priority-dot" style={{ background: PRIORITY_COLORS[p] }} />
                  <span className="dash-priority-label">{PRIORITY_LABELS[p]}</span>
                  <div style={{ flex: 1 }}>
                    <MiniBar
                      percent={stats.total ? (stats.byPriority[p] / stats.total) * 100 : 0}
                      color={PRIORITY_COLORS[p]}
                    />
                  </div>
                  <span className="dash-priority-count">{stats.byPriority[p]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="dash-section">
            <div className="dash-section-title">Статусы задач</div>
            {stats.total > 0 ? (
              <>
                <div className="dash-stacked-bar">
                  {STATUSES.map(s => {
                    const pct = (stats.byStatus[s] / stats.total) * 100;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={s}
                        className="dash-stacked-segment"
                        style={{ width: `${pct}%`, background: STATUS_COLORS[s] }}
                        title={`${STATUS_LABELS[s]}: ${stats.byStatus[s]} (${Math.round(pct)}%)`}
                      />
                    );
                  })}
                </div>
                <div className="dash-status-legend">
                  {STATUSES.map(s => stats.byStatus[s] > 0 && (
                    <div key={s} className="dash-legend-item">
                      <span className="dash-legend-dot" style={{ background: STATUS_COLORS[s] }} />
                      <span>{STATUS_LABELS[s]}</span>
                      <span className="dash-legend-count">{stats.byStatus[s]}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="dash-empty">Задач в проекте нет</div>
            )}
          </div>
        </div>

        <div className="dash-section">
          <div className="dash-section-title">
            Статистика по участникам
            {stats.unassigned > 0 && (
              <span className="dash-unassigned-note"> · {stats.unassigned} без исполнителя</span>
            )}
          </div>
          {stats.memberStats.length === 0 ? (
            <div className="dash-empty">Студентов в проекте нет</div>
          ) : (
            <div className="dash-member-table">
              <div className="dash-member-header">
                <div>Участник</div>
                {STATUSES.map(s => (
                  <div key={s} className="dash-cell-center" title={STATUS_LABELS[s]}>
                    <span className="dash-header-dot" style={{ background: STATUS_COLORS[s] }} />
                    {STATUS_LABELS[s]}
                  </div>
                ))}
                <div className="dash-cell-center">Итого</div>
                <div className="dash-cell-center">Готово</div>
              </div>
              {stats.memberStats.map(m => (
                <div key={m.user_id} className="dash-member-row">
                  <div className="dash-member-name">
                    <div
                      className="member-avatar"
                      style={{ width: 26, height: 26, fontSize: 11, flexShrink: 0 }}
                    >
                      {m.name[0].toUpperCase()}
                    </div>
                    <span>{m.name}</span>
                    {m.is_lead && <span className="dash-lead-badge">РП</span>}
                  </div>
                  {STATUSES.map(s => (
                    <div key={s} className="dash-cell-center">
                      {m.byStatus[s] > 0 ? (
                        <span
                          className="dash-count-badge"
                          style={{
                            background: STATUS_COLORS[s] + '28',
                            color: STATUS_COLORS[s],
                            border: `1px solid ${STATUS_COLORS[s]}55`,
                          }}
                        >
                          {m.byStatus[s]}
                        </span>
                      ) : (
                        <span className="dash-count-zero">—</span>
                      )}
                    </div>
                  ))}
                  <div className="dash-cell-center">
                    <strong style={{ color: '#e0e0e0' }}>{m.total}</strong>
                  </div>
                  <div className="dash-cell-progress">
                    <MiniBar percent={m.percent} color="#20a56e" />
                    <span style={{ fontSize: 11, color: '#a0a0aa', whiteSpace: 'nowrap' }}>
                      {m.percent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardModal;
