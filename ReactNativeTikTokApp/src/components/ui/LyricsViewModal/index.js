import React, { useState } from 'react'
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Pressable,
  useColorScheme,
  StyleSheet,
} from 'react-native'
import { X, Copy, CheckCircle } from 'lucide-react-native'
import * as Clipboard from 'expo-clipboard'

/**
 * Reusable Lyrics View Modal
 *
 * @param {boolean} visible - Whether the modal is visible
 * @param {function} onClose - Callback when modal is closed
 * @param {string} title - Song title to display
 * @param {string} rawLyrics - Plain text lyrics
 * @param {Array} timestampedLyrics - Array of {text, startTime, endTime} for karaoke
 * @param {number} currentPosition - Current playback position in ms (for karaoke highlighting)
 */
export default function LyricsViewModal({
  visible,
  onClose,
  title = 'Unknown Track',
  rawLyrics,
  timestampedLyrics,
  currentPosition = 0,
}) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  const [lyricsTab, setLyricsTab] = useState('raw')
  const [copied, setCopied] = useState(false)

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

  const renderKaraokeLyrics = () => {
    if (!hasTimestampedLyrics) {
      return (
        <Text style={styles.lyricsText}>
          Timestamped lyrics not available for this track.
        </Text>
      )
    }

    return timestampedLyrics.map((line, index) => {
      const lineStartMs = (line.startTime || 0) * 1000
      const lineEndMs = (line.endTime || 0) * 1000
      const lineDuration = lineEndMs - lineStartMs
      const isActive = currentPosition >= lineStartMs && currentPosition < lineEndMs
      const isPast = currentPosition >= lineEndMs

      // Split line into words for karaoke-style highlighting
      const words = (line.text || '').split(/(\s+)/)
      const wordCount = words.filter(w => w.trim()).length

      // Calculate progress within the line (0 to 1)
      const lineProgress = isActive
        ? Math.min(1, Math.max(0, (currentPosition - lineStartMs) / lineDuration))
        : isPast ? 1 : 0

      // Calculate which word index we're currently on
      const currentWordIndex = Math.floor(lineProgress * wordCount)

      let actualWordIndex = 0

      return (
        <Text
          key={index}
          style={[
            styles.timestampedLine,
            isActive && styles.timestampedLineActive
          ]}
        >
          {words.map((word, wordIdx) => {
            if (!word.trim()) {
              return <Text key={wordIdx}>{word}</Text>
            }

            const thisWordIndex = actualWordIndex
            actualWordIndex++

            const isWordSung = isPast || (isActive && thisWordIndex < currentWordIndex)
            const isCurrentWord = isActive && thisWordIndex === currentWordIndex

            return (
              <Text
                key={wordIdx}
                style={[
                  isWordSung && styles.karaokeWordSung,
                  isCurrentWord && styles.karaokeWordCurrent,
                ]}
              >
                {word}
              </Text>
            )
          })}
        </Text>
      )
    })
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lyrics</Text>
          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <X size={22} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2.5} />
          </Pressable>
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
            >
              <Text style={[styles.tabText, lyricsTab === 'raw' && styles.tabTextActive]}>
                Lyrics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, lyricsTab === 'timestamped' && styles.tabActive]}
              onPress={() => setLyricsTab('timestamped')}
            >
              <Text style={[styles.tabText, lyricsTab === 'timestamped' && styles.tabTextActive]}>
                Karaoke
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lyrics Content */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
          bounces={true}
        >
          {lyricsTab === 'raw' ? (
            <Text style={styles.lyricsText}>{lyricsText}</Text>
          ) : (
            renderKaraokeLyrics()
          )}
        </ScrollView>
      </View>
    </Modal>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#333333' : '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
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
    backgroundColor: '#3875e8',
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
  timestampedLine: {
    fontSize: 18,
    lineHeight: 32,
    color: isDark ? '#888888' : '#aaaaaa',
    textAlign: 'center',
    marginBottom: 8,
  },
  timestampedLineActive: {
    fontSize: 22,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    transform: [{ scale: 1.05 }],
  },
  karaokeWordSung: {
    color: isDark ? '#ffffff' : '#151723',
    fontWeight: '700',
  },
  karaokeWordCurrent: {
    color: '#3875e8',
    fontWeight: '700',
    textShadowColor: 'rgba(56, 117, 232, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
})
