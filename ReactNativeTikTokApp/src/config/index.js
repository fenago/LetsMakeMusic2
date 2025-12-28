import React, { useContext } from 'react'
import { Platform } from 'react-native'
import { useTheme, useTranslations } from '../core/dopebase'

const regexForNames = /^[a-zA-Z]{2,25}$/
const regexForPhoneNumber = /\d{9}$/

export const ConfigContext = React.createContext({})

export const ConfigProvider = ({ children }) => {
  const { theme } = useTheme()
  const { localized } = useTranslations()
  const config = {
    isSMSAuthEnabled: true,
    isGoogleAuthEnabled: true,
    isAppleAuthEnabled: true,
    isFacebookAuthEnabled: true,
    forgotPasswordEnabled: true,
    appIdentifier: `rn-tik-tok-${Platform.OS}`,
    facebookIdentifier: '1288726485109267',
    webClientId: Platform.select({
      ios: '22965687108-k9uqgstoahao7bndat1lgbhmlektp2jb.apps.googleusercontent.com',
      default:
        '22965687108-eb2r7krmmebfrd7ks8cl4pc073kek39g.apps.googleusercontent.com',
    }),
    videoMaxDuration: 15,
    onboardingConfig: {
      welcomeTitle: localized("Let's Make Music"),
      welcomeCaption: localized(
        'Create, share, and discover music with creators around the world.',
      ),
      walkthroughScreens: [
        {
          icon: require('../assets/images/photo.png'),
          title: localized('Make Memories'),
          description: localized(
            'Turn your photos and videos into original music videos. Create your own soundtrack—be the trend, don\'t follow it.',
          ),
        },
        {
          icon: require('../assets/images/file.png'),
          title: localized('Discover'),
          description: localized(
            'Explore music videos from creators around the world. Find new sounds and discover your next favorite artist.',
          ),
        },
        {
          icon: require('../assets/images/like.png'),
          title: localized('Vibe Check'),
          description: localized(
            'Show love to the tracks that hit different. Your support helps creators get discovered.',
          ),
        },
        {
          icon: require('../assets/images/chat.png'),
          title: localized('Connect'),
          description: localized(
            'Chat directly with fellow creators and artists. Share ideas, collaborate, and build your music community.',
          ),
        },
        {
          icon: require('../assets/icons/friends-unfilled.png'),
          title: localized('Music Circles'),
          description: localized(
            'Start bands with your crew. Collaborate on tracks, share works in progress, and remix together.',
          ),
        },
        {
          icon: require('../assets/images/instagram.png'),
          title: localized('Share Your Moments'),
          description: localized(
            'Send photos, videos, and tracks to your connections. Swap creative inspiration and memorable moments.',
          ),
        },
        {
          icon: require('../assets/images/notification.png'),
          title: localized('Stay Tuned'),
          description: localized(
            'Get notified when your tracks drop, someone vibes with your music, or your circle shares new creations.',
          ),
        },
      ],
    },
    // Tab display labels - maps route names to music-centric terminology
    tabLabels: {
      Feed: localized('Stage'),
      Discover: localized('Explore'),
      Library: localized('My Catalog'),
      Create: localized('Studio'),
      Profile: localized('Backstage'),
      Inbox: localized('Messages'),
      Friends: localized('Artists'),
    },
    tabIcons: {
      Feed: {
        focus: theme.icons.homefilled,
        unFocus: theme.icons.homeUnfilled,
      },
      Discover: {
        focus: theme.icons.search,
        unFocus: theme.icons.search,
      },
      Library: {
        focus: theme.icons.libraryLandscape,
        unFocus: theme.icons.libraryLandscape,
      },
      Inbox: {
        focus: theme.icons.commentFilled,
        unFocus: theme.icons.commentUnfilled,
      },
      Friends: {
        focus: theme.icons.friendsFilled,
        unFocus: theme.icons.friendsUnfilled,
      },
      Profile: {
        focus: theme.icons.profileFilled,
        unFocus: theme.icons.profileUnfilled,
      },
    },
    drawerMenu: {
      upperMenu: [
        {
          title: localized('Stage'),
          icon: theme.icons.homeUnfilled,
          navigationPath: 'Feed',
        },
        {
          title: localized('Explore'),
          icon: theme.icons.search,
          navigationPath: 'Discover',
        },
        {
          title: localized('Messages'),
          icon: theme.icons.commentUnfilled,
          navigationPath: 'Chat',
        },
        {
          title: localized('Artists'),
          icon: theme.icons.friendsUnfilled,
          navigationPath: 'Friends',
        },
        {
          title: localized('Backstage'),
          icon: theme.icons.search,
          navigationPath: 'Profile',
        },
      ],
      lowerMenu: [
        {
          title: localized('Logout'),
          icon: theme.icons.logout,
          action: 'logout',
        },
      ],
    },
    tosLink: 'https://www.instamobile.io/eula-instachatty/',
    isUsernameFieldEnabled: true,
    smsSignupFields: [
      {
        displayName: localized('First Name'),
        type: 'ascii-capable',
        editable: true,
        regex: regexForNames,
        key: 'firstName',
        placeholder: 'First Name',
      },
      {
        displayName: localized('Last Name'),
        type: 'ascii-capable',
        editable: true,
        regex: regexForNames,
        key: 'lastName',
        placeholder: 'Last Name',
      },
      {
        displayName: localized('Stage Name'),
        type: 'default',
        editable: true,
        regex: regexForNames,
        key: 'username',
        placeholder: 'Your Stage Name (this is your public identity)',
        autoCapitalize: 'none',
      },
    ],
    signupFields: [
      {
        displayName: localized('First Name'),
        type: 'ascii-capable',
        editable: true,
        regex: regexForNames,
        key: 'firstName',
        placeholder: 'First Name',
      },
      {
        displayName: localized('Last Name'),
        type: 'ascii-capable',
        editable: true,
        regex: regexForNames,
        key: 'lastName',
        placeholder: 'Last Name',
      },
      {
        displayName: localized('Stage Name'),
        type: 'default',
        editable: true,
        regex: regexForNames,
        key: 'username',
        placeholder: 'Your Stage Name (this is your public identity)',
        autoCapitalize: 'none',
      },
      {
        displayName: localized('E-mail Address'),
        type: 'email-address',
        editable: true,
        regex: regexForNames,
        key: 'email',
        placeholder: 'E-mail Address',
        autoCapitalize: 'none',
      },
      {
        displayName: localized('Password'),
        type: 'default',
        secureTextEntry: true,
        editable: true,
        regex: regexForNames,
        key: 'password',
        placeholder: 'Password',
        autoCapitalize: 'none',
      },
    ],
    editProfileFields: {
      sections: [
        {
          title: localized('PUBLIC PROFILE'),
          fields: [
            {
              displayName: localized('Stage Name'),
              type: 'text',
              editable: true,
              key: 'stageName',
              placeholder: 'Your Stage Name',
            },
            {
              displayName: localized('Bio'),
              type: 'text',
              editable: true,
              key: 'bio',
              placeholder: 'Tell us about yourself',
              multiline: true,
            },
            {
              displayName: localized('First Name'),
              type: 'text',
              editable: true,
              regex: regexForNames,
              key: 'firstName',
              placeholder: 'Your first name',
            },
            {
              displayName: localized('Last Name'),
              type: 'text',
              editable: true,
              regex: regexForNames,
              key: 'lastName',
              placeholder: 'Your last name',
            },
          ],
        },
        {
          title: localized('PRIVATE DETAILS'),
          fields: [
            {
              displayName: localized('E-mail Address'),
              type: 'text',
              editable: true,
              key: 'email',
              placeholder: 'Your email address',
            },
            {
              displayName: localized('Phone Number'),
              type: 'text',
              editable: true,
              regex: regexForPhoneNumber,
              key: 'phone',
              placeholder: 'Your phone number',
            },
          ],
        },
      ],
    },
    userSettingsFields: {
      sections: [
        {
          title: localized('GENERAL'),
          fields: [
            {
              displayName: localized('Allow Push Notifications'),
              type: 'select',
              editable: true,
              key: 'push_notifications_enabled',
              value: 'On',
              options: ['Off', 'On'],
              displayOptions: ['Off', 'On'],
            },
            ...(Platform.OS === 'ios'
              ? [
                  {
                    displayName: localized('Enable Face ID / Touch ID'),
                    type: 'select',
                    editable: true,
                    key: 'face_id_enabled',
                    value: 'Off',
                    options: ['Off', 'On'],
                    displayOptions: ['Off', 'On'],
                  },
                ]
              : []),
          ],
        },
        {
          title: localized('Stage'),
          fields: [
            {
              displayName: localized('Stage Theme'),
              type: 'select',
              editable: true,
              key: 'stage_theme',
              value: 'Light',
              options: ['Light', 'Dark'],
              displayOptions: ['Light', 'Dark'],
            },
            {
              displayName: localized('Autoplay Videos'),
              type: 'select',
              editable: true,
              key: 'autoplay_video_enabled',
              value: 'On',
              options: ['Off', 'On'],
              displayOptions: ['Off', 'On'],
            },
            {
              displayName: localized('Always Mute Videos'),
              type: 'select',
              editable: true,
              key: 'mute_video_enabled',
              value: 'On',
              options: ['Off', 'On'],
              displayOptions: ['Off', 'On'],
            },
            {
              displayName: localized('Auto-advance Feed'),
              type: 'select',
              editable: true,
              key: 'auto_advance_feed',
              value: 'On',
              options: ['Off', 'On'],
              displayOptions: ['Off', 'On'],
            },
          ],
        },
        {
          title: localized('Song Creation'),
          fields: [
            {
              displayName: localized('Auto-share to Feed'),
              type: 'select',
              editable: true,
              key: 'auto_share_to_feed',
              value: 'Off',
              options: ['Off', 'On'],
              displayOptions: ['Off', 'On'],
            },
          ],
        },
        {
          title: '',
          fields: [
            {
              displayName: localized('Save'),
              type: 'button',
              key: 'savebutton',
            },
          ],
        },
      ],
    },
    contactUsFields: {
      sections: [
        {
          title: localized('CONTACT'),
          fields: [
            {
              displayName: localized('E-mail us'),
              value: 'support@LetsMake.Music',
              type: 'text',
              editable: false,
              key: 'email',
              placeholder: 'Your email address',
            },
          ],
        },
        {
          title: '',
          fields: [
            {
              displayName: localized('Call Us'),
              type: 'button',
              key: 'savebutton',
            },
          ],
        },
      ],
    },
    contactUsPhoneNumber: '+16504850000',
    adsConfig: {
      facebookAdsPlacementID:
        Platform.OS === 'ios'
          ? '834318260403282_834914470343661'
          : '834318260403282_834390467062728',
      adSlotInjectionInterval: 10,
    },
  }

  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  )
}

export const useConfig = () => useContext(ConfigContext)
