import React from 'react'
import { Platform } from 'react-native'
import { createStackNavigator } from '@react-navigation/stack'
import { useTranslations } from '../core/dopebase'
import {
  HomeScreen,
  DiscoverScreen,
  ProfileScreen,
  ChatScreen,
  LibraryScreen,
  CreateScreen,
} from '../screens'
import { IMCreateGroupScreen } from '../core/chat'
import {
  IMFriendsScreen,
  IMUserSearchModal,
} from '../core/socialgraph/friendships'

const InnerStack = createStackNavigator()
const InnerFeedNavigator = () => {
  return (
    <InnerStack.Navigator initialRouteName="Feed">
      <InnerStack.Screen
        name="Feed"
        options={{ headerShown: false }}
        component={HomeScreen}
      />
    </InnerStack.Navigator>
  )
}

const ChatSearch = createStackNavigator()
const InnerChatSearchNavigator = () => {
  return (
    <ChatSearch.Navigator
      initialRouteName="Main"
      screenOptions={{ headerShown: false }}>
      <ChatSearch.Screen
        name="Main"
        component={InnerChatNavigator}
      />
      <ChatSearch.Screen
        name="UserSearchScreen"
        component={IMUserSearchModal}
        options={{ headerShown: true }}
      />
    </ChatSearch.Navigator>
  )
}

const InnerChat = createStackNavigator()
const InnerChatNavigator = () => {
  return (
    <InnerChat.Navigator initialRouteName="Chat">
      <InnerChat.Screen name="Chat" component={ChatScreen} />
      <InnerChat.Screen name="CreateGroup" component={IMCreateGroupScreen} />
    </InnerChat.Navigator>
  )
}

const FriendsSearch = createStackNavigator()
const InnerFriendsSearchNavigator = () => {
  return (
    <FriendsSearch.Navigator
      initialRouteName="Friends"
      screenOptions={{ headerShown: false }}>
      <FriendsSearch.Screen
        name="Friends"
        component={InnerFriendsNavigator}
      />
      <FriendsSearch.Screen
        name="UserSearchScreen"
        component={IMUserSearchModal}
        options={{ headerShown: true }}
      />
    </FriendsSearch.Navigator>
  )
}

const InnerFriends = createStackNavigator()
const InnerFriendsNavigator = () => {
  const { localized } = useTranslations()
  return (
    <InnerFriends.Navigator initialRouteName="Friends">
      <InnerFriends.Screen
        initialParams={{
          followEnabled: false,
          friendsScreenTitle: localized('Friends'),
          showDrawerMenuButton: Platform.OS == 'android',
        }}
        options={{ headerShown: false }}
        name="Friends"
        component={IMFriendsScreen}
      />
    </InnerFriends.Navigator>
  )
}

const InnerDiscover = createStackNavigator()
const InnerDiscoverNavigator = () => {
  return (
    <InnerDiscover.Navigator initialRouteName="Discover">
      <InnerDiscover.Screen name="Discover" component={DiscoverScreen} />
    </InnerDiscover.Navigator>
  )
}

const InnerProfile = createStackNavigator()
const InnerProfileNavigator = () => {
  return (
    <InnerProfile.Navigator initialRouteName="Profile">
      <InnerProfile.Screen
        name="Profile"
        initialParams={{
          hasBottomTab: true,
        }}
        component={ProfileScreen}
      />
    </InnerProfile.Navigator>
  )
}

const InnerLibrary = createStackNavigator()
const InnerLibraryNavigator = () => {
  return (
    <InnerLibrary.Navigator
      initialRouteName="Library"
      screenOptions={{ headerShown: false }}>
      <InnerLibrary.Screen name="Library" component={LibraryScreen} />
    </InnerLibrary.Navigator>
  )
}

const InnerCreate = createStackNavigator()
const InnerCreateNavigator = () => {
  return (
    <InnerCreate.Navigator
      initialRouteName="CreateSong"
      screenOptions={{ headerShown: false }}>
      <InnerCreate.Screen name="CreateSong" component={CreateScreen} />
    </InnerCreate.Navigator>
  )
}

export {
  InnerFeedNavigator,
  InnerChatSearchNavigator,
  InnerFriendsSearchNavigator,
  InnerDiscoverNavigator,
  InnerProfileNavigator,
  InnerLibraryNavigator,
  InnerCreateNavigator,
}
