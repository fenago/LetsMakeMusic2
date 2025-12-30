import React, { memo, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import {
  ChevronUp,
  ChevronDown,
  BarChart3,
  Play,
  Heart,
  MessageCircle,
  Clock,
  Share2,
  Download,
} from 'lucide-react-native'

/**
 * AnalyticsSection - Song stats with own collapsed state
 * Has its own useState to minimize parent re-renders
 */
const AnalyticsSection = ({
  playCount,
  likeCount,
  commentCount,
  totalPlayTime,
  shareCount,
  downloadCount,
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
          <BarChart3 size={20} color="#10b981" strokeWidth={2} />
          <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Analytics</Text>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
        ) : (
          <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={[styles.analyticsContainer, isDark && styles.analyticsContainerDark]}>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsItem}>
              <Play size={20} color="#3875e8" strokeWidth={2} />
              <Text style={[styles.analyticsValue, isDark && styles.analyticsValueDark]}>
                {playCount || 0}
              </Text>
              <Text style={[styles.analyticsLabel, isDark && styles.analyticsLabelDark]}>Plays</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Heart size={20} color="#ef4444" strokeWidth={2} />
              <Text style={[styles.analyticsValue, isDark && styles.analyticsValueDark]}>
                {likeCount || 0}
              </Text>
              <Text style={[styles.analyticsLabel, isDark && styles.analyticsLabelDark]}>Likes</Text>
            </View>
            <View style={styles.analyticsItem}>
              <MessageCircle size={20} color="#8b5cf6" strokeWidth={2} />
              <Text style={[styles.analyticsValue, isDark && styles.analyticsValueDark]}>
                {commentCount || 0}
              </Text>
              <Text style={[styles.analyticsLabel, isDark && styles.analyticsLabelDark]}>Comments</Text>
            </View>
          </View>
          <View style={styles.analyticsRow}>
            <View style={styles.analyticsItem}>
              <Clock size={20} color="#f59e0b" strokeWidth={2} />
              <Text style={[styles.analyticsValue, isDark && styles.analyticsValueDark]}>
                {totalPlayTime ? Math.floor(totalPlayTime / 60) : 0}
              </Text>
              <Text style={[styles.analyticsLabel, isDark && styles.analyticsLabelDark]}>Mins Played</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Share2 size={20} color="#06b6d4" strokeWidth={2} />
              <Text style={[styles.analyticsValue, isDark && styles.analyticsValueDark]}>
                {shareCount || 0}
              </Text>
              <Text style={[styles.analyticsLabel, isDark && styles.analyticsLabelDark]}>Shares</Text>
            </View>
            <View style={styles.analyticsItem}>
              <Download size={20} color="#22c55e" strokeWidth={2} />
              <Text style={[styles.analyticsValue, isDark && styles.analyticsValueDark]}>
                {downloadCount || 0}
              </Text>
              <Text style={[styles.analyticsLabel, isDark && styles.analyticsLabelDark]}>Downloads</Text>
            </View>
          </View>
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
  analyticsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
  },
  analyticsContainerDark: {
    backgroundColor: '#2c2c2e',
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  analyticsItem: {
    alignItems: 'center',
    flex: 1,
  },
  analyticsValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#151723',
    marginTop: 8,
    marginBottom: 4,
  },
  analyticsValueDark: {
    color: '#ffffff',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#7e7e7e',
  },
  analyticsLabelDark: {
    color: '#c5c5c5',
  },
})

export default memo(AnalyticsSection)
