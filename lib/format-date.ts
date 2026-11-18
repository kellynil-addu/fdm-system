/**
 * One date format for the whole app.
 *
 * `new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' })` was declared
 * independently in seven modules, so "Oct 17, 2026" was a convention nobody
 * could change in one place. Formatting a date is not a decision any single
 * screen gets to make differently from its neighbours.
 *
 * Constructing an `Intl.DateTimeFormat` is not free, so the formatter is built
 * once at module scope and reused. The released tab wants the time of day as
 * well, which is what `DATE_TIME_FORMAT` is for.
 */
export const DATE_FORMAT = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

export const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-PH', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** A calendar date, e.g. "Oct 17, 2026". */
export function formatMediumDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : DATE_FORMAT.format(date);
}

/** A calendar date and the time of day, e.g. "Oct 17, 2026, 3:00 PM". */
export function formatMediumDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : DATE_TIME_FORMAT.format(date);
}
