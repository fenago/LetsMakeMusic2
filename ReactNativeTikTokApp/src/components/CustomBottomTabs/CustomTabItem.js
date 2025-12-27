import React from 'react'
import { TouchableOpacity, Image, Text, View } from 'react-native'
import { useTheme } from '../../core/dopebase'
import dynamicStyles from './styles'

function TabItem({
  route,
  onPress,
  focus,
  tabIcons,
  tabLabels,
  routeName,
  isAddPhoto,
  isTransparentTab,
  isVideoOverlay, // New prop: true when showing video content
  onAddPress,
}) {
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const onTabPress = () => {
    onPress(routeName)
  }

  if (isAddPhoto) {
    return (
      <View style={styles.buttonContainer}>
        <TouchableOpacity onPress={onAddPress} style={[styles.addContainer]}>
          <Image style={[styles.addIcon]} source={theme.icons.add} />
        </TouchableOpacity>
      </View>
    )
  }

  // Determine icon tint color based on state:
  // 1. Video overlay (transparent bg with video): always white
  // 2. Focused: brand primary color
  // 3. Unfocused: neutral secondary color
  const getIconStyle = () => {
    if (isVideoOverlay && isTransparentTab) {
      return styles.videoOverlayTintColor
    }
    return focus ? styles.focusTintColor : styles.unFocusTintColor
  }

  return (
    <TouchableOpacity style={styles.buttonContainer} onPress={onTabPress}>
      <Image
        style={[styles.icon, getIconStyle()]}
        source={
          focus ? tabIcons[route.name].focus : tabIcons[route.name].unFocus
        }
      />
      <Text
        style={[
          styles.title,
          focus && styles.titleFocused,
          isVideoOverlay && isTransparentTab && { color: '#F5F5F5' },
        ]}>
        {tabLabels?.[routeName] || routeName}
      </Text>
    </TouchableOpacity>
  )
}

export default TabItem
