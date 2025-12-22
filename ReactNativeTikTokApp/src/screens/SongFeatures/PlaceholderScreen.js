import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native'
import { ChevronLeft } from 'lucide-react-native'

/**
 * PlaceholderScreen - Reusable placeholder for features coming soon
 *
 * Props:
 * - navigation: React Navigation prop
 * - title: Screen title
 * - description: Description of what this feature will do
 * - icon: Lucide icon component
 * - iconColor: Color for the icon
 * - song: Optional song data passed from FullPlayer
 */
export default function PlaceholderScreen({
  navigation,
  title,
  description,
  icon: Icon,
  iconColor = '#3875e8',
  song,
}) {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const styles = getStyles(isDark)

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          {Icon && <Icon size={64} color={iconColor} strokeWidth={1.5} />}
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Description */}
        <Text style={styles.description}>{description}</Text>

        {/* Song Info if available */}
        {song && (
          <View style={styles.songInfo}>
            <Text style={styles.songLabel}>Working with:</Text>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title || song.name || 'Unknown Song'}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.artist || song.author?.stageName || 'Unknown Artist'}
            </Text>
          </View>
        )}

        {/* Coming Soon Badge */}
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? '#222222' : '#e5e7eb',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: isDark ? '#a0a0a0' : '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  songInfo: {
    backgroundColor: isDark ? '#1c1c1e' : '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  songLabel: {
    fontSize: 12,
    color: isDark ? '#666666' : '#9ca3af',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#ffffff' : '#151723',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    color: isDark ? '#a0a0a0' : '#6b7280',
  },
  comingSoonBadge: {
    backgroundColor: isDark ? '#2126A2' : '#3875e8',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  comingSoonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
