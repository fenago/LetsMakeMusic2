/**
 * VoiceCard - Component for displaying a Synthetic Singer in the Library
 *
 * Shows voice name, source song thumbnail, usage count, and action menu.
 */

import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native'
import { Mic, MoreVertical, Trash2, Pencil, Music } from 'lucide-react-native'

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
  const currentUser = useCurrentUser()
  const [showMenu, setShowMenu] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  return (
    <View style={[styles.container, style]}>
      {/* Thumbnail */}
      {voice.sourceSong?.imageUrl ? (
        <Image
          source={{ uri: voice.sourceSong.imageUrl }}
          style={styles.thumbnail}
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Mic size={24} color="#666" />
        </View>
      )}

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {voice.name}
        </Text>
        <View style={styles.metaRow}>
          <Music size={12} color="#888" />
          <Text style={styles.sourceSong} numberOfLines={1}>
            {voice.sourceSong?.title || 'Unknown song'}
          </Text>
        </View>
        <Text style={styles.usage}>{usageText}</Text>
      </View>

      {/* Menu Button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={toggleMenu}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MoreVertical size={20} color="#888" />
      </TouchableOpacity>

      {/* Dropdown Menu */}
      {showMenu && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleRename}
          >
            <Pencil size={16} color="#fff" />
            <Text style={styles.menuItemText}>Rename</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemDestructive]}
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
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    position: 'relative',
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  name: {
    color: '#fff',
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
    color: '#888',
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
    backgroundColor: '#2a2a2a',
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
    borderTopColor: '#333',
  },
  menuItemText: {
    color: '#fff',
    fontSize: 14,
  },
  menuItemTextDestructive: {
    color: '#ef4444',
  },
})
