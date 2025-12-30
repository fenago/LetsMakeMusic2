import React, { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronRight, Edit3 } from 'lucide-react-native'

/**
 * EditSongButton - Opens edit song modal directly (no expandable state)
 */
const EditSongButton = ({ onPress, isDark }) => {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={onPress}
      >
        <View style={styles.sectionHeaderLeft}>
          <Edit3 size={20} color="#6366f1" strokeWidth={2} />
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Edit Song</Text>
        </View>
        <ChevronRight size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
      </TouchableOpacity>
      <Text style={[styles.sectionSubtext, isDark && styles.sectionSubtextDark]}>
        Edit title, style, visibility, and rights
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#151723',
  },
  sectionTitleDark: {
    color: '#ffffff',
  },
  sectionSubtext: {
    fontSize: 13,
    color: '#999999',
    marginTop: -4,
  },
  sectionSubtextDark: {
    color: '#888888',
  },
})

export default memo(EditSongButton)
