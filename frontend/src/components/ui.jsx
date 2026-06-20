// Small presentational helpers shared across pages.

const STATUS_COLORS = {
  in_progress: 'amber',
  done: 'green',
  blocked: 'red',
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'gray',
  present: 'green',
  wfh: 'indigo',
  leave: 'amber',
  absent: 'gray',
};

export function StatusBadge({ value }) {
  const color = STATUS_COLORS[value] || 'gray';
  const label = String(value || '').replace('_', ' ');
  return <span className={`badge ${color}`}>{label}</span>;
}

export function Stat({ value, label, color }) {
  return (
    <div className="card stat">
      <div className="value" style={color ? { color } : undefined}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export function ErrorText({ error }) {
  if (!error) return null;
  return <div className="error">{error.message || String(error)}</div>;
}
