import React from 'react'
import { View, Text } from 'react-native'
import { Image } from 'expo-image'
import { useTheme, IconButton } from '../../../../dopebase'
import dynamicStyles from './styles'
import { timeFormat } from '../../../../helpers/timeFormat'

export default function IMVendorReviewItem({ singleReview }) {
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const date = timeFormat(singleReview.createdAt)
  return (
    <View style={styles.reviewContainer}>
      <View style={[styles.horizontalPane, styles.pad]}>
        <View style={styles.horizontalPane}>
          <Image
            source={{ uri: singleReview.authorProfilePic }}
            style={styles.profilePic}
          />
          <View>
            <Text style={styles.authorName}>{singleReview.authorName}</Text>
            <Text style={styles.date}>{date}</Text>
          </View>
        </View>

        <View style={styles.starContainer}>
          {[1, 2, 3, 4, 5].map(item => (
            <IconButton
              source={
                item <= singleReview.rating
                  ? require('../../../assets/star-filled-icon.png')
                  : require('../../../assets/star-outlined-icon.png')
              }
              width={15}
              height={15}
              onPress={() => setRating(item)}
              tintColor={theme.colors[appearance].primaryForeground}
              style={styles.starStyle}
            />
          ))}
        </View>
      </View>
      <Text style={styles.reviewText}>{singleReview.text}</Text>
    </View>
  )
}
