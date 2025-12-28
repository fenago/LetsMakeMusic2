import { db } from '../../../firebase/config'
import { getUnixTimeStamp } from '../../../helpers/timeFormat'

export const usersRef = db.collection('users')

export const updateUser = async (userID, newData) => {
  const dataWithOnlineStatus = {
    ...newData,
    lastOnlineTimestamp: getUnixTimeStamp(),
  }
  try {
    await usersRef.doc(userID).set({ ...dataWithOnlineStatus }, { merge: true })

    const updatedUserDoc = await usersRef.doc(userID).get(); 
    const updatedUserData = updatedUserDoc.data(); 
    return { success: true, user: updatedUserData };
  
  } catch (error) {
    return error
  }
}

export const getUserByID = async userID => {
  try {
    const document = await usersRef.doc(userID).get()
    if (document) {
      return document.data()
    }
    return null
  } catch (error) {
    console.log(error)
    return null
  }
}

export const updateProfilePhoto = async (userID, profilePictureURL) => {
  try {
    await usersRef.doc(userID).update({ profilePictureURL: profilePictureURL })
    return { success: true }
  } catch (error) {
    console.log(error)
    return { error: error }
  }
}


export const updateOnlineStatus = async (userID, isOnline) => {
  try {
    await usersRef.doc(userID).update({
      isOnline,
      lastOnlineTimestamp: getUnixTimeStamp()
    })
    return { success: true }
  } catch (error) {
    console.log('Error updating online status:', error)
    return { error }
  }
}

/**
 * Update user integrations (API keys, connected services)
 * Uses set with merge to properly handle nested fields and create if needed
 * @param {string} userID - The user's ID
 * @param {object} integrations - The integrations object to merge (e.g., { gemini: { apiKey: '...' } })
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateUserIntegrations = async (userID, integrations) => {
  try {
    console.log('[userClient] Updating integrations for user:', userID, integrations)

    // Use set with merge to handle both new and existing documents/fields
    await usersRef.doc(userID).set(
      {
        integrations: integrations,
        lastOnlineTimestamp: getUnixTimeStamp(),
      },
      { merge: true }
    )

    // Verify the save worked
    const updatedDoc = await usersRef.doc(userID).get()
    const userData = updatedDoc.data()
    console.log('[userClient] Verified integrations after save:', userData?.integrations)

    return { success: true }
  } catch (error) {
    console.log('Error updating user integrations:', error)
    return { success: false, error: error.message }
  }
}