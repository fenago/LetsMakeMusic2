import React from 'react'
import { Text, View } from 'react-native'
import { Image } from 'expo-image'
import { useTheme } from '../../../core/dopebase'
import dynamicStyles from './styles'

const defaultAvatar =
  'https://www.iosapptemplates.com/wp-content/uploads/2019/06/empty-avatar.jpg'

function CommentItem(props) {
  const { item } = props
  const { author } = item
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

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
          <Text style={styles.commentItemBodyTitle}>
            {author.username?.length > 0 ? author.username : author.firstName}
          </Text>
          <Text style={styles.commentItemBodySubtitle}>{item.text || item.commentText}</Text>
        </View>
      </View>
    </View>
  )
}

export default CommentItem
