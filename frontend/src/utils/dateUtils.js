/**
 * Utility functions for date formatting in IST (Indian Standard Time, UTC+5:30)
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // 5 hours 30 minutes in milliseconds

/**
 * Get IST date components from a UTC date
 * @param {string|Date} date - Date string (ISO format) or Date object
 * @returns {Object|null} Object with IST date components or null if invalid
 */
const getISTComponents = (date) => {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return null;
  
  // Get UTC time in milliseconds
  const utcTime = dateObj.getTime();
  
  // Add IST offset to get IST time
  const istTime = utcTime + IST_OFFSET_MS;
  const istDate = new Date(istTime);
  
  // Use UTC methods since we've already adjusted the time
  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth() + 1,
    day: istDate.getUTCDate(),
    hours: istDate.getUTCHours(),
    minutes: istDate.getUTCMinutes(),
    seconds: istDate.getUTCSeconds()
  };
};

/**
 * Format date to IST date string (DD/MM/YYYY)
 * @param {string|Date} date - Date string (ISO format) or Date object
 * @returns {string} Formatted date string or 'N/A' if invalid
 */
export const formatDateIST = (date) => {
  const components = getISTComponents(date);
  if (!components) return 'N/A';
  
  const day = String(components.day).padStart(2, '0');
  const month = String(components.month).padStart(2, '0');
  const year = components.year;
  
  return `${day}/${month}/${year}`;
};

/**
 * Format date and time to IST string (DD/MM/YYYY HH:MM)
 * @param {string|Date} date - Date string (ISO format) or Date object
 * @returns {string} Formatted date-time string or 'N/A' if invalid
 */
export const formatDateTimeIST = (date) => {
  const components = getISTComponents(date);
  if (!components) return 'N/A';
  
  const day = String(components.day).padStart(2, '0');
  const month = String(components.month).padStart(2, '0');
  const year = components.year;
  const hours = String(components.hours).padStart(2, '0');
  const minutes = String(components.minutes).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Format date and time to IST string with seconds (DD/MM/YYYY HH:MM:SS)
 * @param {string|Date} date - Date string (ISO format) or Date object
 * @returns {string} Formatted date-time string or 'N/A' if invalid
 */
export const formatDateTimeFullIST = (date) => {
  const components = getISTComponents(date);
  if (!components) return 'N/A';
  
  const day = String(components.day).padStart(2, '0');
  const month = String(components.month).padStart(2, '0');
  const year = components.year;
  const hours = String(components.hours).padStart(2, '0');
  const minutes = String(components.minutes).padStart(2, '0');
  const seconds = String(components.seconds).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
};

/**
 * Convert date to ISO string for datetime-local input (in IST)
 * @param {string|Date} date - Date string (ISO format) or Date object
 * @returns {string} ISO string formatted for datetime-local input (YYYY-MM-DDTHH:mm)
 */
export const toISTDateTimeLocal = (date) => {
  const components = getISTComponents(date);
  if (!components) return '';
  
  const year = components.year;
  const month = String(components.month).padStart(2, '0');
  const day = String(components.day).padStart(2, '0');
  const hours = String(components.hours).padStart(2, '0');
  const minutes = String(components.minutes).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

/**
 * Convert date to ISO string for date input (in IST)
 * @param {string|Date} date - Date string (ISO format) or Date object
 * @returns {string} ISO string formatted for date input (YYYY-MM-DD)
 */
export const toISTDateLocal = (date) => {
  const components = getISTComponents(date);
  if (!components) return '';
  
  const year = components.year;
  const month = String(components.month).padStart(2, '0');
  const day = String(components.day).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Convert datetime-local input value to ISO string (treating input as IST)
 * @param {string} dateTimeLocal - datetime-local input value (YYYY-MM-DDTHH:mm)
 * @returns {string} ISO string in UTC
 */
export const fromISTDateTimeLocal = (dateTimeLocal) => {
  if (!dateTimeLocal) return null;
  
  // Parse the datetime-local value as IST
  const [datePart, timePart] = dateTimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = (timePart || '00:00').split(':').map(Number);
  
  // Create UTC date representing the IST time
  // We need to subtract IST offset to get the correct UTC time
  const istDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const utcTime = istDate.getTime() - IST_OFFSET_MS;
  
  return new Date(utcTime).toISOString();
};

/**
 * Convert date input value to ISO string (treating input as IST)
 * @param {string} dateLocal - date input value (YYYY-MM-DD)
 * @returns {string} ISO string in UTC
 */
export const fromISTDateLocal = (dateLocal) => {
  if (!dateLocal) return null;
  
  // Parse the date value as IST (midnight IST)
  const [year, month, day] = dateLocal.split('-').map(Number);
  
  // Create UTC date representing midnight IST
  const istDate = new Date(Date.UTC(year, month - 1, day, 0, 0));
  const utcTime = istDate.getTime() - IST_OFFSET_MS;
  
  return new Date(utcTime).toISOString();
};

/**
 * Get current date/time in IST as ISO string
 * @returns {string} Current date/time in IST as ISO string (stored as UTC)
 */
export const getCurrentISTISO = () => {
  const now = new Date();
  // Get current IST time
  const istTime = now.getTime() + IST_OFFSET_MS;
  // Convert back to UTC for storage (subtract offset)
  const utcTimeForStorage = istTime - IST_OFFSET_MS;
  return new Date(utcTimeForStorage).toISOString();
};
