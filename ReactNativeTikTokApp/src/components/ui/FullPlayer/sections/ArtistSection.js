import React, { memo, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native'
import { ChevronUp, ChevronDown, User } from 'lucide-react-native'

/**
 * ArtistSection - About the artist with own collapsed state
 * Has its own useState to minimize parent re-renders
 */
const ArtistSection = ({
  author,
  artist,
  isDark,
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  const displayName = author?.stageName || artist || author?.firstName || 'Unknown Artist'
  const hasRealName = author?.stageName && author?.firstName

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={toggleExpanded}
      >
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>About the artist</Text>
        {isExpanded ? (
          <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
        ) : (
          <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.artistContainer, isDark && styles.artistContainerDark]}>
          <View style={styles.artistInfo}>
            {author?.profilePictureURL ? (
              <Image source={{ uri: author.profilePictureURL }} style={styles.artistImage} />
            ) : (
              <View style={[styles.artistImage, styles.artistPlaceholder, isDark && styles.artistPlaceholderDark]}>
                <User size={24} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={1.5} />
              </View>
            )}
            <View style={styles.artistDetails}>
              <Text style={[styles.artistName, isDark && styles.artistNameDark]}>
                {displayName}
              </Text>
              {hasRealName && (
                <Text style={[styles.artistRealName, isDark && styles.artistRealNameDark]}>
                  {author.firstName} {author.lastName || ''}
                </Text>
              )}
            </View>
          </View>
          {author?.bio ? (
            <Text style={[styles.artistBio, isDark && styles.artistBioDark]} numberOfLines={4}>
              {author.bio}
            </Text>
          ) : null}
        </View>
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
  artistContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  artistContainerDark: {
    backgroundColor: '#2c2c2e',
  },
  artistInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  artistImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
    marginRight: 12,
  },
  artistPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  artistPlaceholderDark: {
    backgroundColor: '#444444',
  },
  artistDetails: {
    flex: 1,
  },
  artistName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#151723',
    marginBottom: 2,
  },
  artistNameDark: {
    color: '#ffffff',
  },
  artistRealName: {
    fontSize: 13,
    color: '#7e7e7e',
  },
  artistRealNameDark: {
    color: '#c5c5c5',
  },
  artistBio: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
  },
  artistBioDark: {
    color: '#c5c5c5',
  },
})

export default memo(ArtistSection)
