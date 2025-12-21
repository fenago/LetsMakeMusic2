import React, { memo, useState, useRef, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import Animated, { FadeIn } from 'react-native-reanimated'

/**
 * TopTabs - Horizontal scrollable filter tabs
 *
 * Features:
 * - Horizontal scroll with smooth snapping
 * - Active tab highlighting
 * - Dark/light mode support
 * - Pill-style active indicator
 */
const TopTabs = ({ tabs = [], activeTab = 0, onTabChange }) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const scrollViewRef = useRef(null)

  const handleTabPress = useCallback((tab, index) => {
    onTabChange?.(tab, index)
  }, [onTabChange])

  if (!tabs || tabs.length === 0) {
    return null
  }

  const styles = getStyles(isDark)

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === index
          return (
            <TouchableOpacity
              key={tab.id ?? index}
              style={[
                styles.tab,
                isActive && styles.activeTab,
              ]}
              onPress={() => handleTabPress(tab, index)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  isActive && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>
    </Animated.View>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
  },
  activeTab: {
    backgroundColor: isDark ? '#ffffff' : '#000000',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: isDark ? '#a0a0a0' : '#666666',
  },
  activeTabText: {
    color: isDark ? '#000000' : '#ffffff',
    fontWeight: '600',
  },
})

export default memo(TopTabs)
