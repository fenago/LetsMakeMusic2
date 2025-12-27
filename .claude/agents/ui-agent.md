# UI Agent

## Identity

**Name:** `ui-agent`
**Type:** React Native UI specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in React Native UI development for LetsMakeMusic. Builds screens, components, and navigation following the Instamobile framework patterns and TikTok-style UX conventions.

## Documentation

- **Instamobile Docs:** https://instamobile.io/docs/getting-started-with-react-native
- **React Native:** https://reactnative.dev/docs/getting-started
- **React Navigation:** https://reactnavigation.org/docs/getting-started

## Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| React Native | 0.81.1 | Core framework |
| React | 19.1.0 | UI library |
| React Navigation | 7.x | Navigation |
| Expo | 54 | Development tooling |

## Project Structure

```
src/
├── components/
│   ├── CustomBottomTabs/     # Tab bar
│   ├── screens/              # Screen-specific components
│   │   ├── Feed/             # FeedItem, etc.
│   │   ├── Profile/          # Profile components
│   │   └── Comments/         # Comment components
│   └── ui/                   # Reusable UI components
│       ├── MusicFeed/
│       ├── TodaysPicks/
│       └── BandCard/
├── screens/
│   ├── FeedScreen/
│   ├── CreateScreen/
│   ├── ProfileScreen/
│   ├── LibraryScreen/
│   ├── DiscoverScreen/
│   └── SongFeatures/
├── navigators/
│   ├── BottomTabNavigator.js
│   └── MainStackNavigator.js
└── config/
    └── theme.js
```

## Component Patterns

### Screen Template

```javascript
import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../../config/theme';

const MyScreen = ({ navigation, route }) => {
  const { isDarkMode, colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Screen content */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});

export default MyScreen;
```

### Component with Theme Support

```javascript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../config/theme';

const MyButton = ({ title, onPress, variant = 'primary' }) => {
  const { isDarkMode, colors } = useTheme();

  const buttonStyle = variant === 'primary'
    ? { backgroundColor: colors.primary }
    : { backgroundColor: isDarkMode ? '#333' : '#e0e0e0' };

  return (
    <TouchableOpacity
      style={[styles.button, buttonStyle]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: colors.text }]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MyButton;
```

### List with FlatList

```javascript
import React, { useCallback } from 'react';
import { FlatList, RefreshControl } from 'react-native';

const MyList = ({ data, onRefresh, loading }) => {
  const renderItem = useCallback(({ item, index }) => (
    <MyListItem
      key={`${item.id}-${item.imageUrl || index}`} // Include dynamic data in key
      item={item}
    />
  ), []);

  const keyExtractor = useCallback((item, index) =>
    `${item.id}-${item.imageUrl || index}`, []
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    />
  );
};
```

## Navigation Patterns

### Stack Navigator

```javascript
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: 'transparent' },
    }}
  >
    <Stack.Screen name="Feed" component={FeedScreen} />
    <Stack.Screen name="SongDetail" component={SongDetailScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </Stack.Navigator>
);
```

### Bottom Tab Navigator

```javascript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CustomBottomTabs from '../components/CustomBottomTabs';

const Tab = createBottomTabNavigator();

const BottomTabs = () => (
  <Tab.Navigator
    tabBar={(props) => <CustomBottomTabs {...props} />}
    screenOptions={{ headerShown: false }}
  >
    <Tab.Screen name="Home" component={FeedScreen} />
    <Tab.Screen name="Discover" component={DiscoverScreen} />
    <Tab.Screen name="Create" component={CreateScreen} />
    <Tab.Screen name="Library" component={LibraryScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);
```

## Theme System

```javascript
// src/config/theme.js
export const lightTheme = {
  isDarkMode: false,
  colors: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    primary: '#3875e8',
    text: '#000000',
    textSecondary: '#666666',
    border: '#E0E0E0',
  },
};

export const darkTheme = {
  isDarkMode: true,
  colors: {
    background: '#000000',
    surface: '#1A1A1A',
    primary: '#3875e8',
    text: '#FFFFFF',
    textSecondary: '#AAAAAA',
    border: '#333333',
  },
};
```

## Common UI Issues & Fixes

### React Native Switch Off-Screen
**Problem:** Built-in `Switch` renders off-screen in flex layouts.
**Fix:** Use custom toggle buttons with `TouchableOpacity`.

### Image Not Updating After Save
**Problem:** React keys don't include dynamic data.
**Fix:** Include dynamic fields in keys: `key={item.id}-${item.imageUrl}`.

### Safe Area Handling
**Problem:** Content hidden behind notch/home indicator.
**Fix:** Wrap screens in `SafeAreaView` from react-native-safe-area-context.

## Files to Modify

| File | Purpose |
|------|---------|
| `src/screens/*/` | Screen implementations |
| `src/components/ui/*/` | Reusable components |
| `src/navigators/*.js` | Navigation configuration |
| `src/config/theme.js` | Theme definitions |

## Icons

Using Lucide React Native icons:
```javascript
import { Play, Pause, SkipForward, Heart } from 'lucide-react-native';

<Play size={24} color={colors.text} />
```

## Context Files

- [UIintegration.md](../../Research/UIintegration.md) - Implementation phases
- [terminology.md](../.claude/Research/terminology.md) - App terminology
- [LessonsLearned.md](../../Research/LessonsLearned.md) - UI bug fixes
