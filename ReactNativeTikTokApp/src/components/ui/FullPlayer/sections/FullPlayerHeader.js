import React, { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronDown, MoreHorizontal } from 'lucide-react-native'

/**
 * FullPlayerHeader - Header with close and options buttons
 * Memoized to prevent re-renders
 */
const FullPlayerHeader = ({ onClose, onOptionsPress, isDark }) => {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={onClose}
        activeOpacity={0.7}
      >
        <ChevronDown size={28} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, isDark && styles.headerTitleDark]}>
        Now Playing
      </Text>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={onOptionsPress}
        activeOpacity={0.7}
      >
        <MoreHorizontal size={24} color={isDark ? '#ffffff' : '#151723'} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7e7e7e',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitleDark: {
    color: '#c5c5c5',
  },
})

export default memo(FullPlayerHeader)
