import { DocRef, FeedFunctions, postsRef } from './feedRef'

/**
 * Validate a post has the minimum required data to be displayed
 * This filters out broken/incomplete posts from the feed
 */
const isValidPost = (post) => {
  // Must have an ID
  if (!post?.id) {
    console.log('[feedClient] Filtering out post: missing id')
    return false
  }

  // Must have an author
  if (!post.authorID && !post.author?.id) {
    console.log('[feedClient] Filtering out post:', post.id, '- missing author')
    return false
  }

  // Must have some media
  if (!post.postMedia || post.postMedia.length === 0) {
    console.log('[feedClient] Filtering out post:', post.id, '- no media')
    return false
  }

  const media = post.postMedia[0]

  // Media must have a URL
  if (!media.url) {
    console.log('[feedClient] Filtering out post:', post.id, '- media has no URL')
    return false
  }

  // For song posts, validate songData
  if (post.postType === 'song') {
    // Song posts MUST have songData with an audioUrl
    if (!post.songData) {
      console.log('[feedClient] Filtering out song post:', post.id, '- missing songData')
      return false
    }
    if (!post.songData.audioUrl && !post.songData.firebaseAudioUrl) {
      console.log('[feedClient] Filtering out song post:', post.id, '- songData has no audio URL')
      return false
    }
  }

  // For video posts, validate the video URL looks valid
  if (media.type?.includes('video')) {
    if (!media.url.startsWith('http')) {
      console.log('[feedClient] Filtering out video post:', post.id, '- invalid video URL')
      return false
    }
  }

  return true
}

/**
 * Filter posts to remove bad/incomplete data
 */
const filterValidPosts = (posts) => {
  const validPosts = posts.filter(isValidPost)
  const filtered = posts.length - validPosts.length
  if (filtered > 0) {
    console.log(`[feedClient] Filtered out ${filtered} invalid posts from ${posts.length} total`)
  }
  return validPosts
}

export const addPost = async (postData, author) => {
  const instance = FeedFunctions().addPost
  try {
    const res = await instance({
      authorID: author?.id,
      postData: postData,
    })
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const deletePost = async (postID, authorID) => {
  const instance = FeedFunctions().deletePost
  try {
    const res = await instance({
      authorID,
      postID,
    })
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const editPost = async (postID, authorID, newPostText) => {
  console.log('[editPost] ========== STARTING ==========')
  console.log('[editPost] Args:', { postID, authorID, newPostText: newPostText?.substring(0, 50) })

  if (!postID || !authorID || newPostText === undefined) {
    console.log('[editPost] ❌ Missing required args')
    return { success: false, error: 'Missing required args' }
  }

  try {
    console.log('[editPost] 📤 Calling editPost function...')
    const instance = FeedFunctions().editPost
    const res = await instance({
      postId: postID,
      authorId: authorID,
      newPostText: newPostText,
    })
    console.log('[editPost] ✅ Success:', JSON.stringify(res?.data))
    return { success: true, ...res?.data }
  } catch (error) {
    console.log('[editPost] ❌ Error:', error?.message)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

export const addStory = async (storyData, author) => {
  const instance = FeedFunctions().addStory
  try {
    const res = await instance({
      authorID: author?.id,
      storyData: storyData,
    })
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const addStoryReaction = async (storyID, userID, emoji = '❤️') => {
  const instance = FeedFunctions().addStoryReaction
  try {
    const res = await instance({
      storyId: storyID,
      userId: userID,
      emoji,
    })
    return res?.data
  } catch (error) {
    console.log('[addStoryReaction] Error:', error)
    return null
  }
}

export const listStories = async (userID, page = 0, size = 100) => {
  console.log('[listStories] Fetching stories for user:', userID)
  const instance = FeedFunctions().listStories
  try {
    const res = await instance({
      userId: userID,
      limit: size,
    })
    console.log('[listStories] Response:', res?.data?.stories?.length, 'story groups')
    // Flatten the grouped stories for the client
    const groups = res?.data?.stories || []
    const allStories = []
    groups.forEach(group => {
      group.stories?.forEach(story => {
        allStories.push({
          ...story,
          author: group.author,
          authorID: group.authorId,
        })
      })
    })
    return allStories
  } catch (error) {
    console.log('[listStories] Error:', error)
    return []
  }
}

export const subscribeToStories = (userID, callback) => {
  console.log('[subscribeToStories] Subscribing to stories_feed_live for user:', userID)
  return DocRef(userID)
    .storiesFeedLive.orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        const isFromCache = querySnapshot?.metadata?.fromCache === true
        const storyCount = querySnapshot?.docs?.length || 0
        console.log(`[subscribeToStories] stories_feed_live snapshot: ${storyCount} stories, fromCache: ${isFromCache}`)

        const stories = querySnapshot?.docs?.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) || []

        // Filter out expired stories (older than 24 hours)
        const now = Date.now()
        const oneDay = 24 * 60 * 60 * 1000
        const validStories = stories.filter(story => {
          if (!story.createdAt) return false
          const createdAt = story.createdAt.seconds
            ? story.createdAt.seconds * 1000
            : story.createdAt
          return (now - createdAt) < oneDay
        })

        console.log(`[subscribeToStories] ${validStories.length} valid stories after filtering`)
        callback && callback(validStories)
      },
      error => {
        console.log('[subscribeToStories] Error:', error)
        callback && callback([])
      },
    )
}

export const subscribeToHomeFeedPosts = (userID, callback) => {
  console.log('[firebaseFeedClient] Subscribing to home_feed_live for user:', userID)
  return DocRef(userID)
    .homeFeedLive.orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        const isFromCache = querySnapshot?.metadata?.fromCache === true
        const postCount = querySnapshot?.docs?.length || 0
        console.log(`[firebaseFeedClient] home_feed_live snapshot: ${postCount} posts, fromCache: ${isFromCache}`)

        // Still call callback even for cached data (removed early return)
        // This ensures we show data even if offline or waiting for server
        const allPosts = querySnapshot?.docs?.map(doc => doc.data()) || []

        // CRITICAL: Filter out invalid/broken posts before returning
        const posts = filterValidPosts(allPosts)

        if (posts.length > 0) {
          console.log('[firebaseFeedClient] First valid post:', {
            id: posts[0].id,
            postType: posts[0].postType,
            mediaType: posts[0].postMedia?.[0]?.type,
          })
        }
        callback && callback(posts)
      },
      error => {
        console.log('[firebaseFeedClient] Error subscribing to home_feed_live:', error)
        callback([])
      },
    )
}

export const listHomeFeedPosts = async (userID, page = 0, size = 1000) => {
  const instance = FeedFunctions().listHomeFeedPosts
  try {
    const res = await instance({
      userID,
      page,
      size,
    })

    return res?.data?.posts
  } catch (error) {
    console.log(error)
    return null
  }
}

export const addReaction = async (postID, authorID, reaction) => {
  const instance = FeedFunctions().addReaction
  try {
    const res = await instance({
      authorID,
      postID,
      reaction,
    })
    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const addComment = async (commentText, postID, authorID) => {
  console.log('[addComment] ========== STARTING ==========')
  console.log('[addComment] Args:', { commentText, postID, authorID })

  // Validate inputs
  if (!commentText || !postID || !authorID) {
    console.log('[addComment] ❌ Missing required args')
    return { success: false, error: 'Missing required args' }
  }

  // PRIMARY: Try httpsCallable first (proper Firebase auth)
  try {
    console.log('[addComment] 📤 Trying httpsCallable (primary)...')
    const instance = FeedFunctions().addComment
    const res = await instance({
      postId: postID,
      text: commentText,
      userId: authorID,
    })
    console.log('[addComment] ✅ httpsCallable success:', JSON.stringify(res?.data))
    return { success: true, commentId: res?.data?.commentId }
  } catch (primaryError) {
    console.log('[addComment] ⚠️ httpsCallable failed:', primaryError?.message)
    console.log('[addComment] 🔄 Falling back to HTTP endpoint...')
  }

  // FALLBACK: Use HTTP endpoint if httpsCallable fails
  try {
    const baseUrl = 'https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/testAddComment'
    const params = new URLSearchParams({
      postId: postID,
      text: commentText,
      authorId: authorID,
    })
    const url = `${baseUrl}?${params.toString()}`

    console.log('[addComment] 📤 Calling HTTP fallback endpoint')
    const response = await fetch(url)
    const result = await response.json()
    console.log('[addComment] ✅ HTTP fallback response:', JSON.stringify(result))

    if (result.error) {
      return { success: false, error: result.error }
    }

    return { success: true, commentId: result.commentId }
  } catch (fallbackError) {
    console.log('[addComment] ❌ Both methods failed:', fallbackError?.message)
    return { success: false, error: fallbackError?.message || 'Unknown error' }
  }
}

export const deleteComment = async (postID, commentID, authorID) => {
  console.log('[deleteComment] ========== STARTING ==========')
  console.log('[deleteComment] Args:', { postID, commentID, authorID })

  if (!postID || !commentID || !authorID) {
    console.log('[deleteComment] ❌ Missing required args')
    return { success: false, error: 'Missing required args' }
  }

  try {
    console.log('[deleteComment] 📤 Calling deleteComment function...')
    const instance = FeedFunctions().deleteComment
    const res = await instance({
      postId: postID,
      commentId: commentID,
      userId: authorID,
    })
    console.log('[deleteComment] ✅ Success:', JSON.stringify(res?.data))
    return { success: true, ...res?.data }
  } catch (error) {
    console.log('[deleteComment] ❌ Error:', error?.message)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

export const editComment = async (postID, commentID, authorID, newText) => {
  console.log('[editComment] ========== STARTING ==========')
  console.log('[editComment] Args:', { postID, commentID, authorID, newText: newText?.substring(0, 50) })

  if (!postID || !commentID || !authorID || newText === undefined) {
    console.log('[editComment] ❌ Missing required args')
    return { success: false, error: 'Missing required args' }
  }

  try {
    console.log('[editComment] 📤 Calling editComment function...')
    const instance = FeedFunctions().editComment
    const res = await instance({
      postId: postID,
      commentId: commentID,
      userId: authorID,
      newText: newText,
    })
    console.log('[editComment] ✅ Success:', JSON.stringify(res?.data))
    return { success: true, ...res?.data }
  } catch (error) {
    console.log('[editComment] ❌ Error:', error?.message)
    return { success: false, error: error?.message || 'Unknown error' }
  }
}

export const subscribeToComments = (postID, callback) => {
  console.log('[subscribeToComments] Subscribing to comments for post:', postID)
  return DocRef(postID)
    .commentsLive.orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        const isFromCache = querySnapshot?.metadata?.fromCache === true
        const commentCount = querySnapshot?.docs?.length || 0
        console.log(`[subscribeToComments] Snapshot: ${commentCount} comments, fromCache: ${isFromCache}`)

        // IMPORTANT: Include doc.id in each comment - needed for deduplication and rendering
        const comments = querySnapshot?.docs?.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) || []
        console.log('[subscribeToComments] Comments with IDs:', comments.length, 'comments loaded')
        callback && callback(comments)
      },
      error => {
        console.log('[subscribeToComments] Error:', error)
        callback([])
      },
    )
}

export const listComments = async (postID, page = 0, size = 50) => {
  const instance = FeedFunctions().listComments
  try {
    console.log('[listComments] Fetching comments for post:', postID)
    const res = await instance({
      postId: postID,
      limit: size,
    })
    console.log('[listComments] Response:', res?.data?.comments?.length, 'comments')
    return res?.data?.comments
  } catch (error) {
    console.log(error)
    return null
  }
}

export const subscribeToSinglePost = (postID, callback) => {
  return DocRef(postID).post.onSnapshot(
    { includeMetadataChanges: true },
    doc => {
      if (doc?.exists) {
        callback && callback(doc.data())
      }
    },
    error => {
      console.log(error)
    },
  )
}

export const listDiscoverFeedPosts = async (userID, page = 0, size = 1000) => {
  console.log('[firebaseFeedClient] Calling listDiscoverFeedPosts for user:', userID)
  const instance = FeedFunctions().listDiscoverFeedPosts
  try {
    const res = await instance({
      userID,
      page,
      size,
    })

    const allPosts = res?.data?.posts || []
    // CRITICAL: Filter out invalid/broken posts before returning
    const posts = filterValidPosts(allPosts)

    console.log(`[firebaseFeedClient] listDiscoverFeedPosts returned ${posts.length} valid posts (${allPosts.length} total)`)
    if (posts.length > 0) {
      console.log('[firebaseFeedClient] First discover post:', {
        id: posts[0].id,
        postType: posts[0].postType,
        mediaType: posts[0].postMedia?.[0]?.type,
      })
    }
    return posts
  } catch (error) {
    console.log('[firebaseFeedClient] Error in listDiscoverFeedPosts:', error)
    return null
  }
}

export const subscribeToHashtagFeedPosts = (hashtag, callback) => {
  return DocRef(hashtag)
    .hashtag.orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        if (querySnapshot?.metadata?.fromCache === true) {
          return
        }
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      },
      error => {
        console.log(error)
        callback([])
      },
    )
}

export const listHashtagFeedPosts = async (
  userID,
  hashtag,
  page = 0,
  size = 1000,
) => {
  const instance = FeedFunctions().listHashtagFeedPosts
  try {
    const res = await instance({
      userID,
      hashtag,
      page,
      size,
    })

    return res?.data?.posts
  } catch (error) {
    console.log(error)
    return null
  }
}

export const subscribeToProfileFeedPosts = (userID, callback) => {
  return DocRef(userID)
    .profileFeedLive.orderBy('createdAt', 'desc')
    .onSnapshot(
      { includeMetadataChanges: true },
      querySnapshot => {
        if (querySnapshot?.metadata?.fromCache === true) {
          return
        }
        callback && callback(querySnapshot?.docs?.map(doc => doc.data()))
      },
      error => {
        console.log(error)
        callback([])
      },
    )
}

export const listProfileFeed = async (userID, page = 0, size = 1000) => {
  const instance = FeedFunctions().listProfileFeedPosts
  try {
    const res = await instance({
      userID,
      page,
      size,
    })

    return res?.data?.posts
  } catch (error) {
    console.log(error)
    return null
  }
}

export const fetchProfile = async (profileID, viewerID) => {
  const instance = FeedFunctions().fetchProfile
  try {
    const res = await instance({
      profileID,
      viewerID,
    })

    return res?.data?.profileData
  } catch (error) {
    console.log(error)
    return null
  }
}

export const hydrateFeedForNewFriendship = async (destUserID, sourceUserID) => {
  // we take all posts & stories from sourceUserID and populate the feed & stories of destUserID
  const mainFeedDestRef = DocRef(destUserID).mainFeed
  const unsubscribeToSourcePosts = postsRef
    .where('authorID', '==', sourceUserID)
    .onSnapshot(
      querySnapshot => {
        querySnapshot?.forEach(doc => {
          const post = doc.data()
          if (post.id) {
            mainFeedDestRef.doc(post.id).set(post)
          }
        })
        unsubscribeToSourcePosts()
      },
      error => {
        console.log(error)
      },
    )
}

export const removeFeedForOldFriendship = async (destUserID, oldFriendID) => {
  // We remove all posts authored by oldFriendID from destUserID's feed
  const mainFeedDestRef = DocRef(destUserID).mainFeed

  const unsubscribeToSourcePosts = postsRef
    .where('authorID', '==', oldFriendID)
    .onSnapshot(
      querySnapshot => {
        querySnapshot?.forEach(doc => {
          const post = doc.data()
          if (post.id) {
            mainFeedDestRef.doc(post.id).delete()
          }
        })
        unsubscribeToSourcePosts()
      },
      error => {
        console.log(error)
      },
    )
}

export const getPost = async postId => {
  try {
    const post = await postsRef.doc(postId).get()
    if (!post.exists) {
      return { error: 'Post not found', success: false }
    }
    return { data: { ...post.data(), id: post.id }, success: true }
  } catch (error) {
    console.log(error)
    return {
      error: 'Oops! an error occurred. Please try again',
      success: false,
    }
  }
}