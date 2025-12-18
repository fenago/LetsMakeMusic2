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