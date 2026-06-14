function TeamMembers({ members }) {
  return (
    <div className="info-card">
      <h3>Участники команды</h3>
      <div className="members-list">
        {members.map((member) => (
          <div className="member-row" key={member.id}>
            <div className="member-avatar">{member.name[0]}</div>
            <div>
              <strong>{member.name}</strong>
              <span>{member.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamMembers;
