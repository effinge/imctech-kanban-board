function ProgressBlock({ progress, title = 'Прогресс проекта' }) {
  return (
    <div className="info-card">
      <div className="info-card-header">
        <h3>{title}</h3>
        <span>{progress.percent}%</span>
      </div>

      <div className="progress-line">
        <div style={{ width: `${progress.percent}%` }}></div>
      </div>

      <p className="muted-text">
        Выполнено {progress.done} из {progress.total} задач
      </p>
    </div>
  );
}

export default ProgressBlock;
