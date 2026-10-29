/**
 * Utility functions to force all date calculations to Egypt Time (Africa/Cairo).
 * Uses Intl.DateTimeFormat to automatically handle Egypt's Daylight Saving Time (DST).
 */

function createDateFromCairoParts(date: Date): Date {
  if (!date || isNaN(date.getTime())) return new Date();

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
      hourCycle: 'h23' // Ensures 00-23
    }).formatToParts(date);

    let year=0, month=0, day=0, hour=0, minute=0, second=0;
    for (const part of parts) {
      if (part.type === 'year') year = Number(part.value);
      if (part.type === 'month') month = Number(part.value) - 1; // 0-indexed
      if (part.type === 'day') day = Number(part.value);
      if (part.type === 'hour') hour = Number(part.value);
      if (part.type === 'minute') minute = Number(part.value);
      if (part.type === 'second') second = Number(part.value);
    }

    return new Date(year, month, day, hour, minute, second);
  } catch (err) {
    console.error('Error formatting date for Cairo timezone:', err);
    return new Date();
  }
}

/**
 * Returns a new Date object representing the current time.
 * This Date is manipulated so that standard browser methods (getHours(), getDate()) 
 * will return the values for Egypt time.
 */
export function getEgyptTime(): Date {
  return createDateFromCairoParts(new Date());
}

/**
 * Returns a Date object for the start of the current day (00:00:00) in Egypt Time.
 */
export function getStartOfDayEgypt(): Date {
  const d = getEgyptTime();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns a Date object for the start of a past day in Egypt Time.
 */
export function getStartOfDaysAgoEgypt(days: number): Date {
  const d = getStartOfDayEgypt();
  d.setDate(d.getDate() - days);
  return d;
}

/**
 * Converts any given Date (e.g. from Firestore) to a Date object where 
 * local methods (getHours, etc) reflect Egypt time (with automatic DST handling).
 */
export function toEgyptTime(date: any): Date {
  if (!date) return new Date();
  let d = date;
  if (!(d instanceof Date)) {
    if (d?.toDate && typeof d.toDate === 'function') {
      d = d.toDate();
    } else if (d?.seconds) {
      d = new Date(d.seconds * 1000);
    } else if (typeof d === 'string' || typeof d === 'number') {
      d = new Date(d);
    }
  }
  if (!d || isNaN(d.getTime())) return new Date();
  return createDateFromCairoParts(d);
}
