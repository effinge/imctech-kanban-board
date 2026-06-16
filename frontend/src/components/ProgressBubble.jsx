function ProgressBubble({ percent }) {
  return (
    <div className="progress-bubble" title={`Прогресс проекта: ${percent}%`}>
      <div className="progress-bubble-track">
        <div className="progress-bubble-fill" style={{ width: `${percent}%` }}></div>
      </div>
      <span className="progress-bubble-value">{percent}%</span>
    </div>
  );
}

export default ProgressBubble;
