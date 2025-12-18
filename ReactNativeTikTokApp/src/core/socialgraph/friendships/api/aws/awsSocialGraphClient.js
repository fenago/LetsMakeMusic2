import { API, graphqlOperation } from 'aws-amplify'

import { storageAPI } from '../../../../media/'

export const searchUsers = async (userID, keyword, nextToken, limit) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.onSearchUsers, {
        userID,
        keyword,
        nextToken,
        limit,
      }),
    )

    if (!res.data?.onSearchUsers.items) {
      return {
        items: [],
        nextToken: null,
      }
    }

    const searchResults = res.data?.onSearchUsers

    const items = await storageAPI.hydrateListWithFileLink(
      searchResults.items,
      'profilePictureKey',
      'profilePictureURL',
    )

    return {
      items,
      nextToken: searchResults.nextToken,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const fetchFriends = async (userID, nextToken, size = 50) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.mutualsBySourceUser, {
        sourceUserID: userID,
        limit: size,
        nextToken: nextToken,
      }),
    )

    if (!res.data?.mutualsBySourceUser.items) {
      return {
        items: [],
        nextToken: null,
      }
    }

    const mutualsBySourceUser = res.data?.mutualsBySourceUser
    const hydratedList = mutualsBySourceUser?.items?.map(async item => {
      item.user.profilePictureURL = await storageAPI.getFileLink(
        item.user.profilePictureKey,
      )
      return item
    })
    return {
      items: await Promise.all(hydratedList),
      nextToken: mutualsBySourceUser.nextToken,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const fetchFriendships = async (userID, nextToken, size = 50) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.friendshipsBySourceUser, {
        sourceUserID: userID,
        limit: size,
        nextToken: nextToken,
      }),
    )

    if (!res.data?.friendshipsBySourceUser.items) {
      return {
        items: [],
        nextToken: null,
      }
    }

    const friendshipsBySourceUser = res.data?.friendshipsBySourceUser

    const hydratedList = friendshipsBySourceUser?.items?.map(async item => {
      item.user.profilePictureURL = await storageAPI.getFileLink(
        item.user.profilePictureKey,
      )
      return item
    })

    return {
      items: await Promise.all(hydratedList),
      nextToken: friendshipsBySourceUser.nextToken,
    }
  } catch (error) {
    console.log(error)
    return null
  }
}

export const fetchOtherUserFriendships = async (
  userID,
  viewerID,
  type,
  nextToken,
  limit = 50,
) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphQueries.fetchOtherUserFriendships, {
        userID,
        viewerID,
        type,
        nextToken,
        limit,
      }),
    )

    if (!res.data?.fetchOtherUserFriendships.friendships) {
      return {
        items: [],
        nextToken: null,
      }
    }

    const friendships = res.data?.fetchOtherUserFriendships.friendships

    const hydratedList = friendships?.map(async item => {
      item.user.profilePictureURL = await storageAPI.getFileLink(
        item.user.profilePictureKey,
      )
      return item
    })

    return {
      items: await Promise.all(hydratedList),
      nextToken: friendshipsBySourceUser.nextToken,
    }

    return []
  } catch (error) {
    console.log(error)
    return null
  }
}

export const add = async (sourceUserID, destUserID) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphMutations.addFriendship, {
        sourceUserID,
        destUserID,
      }),
    )

    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const unfriend = async (sourceUserID, destUserID) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphMutations.unfriend, {
        sourceUserID,
        destUserID,
      }),
    )

    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const unfollow = async (sourceUserID, destUserID) => {
  try {
    const res = await API.graphql(
      graphqlOperation(socialGraphMutations.unfollow, {
        sourceUserID,
        destUserID,
      }),
    )

    return res?.data
  } catch (error) {
    console.log(error)
    return null
  }
}

export const subscribeToFriends = (userID, callback) => {
  const subscription = API.graphql(
    graphqlOperation(socialGraphsubscriptions.onUserMutualFriendshipUpdate, {
      sourceUserID: userID,
    }),
  ).subscribe({
    next: async ({ provider, value }) => {
      const item = { ...value.data.onUserMutualFriendshipUpdate }
      item.user.profilePictureURL = await storageAPI.getFileLink(
        item.user.profilePictureKey,
      )

      callback([item])
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}

export const subscribeToFriendships = (userID, callback) => {
  const subscription = API.graphql(
    graphqlOperation(socialGraphsubscriptions.onUserFriendshipUpdate, {
      sourceUserID: userID,
    }),
  ).subscribe({
    next: async ({ provider, value }) => {
      const item = { ...value.data.onUserFriendshipUpdate }
      item.user.profilePictureURL = await storageAPI.getFileLink(
        item.user.profilePictureKey,
      )

      callback([item])
    },
    error: error => console.warn(error),
  })

  return () => subscription.unsubscribe()
}
