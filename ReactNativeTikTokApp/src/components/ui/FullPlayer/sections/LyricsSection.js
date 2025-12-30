import React, { memo, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { ChevronUp, ChevronDown, Mic } from 'lucide-react-native'

const LYRICS_PREVIEW_LINES = 4

/**
 * LyricsSection - Expandable lyrics preview with karaoke button
 * Has its own collapsed state to minimize parent re-renders
 */
const LyricsSection = ({
  rawLyrics,
  timestampedLyrics,
  hasSunoId,
  isFetchingKaraokeLyrics,
  onOpenLyricsModal,
  onFetchKaraokeLyrics,
  isDark,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const hasTimestampedLyrics = timestampedLyrics?.length > 0

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={toggleExpanded}
      >
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Lyrics</Text>
        {isExpanded ? (
          <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
        ) : (
          <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <>
          <TouchableOpacity
            style={[styles.lyricsContainer, isDark && styles.lyricsContainerDark]}
            onPress={onOpenLyricsModal}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.lyricsText, isDark && styles.lyricsTextDark]}
              numberOfLines={LYRICS_PREVIEW_LINES}
            >
              {rawLyrics || "Lyrics not available for this track"}
            </Text>
            <View style={[styles.lyricsExpandButton, isDark && styles.lyricsExpandButtonDark]}>
              <Text style={styles.lyricsExpandText}>Tap to see full lyrics</Text>
            </View>
          </TouchableOpacity>

          {/* Get Karaoke Lyrics button - shows for Suno songs without timestamped lyrics */}
          {hasSunoId && !hasTimestampedLyrics && (
            <TouchableOpacity
              style={[
                styles.karaokeButton,
                isFetchingKaraokeLyrics && styles.karaokeButtonLoading
              ]}
              onPress={onFetchKaraokeLyrics}
              disabled={isFetchingKaraokeLyrics}
              activeOpacity={0.7}
            >
              {isFetchingKaraokeLyrics ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Mic size={18} color="#ffffff" strokeWidth={2} />
              )}
              <Text style={styles.karaokeButtonText}>
                {isFetchingKaraokeLyrics ? 'Fetching...' : 'Get Karaoke Lyrics'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Karaoke mode indicator - shows when timestamped lyrics are available */}
          {hasTimestampedLyrics && (
            <View style={[styles.karaokeReadyBadge, isDark && styles.karaokeReadyBadgeDark]}>
              <Mic size={14} color="#22c55e" strokeWidth={2} />
              <Text style={styles.karaokeReadyText}>Karaoke mode available</Text>
            </View>
          )}
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#151723',
  },
  sectionTitleDark: {
    color: '#ffffff',
  },
  lyricsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  lyricsContainerDark: {
    backgroundColor: '#2c2c2e',
  },
  lyricsText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333333',
  },
  lyricsTextDark: {
    color: '#e0e0e0',
  },
  lyricsExpandButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  lyricsExpandButtonDark: {
    borderTopColor: '#444444',
  },
  lyricsExpandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3875e8',
    textAlign: 'center',
  },
  karaokeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a855f7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  karaokeButtonLoading: {
    opacity: 0.7,
  },
  karaokeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  karaokeReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 6,
  },
  karaokeReadyBadgeDark: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  karaokeReadyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22c55e',
  },
})

export default memo(LyricsSection)
