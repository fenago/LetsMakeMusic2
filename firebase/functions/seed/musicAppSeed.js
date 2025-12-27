/**
 * LetsMakeMusic - Synthetic Test Users Seed Script
 *
 * Creates 3 synthetic test users with sample content for testing social features.
 * The main user @ernestolee can follow, like, and interact with these users.
 *
 * Usage:
 *   1. Deploy this function: firebase deploy --only functions:seedMusicTestUsers
 *   2. Call via Firebase Console or HTTP: https://us-central1-<project-id>.cloudfunctions.net/seedMusicTestUsers
 *
 * Or run locally with emulators:
 *   firebase emulators:start
 *   Call: http://localhost:5001/<project-id>/us-central1/seedMusicTestUsers
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')

const db = admin.firestore()
const auth = admin.auth()

// ============================================
// SYNTHETIC TEST USER DATA
// ============================================

const syntheticUsers = [
  {
    email: 'musiclover1@letsmakemusic.test',
    firstName: 'Maya',
    lastName: 'Songbird',
    username: 'mayasongs',
    bio: 'Creating beats and melodies since 2015. Pop, R&B, and electronic vibes.',
    profilePictureURL: 'https://randomuser.me/api/portraits/women/44.jpg',
    genres: ['pop', 'r&b', 'electronic'],
  },
  {
    email: 'musiclover2@letsmakemusic.test',
    firstName: 'DJ',
    lastName: 'Rhythm',
    username: 'djrhythmbeats',
    bio: 'Producer | Beatmaker | Hip-hop head. Let the bass drop!',
    profilePictureURL: 'https://randomuser.me/api/portraits/men/32.jpg',
    genres: ['hip-hop', 'trap', 'lo-fi'],
  },
  {
    email: 'musiclover3@letsmakemusic.test',
    firstName: 'Luna',
    lastName: 'Acoustic',
    username: 'lunastrums',
    bio: 'Singer-songwriter. Acoustic covers and original folk tunes.',
    profilePictureURL: 'https://randomuser.me/api/portraits/women/68.jpg',
    genres: ['folk', 'acoustic', 'indie'],
  },
]

const commonUserData = {
  createdAt: Math.floor(Date.now() / 1000),
  location: {
    latitude: 34.0522,
    longitude: -118.2437, // Los Angeles
  },
  isOnline: true,
  settings: {
    distance_radius: 'unlimited',
    gender: 'none',
    gender_preference: 'all',
    show_me: true,
    push_new_matches_enabled: true,
  },
  lastOnlineTimestamp: Math.floor(Date.now() / 1000),
  appIdentifier: 'letsmakemusic-test',
  outboundFriendshipCount: 0,
  inboundFriendshipCount: 0,
}

// Sample songs for each user (will create both song and social post)
const sampleSongs = [
  // Maya Songbird's songs
  {
    userIndex: 0,
    title: 'Summer Breeze',
    style: 'pop electronic chill',
    lyrics: 'Feel the summer breeze\nDancing through the trees\nLet the music flow\nEverywhere we go',
    // Using Suno sample URLs - these are placeholder patterns
    imageUrl: 'https://cdn2.suno.ai/image_large_3a7b8c9d-1234-5678-9abc-def012345678.jpeg',
  },
  {
    userIndex: 0,
    title: 'Midnight Dreams',
    style: 'r&b soul smooth',
    lyrics: 'In the midnight hour\nDreaming of your love\nStars are shining bright\nGuiding from above',
    imageUrl: 'https://cdn2.suno.ai/image_large_4b8c9d0e-2345-6789-abcd-ef0123456789.jpeg',
  },
  // DJ Rhythm's songs
  {
    userIndex: 1,
    title: 'Bass Drop City',
    style: 'hip-hop trap bass',
    lyrics: 'Drop the bass low\nLet the rhythm flow\nHands up in the sky\nWatch the beat go by',
    imageUrl: 'https://cdn2.suno.ai/image_large_5c9d0e1f-3456-789a-bcde-f01234567890.jpeg',
  },
  {
    userIndex: 1,
    title: 'Lo-Fi Sunday',
    style: 'lo-fi chill beats',
    lyrics: 'Sunday morning vibes\nCoffee and good times\nRelax and unwind\nLeave your stress behind',
    imageUrl: 'https://cdn2.suno.ai/image_large_6d0e1f2g-4567-89ab-cdef-012345678901.jpeg',
  },
  {
    userIndex: 1,
    title: 'Night Owl Sessions',
    style: 'electronic ambient dark',
    lyrics: 'When the city sleeps\nCreativity peaks\nMaking beats all night\nUntil the morning light',
    imageUrl: 'https://cdn2.suno.ai/image_large_7e1f2g3h-5678-9abc-def0-123456789012.jpeg',
  },
  // Luna Acoustic's songs
  {
    userIndex: 2,
    title: 'Campfire Stories',
    style: 'folk acoustic indie',
    lyrics: 'Gather round the fire\nLet me sing to you\nStories of the past\nAnd dreams that came true',
    imageUrl: 'https://cdn2.suno.ai/image_large_8f2g3h4i-6789-abcd-ef01-234567890123.jpeg',
  },
  {
    userIndex: 2,
    title: 'Wildflower',
    style: 'indie folk singer-songwriter',
    lyrics: 'Like a wildflower\nGrowing in the sun\nFree and beautiful\nSecond to none',
    imageUrl: 'https://cdn2.suno.ai/image_large_9g3h4i5j-789a-bcde-f012-345678901234.jpeg',
  },
]

// Sample posts with video content (using publicly available sample videos)
const samplePosts = [
  // Maya Songbird's posts
  {
    userIndex: 0,
    description: 'Just finished this new pop track! What do you think? 🎵✨ #newmusic #pop #vibes',
    hashtags: ['newmusic', 'pop', 'vibes'],
    mediaType: 'video/mp4',
    // Using a sample video URL - replace with actual Firebase Storage URLs
    mediaURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnailURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
    reactionsCount: 42,
  },
  {
    userIndex: 0,
    description: 'Late night studio session 🌙🎧 #studiolife #musicproducer',
    hashtags: ['studiolife', 'musicproducer'],
    mediaType: 'video/mp4',
    mediaURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnailURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg',
    reactionsCount: 28,
  },
  // DJ Rhythm's posts
  {
    userIndex: 1,
    description: 'New beat just dropped! 🔥🎤 Tag someone who needs to hear this #hiphop #beats #fire',
    hashtags: ['hiphop', 'beats', 'fire'],
    mediaType: 'video/mp4',
    mediaURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnailURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg',
    reactionsCount: 87,
  },
  {
    userIndex: 1,
    description: 'Lo-fi chill vibes for your Sunday 🎵☕ #lofi #chillbeats #sundayvibes',
    hashtags: ['lofi', 'chillbeats', 'sundayvibes'],
    mediaType: 'video/mp4',
    mediaURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnailURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg',
    reactionsCount: 156,
  },
  {
    userIndex: 1,
    description: 'Making beats at 3am hits different 🌃 #beatmaker #nightowl',
    hashtags: ['beatmaker', 'nightowl'],
    mediaType: 'video/mp4',
    mediaURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnailURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg',
    reactionsCount: 63,
  },
  // Luna Acoustic's posts
  {
    userIndex: 2,
    description: 'Acoustic cover coming your way 🎸💕 #acoustic #cover #singersongwriter',
    hashtags: ['acoustic', 'cover', 'singersongwriter'],
    mediaType: 'video/mp4',
    mediaURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnailURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
    reactionsCount: 234,
  },
  {
    userIndex: 2,
    description: 'Coffee shop performance last night 🎤☕ #livemusic #folk #indie',
    hashtags: ['livemusic', 'folk', 'indie'],
    mediaType: 'video/mp4',
    mediaURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    thumbnailURL: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg',
    reactionsCount: 189,
  },
]

// ============================================
// SEED FUNCTIONS
// ============================================

/**
 * Create a user in Firebase Auth and Firestore
 */
const createUser = async (userData) => {
  const { email, firstName, lastName, username, bio, profilePictureURL, genres } = userData

  let userID

  try {
    // Try to create user in Auth
    const userRecord = await auth.createUser({
      email: email,
      emailVerified: true,
      password: 'TestPassword123!',
      displayName: `${firstName} ${lastName}`,
      disabled: false,
    })
    userID = userRecord.uid
    console.log(`Created new Auth user: ${email} with ID: ${userID}`)
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      // User already exists, get their UID
      const userRecord = await auth.getUserByEmail(email)
      userID = userRecord.uid
      console.log(`User already exists in Auth: ${email} with ID: ${userID}`)
    } else {
      throw error
    }
  }

  // Create/Update Firestore user document
  const userDoc = {
    id: userID,
    email,
    firstName,
    lastName,
    username,
    bio,
    profilePictureURL,
    photos: [profilePictureURL],
    genres: genres || [],
    ...commonUserData,
  }

  await db.collection('users').doc(userID).set(userDoc, { merge: true })
  console.log(`Created/Updated Firestore user document for: ${username}`)

  return { ...userDoc, id: userID }
}

/**
 * Create a song and its social post for a user
 */
const createSongWithPost = async (authorData, songData) => {
  const songID = uuidv4()
  const postID = uuidv4()
  const timestamp = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 604800) // Random time within last week

  // Auto-generate hashtags from style
  const hashtags = songData.style
    .split(/[\s,]+/)
    .map(s => s.toLowerCase())
    .filter(s => s.length > 2)
    .slice(0, 5)

  // Create song document
  const song = {
    id: songID,
    title: songData.title,
    style: songData.style,
    lyrics: songData.lyrics || '',
    imageUrl: songData.imageUrl,
    thumbnailUrl: songData.imageUrl,
    // Use placeholder audio URL (will show as "no audio" but structure is correct)
    audioUrl: `https://cdn1.suno.ai/${songID}.mp3`,
    firebaseAudioUrl: null, // Not uploaded to Firebase Storage
    createdAt: admin.firestore.Timestamp.fromMillis(timestamp * 1000),
    userId: authorData.id,
    author: {
      id: authorData.id,
      firstName: authorData.firstName,
      lastName: authorData.lastName,
      username: authorData.username,
      stageName: authorData.username,
      profilePictureURL: authorData.profilePictureURL,
    },
    isPublic: true,
    sharedToFeed: true,
    linkedPostId: postID,
    source: 'seed',
    status: 'complete',
  }

  // Save song to songs collection
  await db.collection('songs').doc(songID).set(song)

  // Create social post for this song
  const post = {
    id: postID,
    authorID: authorData.id,
    author: {
      id: authorData.id,
      firstName: authorData.firstName,
      lastName: authorData.lastName,
      username: authorData.username,
      profilePictureURL: authorData.profilePictureURL,
      email: authorData.email,
      stageName: authorData.username,
    },
    postMedia: [{
      url: song.audioUrl,
      thumbnailURL: song.imageUrl,
      type: 'audio/mpeg',
    }],
    description: `New song: ${song.title} 🎵 #${hashtags.join(' #')}`,
    hashtags,
    reactionsCount: Math.floor(Math.random() * 100) + 10,
    commentsCount: Math.floor(Math.random() * 20),
    createdAt: timestamp,
    postType: 'song',
    linkedSongId: songID,
    songData: {
      id: songID,
      title: song.title,
      imageUrl: song.imageUrl,
      audioUrl: song.audioUrl,
      style: song.style,
      artist: authorData.username,
    },
  }

  // Save to main posts collection
  await db.collection('posts').doc(postID).set(post)

  // Add to author's profile feed
  await db.collection('social_feeds')
    .doc(authorData.id)
    .collection('profile_feed_live')
    .doc(postID)
    .set(post)

  // Add to main_feed for discovery
  await db.collection('social_feeds')
    .doc(authorData.id)
    .collection('main_feed')
    .doc(postID)
    .set(post)

  // Add to hashtag feeds
  for (const tag of hashtags) {
    await db.collection('hashtags')
      .doc(tag)
      .collection('feed_live')
      .doc(postID)
      .set(post)
  }

  console.log(`Created song: ${songID} with post: ${postID} for user: ${authorData.username}`)
  return { song, post }
}

/**
 * Create a post for a user
 */
const createPost = async (authorData, postData) => {
  const postID = uuidv4()
  const timestamp = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 604800) // Random time within last week

  const post = {
    id: postID,
    authorID: authorData.id,
    author: {
      id: authorData.id,
      firstName: authorData.firstName,
      lastName: authorData.lastName,
      username: authorData.username,
      profilePictureURL: authorData.profilePictureURL,
      email: authorData.email,
    },
    postMedia: [{
      url: postData.mediaURL,
      thumbnailURL: postData.thumbnailURL,
      type: postData.mediaType,
    }],
    description: postData.description,
    hashtags: postData.hashtags || [],
    reactionsCount: postData.reactionsCount || 0,
    commentsCount: 0,
    createdAt: timestamp,
  }

  // Save to main posts collection
  await db.collection('posts').doc(postID).set(post)

  // Add to author's profile feed (social_feeds/{userID}/profile_feed_live)
  await db.collection('social_feeds')
    .doc(authorData.id)
    .collection('profile_feed_live')
    .doc(postID)
    .set(post)

  // Add to main_feed for discovery
  await db.collection('social_feeds')
    .doc(authorData.id)
    .collection('main_feed')
    .doc(postID)
    .set(post)

  // Add to hashtag feeds
  for (const hashtag of postData.hashtags || []) {
    await db.collection('hashtags')
      .doc(hashtag.toLowerCase())
      .collection('feed_live')
      .doc(postID)
      .set(post)
  }

  console.log(`Created post: ${postID} for user: ${authorData.username}`)
  return post
}

/**
 * Create follow relationship between two users
 */
const createFollowRelationship = async (sourceUser, destUser) => {
  const timestamp = admin.firestore.FieldValue.serverTimestamp()

  // Create outbound edge (sourceUser follows destUser)
  await db.collection('social_graph')
    .doc(sourceUser.id)
    .collection('outbound')
    .doc(destUser.id)
    .set({
      id: destUser.id,
      user: destUser,
      type: 'outbound',
      createdAt: timestamp,
    })

  // Create inbound edge (destUser has follower sourceUser)
  await db.collection('social_graph')
    .doc(destUser.id)
    .collection('inbound')
    .doc(sourceUser.id)
    .set({
      id: sourceUser.id,
      user: sourceUser,
      type: 'inbound',
      createdAt: timestamp,
    })

  // Update live collections
  await db.collection('social_graph')
    .doc(sourceUser.id)
    .collection('friendships_live')
    .doc(destUser.id)
    .set({
      id: destUser.id,
      user: destUser,
      type: 'outbound',
      createdAt: timestamp,
    })

  await db.collection('social_graph')
    .doc(destUser.id)
    .collection('friendships_live')
    .doc(sourceUser.id)
    .set({
      id: sourceUser.id,
      user: sourceUser,
      type: 'inbound',
      createdAt: timestamp,
    })

  // Update friendship counts
  await db.collection('users').doc(sourceUser.id).update({
    outboundFriendshipCount: admin.firestore.FieldValue.increment(1),
  })

  await db.collection('users').doc(destUser.id).update({
    inboundFriendshipCount: admin.firestore.FieldValue.increment(1),
  })

  console.log(`Created follow: ${sourceUser.username} -> ${destUser.username}`)
}

/**
 * Add posts to a user's home feed
 */
const addToHomeFeed = async (userID, posts) => {
  for (const post of posts) {
    await db.collection('social_feeds')
      .doc(userID)
      .collection('home_feed_live')
      .doc(post.id)
      .set(post)
  }
  console.log(`Added ${posts.length} posts to home feed for user: ${userID}`)
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================

exports.seedMusicTestUsers = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB',
  })
  .https.onCall(async (data, context) => {
    console.log('Starting LetsMakeMusic test user seeding...')

    const results = {
      usersCreated: [],
      postsCreated: [],
      followsCreated: [],
    }

    try {
      // Step 1: Create synthetic users
      console.log('Step 1: Creating synthetic users...')
      const createdUsers = []
      for (const userData of syntheticUsers) {
        const user = await createUser(userData)
        createdUsers.push(user)
        results.usersCreated.push({
          id: user.id,
          username: user.username,
          email: user.email,
        })
      }

      // Step 2: Create songs with social posts for each user
      console.log('Step 2: Creating songs with social posts...')
      const allPosts = []
      const songsCreated = []
      for (const songData of sampleSongs) {
        const author = createdUsers[songData.userIndex]
        const { song, post } = await createSongWithPost(author, songData)
        allPosts.push(post)
        songsCreated.push({
          id: song.id,
          title: song.title,
          author: author.username,
          postId: post.id,
        })
      }
      results.songsCreated = songsCreated

      // Step 3: Create video posts for each user
      console.log('Step 3: Creating video posts...')
      for (const postData of samplePosts) {
        const author = createdUsers[postData.userIndex]
        const post = await createPost(author, postData)
        allPosts.push(post)
        results.postsCreated.push({
          id: post.id,
          author: author.username,
          description: post.description.substring(0, 50) + '...',
        })
      }

      // Step 4: Create follow relationships between synthetic users
      console.log('Step 4: Creating follow relationships between test users...')
      // Maya follows DJ Rhythm and Luna
      await createFollowRelationship(createdUsers[0], createdUsers[1])
      await createFollowRelationship(createdUsers[0], createdUsers[2])
      // DJ Rhythm follows Maya and Luna
      await createFollowRelationship(createdUsers[1], createdUsers[0])
      await createFollowRelationship(createdUsers[1], createdUsers[2])
      // Luna follows Maya and DJ Rhythm
      await createFollowRelationship(createdUsers[2], createdUsers[0])
      await createFollowRelationship(createdUsers[2], createdUsers[1])

      results.followsCreated = [
        'mayasongs -> djrhythmbeats',
        'mayasongs -> lunastrums',
        'djrhythmbeats -> mayasongs',
        'djrhythmbeats -> lunastrums',
        'lunastrums -> mayasongs',
        'lunastrums -> djrhythmbeats',
      ]

      // Step 5: Add posts to each user's home feed
      console.log('Step 5: Populating home feeds...')
      for (const user of createdUsers) {
        // Add posts from users they follow
        const postsFromOthers = allPosts.filter(p => p.authorID !== user.id)
        await addToHomeFeed(user.id, postsFromOthers)
      }

      console.log('Seeding complete!')
      return {
        success: true,
        message: `Successfully seeded 3 test users with ${songsCreated.length} songs and ${results.postsCreated.length} video posts`,
        data: results,
        instructions: {
          testUsers: [
            '@mayasongs (Maya Songbird) - Pop/R&B creator',
            '@djrhythmbeats (DJ Rhythm) - Hip-hop/Lo-fi producer',
            '@lunastrums (Luna Acoustic) - Folk singer-songwriter',
          ],
          passwords: 'All test accounts use password: TestPassword123!',
          songsCreated: 'Songs will appear in Today\'s Picks and social feeds (songs + videos both visible)',
          toConnectAsErnestolee: [
            '1. Log into the app as @ernestolee',
            '2. Search for any of the test usernames above',
            '3. Follow them to see their songs AND videos in your feed',
            '4. Test liking, commenting, and messaging features',
          ],
        },
      }
    } catch (error) {
      console.error('Error seeding test users:', error)
      throw new functions.https.HttpsError('internal', error.message)
    }
  })

// HTTP endpoint version for easier testing
exports.seedMusicTestUsersHTTP = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB',
  })
  .https.onRequest(async (req, res) => {
    try {
      // Reuse the same logic
      const result = await exports.seedMusicTestUsers.run({}, {})
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

/**
 * Make test users follow a specific user by username
 */
exports.makeTestUsersFollowUser = functions.https.onCall(async (data, context) => {
  const { targetUsername } = data

  if (!targetUsername) {
    throw new functions.https.HttpsError('invalid-argument', 'targetUsername is required')
  }

  try {
    // Find target user by username
    const targetSnapshot = await db.collection('users')
      .where('username', '==', targetUsername)
      .limit(1)
      .get()

    if (targetSnapshot.empty) {
      throw new functions.https.HttpsError('not-found', `User @${targetUsername} not found`)
    }

    const targetUser = targetSnapshot.docs[0].data()
    console.log(`Found target user: ${targetUser.username} (${targetUser.id})`)

    // Get all test users
    const testEmails = syntheticUsers.map(u => u.email)
    const testUsersSnapshot = await db.collection('users')
      .where('email', 'in', testEmails)
      .get()

    const results = []

    for (const doc of testUsersSnapshot.docs) {
      const testUser = doc.data()

      // Check if already following
      const existingFollow = await db.collection('social_graph')
        .doc(testUser.id)
        .collection('outbound')
        .doc(targetUser.id)
        .get()

      if (existingFollow.exists) {
        results.push({
          testUser: testUser.username,
          targetUser: targetUser.username,
          status: 'already_following'
        })
        continue
      }

      // Create follow relationship
      await createFollowRelationship(testUser, targetUser)

      results.push({
        testUser: testUser.username,
        targetUser: targetUser.username,
        status: 'followed'
      })
    }

    return {
      success: true,
      message: `Test users now follow @${targetUsername}`,
      results
    }
  } catch (error) {
    console.error('Error making test users follow:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * HTTP endpoint to make test users follow a specific user
 */
exports.makeTestUsersFollowUserHTTP = functions.https.onRequest(async (req, res) => {
  const targetUsername = req.query.username || req.body?.username

  if (!targetUsername) {
    return res.status(400).json({ error: 'username query parameter is required' })
  }

  try {
    // Find target user by username
    const targetSnapshot = await db.collection('users')
      .where('username', '==', targetUsername)
      .limit(1)
      .get()

    if (targetSnapshot.empty) {
      return res.status(404).json({ error: `User @${targetUsername} not found` })
    }

    const targetUser = targetSnapshot.docs[0].data()
    console.log(`Found target user: ${targetUser.username} (${targetUser.id})`)

    // Get all test users
    const testEmails = syntheticUsers.map(u => u.email)
    const testUsersSnapshot = await db.collection('users')
      .where('email', 'in', testEmails)
      .get()

    const results = []

    for (const doc of testUsersSnapshot.docs) {
      const testUser = doc.data()

      // Check if already following
      const existingFollow = await db.collection('social_graph')
        .doc(testUser.id)
        .collection('outbound')
        .doc(targetUser.id)
        .get()

      if (existingFollow.exists) {
        results.push({
          testUser: testUser.username,
          targetUser: targetUser.username,
          status: 'already_following'
        })
        continue
      }

      // Create follow relationship
      await createFollowRelationship(testUser, targetUser)

      results.push({
        testUser: testUser.username,
        targetUser: targetUser.username,
        status: 'followed'
      })
    }

    res.json({
      success: true,
      message: `Test users now follow @${targetUsername}`,
      results
    })
  } catch (error) {
    console.error('Error making test users follow:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Make a specific user follow all test users AND populate their home feed
 * This is the reverse of makeTestUsersFollowUser - makes YOU follow THEM
 */
exports.followTestUsersAndPopulateFeed = functions.https.onRequest(async (req, res) => {
  const targetUsername = req.query.username || req.body?.username

  if (!targetUsername) {
    return res.status(400).json({ error: 'username query parameter is required' })
  }

  try {
    // Find target user by username
    const targetSnapshot = await db.collection('users')
      .where('username', '==', targetUsername)
      .limit(1)
      .get()

    if (targetSnapshot.empty) {
      return res.status(404).json({ error: `User @${targetUsername} not found` })
    }

    const targetUser = targetSnapshot.docs[0].data()
    console.log(`Found target user: ${targetUser.username} (${targetUser.id})`)

    // Get all test users
    const testEmails = syntheticUsers.map(u => u.email)
    const testUsersSnapshot = await db.collection('users')
      .where('email', 'in', testEmails)
      .get()

    const followResults = []
    const allTestUserPosts = []

    for (const doc of testUsersSnapshot.docs) {
      const testUser = doc.data()

      // Make target user follow this test user (if not already)
      const existingFollow = await db.collection('social_graph')
        .doc(targetUser.id)
        .collection('outbound')
        .doc(testUser.id)
        .get()

      if (!existingFollow.exists) {
        await createFollowRelationship(targetUser, testUser)
        followResults.push({
          from: targetUser.username,
          follows: testUser.username,
          status: 'followed'
        })
      } else {
        followResults.push({
          from: targetUser.username,
          follows: testUser.username,
          status: 'already_following'
        })
      }

      // Get all posts from this test user's profile feed
      const postsSnapshot = await db.collection('social_feeds')
        .doc(testUser.id)
        .collection('profile_feed_live')
        .get()

      for (const postDoc of postsSnapshot.docs) {
        allTestUserPosts.push(postDoc.data())
      }
    }

    // Add all test users' posts to target user's home feed
    let postsAdded = 0
    for (const post of allTestUserPosts) {
      await db.collection('social_feeds')
        .doc(targetUser.id)
        .collection('home_feed_live')
        .doc(post.id)
        .set(post)
      postsAdded++
    }

    res.json({
      success: true,
      message: `@${targetUsername} now follows test users and has ${postsAdded} posts in their feed`,
      followResults,
      postsAdded
    })
  } catch (error) {
    console.error('Error setting up follows and feed:', error)
    res.status(500).json({ error: error.message })
  }
})
