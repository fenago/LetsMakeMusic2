import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useColorScheme } from 'react-native'
import { deleteSong } from '../../../services/songsService'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'

/**
 * SongActionMenu - Bottom sheet action menu for song interactions
 *
 * Props:
 * - visible: boolean - whether the menu is shown
 * - song: object - the song data
 * - currentUserId: string - current user's ID
 * - onClose: function - callback when menu is closed
 * - onAddToPlaylist: function - callback to add song to playlist
 * - onViewArtist: function - callback to navigate to artist profile
 * - onEditSong: function - callback to edit song (owner only)
 */
const SongActionMenu = ({
  visible,
  song,
  currentUserId,
  onClose,
  onAddToPlaylist,
  onViewArtist,
  onEditSong,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const { addToQueue, queue, isLiked: isLikedFn, toggleLike } = useMediaPlayer()

  const [actionLoading, setActionLoading] = useState(null)

  // Check if current user is the song owner
  const isOwner = song?.userId === currentUserId || song?.author?.id === currentUserId

  // Check if song is already in queue
  const isInQueue = queue?.some(item => item.id === song?.id)

  // Get like status from shared context
  const isLiked = song?.id ? isLikedFn(song.id) : false

  const handleLike = useCallback(async () => {
    if (!song?.id) return

    setActionLoading('like')
    try {
      await toggleLike(song)
      // Note: isLiked will update automatically via Firebase subscription in context
      onClose?.()
    } catch (error) {
      console.error('Error toggling like:', error)
      Alert.alert('Error', 'Failed to update like status')
    } finally {
      setActionLoading(null)
    }
  }, [song, toggleLike, onClose])

  const handleAddToQueue = useCallback(() => {
    if (!song) return

    addToQueue({
      id: song.id,
      title: song.title,
      artist: song.artist || song.author?.stageName || 'Unknown Artist',
      audioUrl: song.audioUrl,
      thumbnailUrl: song.thumbnailUrl || song.coverUrl,
    })
    onClose?.()
  }, [song, addToQueue, onClose])

  const handleShare = useCallback(async () => {
    if (!song) return

    try {
      await Share.share({
        message: `Check out "${song.title}" by ${song.artist || song.author?.stageName || 'Unknown Artist'} on LetsMakeMusic!`,
        // TODO: Add deep link URL when available
        // url: `letsmakemusic://song/${song.id}`,
      })
      onClose?.()
    } catch (error) {
      console.error('Error sharing:', error)
    }
  }, [song, onClose])

  const handleViewArtist = useCallback(() => {
    onViewArtist?.(song?.author || { id: song?.userId })
    onClose?.()
  }, [song, onViewArtist, onClose])

  const handleAddToPlaylist = useCallback(() => {
    onAddToPlaylist?.(song)
    onClose?.()
  }, [song, onAddToPlaylist, onClose])

  const handleEdit = useCallback(() => {
    onEditSong?.(song)
    onClose?.()
  }, [song, onEditSong, onClose])

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Song',
      `Are you sure you want to delete "${song?.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('delete')
            try {
              const result = await deleteSong(song.id, currentUserId)
              if (result.success) {
                onClose?.()
              } else {
                Alert.alert('Error', result.error || 'Failed to delete song')
              }
            } catch (error) {
              console.error('Error deleting song:', error)
              Alert.alert('Error', 'Failed to delete song')
            } finally {
              setActionLoading(null)
            }
          },
        },
      ]
    )
  }, [song, currentUserId, onClose])

  if (!visible || !song) return null

  const styles = createStyles(isDark)

  const actions = [
    {
      id: 'like',
      label: isLiked ? 'Unlike' : 'Like',
      icon: isLiked ? '❤️' : '🤍',
      onPress: handleLike,
      loading: actionLoading === 'like',
    },
    {
      id: 'queue',
      label: isInQueue ? 'Already in Queue' : 'Add to Queue',
      icon: '📋',
      onPress: handleAddToQueue,
      disabled: isInQueue,
    },
    {
      id: 'playlist',
      label: 'Add to Playlist',
      icon: '➕',
      onPress: handleAddToPlaylist,
    },
    {
      id: 'share',
      label: 'Share',
      icon: '📤',
      onPress: handleShare,
    },
    {
      id: 'artist',
      label: 'View Artist',
      icon: '👤',
      onPress: handleViewArtist,
      show: !!song?.author?.id || !!song?.userId,
    },
  ]

  // Owner-only actions
  if (isOwner) {
    actions.push(
      {
        id: 'edit',
        label: 'Edit Song',
        icon: '✏️',
        onPress: handleEdit,
      },
      {
        id: 'delete',
        label: 'Delete Song',
        icon: '🗑️',
        onPress: handleDelete,
        destructive: true,
        loading: actionLoading === 'delete',
      }
    )
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          {/* Song Info Header */}
          <View style={styles.header}>
            <Text style={styles.songTitle} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={styles.songArtist} numberOfLines={1}>
              {song.artist || song.author?.stageName || 'Unknown Artist'}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {actions
              .filter(action => action.show !== false)
              .map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={[
                    styles.actionButton,
                    action.disabled && styles.actionButtonDisabled,
                    action.destructive && styles.actionButtonDestructive,
                  ]}
                  onPress={action.onPress}
                  disabled={action.disabled || action.loading}
                >
                  {action.loading ? (
                    <ActivityIndicator
                      size="small"
                      color={isDark ? '#fff' : '#000'}
                      style={styles.actionIcon}
                    />
                  ) : (
                    <Text style={styles.actionIcon}>{action.icon}</Text>
                  )}
                  <Text
                    style={[
                      styles.actionLabel,
                      action.disabled && styles.actionLabelDisabled,
                      action.destructive && styles.actionLabelDestructive,
                    ]}
                  >
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>

          <View style={styles.divider} />

          {/* Cancel Button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  )
}

const createStyles = (isDark) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: isDark ? '#1c1c1e' : '#ffffff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 34, // Safe area
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      alignItems: 'center',
    },
    songTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: isDark ? '#ffffff' : '#000000',
      marginBottom: 4,
    },
    songArtist: {
      fontSize: 14,
      color: isDark ? '#8e8e93' : '#6b7280',
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? '#38383a' : '#e5e7eb',
      marginHorizontal: 20,
    },
    actionsContainer: {
      paddingVertical: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    actionButtonDisabled: {
      opacity: 0.5,
    },
    actionButtonDestructive: {},
    actionIcon: {
      fontSize: 20,
      width: 32,
      textAlign: 'center',
    },
    actionLabel: {
      fontSize: 16,
      color: isDark ? '#ffffff' : '#000000',
      marginLeft: 12,
    },
    actionLabelDisabled: {
      color: isDark ? '#8e8e93' : '#9ca3af',
    },
    actionLabelDestructive: {
      color: '#ef4444',
    },
    cancelButton: {
      paddingVertical: 16,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#0a84ff' : '#3b82f6',
    },
  })

export default SongActionMenu
