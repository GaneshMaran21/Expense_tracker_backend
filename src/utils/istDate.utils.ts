/**
 * IST Date Utility Functions
 * Helper functions for working with IST (Indian Standard Time) dates
 */

// IST offset: UTC+5:30 = 5 hours 30 minutes = 330 minutes
const IST_OFFSET_MINUTES = 330;

/**
 * Convert any date to IST
 */
export function toIST(date: Date | string | null | undefined): Date {
  if (!date) return new Date();
  const utcDate = new Date(date);
  // Add IST offset (5 hours 30 minutes)
  const istDate = new Date(utcDate.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return istDate;
}

/**
 * Convert IST date to UTC
 */
export function toUTC(date: Date | string | null | undefined): Date {
  if (!date) return new Date();
  const istDate = new Date(date);
  // Subtract IST offset to get UTC
  const utcDate = new Date(istDate.getTime() - IST_OFFSET_MINUTES * 60 * 1000);
  return utcDate;
}

/**
 * Get current date/time in IST
 */
export function getCurrentIST(): Date {
  const now = new Date();
  return toIST(now);
}

/**
 * Format date to IST string
 */
export function formatIST(date: Date | string | null | undefined): string {
  if (!date) return '';
  const istDate = toIST(date);
  return istDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

