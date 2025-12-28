/**
 * ArtworkDetailScreen - Full artwork view with actions
 *
 * Features:
 * - Full-screen artwork preview
 * - Metadata display (prompt, source, creation date)
 * - Apply to song/profile/band
 * - Delete artwork
 * - Share (future)
 */
import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ChevronLeft,
  Sparkles,
  ImageIcon,
  Music,
  User,
  Users,
  Trash2,
  ExternalLink,
  Calendar,
  Info,
} from 'lucide-react-native'
import { useTheme } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { useArtworkDetail } from '../../hooks/useArtwork'
import { applyArtworkToSong, applyArtworkAsProfilePicture, applyArtworkToBand, deleteArtwork } from '../../services/artworkService'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

const ArtworkDetailScreen = ({ navigation, route }) => {
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()

  const { artworkId } = route?.params || {}
  const { artwork, artworkLoading, artworkError } = useArtworkDetail(artworkId)

  const [isApplying, setIsApplying] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Format date helper
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // Handle apply as profile picture
  const handleApplyAsProfile = useCallback(async () => {
    if (!artwork || !currentUser?.id) return

    setIsApplying(true)
    try {
      const result = await applyArtworkAsProfilePicture(artwork.id, currentUser.id)
      if (result.success) {
        Alert.alert('Success', 'Profile picture updated!')
      } else {
        Alert.alert('Error', result.error || 'Failed to update profile picture')
      }
    } catch (error) {
      Alert.alert('Error', error.message)
    } finally {
      setIsApplying(false)
    }
  }, [artwork, currentUser])

  // Handle apply to song
  const handleApplyToSong = useCallback(() => {
    navigation.navigate('SelectSongForArtwork', {
      artworkId: artwork.id,
      onSuccess: () => {
        Alert.alert('Success', 'Song cover updated!')
      },
    })
  }, [artwork, navigation])

  // Handle apply to band
  const handleApplyToBand = useCallback(() => {
    navigation.navigate('SelectBandForArtwork', {
      artworkId: artwork.id,
      onSuccess: () => {
        Alert.alert('Success', 'Band image updated!')
      },
    })
  }, [artwork, navigation])

  // Handle delete
  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Artwork',
      'Are you sure you want to delete this artwork? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true)
            try {
              const result = await deleteArtwork(artwork.id, currentUser.id)
              if (result.success) {
                navigation.goBack()
              } else {
                Alert.alert('Error', result.error || 'Failed to delete artwork')
              }
            } catch (error) {
              Alert.alert('Error', error.message)
            } finally {
              setIsDeleting(false)
            }
          },
        },
      ]
    )
  }, [artwork, currentUser, navigation])

  // Loading state
  if (artworkLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colorSet.primaryBackground }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      </SafeAreaView>
    )
  }

  // Error state
  if (artworkError || !artwork) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colorSet.primaryBackground }]}>
        <View style={[styles.header, { borderBottomColor: colorSet.grey3 }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ChevronLeft size={28} color={colorSet.primaryText} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colorSet.primaryText }]}>Artwork</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colorSet.secondaryText }]}>
            {artworkError || 'Artwork not found'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const isGenerated = artwork.source === 'generated'
  const isStock = artwork.source === 'stock'
  const imageUrl = artwork.imageUrl || artwork.thumbnailUrl

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorSet.primaryBackground }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colorSet.grey3 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={colorSet.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colorSet.primaryText }]}>
          Artwork Details
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#ef4444" />
          ) : (
            <Trash2 size={22} color="#ef4444" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Preview */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
          {/* Source Badge */}
          <View style={[
            styles.sourceBadge,
            isGenerated ? styles.badgeGenerated : styles.badgeStock,
          ]}>
            {isGenerated ? (
              <Sparkles size={14} color="#fff" />
            ) : (
              <ImageIcon size={14} color="#fff" />
            )}
            <Text style={styles.badgeText}>
              {isGenerated ? 'AI Created' : 'Stock Photo'}
            </Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
            Details
          </Text>

          {/* Prompt (for AI generated) */}
          {artwork.prompt && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Sparkles size={16} color={colorSet.secondaryText} />
                <Text style={[styles.labelText, { color: colorSet.secondaryText }]}>
                  Prompt
                </Text>
              </View>
              <Text style={[styles.promptText, { color: colorSet.primaryText }]}>
                {artwork.prompt}
              </Text>
            </View>
          )}

          {/* Style */}
          {artwork.style && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <Info size={16} color={colorSet.secondaryText} />
                <Text style={[styles.labelText, { color: colorSet.secondaryText }]}>
                  Style
                </Text>
              </View>
              <Text style={[styles.valueText, { color: colorSet.primaryText }]}>
                {artwork.style.replace(/_/g, ' ')}
              </Text>
            </View>
          )}

          {/* Photographer (for stock) */}
          {artwork.photographer && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabel}>
                <User size={16} color={colorSet.secondaryText} />
                <Text style={[styles.labelText, { color: colorSet.secondaryText }]}>
                  Photographer
                </Text>
              </View>
              <Text style={[styles.valueText, { color: colorSet.primaryText }]}>
                {artwork.photographer}
              </Text>
            </View>
          )}

          {/* Created Date */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabel}>
              <Calendar size={16} color={colorSet.secondaryText} />
              <Text style={[styles.labelText, { color: colorSet.secondaryText }]}>
                Added
              </Text>
            </View>
            <Text style={[styles.valueText, { color: colorSet.primaryText }]}>
              {formatDate(artwork.createdAt)}
            </Text>
          </View>

          {/* Source URL (for stock) */}
          {artwork.sourceUrl && (
            <TouchableOpacity
              style={styles.linkRow}
              onPress={() => {
                // Open in browser
                Alert.alert('Open Link', artwork.sourceUrl)
              }}
            >
              <View style={styles.infoLabel}>
                <ExternalLink size={16} color={colorSet.primaryForeground} />
                <Text style={[styles.linkText, { color: colorSet.primaryForeground }]}>
                  View Original Source
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Usage Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
            Currently Used As
          </Text>

          {artwork.usedAs?.profilePicture && (
            <View style={[styles.usageTag, { backgroundColor: colorSet.grey3 }]}>
              <User size={14} color={colorSet.primaryText} />
              <Text style={[styles.usageText, { color: colorSet.primaryText }]}>
                Profile Picture
              </Text>
            </View>
          )}

          {artwork.usedAs?.songCovers?.length > 0 && (
            <View style={[styles.usageTag, { backgroundColor: colorSet.grey3 }]}>
              <Music size={14} color={colorSet.primaryText} />
              <Text style={[styles.usageText, { color: colorSet.primaryText }]}>
                {artwork.usedAs.songCovers.length} Song Cover{artwork.usedAs.songCovers.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {artwork.usedAs?.bandImages?.length > 0 && (
            <View style={[styles.usageTag, { backgroundColor: colorSet.grey3 }]}>
              <Users size={14} color={colorSet.primaryText} />
              <Text style={[styles.usageText, { color: colorSet.primaryText }]}>
                {artwork.usedAs.bandImages.length} Band Image{artwork.usedAs.bandImages.length > 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {!artwork.usedAs?.profilePicture &&
           !artwork.usedAs?.songCovers?.length &&
           !artwork.usedAs?.bandImages?.length && (
            <Text style={[styles.notUsedText, { color: colorSet.secondaryText }]}>
              Not currently in use
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
            Apply Artwork
          </Text>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colorSet.primaryForeground }]}
            onPress={handleApplyAsProfile}
            disabled={isApplying}
          >
            {isApplying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <User size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Use as Profile Picture</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButtonOutline, { borderColor: colorSet.primaryForeground }]}
            onPress={handleApplyToSong}
          >
            <Music size={20} color={colorSet.primaryForeground} />
            <Text style={[styles.actionButtonOutlineText, { color: colorSet.primaryForeground }]}>
              Apply to Song
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButtonOutline, { borderColor: colorSet.primaryForeground }]}
            onPress={handleApplyToBand}
          >
            <Users size={20} color={colorSet.primaryForeground} />
            <Text style={[styles.actionButtonOutlineText, { color: colorSet.primaryForeground }]}>
              Apply to Band
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    minWidth: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    minWidth: 40,
  },
  deleteButton: {
    padding: 4,
    minWidth: 40,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    aspectRatio: 1,
    backgroundColor: '#000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  sourceBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  badgeGenerated: {
    backgroundColor: 'rgba(147, 51, 234, 0.9)',
  },
  badgeStock: {
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
  },
  badgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 16,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '500',
  },
  promptText: {
    fontSize: 15,
    lineHeight: 22,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '500',
    paddingLeft: 24,
  },
  linkRow: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
  usageTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginBottom: 8,
  },
  usageText: {
    fontSize: 13,
    fontWeight: '500',
  },
  notUsedText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  actionsSection: {
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 10,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 2,
    gap: 10,
    marginBottom: 12,
  },
  actionButtonOutlineText: {
    fontSize: 16,
    fontWeight: '600',
  },
})

export default ArtworkDetailScreen
