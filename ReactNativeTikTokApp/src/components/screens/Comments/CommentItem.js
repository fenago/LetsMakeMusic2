import React from 'react'
import { Text, View, TouchableOpacity, Alert } from 'react-native'
import { Image } from 'expo-image'
import { Trash2, Pencil } from 'lucide-react-native'
import { useTheme } from '../../../core/dopebase'
import { useNavigation } from '@react-navigation/native'
import { IMRichTextView } from '../../../core/mentions'
import dynamicStyles from './styles'

const defaultAvatar =
  'https://www.iosapptemplates.com/wp-content/uploads/2019/06/empty-avatar.jpg'

function CommentItem(props) {
  const { item, currentUserId, onDelete, onEdit, onUserPress, onHashTagPress } = props
  const navigation = useNavigation()
  const { author } = item
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  // Check if current user is the author of this comment
  const isAuthor = currentUserId && (author?.id === currentUserId || item.authorID === currentUserId)

  const handleDelete = () => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('[CommentItem] Delete confirmed for comment:', item.id)
            onDelete?.()
          },
        },
      ]
    )
  }

  const handleEdit = () => {
    console.log('[CommentItem] Edit pressed for comment:', item.id)
    onEdit?.(item)
  }

  const handleUserPress = (userInfo) => {
    if (onUserPress) {
      onUserPress(userInfo)
    } else {
      // Default: navigate to user profile
      navigation.push('Profile', { user: userInfo })
    }
  }

  const handleHashTagPress = (hashtag) => {
    if (onHashTagPress) {
      onHashTagPress(hashtag)
    } else {
      // Default: navigate to hashtag feed
      const tag = hashtag.startsWith('#') ? hashtag.slice(1) : hashtag
      navigation.push('HashtagFeed', { hashtag: tag })
    }
  }

  const commentText = item.text || item.commentText || ''
  const isEdited = item.isEdited === true

  return (
    <View style={styles.commentItemContainer}>
      <View style={styles.commentItemImageContainer}>
        <Image
          style={styles.commentItemImage}
          source={{
            uri: author?.profilePictureURL ?? defaultAvatar,
          }}
        />
      </View>
      <View style={styles.commentItemBodyContainer}>
        <View style={styles.commentItemBodyRadiusContainer}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.commentItemBodyTitle}>
              {author.username?.length > 0 ? author.username : author.firstName}
            </Text>
            {isAuthor && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity onPress={handleEdit} style={{ padding: 4 }}>
                  <Pencil size={14} color="#666666" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete} style={{ padding: 4 }}>
                  <Trash2 size={16} color="#ff4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          <IMRichTextView
            defaultTextStyle={styles.commentItemBodySubtitle}
            usernameStyle={styles.mentionText}
            hashTagStyle={styles.hashtagText}
            onUserPress={handleUserPress}
            onHashTagPress={handleHashTagPress}
          >
            {commentText}
          </IMRichTextView>
          {isEdited && (
            <Text style={styles.editedLabel}>(edited)</Text>
          )}
        </View>
      </View>
    </View>
  )
}

export default CommentItem
