import { SPECIALTY_LABELS, SYSTEM_ROLE_LABELS } from '../constants/roles';

function memberRoleText(member) {
  if (member.system_role === 'mentor') {
    return SYSTEM_ROLE_LABELS.mentor;
  }
  return SPECIALTY_LABELS[member.specialty] || 'Без добавочной роли';
}

function TeamMembers({ members }) {
  return (
    <div className="info-card">
      <h3>Участники проекта</h3>
      <div className="members-list">
        {members.length === 0 && (
          <p className="muted-text">В проекте пока нет участников.</p>
        )}

        {members.map((member) => (
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
            </div>
            {member.is_lead && <span className="lead-badge">Руководитель</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamMembers;
