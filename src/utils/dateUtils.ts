/**
 * Utility functions for date handling in the application
 * Centralizes date logic to avoid inconsistencies and timezone issues
 */

/**
 * Gets today's date in YYYY-MM-DD format using local timezone
 * This ensures consistency across the application
 */
export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  
  const dateString = `${year}-${month}-${day}`;
  
  console.log('🔍 getTodayDateString called:', {
    timestamp: new Date().toISOString(),
    localDate: today.toString(),
    resultString: dateString,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  
  return dateString;
};

/**
 * Validates if a date string is in the past compared to today
 * @param dateString Date in YYYY-MM-DD format
 * @returns true if the date is in the past
 */
export const isDateInPast = (dateString: string): boolean => {
  const today = getTodayDateString();
  const isPast = dateString < today;
  
  console.log('🔍 isDateInPast validation:', {
    inputDate: dateString,
    todayDate: today,
    isPast,
    comparison: `${dateString} < ${today} = ${isPast}`
  });
  
  return isPast;
};

/**
 * Normalizes a date string by removing time part if present
 * Ensures local date interpretation to avoid timezone issues
 * @param dateString Date string that may include time
 * @returns Date string in YYYY-MM-DD format
 */
export const normalizeDateString = (dateString: string): string => {
  if (!dateString) return '';
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // For date objects or ISO strings, ensure local interpretation
  const date = new Date(dateString + 'T12:00:00'); // Force noon to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const normalized = `${year}-${month}-${day}`;
  
  console.log('🔍 normalizeDateString:', {
    input: dateString,
    output: normalized,
    parsedDate: date.toString()
  });
  
  return normalized;
};

/**
 * Safely formats a date string without timezone conversion
 * @param dateString Date in YYYY-MM-DD format
 * @returns Formatted date string in DD/MM/YYYY format
 */
export const formatDateSafe = (dateString: string): string => {
  if (!dateString) return '';
  
  // Split the date string to avoid timezone conversion
  const [year, month, day] = dateString.split('-');
  
  if (!year || !month || !day) return dateString;
  
  // Create date parts without timezone conversion - ensure proper padding
  const formattedDate = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  
  return formattedDate;
};

/**
 * Converts time from 24-hour format to 12-hour format with AM/PM
 * @param time24 Time in HH:MM or HH:MM:SS format (24 hours)
 * @returns Time in 12-hour format with AM/PM (e.g., "02:30 PM")
 */
export const formatTimeTo12Hour = (time24: string | null | undefined): string => {
  if (!time24) return '-';
  
  // Extract just the time part (remove milliseconds if present)
  const timeMatch = time24.match(/^(\d{2}):(\d{2})/);
  if (!timeMatch) return time24;
  
  const [, hourStr, minuteStr] = timeMatch;
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr;
  
  // Convert to 12-hour format
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${hour12}:${minute} ${period}`;
};

/**
 * Rounds time UP to the nearest 15-minute interval
 * @param date Optional date to round, defaults to now
 * @returns Time string in HH:MM format rounded to next 15-minute interval
 */
export const roundToNext15Minutes = (date?: Date): string => {
  const now = date || new Date();
  const minutes = now.getMinutes();
  const hours = now.getHours();
  
  // Calculate minutes to add to reach next 15-minute interval
  const remainder = minutes % 15;
  const minutesToAdd = remainder === 0 ? 15 : 15 - remainder;
  
  // Add minutes
  now.setMinutes(minutes + minutesToAdd);
  now.setSeconds(0);
  now.setMilliseconds(0);
  
  const finalHours = now.getHours();
  const finalMinutes = now.getMinutes();
  
  return `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
};

/**
 * Adds minutes to a time string
 * @param timeString Time in HH:MM format
 * @param minutesToAdd Number of minutes to add
 * @returns New time string in HH:MM format
 */
export const addMinutesToTime = (timeString: string, minutesToAdd: number): string => {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setMinutes(date.getMinutes() + minutesToAdd);
  
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/**
 * Calculates duration between two dates and times
 * @param startDate Start date in YYYY-MM-DD format
 * @param startTime Start time in HH:MM format
 * @param endDate End date in YYYY-MM-DD format
 * @param endTime End time in HH:MM format
 * @returns Object with days, hours, and minutes
 */
export const calculateDuration = (
  startDate: string,
  startTime: string,
  endDate: string,
  endTime: string
): { days: number; hours: number; minutes: number; totalMinutes: number } => {
  const start = new Date(`${startDate}T${startTime}:00`);
  const end = new Date(`${endDate}T${endTime}:00`);
  
  const diffMs = end.getTime() - start.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  
  const days = Math.floor(totalMinutes / (24 * 60));
  const remainingMinutes = totalMinutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  
  return { days, hours, minutes, totalMinutes };
};

/**
 * Formats duration as a readable string
 * @param duration Duration object with days, hours, minutes
 * @returns Formatted string like "2 días, 3 horas, 15 minutos"
 */
export const formatDuration = (duration: { days: number; hours: number; minutes: number }): string => {
  const parts: string[] = [];
  
  if (duration.days > 0) {
    parts.push(`${duration.days} ${duration.days === 1 ? 'día' : 'días'}`);
  }
  if (duration.hours > 0) {
    parts.push(`${duration.hours} ${duration.hours === 1 ? 'hora' : 'horas'}`);
  }
  if (duration.minutes > 0) {
    parts.push(`${duration.minutes} ${duration.minutes === 1 ? 'minuto' : 'minutos'}`);
  }
  
  return parts.length > 0 ? parts.join(', ') : '0 minutos';
};

/**
 * Gets current date and time info for debugging
 */
export const getDateDebugInfo = () => {
  const now = new Date();
  return {
    iso: now.toISOString(),
    local: now.toString(),
    utc: now.toUTCString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: now.getTimezoneOffset(),
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    formatted: getTodayDateString()
  };
};