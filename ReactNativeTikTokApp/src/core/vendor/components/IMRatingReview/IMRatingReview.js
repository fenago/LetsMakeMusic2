import React from 'react'
import { Image, View, Text, TouchableOpacity } from 'react-native'
import dynamicStyles from './styles'
import { useTheme } from '../../../dopebase'

export default function Rating({ rating, number, onPressReview }) {
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  if (rating === 0) {
    return <View style={styles.container} />
  }

  return (
    <TouchableOpacity onPress={onPressReview}>
      <View style={styles.container}>
        <Text style={styles.rating}>{rating.toFixed(2)}</Text>
        <Image
          tintColor={theme.colors[appearance].primaryForeground}
          style={styles.image}
          source={require('../../../../assets/images/gold_star.png')}
        />
        <Text style={styles.rating}>({number})</Text>
      </View>
    </TouchableOpacity>
  )
}
