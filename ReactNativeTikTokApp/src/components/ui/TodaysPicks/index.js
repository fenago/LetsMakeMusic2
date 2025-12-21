import React, { memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Dimensions,
  useColorScheme,
} from 'react-native'
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
        {picks.map((item, index) => (
          <View key={item.id ?? index}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => onPickPress?.(item, index)}
              activeOpacity={0.9}
            >
              {/* Blurred Background */}
              <ImageBackground
                source={{ uri: item.imageUrl || item.thumbnailUrl }}
                style={styles.backgroundImage}
                blurRadius={15}
                resizeMode="cover"
              >
                <View style={styles.overlay} />
              </ImageBackground>

              {/* Content */}
              <View style={styles.content}>
                {/* Circular Image */}
                <View style={styles.imageContainer}>
                  {item.imageUrl || item.thumbnailUrl ? (
                    <Image
                      source={{ uri: item.imageUrl || item.thumbnailUrl }}
                      style={styles.circleImage}
                    />
                  ) : (
                    <View style={[styles.circleImage, styles.placeholderImage]}>
                      <Text style={styles.placeholderIcon}>🎵</Text>
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
        ))}
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
  },
  circleImage: {
    width: IMAGE_SIZE, // h-40 w-40 = 160px
    height: IMAGE_SIZE,
    borderRadius: IMAGE_SIZE / 2, // rounded-full
    backgroundColor: isDark ? '#333333' : '#e0e0e0',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 60,
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
