import React from 'react'
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack'
import BottomTabNavigator from './BottomTabNavigator'
import { useTranslations } from '../core/dopebase'
import {
  IMEditProfileScreen,
  IMUserSettingsScreen,
  IMContactUsScreen,
  IMProfileSettingsScreen,
  IMBlockedUsersScreen,
} from '../core/profile'
import { IMAllFriendsScreen } from '../core/socialgraph/friendships'
import { IMChatScreen, IMViewGroupMembersScreen, IMCreateGroupScreen } from '../core/chat'
import { IMNotificationScreen } from '../core/notifications'
import {
  CustomFeedScreen,
  CommentsScreen,
  ProfileScreen,
  HomeScreen,
  FeedSearchScreen,
  CameraScreen,
  CreateScreen,
  NewPostScreen,
  SongPickerScreen,
  SystemStatusScreen,
  FoundersScreen,
  AboutUsScreen,
  VideosScreen,
  ShareSongToFeedScreen,
  DebugLogsScreen,
  BandDetailScreen,
  BandSongsScreen,
  AddSongToBandScreen,
  AddMembersToBandScreen,
  // Song Features screens
  CreateMusicVideoScreen,
  ExtendSongScreen,
  ReinterpretSongScreen,
  AddVocalsScreen,
  AddInstrumentsScreen,
  GetTimestampedLyricsScreen,
  ChangeSongCoverScreen,
  AddMediaForVideoScreen,
  GetAcapellaScreen,
  StemSongScreen,
  CreateLyricsScreen,
  BuildBeatsScreen,
} from '../screens'
// import { Camera, NewPost, ComposerSongs } from '../components';
import { InnerFriendsSearchNavigator } from './InnerStackNavigators'
import useNotificationOpenedApp from '../core/helpers/notificationOpenedApp'

const MainStack = createStackNavigator()
const MainStackNavigator = () => {
  useNotificationOpenedApp()
  const { localized } = useTranslations()

  return (
    <MainStack.Navigator
      screenOptions={{
        headerBackTitleVisible: false,
        headerBackTitle: localized('Back'),
      }}
      initialRouteName="NavStack">
      <MainStack.Screen
        name="NavStack"
        options={{
          headerShown: false,
        }}
        component={BottomTabNavigator}
      />
      <MainStack.Screen
        options={{
          headerTransparent: true,
          headerTitle: '',
          headerTintColor: '#fff',
        }}
        name="DiscoverFeed"
        component={HomeScreen}
      />
      <MainStack.Screen
        options={{
          headerTransparent: true,
          headerTitle: '',
          headerTintColor: '#fff',
        }}
        name="CustomFeedScreen"
        component={CustomFeedScreen}
      />
      <MainStack.Screen name="Comments" component={CommentsScreen} />
      <MainStack.Screen
        name="FeedSearch"
        component={FeedSearchScreen}
        options={{
          headerTitle: localized('Hashtags'),
        }}
      />
      <MainStack.Screen
        options={{
          headerTitle: '',
        }}
        name="Profile"
        component={ProfileScreen}
      />
      <MainStack.Screen
        name="ProfileEditProfile"
        component={IMEditProfileScreen}
      />
      <MainStack.Screen
        name="ProfileAppSettings"
        component={IMUserSettingsScreen}
      />
      <MainStack.Screen
        name="ProfileSettings"
        component={IMProfileSettingsScreen}
      />
      <MainStack.Screen
        name="ProfileBlockedSettings"
        component={IMBlockedUsersScreen}
      />
      <MainStack.Screen name="ProfileContactUs" component={IMContactUsScreen} />
      <MainStack.Screen name="ProfileFounders" component={FoundersScreen} />
      <MainStack.Screen name="ProfileAboutUs" component={AboutUsScreen} />
      <MainStack.Screen
        name="Videos"
        options={{
          headerTitle: 'My Videos',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
        }}
        component={VideosScreen}
      />
      <MainStack.Screen
        name="ShareSongToFeed"
        options={{
          headerTitle: 'Share to Feed',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={ShareSongToFeedScreen}
      />
      <MainStack.Screen name="AllFriends" component={IMAllFriendsScreen} />
      <MainStack.Screen
        name="Friends"
        options={{ headerShown: false }}
        component={InnerFriendsSearchNavigator}
      />
      <MainStack.Screen
        name="Create"
        options={{
          headerShown: false,
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={CreateScreen}
      />
      <MainStack.Screen
        name="Camera"
        options={{
          headerShown: false,
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={CameraScreen}
      />
      <MainStack.Screen
        name="SongPicker"
        options={{
          headerShown: false,
          title: 'Sounds',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={SongPickerScreen}
      />
      <MainStack.Screen
        name="NewPost"
        options={{
          headerShown: false,
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={NewPostScreen}
      />
      <MainStack.Screen name="PersonalChat" component={IMChatScreen} />
      <MainStack.Screen name="CreateGroup" component={IMCreateGroupScreen} />
      <MainStack.Screen
        name="ViewGroupMembers"
        component={IMViewGroupMembersScreen}
      />
      <MainStack.Screen name="Notification" component={IMNotificationScreen} />
      <MainStack.Screen name="ContactUs" component={IMContactUsScreen} />
      <MainStack.Screen
        name="SystemStatus"
        options={{
          headerTitle: 'System Status',
          headerStyle: {
            backgroundColor: '#000',
          },
          headerTintColor: '#fff',
        }}
        component={SystemStatusScreen}
      />
      <MainStack.Screen
        name="DebugLogs"
        options={{
          headerShown: false,
        }}
        component={DebugLogsScreen}
      />
      {/* Band Screens */}
      <MainStack.Screen
        name="BandDetail"
        options={{
          headerShown: false,
        }}
        component={BandDetailScreen}
      />
      <MainStack.Screen
        name="BandSongs"
        options={{
          headerShown: false,
        }}
        component={BandSongsScreen}
      />
      <MainStack.Screen
        name="AddSongToBand"
        options={{
          headerShown: false,
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={AddSongToBandScreen}
      />
      <MainStack.Screen
        name="AddMembersToBand"
        options={{
          headerShown: false,
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={AddMembersToBandScreen}
      />
      {/* Song Feature Screens */}
      <MainStack.Screen
        name="CreateMusicVideo"
        options={{
          headerTitle: 'Create Music Video',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={CreateMusicVideoScreen}
      />
      <MainStack.Screen
        name="ExtendSong"
        options={{
          headerTitle: 'Extend Song',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={ExtendSongScreen}
      />
      <MainStack.Screen
        name="ReinterpretSong"
        options={{
          headerTitle: 'Reinterpret Song',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={ReinterpretSongScreen}
      />
      <MainStack.Screen
        name="AddVocals"
        options={{
          headerTitle: 'Add Vocals',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={AddVocalsScreen}
      />
      <MainStack.Screen
        name="AddInstruments"
        options={{
          headerTitle: 'Add Instruments',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={AddInstrumentsScreen}
      />
      <MainStack.Screen
        name="GetTimestampedLyrics"
        options={{
          headerTitle: 'Get Lyrics',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={GetTimestampedLyricsScreen}
      />
      <MainStack.Screen
        name="ChangeSongCover"
        options={{
          headerTitle: 'Change Cover',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={ChangeSongCoverScreen}
      />
      <MainStack.Screen
        name="AddMediaForVideo"
        options={{
          headerTitle: 'Add Media',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={AddMediaForVideoScreen}
      />
      <MainStack.Screen
        name="GetAcapella"
        options={{
          headerTitle: 'Get Acapella',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={GetAcapellaScreen}
      />
      <MainStack.Screen
        name="StemSong"
        options={{
          headerTitle: 'Stem Song',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={StemSongScreen}
      />
      <MainStack.Screen
        name="CreateLyrics"
        options={{
          headerTitle: 'Create Lyrics',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={CreateLyricsScreen}
      />
      <MainStack.Screen
        name="BuildBeats"
        options={{
          headerTitle: 'Build Beats',
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          ...TransitionPresets.ModalSlideFromBottomIOS,
        }}
        component={BuildBeatsScreen}
      />
    </MainStack.Navigator>
  )
}

export default MainStackNavigator
