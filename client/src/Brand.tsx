import { Link } from 'react-router-dom';

/** Small apple with a bite, used in place of the "o" in "Forbidden". */
function Apple() {
  return (
    <svg className="brand-apple" viewBox="14 6 100 116" aria-hidden="true">
      <defs>
        <mask id="brand-bite">
          <rect width="128" height="128" fill="#fff" />
          <circle cx="108" cy="58" r="13" fill="#000" />
          <circle cx="110" cy="78" r="11" fill="#000" />
          <circle cx="104" cy="68" r="13" fill="#000" />
        </mask>
        <radialGradient id="brand-shine" cx="35%" cy="30%" r="80%">
          <stop offset="0" stop-color="#ff6a5c" />
          <stop offset="1" stop-color="#c8102e" />
        </radialGradient>
      </defs>
      <path
        mask="url(#brand-bite)"
        fill="url(#brand-shine)"
        d="M64 36C50 26 22 32 22 66c0 30 22 52 36 48 4-1 8-1 12 0 14 4 36-18 36-48 0-34-28-40-42-30z"
      />
      <path d="M64 36c0-10 4-18 10-22" fill="none" stroke="#8a5a2b" stroke-width="7" stroke-linecap="round" />
      <path d="M70 24c6-14 22-14 28-10-6 12-20 16-28 10z" fill="#4caf50" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="Forbidden Fruit">
      <span className="wordmark" aria-hidden="true">
        F<Apple />
        rbidden Fruit
      </span>
    </Link>
  );
}
