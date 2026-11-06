import { useEffect, useState } from 'react';

type Preference = 'system' | 'light' | 'dark';
const OPTIONS: { value: Preference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

function stored(): Preference {
  try {
    const t = localStorage.getItem('theme');
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

export function ThemeSwitcher() {
  const [pref, setPref] = useState<Preference>(stored);

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = pref === 'dark' || (pref === 'system' && media.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    };
    apply();
    try {
      localStorage.setItem('theme', pref);
    } catch {}
    if (pref !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [pref]);

  return (
    <div className="theme-switch" role="group" aria-label="Theme">
      {OPTIONS.map((o) => (
        <button key={o.value} aria-pressed={pref === o.value} onClick={() => setPref(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
