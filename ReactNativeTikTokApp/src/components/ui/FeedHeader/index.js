import React, { memo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
} from 'react-native'

/**
 * FeedHeader - Greeting header for Home/Feed screen
 *
 * Displays personalized greeting based on time of day
 * "Good Morning John" / "Have a nice day!"
 */
const FeedHeader = ({ userName = 'there' }) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  // Get subtext based on time of day
  const getSubtext = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Have a great day!'
    if (hour < 17) return 'Keep the vibes going!'
    return 'Time to unwind!'
  }

  const styles = getStyles(isDark)

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>
        {getGreeting()} {userName}
      </Text>
      <Text style={styles.subtext}>
        {getSubtext()}
      </Text>
    </View>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  greeting: {
    fontSize: 30, // size="3xl"
    fontWeight: '500', // font-medium
    color: isDark ? '#e5e5e5' : '#171717', // text-typography-900
    marginBottom: 4,
  },
  subtext: {
    fontSize: 20, // size="xl"
    color: isDark ? '#737373' : '#525252', // text-typography-600
  },
})

export default memo(FeedHeader)
