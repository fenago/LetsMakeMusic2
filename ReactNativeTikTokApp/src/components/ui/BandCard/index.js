import React, { memo, useMemo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Users, Music } from 'lucide-react-native'

// Predefined gradient backgrounds for bands
const BAND_GRADIENTS = [
  ['#7c3aed', '#ec4899'], // Purple to pink
  ['#3b82f6', '#06b6d4'], // Blue to cyan
  ['#f59e0b', '#ef4444'], // Amber to red
  ['#10b981', '#3b82f6'], // Emerald to blue
  ['#8b5cf6', '#06b6d4'], // Violet to cyan
  ['#ec4899', '#f59e0b'], // Pink to amber
]

// Get a consistent gradient based on band ID
const getGradientForBand = (bandId) => {
  if (!bandId) return BAND_GRADIENTS[0]
  const hash = bandId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return BAND_GRADIENTS[hash % BAND_GRADIENTS.length]
}

/**
 * BandCard - Displays a band with members overlay
 *
 * Features:
 * - Band cover image or generated placeholder
 * - Band name
 * - Member count and avatars
 * - Tap to navigate to band detail
 */
const BandCard = ({
  band,
  onPress,
  size = 132,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const styles = getStyles(isDark, size)

  const imageUrl = band.bandImageUrl || band.imageUrl

  // Get consistent gradient colors for this band
  const gradientColors = useMemo(() => getGradientForBand(band.id), [band.id])

  // Get participants (members) - limit to 3 for avatar display
  const members = band.participants || []
  const displayMembers = members.slice(0, 3)
  const memberCount = members.length

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(band)}
      activeOpacity={0.8}
    >
      {/* Band Cover Art */}
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.image} />
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.image, styles.gradientImage]}
        >
          <Music color="rgba(255,255,255,0.3)" size={size * 0.4} />
        </LinearGradient>
      )}

      {/* Member Avatars Overlay */}
      {memberCount > 0 && (
        <View style={styles.membersOverlay}>
          {displayMembers.map((member, index) => (
            <View
              key={member.id || index}
              style={[
                styles.memberAvatar,
                { marginLeft: index === 0 ? 0 : -8 },
                { zIndex: displayMembers.length - index },
              ]}
            >
              {member.profilePictureURL || member.profilePhoto ? (
                <Image
                  source={{ uri: member.profilePictureURL || member.profilePhoto }}
                  style={styles.memberAvatarImage}
                />
              ) : (
                <View style={styles.memberAvatarPlaceholder}>
                  <Text style={styles.memberAvatarText}>
                    {(member.firstName?.[0] || member.username?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {memberCount > 3 && (
            <View style={[styles.memberAvatar, styles.memberCountBadge, { marginLeft: -8 }]}>
              <Text style={styles.memberCountText}>+{memberCount - 3}</Text>
            </View>
          )}
        </View>
      )}

      {/* Band Name */}
      <Text style={styles.name} numberOfLines={1}>
        {band.name || 'Unnamed Band'}
      </Text>

      {/* Member Count */}
      <Text style={styles.memberLabel} numberOfLines={1}>
        {memberCount} {memberCount === 1 ? 'member' : 'members'}
      </Text>
    </TouchableOpacity>
  )
}

const getStyles = (isDark, size) => StyleSheet.create({
  container: {
    width: size,
  },
  image: {
    width: size,
    height: size,
    borderRadius: 8,
    backgroundColor: isDark ? '#333333' : '#e0e0e0',
  },
  gradientImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  membersOverlay: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: size * 0.35,
    left: 6,
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: isDark ? '#1a1a1a' : '#ffffff',
    backgroundColor: isDark ? '#444444' : '#cccccc',
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },
  memberAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDark ? '#555555' : '#aaaaaa',
  },
  memberAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  memberCountBadge: {
    backgroundColor: isDark ? '#7c3aed' : '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberCountText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#ffffff',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: isDark ? '#e5e5e5' : '#262626',
    marginTop: 10,
  },
  memberLabel: {
    fontSize: 13,
    color: isDark ? '#666666' : '#999999',
    marginTop: 2,
  },
})

export default memo(BandCard)
