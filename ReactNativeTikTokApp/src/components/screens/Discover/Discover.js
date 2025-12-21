import React, { useLayoutEffect } from 'react'
import { SafeAreaView, ScrollView, Image, View, Text, TouchableOpacity, Dimensions } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Video } from 'expo-av'
import { RefreshControl } from 'react-native'
import { useTheme, ActivityIndicator, EmptyStateView } from '../../../core/dopebase'
import { useMediaPlayer } from '../../../contexts/MediaPlayerContext'
import { prepareSongForPlayer } from '../../../utils/audioUtils'
import dynamicStyles from './styles'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GRID_PADDING = 16
const GRID_GAP = 12
const SONG_CARD_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - GRID_GAP) / 2

// NOTE: getPlayableUrl is now imported from centralized audioUtils via prepareSongForPlayer

export default function Discover(props) {
  const {
    onCategoryPress,
    onCategoryItemPress,
    feed,
    emptyStateConfig,
    refreshing,
    onRefresh,
    songs = [], // AI-generated songs from Firebase
    songsLoading = false,
  } = props

  const { playSong } = useMediaPlayer()

  const navigation = useNavigation()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: theme.colors[appearance].primaryBackground,
      },
      headerTintColor: theme.colors[appearance].primaryText,
    })
  }, [navigation])

  /**
   * Handle song tap - play the song
   * Uses centralized prepareSongForPlayer from audioUtils for consistent behavior
   */
  const handleSongPress = (song) => {
    console.log('[Discover] handleSongPress called:', { id: song?.id, title: song?.title })
    const songForPlayer = prepareSongForPlayer(song)
    if (songForPlayer && songForPlayer.audioUrl) {
      playSong(songForPlayer)
    } else {
      console.warn('[Discover] No playable URL found for song:', song?.id)
    }
  }

  /**
   * Render the AI Songs section
   */
  const renderSongsSection = () => {
    if (songsLoading && songs.length === 0) {
      return (
        <View style={songStyles.sectionContainer}>
          <Text style={[songStyles.sectionTitle, { color: theme.colors[appearance].primaryText }]}>
            AI Generated Songs
          </Text>
          <View style={songStyles.loadingContainer}>
            <ActivityIndicator />
          </View>
        </View>
      )
    }

    if (songs.length === 0) {
      return null // Don't show section if no songs
    }

    return (
      <View style={songStyles.sectionContainer}>
        <View style={songStyles.sectionHeader}>
          <View style={songStyles.sectionIconContainer}>
            <Text style={songStyles.sectionIcon}>🎵</Text>
          </View>
          <View style={songStyles.sectionTitleContainer}>
            <Text style={[songStyles.sectionTitle, { color: theme.colors[appearance].primaryText }]}>
              AI Generated Songs
            </Text>
            <Text style={[songStyles.sectionSubtitle, { color: theme.colors[appearance].secondaryText }]}>
              {songs.length} songs available
            </Text>
          </View>
        </View>
        <View style={songStyles.songsGrid}>
          {songs.slice(0, 20).map((song) => (
            <TouchableOpacity
              key={song.id}
              style={songStyles.songCard}
              onPress={() => handleSongPress(song)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: song.imageUrl || 'https://picsum.photos/200/200?random=' + song.id }}
                style={songStyles.songImage}
              />
              <View style={songStyles.songInfo}>
                <Text
                  style={[songStyles.songTitle, { color: theme.colors[appearance].primaryText }]}
                  numberOfLines={1}
                >
                  {song.title || 'Untitled Song'}
                </Text>
                <Text
                  style={[songStyles.songStyle, { color: theme.colors[appearance].secondaryText }]}
                  numberOfLines={1}
                >
                  {song.style || 'AI Generated'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    )
  }

  const renderContent = () => {
    // Show loading only if both feed and songs are loading
    if (!feed && songsLoading) {
      return <ActivityIndicator />
    }

    // If we have songs but no feed, still show songs
    if (songs.length > 0 || (feed && feed.length > 0)) {
      return (
        <>
          {renderSongsSection()}
          {feed && feed.map((category, index) => renderVideoCategory(category, index))}
        </>
      )
    }

    // Empty state - no songs and no feed
    if ((!feed || feed.length === 0) && songs.length === 0) {
      return <EmptyStateView emptyStateConfig={emptyStateConfig} />
    }

    return null
  }

  const renderVideoCategory = (category, index) => (
    <View key={index.toString()} style={styles.categoryPrimary}>
      <View style={styles.categoryMain}>
        <View style={styles.categoryHashtagIcon}>
          <Image style={styles.icon} source={theme.icons.hashtagSymbol} />
        </View>
        <View style={styles.categoryDetail}>
          <Text style={styles.categoryName}>{category.hashtag}</Text>
          <Text style={styles.categoryDescription}>
            {category.description ?? 'Trending'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onCategoryPress(category.videos)}
          style={styles.categoryRightIcon}>
          <Image style={styles.icon} source={theme.icons.rightArrow} />
        </TouchableOpacity>
      </View>
      <View style={styles.categoryVideo}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {category.videos.map((video, key) =>
            video?.postMedia?.length < 1 ||
            !video?.postMedia[0].url ? null : (
              <TouchableOpacity
                key={video.id ?? key}
                onPress={() => onCategoryItemPress(category.videos, key)}>
                <Video
                  style={styles.video}
                  rate={1.0}
                  volume={1.0}
                  shouldPlay={false}
                  useNativeControls={false}
                  source={{ uri: video?.postMedia[0].url }}
                  resizeMode={'cover'}
                />
              </TouchableOpacity>
            ),
          )}
        </ScrollView>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  )
}

// Styles for the songs section
const songStyles = {
  sectionContainer: {
    paddingVertical: 16,
    paddingHorizontal: GRID_PADDING,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  loadingContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  songsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  songCard: {
    width: SONG_CARD_WIDTH,
    marginBottom: GRID_GAP,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  songImage: {
    width: SONG_CARD_WIDTH,
    height: SONG_CARD_WIDTH,
    borderRadius: 12,
  },
  songInfo: {
    padding: 10,
  },
  songTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  songStyle: {
    fontSize: 12,
    marginTop: 4,
  },
}