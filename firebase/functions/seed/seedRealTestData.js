/**
 * Seed Real Test Data
 *
 * Creates test posts with REAL, WORKING media URLs for testing.
 * Uses:
 * - Google's sample videos (gtv-videos-bucket) - always accessible
 * - Picsum photos for images - always accessible
 * - For songs - we need to first run audio migration or use existing backed-up songs
 *
 * This script creates posts that will ACTUALLY PLAY in the feed.
 */

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')

const db = admin.firestore()

// REAL working video URLs from Google's sample bucket
const REAL_VIDEOS = [
  {
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
    title: 'Studio session vibes',
  },
  {
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg',
    title: 'Late night beats',
  },
  {
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    thumbnail: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg',
    title: 'Making music with friends',
  },
  {
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    thumbnail: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg',
    title: 'Sunset sessions',
  },
  {
    url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
    thumbnail: 'https://storage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg',
    title: 'Electronic experiments',
  },
]

// Test user data - these users MUST already exist in Firebase Auth
// Create them with seedMusicTestUsers first
const TEST_USERS = [
  { username: 'mayasongs', email: 'musiclover1@letsmakemusic.test' },
  { username: 'djrhythmbeats', email: 'musiclover2@letsmakemusic.test' },
  { username: 'lunastrums', email: 'musiclover3@letsmakemusic.test' },
]

/**
 * Get real songs that have working firebaseAudioUrl
 */
async function getRealSongsWithAudio(limit = 5) {
  const snapshot = await db.collection('songs')
    .where('firebaseAudioUrl', '!=', null)
    .limit(limit)
    .get()

  const songs = []
  snapshot.forEach(doc => {
    const data = doc.data()
    // Validate the song has all required fields
    if (data.firebaseAudioUrl && data.title) {
      songs.push({ id: doc.id, ...data })
    }
  })

  console.log(`Found ${songs.length} real songs with Firebase audio URLs`)
  return songs
}

/**
 * Create a video post with REAL working video
 */
async function createVideoPost(author, videoData, hashtags = []) {
  const postID = uuidv4()
  const timestamp = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 604800)

  const post = {
    id: postID,
    authorID: author.id,
    author: {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName,
      username: author.username,
      profilePictureURL: author.profilePictureURL,
      email: author.email,
      stageName: author.stageName || author.username,
    },
    postMedia: [{
      url: videoData.url,
      thumbnailURL: videoData.thumbnail,
      type: 'video/mp4',
    }],
    postText: `${videoData.title} 🎵 #music ${hashtags.map(h => `#${h}`).join(' ')}`,
    description: `${videoData.title} 🎵`,
    hashtags: ['music', ...hashtags],
    reactionsCount: Math.floor(Math.random() * 200) + 20,
    commentsCount: Math.floor(Math.random() * 30),
    createdAt: timestamp,
    postType: 'video',
    // NO songData for video posts - they play video with its own audio
  }

  // Save to main posts collection
  await db.collection('posts').doc(postID).set(post)

  // Add to author's profile feed
  await db.collection('social_feeds')
    .doc(author.id)
    .collection('profile_feed_live')
    .doc(postID)
    .set(post)

  // Add to main_feed for discovery
  await db.collection('social_feeds')
    .doc(author.id)
    .collection('main_feed')
    .doc(postID)
    .set(post)

  console.log(`Created VIDEO post: ${postID} - "${videoData.title}"`)
  return post
}

/**
 * Create a song post with REAL working song from Firebase
 */
async function createSongPost(author, song) {
  const postID = uuidv4()
  const timestamp = Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 604800)

  // Use firebaseImageUrl if available, otherwise fallback to Picsum
  const imageUrl = song.firebaseImageUrl || song.imageUrl ||
                   `https://picsum.photos/seed/${song.id}/400/400`

  const post = {
    id: postID,
    authorID: author.id,
    author: {
      id: author.id,
      firstName: author.firstName,
      lastName: author.lastName,
      username: author.username,
      profilePictureURL: author.profilePictureURL,
      email: author.email,
      stageName: author.stageName || author.username,
    },
    postMedia: [{
      url: song.firebaseAudioUrl || song.audioUrl,
      thumbnailURL: imageUrl,
      type: 'audio/mpeg',
    }],
    postText: `New song: ${song.title} 🎵 #newmusic`,
    description: `Check out my new track: ${song.title}`,
    hashtags: ['newmusic', 'letsmakemusic'],
    reactionsCount: Math.floor(Math.random() * 200) + 20,
    commentsCount: Math.floor(Math.random() * 30),
    createdAt: timestamp,
    postType: 'song',
    linkedSongId: song.id,
    // CRITICAL: songData field for song playback
    // Use || null to avoid undefined values (Firestore rejects undefined)
    songData: {
      id: song.id,
      title: song.title,
      imageUrl: imageUrl,
      audioUrl: song.firebaseAudioUrl || song.audioUrl,
      firebaseAudioUrl: song.firebaseAudioUrl || null,
      firebaseImageUrl: song.firebaseImageUrl || null,
      style: song.style || 'AI Generated',
      artist: author.stageName || author.username,
    },
  }

  // Save to main posts collection
  await db.collection('posts').doc(postID).set(post)

  // Add to author's profile feed
  await db.collection('social_feeds')
    .doc(author.id)
    .collection('profile_feed_live')
    .doc(postID)
    .set(post)

  // Add to main_feed for discovery
  await db.collection('social_feeds')
    .doc(author.id)
    .collection('main_feed')
    .doc(postID)
    .set(post)

  console.log(`Created SONG post: ${postID} - "${song.title}"`)
  return post
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
  const snapshot = await db.collection('users')
    .where('username', '==', username)
    .limit(1)
    .get()

  if (snapshot.empty) {
    return null
  }

  return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() }
}

/**
 * Add posts to a user's home feed
 */
async function addToHomeFeed(userID, posts) {
  for (const post of posts) {
    await db.collection('social_feeds')
      .doc(userID)
      .collection('home_feed_live')
      .doc(post.id)
      .set(post)
  }
  console.log(`Added ${posts.length} posts to home feed for user: ${userID}`)
}

/**
 * Main seeding function - creates REAL working test data
 */
exports.seedRealTestData = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB',
  })
  .https.onCall(async (data, context) => {
    console.log('Starting REAL test data seeding...')

    const results = {
      videoPosts: [],
      songPosts: [],
      errors: [],
    }

    try {
      // Step 1: Get test users
      console.log('Step 1: Getting test users...')
      const users = []
      for (const testUser of TEST_USERS) {
        const user = await getUserByUsername(testUser.username)
        if (user) {
          users.push(user)
          console.log(`Found user: ${user.username}`)
        } else {
          results.errors.push(`User ${testUser.username} not found. Run seedMusicTestUsers first.`)
        }
      }

      if (users.length === 0) {
        throw new Error('No test users found. Run seedMusicTestUsers first.')
      }

      // Step 2: Create VIDEO posts (always work - using Google sample videos)
      console.log('Step 2: Creating video posts with REAL working videos...')
      const allPosts = []

      for (let i = 0; i < REAL_VIDEOS.length; i++) {
        const user = users[i % users.length]
        const video = REAL_VIDEOS[i]
        const post = await createVideoPost(user, video, ['vibes', 'studio'])
        allPosts.push(post)
        results.videoPosts.push({
          id: post.id,
          author: user.username,
          title: video.title,
          url: video.url,
        })
      }

      // Step 3: Get real songs that have Firebase audio URLs
      console.log('Step 3: Getting real songs with Firebase audio...')
      const realSongs = await getRealSongsWithAudio(5)

      if (realSongs.length > 0) {
        console.log(`Found ${realSongs.length} real songs to create posts for`)

        // Create song posts for each real song
        for (let i = 0; i < realSongs.length; i++) {
          const user = users[i % users.length]
          const song = realSongs[i]
          try {
            const post = await createSongPost(user, song)
            allPosts.push(post)
            results.songPosts.push({
              id: post.id,
              author: user.username,
              songTitle: song.title,
              audioUrl: song.firebaseAudioUrl,
            })
          } catch (error) {
            results.errors.push(`Failed to create song post for ${song.title}: ${error.message}`)
          }
        }
      } else {
        results.errors.push('No songs with firebaseAudioUrl found. Run migration first.')
      }

      // Step 4: Add all posts to each test user's home feed
      console.log('Step 4: Populating home feeds...')
      for (const user of users) {
        const postsFromOthers = allPosts.filter(p => p.authorID !== user.id)
        await addToHomeFeed(user.id, postsFromOthers)
      }

      // Step 5: Also add to ernestolee's home feed if exists
      console.log('Step 5: Adding to main user feed...')
      const mainUser = await getUserByUsername('ernestolee')
      if (mainUser) {
        await addToHomeFeed(mainUser.id, allPosts)
        console.log(`Added ${allPosts.length} posts to @ernestolee's home feed`)
      }

      console.log('REAL test data seeding complete!')

      return {
        success: true,
        message: `Created ${results.videoPosts.length} video posts and ${results.songPosts.length} song posts`,
        results,
        nextSteps: results.songPosts.length === 0 ? [
          '1. Run migrateSongsToCorrectBucket to backup existing songs to Firebase',
          '2. Or create a new song through the app (auto-backed to Firebase)',
          '3. Then run seedRealTestData again to create song posts',
        ] : [],
      }
    } catch (error) {
      console.error('Error seeding real test data:', error)
      throw new functions.https.HttpsError('internal', error.message)
    }
  })

/**
 * HTTP endpoint for easy testing
 */
exports.seedRealTestDataHTTP = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '512MB',
  })
  .https.onRequest(async (req, res) => {
    try {
      const result = await runSeedRealTestData()
      res.json(result)
    } catch (error) {
      res.status(500).json({ error: error.message })
    }
  })

/**
 * Internal function to run seeding (shared by onCall and HTTP)
 */
async function runSeedRealTestData() {
  console.log('Starting REAL test data seeding...')

  const results = {
    videoPosts: [],
    songPosts: [],
    errors: [],
  }

  // Step 1: Get test users
  const users = []
  for (const testUser of TEST_USERS) {
    const user = await getUserByUsername(testUser.username)
    if (user) {
      users.push(user)
    } else {
      results.errors.push(`User ${testUser.username} not found`)
    }
  }

  if (users.length === 0) {
    throw new Error('No test users found. Run seedMusicTestUsers first.')
  }

  // Step 2: Create VIDEO posts
  const allPosts = []
  for (let i = 0; i < REAL_VIDEOS.length; i++) {
    const user = users[i % users.length]
    const video = REAL_VIDEOS[i]
    const post = await createVideoPost(user, video, ['vibes', 'studio'])
    allPosts.push(post)
    results.videoPosts.push({
      id: post.id,
      author: user.username,
      title: video.title,
    })
  }

  // Step 3: Get real songs and create posts
  const realSongs = await getRealSongsWithAudio(5)
  for (let i = 0; i < realSongs.length; i++) {
    const user = users[i % users.length]
    const song = realSongs[i]
    try {
      const post = await createSongPost(user, song)
      allPosts.push(post)
      results.songPosts.push({
        id: post.id,
        author: user.username,
        songTitle: song.title,
      })
    } catch (error) {
      results.errors.push(`Song post failed: ${error.message}`)
    }
  }

  // Step 4: Populate home feeds
  for (const user of users) {
    const postsFromOthers = allPosts.filter(p => p.authorID !== user.id)
    await addToHomeFeed(user.id, postsFromOthers)
  }

  // Step 5: Add to main user
  const mainUser = await getUserByUsername('ernestolee')
  if (mainUser) {
    await addToHomeFeed(mainUser.id, allPosts)
  }

  return {
    success: true,
    message: `Created ${results.videoPosts.length} video posts and ${results.songPosts.length} song posts`,
    results,
  }
}
