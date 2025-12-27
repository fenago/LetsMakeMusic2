import React, { useState, useEffect, useCallback } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DNDefaultTheme from './default'

export default DNDefaultTheme

export const DopebaseContext = React.createContext()

const THEME_PREFERENCE_KEY = 'APP_THEME_PREFERENCE'

const defaultProps = {
  children: null,
  theme: {},
}

export function DopebaseProvider(props = defaultProps) {
  const { theme, children } = props
  const systemColorScheme = useColorScheme()
  const [themePreference, setThemePreference] = useState('system') // 'system', 'light', 'dark'
  const [isLoaded, setIsLoaded] = useState(false)

  // Load saved theme preference on mount
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_PREFERENCE_KEY)
        if (saved) {
          setThemePreference(saved)
        }
      } catch (error) {
        console.log('Error loading theme preference:', error)
      }
      setIsLoaded(true)
    }
    loadThemePreference()
  }, [])

  const setAppearance = useCallback(async (preference) => {
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference)
      setThemePreference(preference)
    } catch (error) {
      console.log('Error saving theme preference:', error)
    }
  }, [])

  // Determine actual appearance based on preference
  const appearance = themePreference === 'system'
    ? (systemColorScheme || 'light')
    : themePreference

  const overridenTheme = { ...DNDefaultTheme, ...theme }
  const context = {
    theme: overridenTheme,
    appearance,
    themePreference,
    setAppearance,
  }

  // Don't render until we've loaded the preference to avoid flash
  if (!isLoaded) {
    return null
  }

  return (
    <DopebaseContext.Provider value={context}>
      {children}
    </DopebaseContext.Provider>
  )
}

export function useDopebase(Component, styles) {
  return props => {
    const colorScheme = useColorScheme()
    return (
      <DopebaseContext.Consumer>
        {context => (
          <Component
            {...props}
            theme={{ ...DNDefaultTheme, ...context.theme }}
            appearance={colorScheme || context.appearance}
            styles={
              styles &&
              styles(
                { ...DNDefaultTheme, ...context.theme },
                context.appearance,
              )
            }
          />
        )}
      </DopebaseContext.Consumer>
    )
  }
}

export function extendTheme(theme) {
  return { ...DNDefaultTheme, ...theme }
}

export function useTheme() {
  return React.useContext(DopebaseContext)
}
