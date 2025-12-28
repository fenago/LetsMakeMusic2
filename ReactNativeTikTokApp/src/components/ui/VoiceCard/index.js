/**
 * VoiceCard - Component for displaying a Synthetic Singer in the Library
 *
 * Shows voice name, source song thumbnail, usage count, and action menu.
 * Supports both light and dark themes.
 */

import React, { useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native'
import { Mic, MoreVertical, Trash2, Pencil, Music, User } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'

import { useTheme } from '../../../core/dopebase'
import { useCurrentUser } from '../../../core/onboarding'
import { deleteVoice, updateVoice } from '../../../services/artistVoiceService'

/**
 * VoiceCard Component
 *
 * @param {Object} props
 * @param {Object} props.voice - Synthetic Singer object
 * @param {function} props.onDelete - Callback after deletion (for UI refresh)
 * @param {Object} props.style - Additional container styles
 */
export default function VoiceCard({ voice, onDelete, style }) {
  const { theme, appearance } = useTheme()
  const colors = theme.colors[appearance]
  const currentUser = useCurrentUser()
  const navigation = useNavigation()
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Dynamic styles based on theme
  const themedStyles = useMemo(() => ({
    container: {
      backgroundColor: appearance === 'dark' ? '#1a1a1a' : colors.primaryBackground,
      borderColor: appearance === 'dark' ? 'transparent' : colors.hairline,
      borderWidth: appearance === 'dark' ? 0 : 1,
    },
    thumbnailPlaceholder: {
      backgroundColor: appearance === 'dark' ? '#333' : colors.grey3,
    },
    name: {
      color: colors.primaryText,
    },
    sourceSong: {
      color: colors.secondaryText,
    },
    menuDropdown: {
      backgroundColor: appearance === 'dark' ? '#2a2a2a' : colors.primaryBackground,
      borderColor: appearance === 'dark' ? 'transparent' : colors.hairline,
      borderWidth: appearance === 'dark' ? 0 : 1,
    },
    menuItemText: {
      color: colors.primaryText,
    },
    menuItemBorder: {
      borderTopColor: appearance === 'dark' ? '#333' : colors.hairline,
    },
  }), [appearance, colors])

  // Navigate to profile screen
  const handleViewProfile = useCallback(() => {
    setShowMenu(false)
    navigation.navigate('SyntheticSingerProfile', {
      voiceId: voice?.id,
      userId: currentUser?.id,
    })
  }, [navigation, voice?.id, currentUser?.id])

  const handleDelete = useCallback(async () => {
    if (!currentUser?.id || !voice?.id) return

    Alert.alert(
      'Delete Synthetic Singer?',
      `Are you sure you want to delete "${voice.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            try {
              await deleteVoice(currentUser.id, voice.id)
              console.log('[VoiceCard] Voice deleted:', voice.id)
              onDelete?.(voice.id)
            } catch (error) {
              console.error('[VoiceCard] Delete error:', error)
              Alert.alert('Error', 'Failed to delete voice. Please try again.')
            } finally {
              setIsDeleting(false)
            }
          },
        },
      ]
    )
    setShowMenu(false)
  }, [currentUser?.id, voice, onDelete])

  const handleRename = useCallback(() => {
    Alert.prompt(
      'Rename Voice',
      'Enter a new name for this voice',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async (newName) => {
            if (!newName || !newName.trim()) return
            if (!currentUser?.id || !voice?.id) return

            try {
              await updateVoice(currentUser.id, voice.id, { name: newName.trim() })
              console.log('[VoiceCard] Voice renamed:', voice.id)
            } catch (error) {
              console.error('[VoiceCard] Rename error:', error)
              Alert.alert('Error', 'Failed to rename voice. Please try again.')
            }
          },
        },
      ],
      'plain-text',
      voice.name
    )
    setShowMenu(false)
  }, [currentUser?.id, voice])

  const toggleMenu = useCallback(() => {
    setShowMenu(prev => !prev)
  }, [])

  if (!voice) return null

  const usageText = voice.usageCount === 1
    ? '1 song created'
    : `${voice.usageCount || 0} songs created`

  const iconColor = colors.secondaryText

  return (
    <View style={[styles.container, themedStyles.container, style]}>
      {/* Tappable content area */}
      <TouchableOpacity
        style={styles.contentArea}
        onPress={handleViewProfile}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        {voice.sourceSong?.imageUrl ? (
          <Image
            source={{ uri: voice.sourceSong.imageUrl }}
            style={styles.thumbnail}
          />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder, themedStyles.thumbnailPlaceholder]}>
            <Mic size={24} color={iconColor} />
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <Text style={[styles.name, themedStyles.name]} numberOfLines={1}>
            {voice.name}
          </Text>
          <View style={styles.metaRow}>
            <Music size={12} color={iconColor} />
            <Text style={[styles.sourceSong, themedStyles.sourceSong]} numberOfLines={1}>
              {voice.sourceSong?.title || 'Unknown song'}
            </Text>
          </View>
          <Text style={styles.usage}>{usageText}</Text>
        </View>
      </TouchableOpacity>

      {/* Menu Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={toggleMenu}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MoreVertical size={20} color={iconColor} />
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {showMenu && (
        <View style={[styles.menuDropdown, themedStyles.menuDropdown]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleViewProfile}
          >
            <User size={16} color={colors.primaryText} />
            <Text style={[styles.menuItemText, themedStyles.menuItemText]}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleRename}
          >
            <Pencil size={16} color={colors.primaryText} />
            <Text style={[styles.menuItemText, themedStyles.menuItemText]}>Rename</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDestructive, themedStyles.menuItemBorder]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 size={16} color="#ef4444" />
            <Text style={[styles.menuItemText, styles.menuItemTextDestructive]}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    position: 'relative',
  },
  contentArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sourceSong: {
    fontSize: 13,
    flex: 1,
  },
  usage: {
    color: '#6366F1',
    fontSize: 12,
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  menuDropdown: {
    position: 'absolute',
    top: 48,
    right: 8,
    borderRadius: 8,
    paddingVertical: 4,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  menuItemDestructive: {
    borderTopWidth: 1,
  },
  menuItemText: {
    fontSize: 14,
  },
  menuItemTextDestructive: {
    color: '#ef4444',
  },
})
