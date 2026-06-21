function ProjectSwitcher({ projects, activeProjectId, onChange }) {
  return (
    <div className="project-switcher">
      <span>Проект:</span>
      <select
        value={activeProjectId ?? ''}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ProjectSwitcher;
