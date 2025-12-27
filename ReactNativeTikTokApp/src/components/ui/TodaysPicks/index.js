import React, { memo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Dimensions,
  useColorScheme,
} from 'react-native'
import { Image } from 'expo-image'
import { Film, Music } from 'lucide-react-native'
import { getPlayableImageUrl } from '../../../utils/audioUtils'
// Note: Reanimated entering animations removed to fix refresh crash
// import Animated, { FadeInRight } from 'react-native-reanimated'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CARD_WIDTH = 210
const CARD_HEIGHT = 280
const IMAGE_SIZE = 160

/**
 * TodaysPicks - Horizontal carousel of daily recommendations
 *
 * Features:
 * - Blurred background from album art
 * - Circular album artwork
 * - Title and subtitle
 * - (Animation removed to fix refresh crash)
 */
const TodaysPicks = ({ picks = [], onPickPress }) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [failedImages, setFailedImages] = useState({})

  // Handle image load error - track which images failed
  const handleImageError = (itemId) => {
    console.log('[TodaysPicks] Image failed to load for:', itemId)
    setFailedImages(prev => ({ ...prev, [itemId]: true }))
  }

  // Get image URL with fallback for failed images
  const getImageUrl = (item) => {
    const resolvedUrl = getPlayableImageUrl(item)
    if (failedImages[item.id]) {
      // Use picsum fallback if the resolved URL failed
      return `https://picsum.photos/seed/${item.id}/400/400`
    }
    return resolvedUrl
  }

  if (!picks || picks.length === 0) {
    return null
  }

  const styles = getStyles(isDark)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Today's picks for you</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {picks.map((item, index) => {
          // Use centralized image URL resolution with error fallback
          const imageUrl = getImageUrl(item)
          return (
          <View key={`${item.id}-${index}`}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => onPickPress?.(item, index)}
              activeOpacity={0.9}
            >
              {/* Blurred Background - using resolved URL */}
              <ImageBackground
                source={{ uri: imageUrl }}
                style={styles.backgroundImage}
                blurRadius={15}
                resizeMode="cover"
                onError={() => handleImageError(item.id)}
              >
                <View style={styles.overlay} />
              </ImageBackground>

              {/* Content */}
              <View style={styles.content}>
                {/* Circular Image - using expo-image with error handling */}
                <View style={styles.imageContainer}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.circleImage}
                    contentFit="cover"
                    transition={200}
                    onError={() => handleImageError(item.id)}
                  />
                  {/* Music icon overlay - shows on gray background */}
                  <View style={styles.musicIconOverlay}>
                    <Music size={24} color="rgba(255,255,255,0.5)" />
                  </View>
                  {/* Video badge - show if song has a video */}
                  {item.videoUrl && (
                    <View style={styles.videoBadge}>
                      <Film size={14} color="#fff" />
                    </View>
                  )}
                </View>

                {/* Labels */}
                <Text style={styles.label} numberOfLines={1}>
                  {item.label || item.title || 'Unknown'}
                </Text>
                <Text style={styles.subLabel} numberOfLines={1}>
                  {item.subLabel || item.artist || item.description || ''}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )})}
      </ScrollView>
    </View>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    // VStack space="md" equivalent
  },
  title: {
    fontSize: 24, // size="2xl"
    fontWeight: '500', // font-medium
    color: isDark ? '#fafafa' : '#0a0a0a', // text-typography-950
    paddingHorizontal: 16, // px-4
    marginBottom: 12,
  },
  scrollContent: {
    paddingHorizontal: 16, // px-4
    gap: 10, // gap-2.5
  },
  card: {
    width: CARD_WIDTH, // w-[210px]
    height: CARD_HEIGHT, // h-[280px]
    borderRadius: 16, // rounded-2xl
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  imageContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  circleImage: {
    width: IMAGE_SIZE, // h-40 w-40 = 160px
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2, // rounded-full
    backgroundColor: isDark ? '#333333' : '#e0e0e0',
  },
  videoBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(56, 117, 232, 0.9)',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  musicIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: IMAGE_SIZE / 2,
  },
  label: {
    fontSize: 18, // size="lg"
    fontWeight: '500', // font-medium
    color: '#ffffff', // White text on blurred background
    textAlign: 'center',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subLabel: {
    fontSize: 14, // size="sm"
    color: 'rgba(255,255,255,0.8)', // Slightly transparent white
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
})

export default memo(TodaysPicks)
