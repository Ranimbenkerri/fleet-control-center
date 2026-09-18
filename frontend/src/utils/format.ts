/**
 * Dataset timestamps carry no timezone, so they are treated as wall-clock time
 * throughout. Going through `Date` requires local-time formatting on the way
 * back, otherwise `toISOString()` would silently shift by the UTC offset.
 */
export function apiTimestampToDate(apiTimestamp: string): Date {
  return new Date(apiTimestamp.replace(' ', 'T'));
}

export function dateToApiTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** The API speaks "YYYY-MM-DD HH:MM:SS"; `<input type="datetime-local">` wants "YYYY-MM-DDTHH:MM". */
export function apiToInputValue(apiTimestamp: string): string {
  return apiTimestamp.replace(' ', 'T').slice(0, 16);
}

export function inputToApiValue(inputValue: string): string {
  const normalised = inputValue.replace('T', ' ');
  return normalised.length === 16 ? `${normalised}:00` : normalised;
}

export function formatTimestamp(apiTimestamp: string): string {
  const [date, time = ''] = apiTimestamp.split(' ');
  const [year, month, day] = date.split('-');
  return `${day}/${month}/${year} ${time.slice(0, 5)}`;
}

export function formatDateOnly(apiTimestamp: string): string {
  const [year, month, day] = apiTimestamp.split(' ')[0].split('-');
  return `${day}/${month}/${year}`;
}

export function formatNumber(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}

export function formatDuration(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '—';
  const days = Math.floor(hours / 24);
  const remaining = Math.round(hours % 24);
  return days > 0 ? `${days}d ${remaining}h` : `${Math.round(hours)}h`;
}
