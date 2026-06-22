function Logo({ height = 34, withText = true }) {
  return (
    <span className="brand-logo" style={{ height }}>
      <svg
        className="brand-logo-mark"
        viewBox="0 0 55 48.61"
        height={height}
        role="img"
        aria-label="IMCTech"
      >
        <path d="M12.54,48.61L32.4,0h7.38L19.92,48.61h-7.38Z" />
        <path d="M13.24,29.37s-7.83-4.99-8.25-5.11c.42-.12,14.21-9.49,14.21-9.49L25.08,.39,0,18.78v11.04l10.05,7.37,3.2-7.82Z" />
        <path d="M42.27,11.42l-3.22,7.87s7.85,4.94,8.27,5.06c-.42,.18-14.21,9.49-14.21,9.49l-5.88,14.38,25.08-18.39v-11.04l-10.05-7.37Z" />
      </svg>
      {withText && <span className="brand-logo-text">IMCTech</span>}
    </span>
  );
}

export default Logo;
