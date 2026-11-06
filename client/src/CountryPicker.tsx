import { useMemo, useState } from 'react';

export interface CountryOption {
  code: string;
  name: string;
}

/** Regional-indicator emoji for an ISO country code, e.g. "de" -> 🇩🇪. */
export const flag = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

interface Props {
  options: CountryOption[];
  selected: string[];
  onAdd: (code: string) => void;
}

export function CountryPicker({ options, selected, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !selected.includes(o.code) && (!q || o.name.toLowerCase().includes(q) || o.code === q));
  }, [options, selected, query]);

  const choose = (code: string) => {
    onAdd(code);
    setQuery('');
    setActive(0);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter' && matches[active]) {
      e.preventDefault();
      choose(matches[active].code);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="picker-field">
      <span aria-hidden="true">🔍</span>
      <input
        value={query}
        placeholder="Add a country…"
        aria-label="Add a country"
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className="dropdown" role="listbox">
          {matches.length === 0 && <li className="muted">No matching country</li>}
          {matches.slice(0, 60).map((o, i) => (
            <li
              key={o.code}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              // mouseDown fires before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o.code);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="flag">{flag(o.code)}</span>
              {o.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
