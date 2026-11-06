export interface DebugState {
  data?: unknown;
  error?: string;
}

interface Props extends DebugState {
  title: string;
  links?: { label: string; url: string }[];
  onClose: () => void;
}

export function DebugModal({ title, data, error, links, onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header>
          <strong>{title}</strong>
          <button onClick={onClose}>✕</button>
        </header>
        {links && (
          <p className="small">
            {links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noreferrer" style={{ marginRight: 16 }}>
                {l.label} ↗
              </a>
            ))}
          </p>
        )}
        {error ? <p className="error">{error}</p> : data ? <pre>{JSON.stringify(data, null, 2)}</pre> : <p className="muted">Loading…</p>}
      </div>
    </div>
  );
}
