import { v4 as uuidv4 } from 'uuid'
import { API, graphqlOperation } from 'aws-amplify'

import { getUnixTimeStamp } from '../../../../helpers/timeFormat'
import { storageAPI } from '../../../../media/'

const extractHashtags = text => {
  const regexp = /(\s|^)\#\w\w+\b/gm
  let result = text?.match(regexp)
  if (result) {
    result = result.map(hashtag => hashtag.trim())
    return result
  } else {
    return []
  }
}

export const addPost = async (postData, author) => {
  const { postText } = postData
  const hashtags = extractHashtags(postText)
  const post = {
    id: uuidv4(),
    ...postData,
    authorID: author.id,
    hashtags,
    commentCount: 0,
    reactionsCount: 0,
    reactions: {
      like: [], // the list of userIDs who liked the post
      love: [],
      laugh: [],
      angry: [],
      suprised: [],
      cry: [],
      sad: [],
    },
    createdAt: getUnixTimeStamp(),
    updatedAt: getUnixTimeStamp(),
  }

  try {
    await API.graphql(
      graphqlOperation(socialGraphMutations.createPost, {
        input: post,
      }),
    )
  } catch (error) {
    console.log(error)
    return null
  }
}

export const deletePost = async (postID, authorID) => {
  try {
    await API.graphql(
      graphqlOperation(socialGraphMutations.deletePost, {
        input: {
          id: postID,
        },
      }),
    )
  } catch (error) {
    console.log(error)
    return null
  }
}

export const addStory = async (storyData, author) => {
  const story = {
    id: uuidv4(),
    ...storyData,
    authorID: author.id,
    viewsCount: 0,
    reactionsCount: 0,
    createdAt: getUnixTimeStamp(),
    updatedAt: getUnixTimeStamp(),
  }
  try {
    await API.graphql(
      graphqlOperation(socialGraphMutations.createStory, {
        input: story,
      }),
    )
  } catch (error) {
    console.log(error)
    return null
  }
}

export const addReaction = async (postID, authorID, reaction) => {
  try {
    await API.graphql(
      graphqlOperation(socialGraphMutations.addReaction, {
        authorID,
        postID,
        reaction,
      }),
    )
  } catch (error) {
    console.log(error)
    return null
  }
}

export const addComment = async (commentText, postID, authorID) => {
  try {
    await API.graphql(
      graphqlOperation(socialGraphMutations.addComment, {
        commentText,
        postID,
        authorID,
      }),
    )
  } catch (error) {
    console.log(error)
    return null
  }
}

export const listHomeFeedPosts = async (userID, nextToken, size = 1000) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.getPostFeedForDestUser, {
        destUserID: userID,
        limit: size,
        nextToken,
      }),
    )

    const posts = res.data?.getPostFeedForDestUser.items
    const token = res.data?.getPostFeedForDestUser.nextToken

    if (!posts?.length) {
      return {
        items: [],
        nextToken: null,
      }
    }

    return {
      items: await hydratePostsFeedWithUrlLink(posts),
      nextToken: token,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const listStories = async (userID, nextToken, size = 1000) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.getStoryFeedForDestUser, {
        destUserID: userID,
        limit: size,
        nextToken,
      }),
    )

    const stories = res.data?.getStoryFeedForDestUser.items
    const token = res.data?.getStoryFeedForDestUser.nextToken

    if (!stories?.length) {
      return {
        items: [],
        nextToken: null,
      }
    }

    return {
      items: stories.map(item => ({ ...item, ...item.story })),
      nextToken: token,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const listComments = async (postID, nextToken, size = 1000) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.getPostComments, {
        postID,
        limit: size,
        nextToken: nextToken,
      }),
    )

    const comments = res.data?.getPostComments.items
    const token = res.data?.getPostComments.nextToken

    if (!comments.length) {
      return {
        items: [],
        nextToken: null,
      }
    }

    return {
      items: await hydrateCommentsWithUrlLink(comments),
      nextToken: token,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const listDiscoverFeedPosts = async (
  userID,
  nextToken,
  limit = 1000,
) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.fetchDiscoverFeedPosts, {
        userID,
        nextToken,
        limit,
        nextToken: nextToken,
      }),
    )

    const posts = res.data?.fetchDiscoverFeedPosts.items
    const token = res.data?.fetchDiscoverFeedPosts.nextToken

    if (!posts?.length) {
      return {
        items: [],
        nextToken: null,
      }
    }

    return {
      items: await hydratePostsFeedWithUrlLink(posts),
      nextToken: token,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const listHashtagFeedPosts = async (
  userID,
  hashtag,
  nextToken,
  size = 1000,
) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.fetchHashtagFeedPosts, {
        userID,
        hashtag: hashtag,
        limit: size,
        nextToken,
      }),
    )

    const posts = res.data?.fetchHashtagFeedPosts.items
    const token = res.data?.fetchHashtagFeedPosts.nextToken

    if (!posts?.length) {
      return {
        items: [],
        nextToken: null,
      }
    }

    return {
      items: await hydratePostsFeedWithUrlLink(posts),
      nextToken: token,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const listProfileFeed = async (userID, nextToken, size = 1000) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.getPostFeedByAuthor, {
        authorID: userID,
        limit: size,
        nextToken: nextToken,
      }),
    )

    const posts = res.data?.getPostFeedByAuthor.items
    const token = res.data?.getPostFeedByAuthor.nextToken

    if (!posts?.length) {
      return {
        items: [],
        nextToken: null,
      }
    }

    return {
      items: await hydratePostsFeedWithUrlLink(posts),
      nextToken: token,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const fetchProfile = async (profileID, viewerID) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.fetchProfile, {
        profileID,
        viewerID,
      }),
    )

    return await hydrateProfileDataUrlLink(res.data.fetchProfile?.profileData)
  } catch (error) {
    console.log(error)
    return null
  }
}

export const hydrateFeedForNewFriendship = async (destUserID, sourceUserID) => {
  // we take all posts & stories from sourceUserID and populate the feed & stories of destUserID
  // const mainFeedDestRef = firebase
  //   .firestore()
  //   .collection('social_feeds')
  //   .doc(destUserID)
  //   .collection('main_feed')
  // const unsubscribeToSourcePosts = postsRef
  //   .where('authorID', '==', sourceUserID)
  //   .onSnapshot(
  //     querySnapshot => {
  //       querySnapshot?.forEach(doc => {
  //         const post = doc.data()
  //         if (post.id) {
  //           mainFeedDestRef.doc(post.id).set(post)
  //         }
  //       })
  //       unsubscribeToSourcePosts()
  //     },
  //     error => {
  //       console.log(error)
  //     },
  //   )
}

export const removeFeedForOldFriendship = async (destUserID, oldFriendID) => {
  // We remove all posts authored by oldFriendID from destUserID's feed
  // const mainFeedDestRef = firebase
  //   .firestore()
  //   .collection('social_feeds')
  //   .doc(destUserID)
  //   .collection('main_feed')
  // const unsubscribeToSourcePosts = postsRef
  //   .where('authorID', '==', oldFriendID)
  //   .onSnapshot(
  //     querySnapshot => {
  //       querySnapshot?.forEach(doc => {
  //         const post = doc.data()
  //         if (post.id) {
  //           mainFeedDestRef.doc(post.id).delete()
  //         }
  //       })
  //       unsubscribeToSourcePosts()
  //     },
  //     error => {
  //       console.log(error)
  //     },
  //   )
}

export const getPost = async postId => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.getPost, {
        id: postId,
      }),
    )

    const posts = await hydratePostsFeedWithUrlLink([res.data?.getPost])

    return {
      data: posts[0] ?? {},
      success: !!res.data?.getPost,
    }
  } catch (error) {
    console.log(error)
    return {
      error: 'Oops! an error occurred. Please try again',
      success: false,
    }
  }
}

export const subscribeToProfileFeedPosts = (userID, callback) => {
  const subscription = API.graphql(
    graphqlOperation(socialGraphsubscriptions.onAuthorPostFeedUpdate, {
      authorID: userID,
    }),
  ).subscribe({
    next: async ({ provider, value }) => {
      const item = { ...value.data.onAuthorPostFeedUpdate }

      callback(await hydratePostsFeedWithUrlLink([item]))
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}

export const subscribeToComments = (postID, callback) => {
  const subscription = API.graphql(
    graphqlOperation(socialGraphsubscriptions.onPostCommentsUpdate, {
      postID,
    }),
  ).subscribe({
    next: async ({ provider, value }) => {
      const item = { ...value.data.onPostCommentsUpdate }

      callback(await hydrateCommentsWithUrlLink([item]))
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}

export const subscribeToHashtagFeedPosts = (hashtag, callback) => {
  const subscription = API.graphql(
    graphqlOperation(socialGraphsubscriptions.onEntityPostFeedUpdate, {
      hashtag,
    }),
  ).subscribe({
    next: async ({ provider, value }) => {
      const item = { ...value.data.onEntityPostFeedUpdate }

      callback(await hydratePostsFeedWithUrlLink([item]))
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}

export const subscribeToSinglePost = (postID, callback) => {
  const subscription = API.graphql(
    graphqlOperation(socialGraphsubscriptions.onSinglePostUpdate, {
      id: postID,
    }),
  ).subscribe({
    next: async ({ provider, value }) => {
      const item = { ...value.data.onSinglePostUpdate }
      const posts = hydratePostsFeedWithUrlLink([item])

      !!posts.length && callback(posts[0])
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}

export const subscribeToHomeFeedPosts = (userID, callback) => {
  const subscription = API.graphql(
    graphqlOperation(socialGraphsubscriptions.onDestUserPostFeedUpdate, {
      destUserID: userID,
    }),
  ).subscribe({
    next: async ({ provider, value }) => {
      const item = { ...value.data.onDestUserPostFeedUpdate }

      callback(await hydratePostsFeedWithUrlLink([item]))
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}

export const subscribeToStories = (userID, callback) => {
  const subscription = API.graphql(
    graphqlOperation(socialGraphsubscriptions.onDestUserStoryFeedUpdate, {
      destUserID: userID,
    }),
  ).subscribe({
    next: async ({ provider, value }) => {
      const item = { ...value.data.onDestUserStoryFeedUpdate?.story }

      callback([item])
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}

const hydratePostsFeedWithUrlLink = async (postsFeed = []) => {
  const task = postsFeed.map(async item => {
    const newItem = { ...item, ...(item.post ?? {}) }
    if (newItem?.postMedia?.length) {
      newItem.postMedia = await storageAPI.hydrateListWithFileLink(
        newItem?.postMedia,
        'urlKey',
        'url',
      )

      newItem.postMedia = await storageAPI.hydrateListWithFileLink(
        newItem?.postMedia,
        'thumbnailKey',
        'thumbnailURL',
      )

      if (newItem.post?.postMedia) {
        newItem.post.postMedia = newItem.postMedia
      }
    }
    newItem.author.profilePictureURL = await storageAPI.getFileLink(
      newItem.author.profilePictureKey,
    )
    return newItem
  })

  return await Promise.all(task)
}

const hydrateCommentsWithUrlLink = async (comments = []) => {
  const task = comments.map(async comment => {
    comment.author.profilePictureURL = await storageAPI.getFileLink(
      comment.author.profilePictureKey,
    )
    return newItem
  })

  return await Promise.all(task)
}

const hydrateProfileDataUrlLink = async (profileData = {}) => {
  const { friends, user = {} } = profileData

  return {
    ...profileData,
    user: {
      ...user,
      profilePictureURL: await storageAPI.getFileLink(user.profilePictureKey),
    },
    friends: await storageAPI.hydrateListWithFileLink(
      friends ?? [],
      'profilePictureKey',
      'profilePictureURL',
    ),
  }
}
