import { useState } from 'react';
import { SPECIALTY_LABELS, SPECIALTY_OPTIONS, SYSTEM_ROLE_LABELS } from '../constants/roles';

function memberRoleText(member) {
  if (member.system_role === 'mentor') {
    return SYSTEM_ROLE_LABELS.mentor;
  }
  return SPECIALTY_LABELS[member.specialty] || 'Без добавочной роли';
}

function TeamMembers({
  members,
  canAssignLead,
  canManageRoles,
  canAddParticipant,
  addableUsers,
  onAssignLead,
  onAssignSpecialty,
  onAddParticipant,
}) {
  const [newUserId, setNewUserId] = useState('');

  function handleAdd() {
    if (!newUserId) {
      return;
    }
    onAddParticipant(Number(newUserId));
    setNewUserId('');
  }

  return (
    <div className="info-card">
      <h3>Участники проекта</h3>
      <div className="members-list">
        {members.length === 0 && (
          <p className="muted-text">В проекте пока нет участников.</p>
        )}

        {members.map((member) => {
          const isStudentMember = member.system_role === 'student';

          return (
            <div className="member-row" key={member.id}>
              <div
                className={
                  member.system_role === 'mentor'
                    ? 'member-avatar member-avatar-mentor'
                    : 'member-avatar'
                }
              >
                {member.name[0]}
              </div>

              <div className="member-info">
                <strong>{member.name}</strong>
                <span>{memberRoleText(member)}</span>

                {canManageRoles && isStudentMember && (
                  <select
                    className="role-select"
                    value={member.specialty || ''}
                    onChange={(event) => onAssignSpecialty(member.user_id, event.target.value)}
                  >
                    {!member.specialty && (
                      <option value="" disabled>
                        Выбрать роль…
                      </option>
                    )}
                    {SPECIALTY_OPTIONS.map((specialty) => (
                      <option key={specialty} value={specialty}>
                        {SPECIALTY_LABELS[specialty]}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {member.is_lead && <span className="lead-badge">Руководитель</span>}

              {canAssignLead && isStudentMember && !member.is_lead && (
                <button
                  className="assign-button"
                  onClick={() => onAssignLead(member.user_id)}
                  title="Назначить руководителем проекта"
                >
                  ↑ Руководитель
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canAddParticipant && addableUsers.length > 0 && (
        <div className="add-member">
          <select value={newUserId} onChange={(event) => setNewUserId(event.target.value)}>
            <option value="">Добавить участника…</option>
            {addableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <button className="secondary-button" onClick={handleAdd} disabled={!newUserId}>
            Добавить
          </button>
        </div>
      )}
    </div>
  );
}

export default TeamMembers;
