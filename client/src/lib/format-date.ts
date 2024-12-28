import {
  formatDistanceToNow,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  format,
  isAfter,
  isFuture,
  differenceInYears
} from 'date-fns';

export function formatRelativeDate(date: Date | string | number) {
  const parsedDate = new Date(date);
  const now = new Date();

  // Handle future dates
  if (isFuture(parsedDate)) {
    const daysInFuture = differenceInDays(parsedDate, now);
    if (daysInFuture > 30) {
      return format(parsedDate, 'dd/MM/yy');
    }
    const hoursInFuture = differenceInHours(parsedDate, now);
    return hoursInFuture < 24 
      ? `In ${hoursInFuture} ${hoursInFuture === 1 ? 'hour' : 'hours'}`
      : `In ${daysInFuture} ${daysInFuture === 1 ? 'day' : 'days'}`;
  }

  // Handle past dates
  const secondsAgo = differenceInSeconds(now, parsedDate);
  const minutesAgo = differenceInMinutes(now, parsedDate);
  const hoursAgo = differenceInHours(now, parsedDate);
  const daysAgo = differenceInDays(now, parsedDate);
  const yearsAgo = differenceInYears(now, parsedDate);

  // Over a year ago
  if (yearsAgo >= 1) {
    return format(parsedDate, 'dd/MM/yy');
  }

  // Less than a minute
  if (secondsAgo < 60) {
    return 'Just now';
  }

  // Less than an hour
  if (minutesAgo < 60) {
    return `${minutesAgo} ${minutesAgo === 1 ? 'min' : 'mins'} ago`;
  }

  // Less than a day
  if (hoursAgo < 24) {
    return `${hoursAgo} ${hoursAgo === 1 ? 'hour' : 'hours'} ago`;
  }

  // Less than 30 days
  if (daysAgo <= 30) {
    return `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
  }

  // More than 30 days
  return format(parsedDate, 'dd/MM/yy');
}
