import React, { memo, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { ChevronUp, ChevronDown, ChevronRight, Share2, User, Music } from 'lucide-react-native'

/**
 * ShareSection - Share options with own collapsed state
 * Has its own useState to minimize parent re-renders
 */
const ShareSection = ({
  onShare,
  onShareWithUser,
  onShareToFeed,
  isDark,
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev)
  }, [])

  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.7}
        onPress={toggleExpanded}
      >
        <View style={styles.sectionHeaderLeft}>
          <Share2 size={20} color="#ec4899" strokeWidth={2} />
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Share</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
        ) : (
          <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.actionsList, isDark && styles.actionsListDark]}>
          <TouchableOpacity style={styles.actionItem} onPress={onShare}>
            <View style={styles.actionItemLeft}>
              <Share2 size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
              <Text style={[styles.actionItemText, isDark && styles.actionItemTextDark]}>Share</Text>
            </View>
            <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={onShareWithUser}>
            <View style={styles.actionItemLeft}>
              <User size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
              <Text style={[styles.actionItemText, isDark && styles.actionItemTextDark]}>Share with user</Text>
            </View>
            <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={onShareToFeed}>
            <View style={styles.actionItemLeft}>
              <Music size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
              <Text style={[styles.actionItemText, isDark && styles.actionItemTextDark]}>Share to feed</Text>
            </View>
            <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}
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
  actionsList: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionsListDark: {
    backgroundColor: '#2c2c2e',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionItemText: {
    fontSize: 15,
    color: '#151723',
    flex: 1,
  },
  actionItemTextDark: {
    color: '#ffffff',
  },
})

export default memo(ShareSection)
