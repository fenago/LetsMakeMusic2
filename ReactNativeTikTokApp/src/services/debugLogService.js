/**
 * Debug Log Service
 * Stores recent logs in memory for viewing in the app
 */

const MAX_LOGS = 100
let logs = []
let listeners = []

export const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SUCCESS: 'success',
}

/**
 * Add a log entry
 */
export const addLog = (message, level = LogLevel.INFO, data = null) => {
  const entry = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    message,
    level,
    data: data ? JSON.stringify(data, null, 2) : null,
  }

  logs = [entry, ...logs].slice(0, MAX_LOGS)

  // Notify listeners
  listeners.forEach(listener => listener(logs))

  // Also log to console for Metro (if visible)
  const prefix = `[DebugLog][${level.toUpperCase()}]`
  if (level === LogLevel.ERROR) {
    console.error(prefix, message, data || '')
  } else if (level === LogLevel.WARN) {
    console.warn(prefix, message, data || '')
  } else {
    console.log(prefix, message, data || '')
  }

  return entry
}

/**
 * Get all logs
 */
export const getLogs = () => logs

/**
 * Clear all logs
 */
export const clearLogs = () => {
  logs = []
  listeners.forEach(listener => listener(logs))
}

/**
 * Subscribe to log changes
 */
export const subscribeLogs = (listener) => {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

// Convenience methods
export const logInfo = (message, data) => addLog(message, LogLevel.INFO, data)
export const logWarn = (message, data) => addLog(message, LogLevel.WARN, data)
export const logError = (message, data) => addLog(message, LogLevel.ERROR, data)
export const logSuccess = (message, data) => addLog(message, LogLevel.SUCCESS, data)

export default {
  addLog,
  getLogs,
  clearLogs,
  subscribeLogs,
  logInfo,
  logWarn,
  logError,
  logSuccess,
  LogLevel,
}
