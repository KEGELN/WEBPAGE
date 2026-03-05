export function parseDateTimeString(value: string): Date | null {
  const input = String(value || '').replace(/\s+/g, ' ').trim();
  if (!input) return null;

  const dateMatch = input.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (dateMatch) {
    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]) - 1;
    const year = Number(dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]);
    const timeMatch = input.match(/(\d{1,2}):(\d{2})/);
    const hour = timeMatch ? Number(timeMatch[1]) : 0;
    const minute = timeMatch ? Number(timeMatch[2]) : 0;
    const parsed = new Date(year, month, day, hour, minute, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(input);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
