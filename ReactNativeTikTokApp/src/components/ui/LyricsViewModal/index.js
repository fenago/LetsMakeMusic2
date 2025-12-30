import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  StyleSheet,
} from 'react-native'
import { X, Copy, CheckCircle } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'
import { usePlaybackPosition } from '../../../contexts/MediaPlayerContext'

/**
 * KaraokeLyrics - Separate component that subscribes directly to position context
 * This ensures real-time updates regardless of parent Modal re-render issues
 *
 * PERFORMANCE OPTIMIZATION: Styles are memoized with useMemo to prevent
 * StyleSheet recreation every 100ms position update
 */
const KaraokeLyrics = ({ timestampedLyrics, isDark, scrollViewRef }) => {
  // Subscribe directly to position from context (isolated from main context)
  const { position } = usePlaybackPosition()
  const lastActiveIndexRef = useRef(-1)
  const linePositionsRef = useRef({})

  // CRITICAL: Memoize styles to prevent StyleSheet recreation every 100ms
  const styles = useMemo(() => createKaraokeStyles(isDark), [isDark])

  // Position is in milliseconds from expo-av
  // Timestamps from Suno are in seconds (startS, endS)
  const positionMs = position || 0

  // Find current active line index for auto-scroll
  const activeLineIndex = timestampedLyrics.findIndex((line) => {
    const lineStartMs = (line.startTime || 0) * 1000
    const lineEndMs = (line.endTime || 0) * 1000
    return positionMs >= lineStartMs && positionMs < lineEndMs
  })

  // Auto-scroll when active line changes
  useEffect(() => {
    if (activeLineIndex !== -1 && activeLineIndex !== lastActiveIndexRef.current && scrollViewRef?.current) {
      const lineY = linePositionsRef.current[activeLineIndex]
      if (typeof lineY === 'number') {
        // Scroll to center the active line (offset by ~200px to center it)
        scrollViewRef.current.scrollTo({ y: Math.max(0, lineY - 200), animated: true })
      }
      lastActiveIndexRef.current = activeLineIndex
    }
  }, [activeLineIndex, scrollViewRef])

  return (
    <View>
      {timestampedLyrics.map((line, index) => {
        // Timestamps are in seconds, convert to ms
        const lineStartMs = (line.startTime || 0) * 1000
        const lineEndMs = (line.endTime || 0) * 1000

        const isActive = positionMs >= lineStartMs && positionMs < lineEndMs
        const isPast = positionMs >= lineEndMs

        return (
          <Text
            key={index}
            onLayout={(event) => {
              linePositionsRef.current[index] = event.nativeEvent.layout.y
            }}
            style={[
              styles.timestampedLine,
              isPast && styles.timestampedLinePast,
              isActive && styles.timestampedLineActive,
            ]}
          >
            {line.text || ''}
          </Text>
        )
      })}
    </View>
  )
}

// Separate style creator for KaraokeLyrics to allow independent memoization
const createKaraokeStyles = (isDark) => StyleSheet.create({
  // Upcoming lyrics - dimmed, waiting to be sung
  timestampedLine: {
    fontSize: 16,
    lineHeight: 28,
    color: isDark ? '#666666' : '#aaaaaa',
    textAlign: 'center',
    marginBottom: 8,
  },
  // Past lyrics - already sung, slightly more visible than upcoming
  timestampedLinePast: {
    color: isDark ? '#999999' : '#888888',
  },
  // Active/current line - highlighted, larger, bold (brand teal color)
  timestampedLineActive: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F979E',
    marginVertical: 8,
  },
})

/**
 * Reusable Lyrics View Modal
 *
 * @param {boolean} visible - Whether the modal is visible
 * @param {function} onClose - Callback when modal is closed
 * @param {string} title - Song title to display
 * @param {string} rawLyrics - Plain text lyrics
 * @param {Array} timestampedLyrics - Array of {text, startTime, endTime} for karaoke
 */
export default function LyricsViewModal({
  visible,
  onClose,
  title = 'Unknown Track',
  rawLyrics,
  timestampedLyrics,
}) {
  // Debug: Log when modal renders and visibility state

  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  // CRITICAL: Memoize styles to prevent recreation on every render
  const styles = useMemo(() => getStyles(isDark), [isDark])

  const [lyricsTab, setLyricsTab] = useState('raw')
  const [copied, setCopied] = useState(false)
  const scrollViewRef = useRef(null)

  const hasTimestampedLyrics = timestampedLyrics &&
    Array.isArray(timestampedLyrics) &&
    timestampedLyrics.length > 0

  const lyricsText = rawLyrics || 'Lyrics not available for this track.'

  const handleCopyLyrics = async () => {
    if (rawLyrics) {
      await Clipboard.setStringAsync(rawLyrics)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Don't render if not visible
  if (!visible) return null

  return (
    <View style={styles.fullScreenOverlay}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Lyrics</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={22} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* Track Name */}
        <Text style={styles.trackName} numberOfLines={1}>
          {title}
        </Text>

        {/* Copy Button */}
        {rawLyrics && (
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyLyrics}>
            {copied ? (
              <>
                <CheckCircle size={16} color="#34C759" strokeWidth={2} />
                <Text style={[styles.copyButtonText, { color: '#34C759' }]}>Copied!</Text>
              </>
            ) : (
              <>
                <Copy size={16} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
                <Text style={styles.copyButtonText}>Copy Lyrics</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Tabs - Only show when we have timestamped lyrics */}
        {hasTimestampedLyrics && (
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, lyricsTab === 'raw' && styles.tabActive]}
              onPress={() => setLyricsTab('raw')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, lyricsTab === 'raw' && styles.tabTextActive]}>
                Lyrics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, lyricsTab === 'timestamped' && styles.tabActive]}
              onPress={() => setLyricsTab('timestamped')}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, lyricsTab === 'timestamped' && styles.tabTextActive]}>
                Karaoke
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lyrics Content */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
        >
          {lyricsTab === 'raw' ? (
            <Text style={styles.lyricsText}>{lyricsText}</Text>
          ) : hasTimestampedLyrics ? (
            <KaraokeLyrics timestampedLyrics={timestampedLyrics} isDark={isDark} scrollViewRef={scrollViewRef} />
          ) : (
            <Text style={styles.lyricsText}>
              Timestamped lyrics not available for this track.
            </Text>
          )}
        </ScrollView>
      </View>
    </View>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  fullScreenOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  container: {
    flex: 1,
    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? '#333333' : '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackName: {
    fontSize: 15,
    fontWeight: '600',
    color: isDark ? '#c5c5c5' : '#7e7e7e',
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  copyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: isDark ? '#2c2c2e' : '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#1F979E',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#c5c5c5' : '#7e7e7e',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: 60,
  },
  lyricsText: {
    fontSize: 18,
    lineHeight: 32,
    color: isDark ? '#ffffff' : '#151723',
    textAlign: 'center',
  },
})
