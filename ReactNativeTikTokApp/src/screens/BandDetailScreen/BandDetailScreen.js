/**
 * BandDetailScreen - Main hub for band collaboration
 *
 * Shows band info, members, shared songs, and provides
 * access to band chat and collaborative features.
 */

import React, { useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ChevronLeft,
  Users,
  Music,
  ListMusic,
  MessageCircle,
  Plus,
  MoreHorizontal,
  Crown,
} from 'lucide-react-native'
import { useTheme } from '../../core/dopebase'
import { useBandSongs } from '../../hooks/useBandSongs'
import { useCurrentUser } from '../../core/onboarding'

const BandDetailScreen = ({ navigation, route }) => {
  const { band } = route.params || {}
  const insets = useSafeAreaInsets()
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()

  const { songs, songsLoading, songsCount } = useBandSongs(band?.id, currentUser?.id)

  // Get member info from participants
  const members = useMemo(() => {
    return band?.participants || []
  }, [band?.participants])

  const admins = useMemo(() => {
    return band?.admins || []
  }, [band?.admins])

  const isAdmin = useMemo(() => {
    return admins.includes(currentUser?.id)
  }, [admins, currentUser?.id])

  // Get band cover image (fallback to first member's avatar)
  const bandCoverImage = useMemo(() => {
    if (band?.bandImageUrl) return band.bandImageUrl
    if (members[0]?.profilePictureURL) return members[0].profilePictureURL
    return null
  }, [band?.bandImageUrl, members])

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const handleGoToChat = useCallback(() => {
    // Navigate to the chat for this band/channel
    navigation.navigate('PersonalChat', {
      channel: band,
    })
  }, [navigation, band])

  const handleViewAllSongs = useCallback(() => {
    navigation.navigate('BandSongs', { band })
  }, [navigation, band])

  const handleAddSong = useCallback(() => {
    navigation.navigate('AddSongToBand', { band })
  }, [navigation, band])

  const handleViewAllMembers = useCallback(() => {
    navigation.navigate('ViewGroupMembers', { channel: band })
  }, [navigation, band])

  const handleSongPress = useCallback((song) => {
    // Play the song or navigate to song detail
    console.log('[BandDetailScreen] Song pressed:', song.id)
  }, [])

  const handleMoreOptions = useCallback(() => {
    // Show band settings/options
    console.log('[BandDetailScreen] More options pressed')
  }, [navigation, band])

  // Render member avatar with admin crown
  const renderMember = ({ item, index }) => {
    const isAdminMember = admins.includes(item.id || item.userID)
    return (
      <View style={styles.memberItem}>
        <View style={styles.memberAvatarContainer}>
          <Image
            source={{
              uri: item.profilePictureURL ||
                'https://www.iosapptemplates.com/wp-content/uploads/2019/06/empty-avatar.jpg',
            }}
            style={styles.memberAvatar}
          />
          {isAdminMember && (
            <View style={[styles.adminBadge, { backgroundColor: colorSet.primaryForeground }]}>
              <Crown size={10} color="#fff" />
            </View>
          )}
        </View>
        <Text
          style={[styles.memberName, { color: colorSet.primaryText }]}
          numberOfLines={1}>
          {item.firstName || item.username || 'Artist'}
        </Text>
      </View>
    )
  }

  // Render song item in horizontal list
  const renderSong = ({ item }) => (
    <TouchableOpacity
      style={styles.songItem}
      onPress={() => handleSongPress(item)}>
      <Image
        source={{
          uri: item.imageUrl ||
            'https://via.placeholder.com/100x100?text=Song',
        }}
        style={styles.songImage}
      />
      <Text
        style={[styles.songTitle, { color: colorSet.primaryText }]}
        numberOfLines={1}>
        {item.title || 'Untitled'}
      </Text>
      <Text
        style={[styles.songArtist, { color: colorSet.secondaryText }]}
        numberOfLines={1}>
        {item.artist || 'Unknown Artist'}
      </Text>
    </TouchableOpacity>
  )

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorSet.primaryBackground,
          paddingTop: insets.top,
        },
      ]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeft size={28} color={colorSet.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colorSet.primaryText }]}>
          Band
        </Text>
        <TouchableOpacity onPress={handleMoreOptions} style={styles.moreButton}>
          <MoreHorizontal size={24} color={colorSet.primaryText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Band Hero Section */}
        <View style={styles.heroSection}>
          <View
            style={[
              styles.bandCoverContainer,
              { backgroundColor: colorSet.secondaryBackground },
            ]}>
            {bandCoverImage ? (
              <Image
                source={{ uri: bandCoverImage }}
                style={styles.bandCover}
              />
            ) : (
              <Users size={60} color={colorSet.secondaryText} />
            )}
          </View>
          <Text style={[styles.bandName, { color: colorSet.primaryText }]}>
            {band?.name || 'Unnamed Band'}
          </Text>
          <Text style={[styles.memberCount, { color: colorSet.secondaryText }]}>
            {members.length} {members.length === 1 ? 'member' : 'members'} · {songsCount} {songsCount === 1 ? 'song' : 'songs'}
          </Text>
          {band?.bandDescription && (
            <Text style={[styles.bandDescription, { color: colorSet.secondaryText }]}>
              {band.bandDescription}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colorSet.primaryForeground }]}
            onPress={handleGoToChat}>
            <MessageCircle size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Band Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, { borderColor: colorSet.hairline }]}
            onPress={handleAddSong}>
            <Plus size={20} color={colorSet.primaryText} />
            <Text style={[styles.actionButtonText, { color: colorSet.primaryText }]}>Add Song</Text>
          </TouchableOpacity>
        </View>

        {/* Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: '#7c3aed20' }]}>
                <Users size={18} color="#7c3aed" />
              </View>
              <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
                Members
              </Text>
              <View style={[styles.countBadge, { backgroundColor: colorSet.secondaryBackground }]}>
                <Text style={[styles.countText, { color: colorSet.secondaryText }]}>
                  {members.length}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleViewAllMembers}>
              <Text style={[styles.seeAllText, { color: colorSet.primaryForeground }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={members.slice(0, 6)}
            renderItem={renderMember}
            keyExtractor={(item) => item.id || item.userID}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.membersListContent}
            ItemSeparatorComponent={() => <View style={{ width: 16 }} />}
          />
        </View>

        {/* Shared Songs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: '#ec489920' }]}>
                <Music size={18} color="#ec4899" />
              </View>
              <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
                Shared Songs
              </Text>
              <View style={[styles.countBadge, { backgroundColor: colorSet.secondaryBackground }]}>
                <Text style={[styles.countText, { color: colorSet.secondaryText }]}>
                  {songsCount}
                </Text>
              </View>
            </View>
            {songsCount > 0 && (
              <TouchableOpacity onPress={handleViewAllSongs}>
                <Text style={[styles.seeAllText, { color: colorSet.primaryForeground }]}>
                  See All
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {songsLoading ? (
            <View style={styles.loadingSection}>
              <Text style={[styles.loadingText, { color: colorSet.secondaryText }]}>
                Loading songs...
              </Text>
            </View>
          ) : songs.length > 0 ? (
            <FlatList
              data={songs.slice(0, 6)}
              renderItem={renderSong}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.songsListContent}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
            />
          ) : (
            <View style={styles.emptySection}>
              <Text style={[styles.emptyText, { color: colorSet.secondaryText }]}>
                No songs shared yet. Add songs to collaborate!
              </Text>
              <TouchableOpacity
                style={[styles.addSongButton, { backgroundColor: colorSet.primaryForeground }]}
                onPress={handleAddSong}>
                <Plus size={16} color="#fff" />
                <Text style={styles.addSongButtonText}>Add First Song</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Band Playlists Section (Coming Soon) */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: '#06b6d420' }]}>
                <ListMusic size={18} color="#06b6d4" />
              </View>
              <Text style={[styles.sectionTitle, { color: colorSet.primaryText }]}>
                Band Playlists
              </Text>
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Coming Soon</Text>
              </View>
            </View>
          </View>
          <View style={styles.emptySection}>
            <Text style={[styles.emptyText, { color: colorSet.secondaryText }]}>
              Create collaborative playlists with your band members.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  moreButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  bandCoverContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  bandCover: {
    width: '100%',
    height: '100%',
  },
  bandName: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  memberCount: {
    fontSize: 15,
    marginBottom: 8,
  },
  bandDescription: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  comingSoonBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 4,
  },
  comingSoonText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  membersListContent: {
    paddingHorizontal: 16,
  },
  memberItem: {
    alignItems: 'center',
    width: 72,
  },
  memberAvatarContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  adminBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  memberName: {
    fontSize: 12,
    textAlign: 'center',
  },
  songsListContent: {
    paddingHorizontal: 16,
  },
  songItem: {
    width: 120,
  },
  songImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  songTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  songArtist: {
    fontSize: 12,
  },
  loadingSection: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptySection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  addSongButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  addSongButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
})

export default BandDetailScreen
