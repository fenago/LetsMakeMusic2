const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

const usersRef = db.collection('users')
const socialGraphRef = db.collection('social_graph')

/**
 * Search for users by keyword (searches firstName, lastName, username)
 */
exports.searchUsers = functions.https.onCall(async (data, context) => {
  const { userID, keyword, page = 0, size = 25 } = data

  try {
    if (!keyword || keyword.trim() === '') {
      return { users: [] }
    }

    const searchTerm = keyword.toLowerCase().trim()

    // Get all users and filter client-side (Firestore doesn't support full-text search)
    // For production, consider using Algolia or Elasticsearch
    const usersSnapshot = await usersRef.limit(500).get()

    const users = []
    usersSnapshot.forEach((doc) => {
      const user = doc.data()
      // Don't include current user in search results
      if (user.id === userID) return

      const firstName = (user.firstName || '').toLowerCase()
      const lastName = (user.lastName || '').toLowerCase()
      const username = (user.username || '').toLowerCase()
      const email = (user.email || '').toLowerCase()

      if (
        firstName.includes(searchTerm) ||
        lastName.includes(searchTerm) ||
        username.includes(searchTerm) ||
        email.includes(searchTerm)
      ) {
        users.push(user)
      }
    })

    // Apply pagination
    const startIndex = page * size
    const paginatedUsers = users.slice(startIndex, startIndex + size)

    return { users: paginatedUsers }
  } catch (error) {
    console.error('Error searching users:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Add a friendship/follow edge between two users
 */
exports.add = functions.https.onCall(async (data, context) => {
  const { sourceUserID, destUserID } = data

  try {
    if (!sourceUserID || !destUserID) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'sourceUserID and destUserID are required'
      )
    }

    // Get both users
    const [sourceUserDoc, destUserDoc] = await Promise.all([
      usersRef.doc(sourceUserID).get(),
      usersRef.doc(destUserID).get(),
    ])

    if (!sourceUserDoc.exists || !destUserDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found')
    }

    const sourceUser = sourceUserDoc.data()
    const destUser = destUserDoc.data()
    const timestamp = admin.firestore.FieldValue.serverTimestamp()

    // Check if reverse friendship exists (destUser -> sourceUser)
    const reverseDoc = await socialGraphRef
      .doc(destUserID)
      .collection('outbound')
      .doc(sourceUserID)
      .get()

    const isReciprocal = reverseDoc.exists

    // Create outbound edge (sourceUser follows destUser)
    await socialGraphRef
      .doc(sourceUserID)
      .collection('outbound')
      .doc(destUserID)
      .set({
        id: destUserID,
        user: destUser,
        type: isReciprocal ? 'reciprocal' : 'outbound',
        createdAt: timestamp,
      })

    // Create inbound edge (destUser has follower sourceUser)
    await socialGraphRef
      .doc(destUserID)
      .collection('inbound')
      .doc(sourceUserID)
      .set({
        id: sourceUserID,
        user: sourceUser,
        type: isReciprocal ? 'reciprocal' : 'inbound',
        createdAt: timestamp,
      })

    // Update live collections for real-time listeners
    await socialGraphRef
      .doc(sourceUserID)
      .collection('friendships_live')
      .doc(destUserID)
      .set({
        id: destUserID,
        user: destUser,
        type: isReciprocal ? 'reciprocal' : 'outbound',
        createdAt: timestamp,
      })

    await socialGraphRef
      .doc(destUserID)
      .collection('friendships_live')
      .doc(sourceUserID)
      .set({
        id: sourceUserID,
        user: sourceUser,
        type: isReciprocal ? 'reciprocal' : 'inbound',
        createdAt: timestamp,
      })

    // If reciprocal, update both to mutual_users_live
    if (isReciprocal) {
      await socialGraphRef
        .doc(sourceUserID)
        .collection('mutual_users_live')
        .doc(destUserID)
        .set({
          id: destUserID,
          user: destUser,
          createdAt: timestamp,
        })

      await socialGraphRef
        .doc(destUserID)
        .collection('mutual_users_live')
        .doc(sourceUserID)
        .set({
          id: sourceUserID,
          user: sourceUser,
          createdAt: timestamp,
        })

      // Update the type to reciprocal on both sides
      await socialGraphRef
        .doc(destUserID)
        .collection('outbound')
        .doc(sourceUserID)
        .update({ type: 'reciprocal' })

      await socialGraphRef
        .doc(sourceUserID)
        .collection('inbound')
        .doc(destUserID)
        .update({ type: 'reciprocal' })
    }

    // Update friendship counts
    await usersRef.doc(sourceUserID).update({
      outboundFriendshipCount: admin.firestore.FieldValue.increment(1),
    })

    await usersRef.doc(destUserID).update({
      inboundFriendshipCount: admin.firestore.FieldValue.increment(1),
    })

    return { success: true }
  } catch (error) {
    console.error('Error adding friendship:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Remove a friendship between two users (unfollow)
 */
exports.unfriend = functions.https.onCall(async (data, context) => {
  const { sourceUserID, destUserID } = data

  try {
    if (!sourceUserID || !destUserID) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'sourceUserID and destUserID are required'
      )
    }

    // Remove outbound edge
    await socialGraphRef
      .doc(sourceUserID)
      .collection('outbound')
      .doc(destUserID)
      .delete()

    // Remove inbound edge
    await socialGraphRef
      .doc(destUserID)
      .collection('inbound')
      .doc(sourceUserID)
      .delete()

    // Remove from live collections
    await socialGraphRef
      .doc(sourceUserID)
      .collection('friendships_live')
      .doc(destUserID)
      .delete()

    await socialGraphRef
      .doc(destUserID)
      .collection('friendships_live')
      .doc(sourceUserID)
      .delete()

    // Remove from mutual users if exists
    await socialGraphRef
      .doc(sourceUserID)
      .collection('mutual_users_live')
      .doc(destUserID)
      .delete()

    await socialGraphRef
      .doc(destUserID)
      .collection('mutual_users_live')
      .doc(sourceUserID)
      .delete()

    // Update the reverse friendship type if it exists
    const reverseOutbound = await socialGraphRef
      .doc(destUserID)
      .collection('outbound')
      .doc(sourceUserID)
      .get()

    if (reverseOutbound.exists) {
      await socialGraphRef
        .doc(destUserID)
        .collection('outbound')
        .doc(sourceUserID)
        .update({ type: 'outbound' })

      await socialGraphRef
        .doc(sourceUserID)
        .collection('inbound')
        .doc(destUserID)
        .update({ type: 'inbound' })

      await socialGraphRef
        .doc(destUserID)
        .collection('friendships_live')
        .doc(sourceUserID)
        .update({ type: 'outbound' })

      await socialGraphRef
        .doc(sourceUserID)
        .collection('friendships_live')
        .doc(destUserID)
        .update({ type: 'inbound' })
    }

    // Update friendship counts
    await usersRef.doc(sourceUserID).update({
      outboundFriendshipCount: admin.firestore.FieldValue.increment(-1),
    })

    await usersRef.doc(destUserID).update({
      inboundFriendshipCount: admin.firestore.FieldValue.increment(-1),
    })

    return { success: true }
  } catch (error) {
    console.error('Error unfriending:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Alias for unfriend
 */
exports.unfollow = exports.unfriend

/**
 * Fetch friends (mutual followers)
 */
exports.fetchFriends = functions.https.onCall(async (data, context) => {
  const { userID, page = 0, size = 25 } = data

  try {
    if (!userID) {
      throw new functions.https.HttpsError('invalid-argument', 'userID is required')
    }

    const friendsSnapshot = await socialGraphRef
      .doc(userID)
      .collection('mutual_users_live')
      .orderBy('createdAt', 'desc')
      .offset(page * size)
      .limit(size)
      .get()

    const friends = friendsSnapshot.docs.map((doc) => doc.data())

    return { friends }
  } catch (error) {
    console.error('Error fetching friends:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Fetch all friendships (followers, following, mutual)
 */
exports.fetchFriendships = functions.https.onCall(async (data, context) => {
  const { userID, page = 0, size = 25 } = data

  try {
    if (!userID) {
      throw new functions.https.HttpsError('invalid-argument', 'userID is required')
    }

    const friendshipsSnapshot = await socialGraphRef
      .doc(userID)
      .collection('friendships_live')
      .orderBy('createdAt', 'desc')
      .offset(page * size)
      .limit(size)
      .get()

    const friendships = friendshipsSnapshot.docs.map((doc) => doc.data())

    return { friendships }
  } catch (error) {
    console.error('Error fetching friendships:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})

/**
 * Fetch friendships for another user (with viewer context)
 */
exports.fetchOtherUserFriendships = functions.https.onCall(async (data, context) => {
  const { userID, viewerID, type, page = 0, size = 25 } = data

  try {
    if (!userID) {
      throw new functions.https.HttpsError('invalid-argument', 'userID is required')
    }

    let collection = 'friendships_live'
    if (type === 'inbound') {
      collection = 'inbound'
    } else if (type === 'outbound') {
      collection = 'outbound'
    }

    const friendshipsSnapshot = await socialGraphRef
      .doc(userID)
      .collection(collection)
      .orderBy('createdAt', 'desc')
      .offset(page * size)
      .limit(size)
      .get()

    const friendships = []

    for (const doc of friendshipsSnapshot.docs) {
      const friendship = doc.data()

      // Check viewer's relationship to this user
      if (viewerID && viewerID !== userID) {
        const viewerOutbound = await socialGraphRef
          .doc(viewerID)
          .collection('outbound')
          .doc(friendship.id)
          .get()

        const viewerInbound = await socialGraphRef
          .doc(viewerID)
          .collection('inbound')
          .doc(friendship.id)
          .get()

        if (viewerOutbound.exists && viewerInbound.exists) {
          friendship.type = 'reciprocal'
        } else if (viewerOutbound.exists) {
          friendship.type = 'outbound'
        } else if (viewerInbound.exists) {
          friendship.type = 'inbound'
        } else {
          friendship.type = 'none'
        }
      }

      friendships.push(friendship)
    }

    return { friendships }
  } catch (error) {
    console.error('Error fetching other user friendships:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})
