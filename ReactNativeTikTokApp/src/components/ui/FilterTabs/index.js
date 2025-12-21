import React, { memo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
} from 'react-native'

/**
 * FilterTabs - Horizontal scrollable filter tabs
 *
 * Used for filtering content (All, Music, Videos, etc.)
 */
const FilterTabs = ({
  tabs = [],
  activeTab = 0,
  onTabChange,
  style,
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [selectedTab, setSelectedTab] = useState(activeTab)

  const handleTabPress = (index) => {
    setSelectedTab(index)
    onTabChange?.(index)
  }

  const styles = getStyles(isDark)

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {tabs.map((tab, index) => {
        const isActive = selectedTab === index
        return (
          <TouchableOpacity
            key={tab.id ?? index}
            style={[
              styles.tab,
              isActive && styles.activeTab,
            ]}
            onPress={() => handleTabPress(index)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              isActive && styles.activeTabText,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )
      })}
    </ScrollView>
  )
}

const getStyles = (isDark) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10, // gap-2.5
  },
  tab: {
    paddingHorizontal: 20, // px-5
    paddingVertical: 8, // py-2
    borderRadius: 9999, // rounded-full
    backgroundColor: isDark ? '#262626' : '#f5f5f5', // bg-background-50
  },
  activeTab: {
    backgroundColor: '#2126A2', // bg-[#2126A2] - exact reference color
  },
  tabText: {
    fontSize: 18, // size="lg"
    fontWeight: '400',
    color: isDark ? '#fafafa' : '#0a0a0a', // text-typography-950
  },
  activeTabText: {
    color: '#ffffff',
  },
})

export default memo(FilterTabs)
