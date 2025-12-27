import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Share,
  TextInput,
} from 'react-native'
import { subscribeLogs, getLogs, clearLogs, LogLevel } from '../../services/debugLogService'

const levelColors = {
  [LogLevel.INFO]: '#3B82F6',    // Blue
  [LogLevel.WARN]: '#F59E0B',    // Orange
  [LogLevel.ERROR]: '#EF4444',   // Red
  [LogLevel.SUCCESS]: '#10B981', // Green
}

const levelIcons = {
  [LogLevel.INFO]: 'i',
  [LogLevel.WARN]: '!',
  [LogLevel.ERROR]: 'X',
  [LogLevel.SUCCESS]: '✓',
}

const LogItem = ({ item, onPress }) => {
  const [expanded, setExpanded] = useState(false)
  const color = levelColors[item.level] || '#666'

  const time = new Date(item.timestamp).toLocaleTimeString()

  return (
    <TouchableOpacity
      style={styles.logItem}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.logHeader}>
        <View style={[styles.levelBadge, { backgroundColor: color }]}>
          <Text style={styles.levelIcon}>{levelIcons[item.level]}</Text>
        </View>
        <Text style={styles.logTime}>{time}</Text>
        <Text style={styles.logMessage} numberOfLines={expanded ? undefined : 2}>
          {item.message}
        </Text>
      </View>
      {expanded && item.data && (
        <View style={styles.dataContainer}>
          <Text style={styles.dataText}>{item.data}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const DebugLogsScreen = ({ navigation }) => {
  const [logs, setLogs] = useState(getLogs())
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const unsubscribe = subscribeLogs(setLogs)
    return unsubscribe
  }, [])

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return logs
    const query = searchQuery.toLowerCase()
    return logs.filter(log =>
      log.message.toLowerCase().includes(query) ||
      log.level.toLowerCase().includes(query) ||
      (log.data && log.data.toLowerCase().includes(query))
    )
  }, [logs, searchQuery])

  const handleClear = useCallback(() => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: clearLogs },
      ]
    )
  }, [])

  const handleShare = useCallback(async () => {
    const logText = logs.map(log =>
      `[${log.level.toUpperCase()}] ${log.timestamp}\n${log.message}${log.data ? '\n' + log.data : ''}`
    ).join('\n\n---\n\n')

    try {
      await Share.share({
        message: logText,
        title: 'Debug Logs',
      })
    } catch (error) {
      console.error('Error sharing logs:', error)
    }
  }, [logs])

  const renderItem = useCallback(({ item }) => (
    <LogItem item={item} />
  ), [])

  const keyExtractor = useCallback((item) => item.id, [])

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Debug Logs</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.actionButton}>
            <Text style={[styles.actionText, { color: '#EF4444' }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search logs..."
          placeholderTextColor="#666"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.legend}>
        {Object.entries(levelColors).map(([level, color]) => (
          <View key={level} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{level}</Text>
          </View>
        ))}
        {searchQuery && (
          <Text style={styles.resultCount}>
            {filteredLogs.length} result{filteredLogs.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {filteredLogs.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No matching logs' : 'No logs yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery
              ? `No logs match "${searchQuery}"`
              : 'Logs will appear here when you create songs, enable auto-share, etc.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backText: {
    color: '#3B82F6',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingLeft: 12,
  },
  actionText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
  },
  clearSearchButton: {
    marginLeft: 8,
    padding: 8,
  },
  clearSearchText: {
    color: '#666',
    fontSize: 16,
  },
  resultCount: {
    color: '#888',
    fontSize: 12,
    marginLeft: 8,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#888',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  list: {
    padding: 12,
  },
  logItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  levelBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  logTime: {
    color: '#666',
    fontSize: 12,
    minWidth: 70,
  },
  logMessage: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  dataContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#0d0d0d',
    borderRadius: 4,
  },
  dataText: {
    color: '#888',
    fontSize: 12,
    fontFamily: 'Menlo',
  },
  separator: {
    height: 8,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#444',
    fontSize: 14,
    textAlign: 'center',
  },
})

export default DebugLogsScreen
