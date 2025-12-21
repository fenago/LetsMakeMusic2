import React, { memo, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  useColorScheme,
  Dimensions,
} from 'react-native'
import SectionHeader from '../SectionHeader'
import AlbumCard from '../AlbumCard'
import ArtistCard from '../ArtistCard'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_GAP = 12
const GRID_PADDING = 16
const GRID_COLUMNS = 2
const GRID_CARD_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - (GRID_GAP * (GRID_COLUMNS - 1))) / GRID_COLUMNS

/**
 * MusicFeedStyleB - Album Grid Home Style
 *
 * Features:
 * - Grid layout of featured albums at top
 * - Artists section with circular avatars
 * - Radio for you section
 * - Clean, minimal design focused on album artwork
 */
const MusicFeedStyleB = ({
  featuredAlbums = [],
  artists = [],
  radioStations = [],
  onViewAllArtists,
  onViewAllRadio,
  onArtistPress,
  onAlbumPress,
  onRadioPress,
  refreshing = false,
  onRefresh,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const { playList } = useMediaPlayer()

  const styles = getStyles(isDark)

  // Handle album press
  const handleAlbumPress = useCallback((album) => {
    onAlbumPress?.(album)
  }, [onAlbumPress])

  // Handle artist press
  const handleArtistPress = useCallback((artist) => {
    onArtistPress?.(artist)
  }, [onArtistPress])

  // Handle radio press - play as audio
  const handleRadioPress = useCallback((radio, index) => {
    if (radio.audioUrl) {
      const audioTracks = radioStations.filter(r => r.audioUrl).map(r => ({
        ...r,
        type: 'audio',
        audioUrl: r.audioUrl,
      }))
      const trackIndex = audioTracks.findIndex(t => t.id === radio.id)
      playList(audioTracks, trackIndex >= 0 ? trackIndex : 0)
    } else {
      onRadioPress?.(radio)
    }
  }, [radioStations, playList, onRadioPress])

  // Render album grid (2 columns)
  const renderAlbumGrid = () => {
    const rows = []
    for (let i = 0; i < featuredAlbums.length; i += GRID_COLUMNS) {
      const rowItems = featuredAlbums.slice(i, i + GRID_COLUMNS)
      rows.push(
        <View
          key={`row-${i}`}
          style={styles.gridRow}
        >
          {rowItems.map((album, idx) => (
            <View key={album.id ?? `${i}-${idx}`} style={styles.gridItem}>
              <AlbumCard
                album={album}
                onPress={handleAlbumPress}
                size={GRID_CARD_WIDTH}
              />
            </View>
          ))}
          {/* Fill empty space if odd number */}
          {rowItems.length < GRID_COLUMNS && (
            <View style={styles.gridItem} />
          )}
        </View>
      )
    }
    return rows
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      scrollEnabled={true}
      bounces={true}
      nestedScrollEnabled={true}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#ffffff' : '#151723'}
          />
        ) : undefined
      }
    >
      {/* Featured Albums Grid */}
      {featuredAlbums.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <View style={styles.grid}>
            {renderAlbumGrid()}
          </View>
        </View>
      )}

      {/* Artists Section */}
      {artists.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Artists"
            onViewAll={onViewAllArtists}
            showViewAll={artists.length > 5}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {artists.map((artist, index) => (
              <ArtistCard
                key={artist.id ?? index}
                artist={artist}
                onPress={handleArtistPress}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Radio for you Section */}
      {radioStations.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="Radio for you"
            onViewAll={onViewAllRadio}
            showViewAll={radioStations.length > 4}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {radioStations.map((radio, index) => (
              <AlbumCard
                key={radio.id ?? index}
                album={radio}
                onPress={() => handleRadioPress(radio, index)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bottom spacing for MiniPlayer */}
      <View style={{ height: 150 }} />
    </ScrollView>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isDark ? '#0f0f0f' : '#ffffff',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: isDark ? '#ffffff' : '#151723',
    paddingHorizontal: GRID_PADDING,
    marginBottom: 16,
  },
  grid: {
    paddingHorizontal: GRID_PADDING,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: GRID_GAP,
  },
  gridItem: {
    width: GRID_CARD_WIDTH,
    marginRight: GRID_GAP,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
})

export default memo(MusicFeedStyleB)
