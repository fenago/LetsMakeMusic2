const functions = require('firebase-functions')
const admin = require('firebase-admin')

const db = admin.firestore()

const usersRef = db.collection('users')
const socialGraphRef = db.collection('social_graph')

/**
 * Fetch profile data for a user, including their friendship status with the viewer
 */
exports.fetchProfile = functions.https.onCall(async (data, context) => {
  const { profileID, viewerID } = data

  try {
    if (!profileID) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'profileID is required'
      )
    }

    // Fetch the user profile
    const userDoc = await usersRef.doc(profileID).get()
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found')
    }

    const user = userDoc.data()

    // Determine action button type
    let actionButtonType = 'add' // default: can add/follow this user

    if (viewerID === profileID) {
      // Viewing own profile
      actionButtonType = 'settings'
    } else if (viewerID) {
      // Check if viewer is following the profile user
      const viewerOutbound = await socialGraphRef
        .doc(viewerID)
        .collection('outbound')
        .doc(profileID)
        .get()

      if (viewerOutbound.exists) {
        // Already following, show message button
        actionButtonType = 'message'
      }
    }

    // Fetch friends (mutual followers) for this profile - limited to a few for display
    const friendsSnapshot = await socialGraphRef
      .doc(profileID)
      .collection('mutual_users_live')
      .limit(10)
      .get()

    const friends = friendsSnapshot.docs.map((doc) => doc.data())

    // Check if there are more friends available
    const totalFriendsSnapshot = await socialGraphRef
      .doc(profileID)
      .collection('mutual_users_live')
      .limit(11)
      .get()

    const moreFriendsAvailable = totalFriendsSnapshot.docs.length > 10

    return {
      profileData: {
        user,
        friends,
        moreFriendsAvailable,
        actionButtonType,
      },
    }
  } catch (error) {
    console.error('Error fetching profile:', error)
    throw new functions.https.HttpsError('internal', error.message)
  }
})
