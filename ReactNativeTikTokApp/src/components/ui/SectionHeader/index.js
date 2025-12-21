import React, { memo } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native'

/**
 * SectionHeader - Section heading with optional "View all" button
 *
 * Used for section titles like "Your favorites", "Playlist for you"
 */
const SectionHeader = ({
  title,
  onViewAll,
  showViewAll = true,
  style,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'

  const styles = getStyles(isDark)

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      {showViewAll && onViewAll && (
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24, // mt-6
    marginBottom: 12, // mb-3
  },
  title: {
    fontSize: 24, // size="2xl"
    fontWeight: '500', // font-medium
    color: isDark ? '#fafafa' : '#0a0a0a', // text-typography-950
    flex: 1,
  },
  viewAll: {
    fontSize: 14,
    color: isDark ? '#a3a3a3' : '#525252', // secondary link color
    fontWeight: '500',
    paddingHorizontal: 12, // px-3
  },
})

export default memo(SectionHeader)
