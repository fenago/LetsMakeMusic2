import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import {
  ChevronLeft,
  Pencil,
  Trash2,
  Music,
  Video,
  Image as ImageIcon,
  Hash,
  MessageCircle,
  Heart,
} from 'lucide-react-native'
import functions from '@react-native-firebase/functions'
import { useCurrentUser } from '../../core/onboarding'
import { useMyPosts } from '../../hooks/useMyPosts'
import EditPostModal from '../../components/ui/EditPostModal'
import { IMRichTextView } from '../../core/mentions'

/**
 * ManageFeedScreen - View and manage user's feed posts
 *
 * Features:
 * - List all posts shared to feed
 * - Edit caption and hashtags
 * - Delete posts
 * - Shows post stats (likes, comments)
 */
const ManageFeedScreen = () => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const navigation = useNavigation()
  const styles = getStyles(isDark)

  const currentUser = useCurrentUser()
  const userId = currentUser?.id || currentUser?.userID

  const {
    posts,
    loading,
    refreshing,
    refresh,
    removePostLocally,
    updatePostLocally,
  } = useMyPosts(userId)

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [deletingPostId, setDeletingPostId] = useState(null)

  const handleEdit = useCallback((post) => {
    setEditingPost(post)
    setEditModalVisible(true)
  }, [])

  const handleEditSuccess = useCallback((updates) => {
    if (editingPost?.id) {
      updatePostLocally(editingPost.id, updates)
    }
    setEditingPost(null)
  }, [editingPost, updatePostLocally])

  const handleDelete = useCallback((post) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingPostId(post.id)
            try {
              const deletePost = functions().httpsCallable('deletePost')
              await deletePost({ postId: post.id })
              removePostLocally(post.id)
            } catch (error) {
              console.error('[ManageFeedScreen] Delete error:', error)
              Alert.alert('Error', 'Failed to delete post')
            } finally {
              setDeletingPostId(null)
            }
          },
        },
      ]
    )
  }, [removePostLocally])

  const getPostTypeIcon = (post) => {
    if (post.postType === 'song' || post.songData) {
      return <Music size={14} color={isDark ? '#8e8e93' : '#666'} />
    }
    const mediaType = post.postMedia?.[0]?.type || ''
    if (mediaType.includes('video')) {
      return <Video size={14} color={isDark ? '#8e8e93' : '#666'} />
    }
    return <ImageIcon size={14} color={isDark ? '#8e8e93' : '#666'} />
  }

  const getPostThumbnail = (post) => {
    // Try song cover first
    if (post.songData?.imageUrl) return post.songData.imageUrl
    // Then post media thumbnail
    if (post.postMedia?.[0]?.thumbnailURL) return post.postMedia[0].thumbnailURL
    // Then direct URL for images
    if (post.postMedia?.[0]?.url && post.postMedia[0].type?.includes('image')) {
      return post.postMedia[0].url
    }
    return null
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.seconds
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp * 1000)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const renderPost = ({ item: post }) => {
    const thumbnail = getPostThumbnail(post)
    const caption = post.postText || post.description || ''
    const hashtags = post.hashtags || []
    const isDeleting = deletingPostId === post.id

    return (
      <View style={[styles.postCard, isDeleting && styles.postCardDeleting]}>
        {/* Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              {getPostTypeIcon(post)}
            </View>
          )}
          <View style={styles.postTypeBadge}>
            {getPostTypeIcon(post)}
          </View>
        </View>

        {/* Content */}
        <View style={styles.postContent}>
          {/* Caption */}
          <View style={styles.captionContainer}>
            <IMRichTextView
              defaultTextStyle={styles.caption}
              usernameStyle={styles.mention}
              hashTagStyle={styles.hashtag}
            >
              {caption || 'No caption'}
            </IMRichTextView>
          </View>

          {/* Hashtags chips */}
          {hashtags.length > 0 && (
            <View style={styles.hashtagsRow}>
              <Hash size={12} color={isDark ? '#8e8e93' : '#666'} />
              <Text style={styles.hashtagsText} numberOfLines={1}>
                {hashtags.slice(0, 3).map(t => t.startsWith('#') ? t : `#${t}`).join(' ')}
                {hashtags.length > 3 && ` +${hashtags.length - 3}`}
              </Text>
            </View>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Heart size={12} color={isDark ? '#8e8e93' : '#666'} />
              <Text style={styles.statText}>{post.reactionsCount || 0}</Text>
            </View>
            <View style={styles.stat}>
              <MessageCircle size={12} color={isDark ? '#8e8e93' : '#666'} />
              <Text style={styles.statText}>{post.commentsCount || 0}</Text>
            </View>
            <Text style={styles.dateText}>{formatDate(post.createdAt)}</Text>
            {post.isEdited && <Text style={styles.editedBadge}>Edited</Text>}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isDeleting ? (
            <ActivityIndicator size="small" color="#ff3b30" />
          ) : (
            <>
              <TouchableOpacity
                onPress={() => handleEdit(post)}
                style={styles.actionButton}
              >
                <Pencil size={18} color="#2126A2" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDelete(post)}
                style={styles.actionButton}
              >
                <Trash2 size={18} color="#ff3b30" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    )
  }

  const renderEmpty = () => {
    if (loading) return null
    return (
      <View style={styles.emptyContainer}>
        <Music size={48} color={isDark ? '#333' : '#ccc'} />
        <Text style={styles.emptyTitle}>No Posts Yet</Text>
        <Text style={styles.emptySubtitle}>
          Share your songs to the feed and they'll appear here
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ChevronLeft size={28} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Feed</Text>
        <View style={styles.headerRight}>
          <Text style={styles.postCount}>{posts.length} posts</Text>
        </View>
      </View>

      {/* Posts List */}
      {loading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2126A2" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#2126A2"
            />
          }
        />
      )}

      {/* Edit Modal */}
      <EditPostModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false)
          setEditingPost(null)
        }}
        post={editingPost}
        onSaveSuccess={handleEditSuccess}
      />
    </SafeAreaView>
  )
}

const getStyles = (isDark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#0a0a0a' : '#f5f5f5',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingVertical: 12,
      backgroundColor: isDark ? '#0a0a0a' : '#fff',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1c1c1e' : '#e0e0e0',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
    },
    headerRight: {
      paddingRight: 16,
    },
    postCount: {
      fontSize: 14,
      color: isDark ? '#8e8e93' : '#666',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    listContent: {
      padding: 12,
      paddingBottom: 100,
    },
    postCard: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1c1c1e' : '#fff',
      borderRadius: 12,
      marginBottom: 12,
      padding: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    postCardDeleting: {
      opacity: 0.5,
    },
    thumbnailContainer: {
      position: 'relative',
    },
    thumbnail: {
      width: 70,
      height: 70,
      borderRadius: 8,
      backgroundColor: isDark ? '#333' : '#e0e0e0',
    },
    thumbnailPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    postTypeBadge: {
      position: 'absolute',
      bottom: 4,
      right: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
      borderRadius: 4,
      padding: 2,
    },
    postContent: {
      flex: 1,
      marginLeft: 12,
      justifyContent: 'center',
    },
    captionContainer: {
      marginBottom: 4,
    },
    caption: {
      fontSize: 14,
      color: isDark ? '#fff' : '#000',
      lineHeight: 18,
    },
    mention: {
      color: '#2126A2',
      fontWeight: '600',
    },
    hashtag: {
      color: '#2126A2',
    },
    hashtagsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    hashtagsText: {
      fontSize: 12,
      color: isDark ? '#8e8e93' : '#666',
      marginLeft: 4,
    },
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 12,
      color: isDark ? '#8e8e93' : '#666',
    },
    dateText: {
      fontSize: 11,
      color: isDark ? '#666' : '#999',
    },
    editedBadge: {
      fontSize: 10,
      color: isDark ? '#666' : '#999',
      fontStyle: 'italic',
    },
    actions: {
      justifyContent: 'center',
      gap: 12,
    },
    actionButton: {
      padding: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 80,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#fff' : '#000',
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: isDark ? '#8e8e93' : '#666',
      marginTop: 8,
      textAlign: 'center',
      paddingHorizontal: 40,
    },
  })

export default ManageFeedScreen
