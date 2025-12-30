import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  NativeModules,
  Platform,
  Alert,
} from 'react-native'
import { X, ChevronDown, ChevronUp, Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

// Global log storage that persists across component remounts
const logStore = {
  logs: [],
  listeners: new Set(),
  maxLogs: 100,

  addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })

    const log = {
      id: Date.now() + Math.random(),
      type,
      message: typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message),
      timestamp
    }

    this.logs = [log, ...this.logs].slice(0, this.maxLogs)
    this.listeners.forEach(listener => listener(this.logs))
  },

  clear() {
    this.logs = []
    this.listeners.forEach(listener => listener(this.logs))
  },

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}

// DISABLED: Console interception was causing performance issues
// To manually log to the debug overlay, use: logStore.addLog('log', 'message')
// Uncomment below to re-enable console capture (may cause lag)
/*
if (__DEV__) {
  const originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
  }

  let lastLogTime = 0
  const LOG_THROTTLE_MS = 100

  const throttledAddLog = (type, message) => {
    const now = Date.now()
    if (now - lastLogTime >= LOG_THROTTLE_MS) {
      lastLogTime = now
      logStore.addLog(type, message)
    }
  }

  console.log = (...args) => {
    originalConsole.log(...args)
    throttledAddLog('log', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
  }

  console.warn = (...args) => {
    originalConsole.warn(...args)
    throttledAddLog('warn', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
  }

  console.error = (...args) => {
    originalConsole.error(...args)
    throttledAddLog('error', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
  }

  console.info = (...args) => {
    originalConsole.info(...args)
    throttledAddLog('info', args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '))
  }
}
*/

/**
 * DebugOverlay - Shows memory usage, JS heap, and console logs
 * Only visible in __DEV__ mode
 */
const DebugOverlay = ({ visible = true }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [logs, setLogs] = useState(logStore.logs)
  const [position, setPosition] = useState('bottom') // 'top' or 'bottom'
  const [renderCount, setRenderCount] = useState(0)
  const [lastRenderTime, setLastRenderTime] = useState(Date.now())
  const scrollViewRef = useRef(null)
  const renderCountRef = useRef(0)

  const togglePosition = useCallback(() => {
    setPosition(prev => prev === 'bottom' ? 'top' : 'bottom')
  }, [])

  // Subscribe to log updates
  useEffect(() => {
    return logStore.subscribe(setLogs)
  }, [])

  // Track render performance - count renders per second
  useEffect(() => {
    renderCountRef.current++
    const interval = setInterval(() => {
      setRenderCount(renderCountRef.current)
      renderCountRef.current = 0
      setLastRenderTime(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const clearLogs = useCallback(() => {
    logStore.clear()
  }, [])

  const copyLogs = useCallback(async () => {
    if (logs.length === 0) {
      Alert.alert('No logs', 'There are no logs to copy.')
      return
    }
    const logText = logs.map(log =>
      `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`
    ).join('\n')

    await Clipboard.setStringAsync(logText)
    Alert.alert('Copied', `${logs.length} log entries copied to clipboard.`)
  }, [logs])

  if (!__DEV__ || !visible) return null

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return '#ff6b6b'
      case 'warn': return '#feca57'
      case 'info': return '#54a0ff'
      default: return '#ffffff'
    }
  }

  const containerStyle = [
    styles.container,
    position === 'top' ? styles.containerTop : styles.containerBottom,
  ]

  return (
    <View style={containerStyle} pointerEvents="box-none">
      {/* Collapsed bar */}
      <TouchableOpacity
        style={styles.bar}
        onPress={toggleExpanded}
        activeOpacity={0.8}
      >
        <View style={styles.statsRow}>
          <Text style={styles.statText}>R/s: {renderCount}</Text>
          <Text style={styles.statText}>Logs: {logs.length}</Text>
        </View>
        <View style={styles.barButtons}>
          <TouchableOpacity onPress={togglePosition} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            {position === 'bottom' ? (
              <ArrowUp size={14} color="#feca57" />
            ) : (
              <ArrowDown size={14} color="#feca57" />
            )}
          </TouchableOpacity>
          {isExpanded ? (
            <ChevronDown size={16} color="#ffffff" />
          ) : (
            <ChevronUp size={16} color="#ffffff" />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded log view */}
      {isExpanded && (
        <View style={styles.logContainer}>
          <View style={styles.logHeader}>
            <Text style={styles.logTitle}>Console Logs</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={copyLogs} style={styles.headerButton}>
                <Copy size={16} color="#54a0ff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearLogs} style={styles.headerButton}>
                <Trash2 size={16} color="#ff6b6b" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.logScroll}
            showsVerticalScrollIndicator={true}
          >
            {logs.length === 0 ? (
              <Text style={styles.emptyText}>No logs yet</Text>
            ) : (
              logs.map((log) => (
                <View key={log.id} style={styles.logItem}>
                  <Text style={styles.logTimestamp}>{log.timestamp}</Text>
                  <Text style={[styles.logMessage, { color: getLogColor(log.type) }]} numberOfLines={5}>
                    [{log.type.toUpperCase()}] {log.message}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 99999, // Above FullPlayer (which uses 9999)
  },
  containerTop: {
    top: 60, // Below status bar and notch
  },
  containerBottom: {
    bottom: 100, // Above MiniPlayer
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 10,
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  barButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00ff88',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    marginHorizontal: 10,
    marginTop: 4,
    borderRadius: 8,
    maxHeight: 250,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  logTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  logScroll: {
    maxHeight: 200,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 11,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  logItem: {
    marginBottom: 6,
  },
  logTimestamp: {
    fontSize: 9,
    color: '#666666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  logMessage: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
})

export default DebugOverlay
