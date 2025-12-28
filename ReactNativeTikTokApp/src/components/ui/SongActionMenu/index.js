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
  ScrollView,
} from 'react-native'
import { useColorScheme } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { deleteSong } from '../../../services/songsService'
import { canCreateVoiceFromSong } from '../../../services/artistVoiceService'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'
import {
  DEFAULT_SONG_RIGHTS,
  RIGHTS_DESCRIPTIONS,
  canUserPerformAction,
} from '../../../constants/songRights'

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
  const navigation = useNavigation()
  const { addToQueue, queue, isLiked: isLikedFn, toggleLike, stopIfPlaying } = useMediaPlayer()

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
      artist: song.author?.stageName || song.artist || 'Unknown Artist',
      audioUrl: song.audioUrl,
      thumbnailUrl: song.thumbnailUrl || song.coverUrl,
    })
    onClose?.()
  }, [song, addToQueue, onClose])

  const handleShare = useCallback(async () => {
    if (!song) return

    try {
      await Share.share({
        message: `Check out "${song.title}" by ${song.author?.stageName || song.artist || 'Unknown Artist'} on LetsMakeMusic!`,
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

  // Song feature navigation handlers (owner only)
  const handleChangeCover = useCallback(() => {
    onClose?.()
    navigation.navigate('ChangeSongCover', { song })
  }, [song, navigation, onClose])

  const handleCreateVideo = useCallback(() => {
    onClose?.()
    navigation.navigate('AddMediaForVideo', { song })
  }, [song, navigation, onClose])

  const handleAIVideo = useCallback(() => {
    onClose?.()
    navigation.navigate('CreateMusicVideo', { song })
  }, [song, navigation, onClose])

  const handleMusicGeneration = useCallback(() => {
    onClose?.()
    navigation.navigate('MusicGeneration', { song })
  }, [song, navigation, onClose])

  const handleAudioProcessing = useCallback(() => {
    onClose?.()
    navigation.navigate('AudioProcessing', { song })
  }, [song, navigation, onClose])

  const handleShareToFeed = useCallback(() => {
    onClose?.()
    navigation.navigate('ShareSongToFeed', { song })
  }, [song, navigation, onClose])

  const handleCreateArtistVoice = useCallback(() => {
    onClose?.()
    navigation.navigate('CreateArtistVoice', { song })
  }, [song, navigation, onClose])

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
                // Stop playback if this song is currently playing
                await stopIfPlaying(song.id)
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
  }, [song, currentUserId, onClose, stopIfPlaying])

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
      id: 'shareToFeed',
      label: 'Share to Feed',
      icon: '📣',
      onPress: handleShareToFeed,
    },
    {
      id: 'artist',
      label: 'View Artist',
      icon: '👤',
      onPress: handleViewArtist,
      show: !!song?.author?.id || !!song?.userId,
    },
  ]

  // Check Synthetic Singer eligibility (available to owner and non-owners if rights allow)
  const voiceEligibility = canCreateVoiceFromSong(song, currentUserId)
  if (voiceEligibility.eligible) {
    // Add Synthetic Singer action with expiration info
    const daysLabel = voiceEligibility.daysRemaining
      ? ` (${voiceEligibility.daysRemaining} days left)`
      : ''
    actions.push({
      id: 'createArtistVoice',
      label: `Create Synthetic Singer${daysLabel}`,
      icon: '🎤',
      onPress: handleCreateArtistVoice,
    })
  }

  // Owner-only actions
  if (isOwner) {
    actions.push(
      {
        id: 'changeCover',
        label: 'Change Cover',
        icon: '🖼️',
        onPress: handleChangeCover,
      },
      {
        id: 'aiVideo',
        label: 'AI Music Video',
        icon: '🎥',
        onPress: handleAIVideo,
        // Only show if song has sunoId (Suno-generated song) AND audio is still available
        show: !!song?.sunoId && song?.sunoAudioAvailable !== false,
      },
      {
        id: 'createVideo',
        label: 'Custom Video (Add Media)',
        icon: '🎬',
        onPress: handleCreateVideo,
        // Only show if song has sunoId (Suno-generated song) AND audio is still available
        show: !!song?.sunoId && song?.sunoAudioAvailable !== false,
      },
      {
        id: 'musicGen',
        label: 'Music Generation',
        icon: '✨',
        onPress: handleMusicGeneration,
      },
      {
        id: 'audioProcessing',
        label: 'Audio Processing',
        icon: '🎛️',
        onPress: handleAudioProcessing,
      },
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
              {song.author?.stageName || song.artist || 'Unknown Artist'}
            </Text>
          </View>

          <View style={styles.divider} />

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

          {/* Song Rights Section */}
          <View style={styles.rightsSection}>
            <Text style={styles.rightsSectionTitle}>Song Rights</Text>

            {/* Monetization */}
            <View style={styles.rightsCategory}>
              <Text style={styles.rightsCategoryTitle}>💰 Monetization</Text>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Price</Text>
                <Text style={styles.rightsValue}>
                  {song.rights?.monetized
                    ? `$${((song.rights?.price || 0) / 100).toFixed(2)}`
                    : 'Free'}
                </Text>
              </View>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Tipping</Text>
                <Text style={[
                  styles.rightsValue,
                  (song.rights?.allowTipping ?? DEFAULT_SONG_RIGHTS.allowTipping)
                    ? styles.rightsEnabled
                    : styles.rightsDisabled
                ]}>
                  {(song.rights?.allowTipping ?? DEFAULT_SONG_RIGHTS.allowTipping) ? 'Allowed' : 'Disabled'}
                </Text>
              </View>
            </View>

            {/* Derivatives */}
            <View style={styles.rightsCategory}>
              <Text style={styles.rightsCategoryTitle}>🎵 Derivative Works</Text>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Extend</Text>
                <Text style={[
                  styles.rightsValue,
                  (song.rights?.allowExtend ?? DEFAULT_SONG_RIGHTS.allowExtend)
                    ? styles.rightsEnabled
                    : styles.rightsDisabled
                ]}>
                  {(song.rights?.allowExtend ?? DEFAULT_SONG_RIGHTS.allowExtend) ? 'Allowed' : 'Disabled'}
                </Text>
              </View>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Stem Extraction</Text>
                <View style={styles.rightsValueContainer}>
                  <Text style={[
                    styles.rightsValue,
                    (song.rights?.allowStemExtraction ?? DEFAULT_SONG_RIGHTS.allowStemExtraction)
                      ? styles.rightsEnabled
                      : styles.rightsDisabled
                  ]}>
                    {(song.rights?.allowStemExtraction ?? DEFAULT_SONG_RIGHTS.allowStemExtraction) ? 'Allowed' : 'Disabled'}
                  </Text>
                  <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                </View>
              </View>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>WAV Export</Text>
                <View style={styles.rightsValueContainer}>
                  <Text style={[
                    styles.rightsValue,
                    (song.rights?.allowWavExport ?? DEFAULT_SONG_RIGHTS.allowWavExport)
                      ? styles.rightsEnabled
                      : styles.rightsDisabled
                  ]}>
                    {(song.rights?.allowWavExport ?? DEFAULT_SONG_RIGHTS.allowWavExport) ? 'Allowed' : 'Disabled'}
                  </Text>
                  <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                </View>
              </View>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Lyrics Use</Text>
                <Text style={[
                  styles.rightsValue,
                  (song.rights?.allowLyricsUse ?? DEFAULT_SONG_RIGHTS.allowLyricsUse)
                    ? styles.rightsEnabled
                    : styles.rightsDisabled
                ]}>
                  {(song.rights?.allowLyricsUse ?? DEFAULT_SONG_RIGHTS.allowLyricsUse) ? 'Allowed' : 'Disabled'}
                </Text>
              </View>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Reinterpret (Cover)</Text>
                <View style={styles.rightsValueContainer}>
                  <Text style={[
                    styles.rightsValue,
                    (song.rights?.allowReinterpret ?? DEFAULT_SONG_RIGHTS.allowReinterpret)
                      ? styles.rightsEnabled
                      : styles.rightsDisabled
                  ]}>
                    {(song.rights?.allowReinterpret ?? DEFAULT_SONG_RIGHTS.allowReinterpret) ? 'Allowed' : 'Disabled'}
                  </Text>
                  <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                </View>
              </View>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Sampling</Text>
                <View style={styles.rightsValueContainer}>
                  <Text style={[
                    styles.rightsValue,
                    (song.rights?.allowSampling ?? DEFAULT_SONG_RIGHTS.allowSampling)
                      ? styles.rightsEnabled
                      : styles.rightsDisabled
                  ]}>
                    {(song.rights?.allowSampling ?? DEFAULT_SONG_RIGHTS.allowSampling) ? 'Allowed' : 'Disabled'}
                  </Text>
                  <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                </View>
              </View>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Synthetic Singer</Text>
                <Text style={[
                  styles.rightsValue,
                  (song.rights?.allowArtistVoice ?? song.rights?.allowPersonaCreation ?? DEFAULT_SONG_RIGHTS.allowArtistVoice)
                    ? styles.rightsEnabled
                    : styles.rightsDisabled
                ]}>
                  {(song.rights?.allowArtistVoice ?? song.rights?.allowPersonaCreation ?? DEFAULT_SONG_RIGHTS.allowArtistVoice) ? 'Allowed' : 'Disabled'}
                </Text>
              </View>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Video Creation</Text>
                <Text style={[
                  styles.rightsValue,
                  (song.rights?.allowVideoCreation ?? DEFAULT_SONG_RIGHTS.allowVideoCreation)
                    ? styles.rightsEnabled
                    : styles.rightsDisabled
                ]}>
                  {(song.rights?.allowVideoCreation ?? DEFAULT_SONG_RIGHTS.allowVideoCreation) ? 'Allowed' : 'Disabled'}
                </Text>
              </View>
            </View>

            {/* Attribution */}
            <View style={styles.rightsCategory}>
              <Text style={styles.rightsCategoryTitle}>📝 Attribution</Text>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Attribution Required</Text>
                <Text style={[
                  styles.rightsValue,
                  (song.rights?.requireAttribution ?? DEFAULT_SONG_RIGHTS.requireAttribution)
                    ? styles.rightsEnabled
                    : styles.rightsDisabled
                ]}>
                  {(song.rights?.requireAttribution ?? DEFAULT_SONG_RIGHTS.requireAttribution) ? 'Yes' : 'No'}
                </Text>
              </View>
              {song.rights?.attributionText ? (
                <View style={styles.rightsRow}>
                  <Text style={styles.rightsLabel}>Credit As</Text>
                  <Text style={styles.rightsValue} numberOfLines={1}>
                    {song.rights.attributionText}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Commercial */}
            <View style={styles.rightsCategory}>
              <Text style={styles.rightsCategoryTitle}>💼 Commercial Use</Text>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>Commercial Use</Text>
                <View style={styles.rightsValueContainer}>
                  <Text style={[
                    styles.rightsValue,
                    (song.rights?.allowCommercialUse ?? DEFAULT_SONG_RIGHTS.allowCommercialUse)
                      ? styles.rightsEnabled
                      : styles.rightsDisabled
                  ]}>
                    {(song.rights?.allowCommercialUse ?? DEFAULT_SONG_RIGHTS.allowCommercialUse) ? 'Allowed' : 'Disabled'}
                  </Text>
                  <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                </View>
              </View>
              <View style={styles.rightsRow}>
                <Text style={styles.rightsLabel}>License Fee</Text>
                <View style={styles.rightsValueContainer}>
                  <Text style={styles.rightsValue}>
                    {song.rights?.commercialLicenseFee
                      ? `$${((song.rights.commercialLicenseFee) / 100).toFixed(2)}`
                      : 'Not set'}
                  </Text>
                  <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                </View>
              </View>
            </View>
          </View>
          </ScrollView>

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
      maxHeight: '80%',
    },
    scrollContent: {
      maxHeight: 400,
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
    // Song Rights Styles
    rightsSection: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    rightsSectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: isDark ? '#ffffff' : '#000000',
      marginBottom: 16,
    },
    rightsCategory: {
      marginBottom: 16,
    },
    rightsCategoryTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: isDark ? '#a1a1aa' : '#71717a',
      marginBottom: 8,
    },
    rightsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 6,
    },
    rightsLabel: {
      fontSize: 14,
      color: isDark ? '#d4d4d8' : '#52525b',
      flex: 1,
    },
    rightsValue: {
      fontSize: 14,
      color: isDark ? '#ffffff' : '#000000',
      textAlign: 'right',
    },
    rightsValueContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rightsEnabled: {
      color: '#22c55e',
    },
    rightsDisabled: {
      color: isDark ? '#6b7280' : '#9ca3af',
    },
    comingSoonBadge: {
      fontSize: 10,
      fontWeight: '600',
      color: '#f59e0b',
      backgroundColor: isDark ? '#422006' : '#fef3c7',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      overflow: 'hidden',
    },
  })

export default SongActionMenu
