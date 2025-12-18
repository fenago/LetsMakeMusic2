import { Platform } from 'react-native'
import { uploadMediaFunctionURL } from '../../../firebase/config'
import { processMediaFile } from '../../mediaProcessor'

const uploadFile = async file => {
  const uri = file?.path || file?.uri 
  const type = file?.mime || file?.type || 'image/jpeg'
  const fallbackName = Platform.select({
    native: uri.substring(uri?.lastIndexOf('/') + 1),
    default: 'webdefaultbase24',
  })

  const uriParts = uri.split('.')
  const fileType = uriParts[uriParts.length - 1]

  console.log('raw file object', file)
  
  const isThumbnail = file?.fileName && file?.width && file?.height
  
  var fileData = Platform.select({
    web: {
      name: file?.name ?? file?.fileName ?? fallbackName,
      fileName: file?.name ?? file?.fileName ?? fallbackName,
      ...file,
      uri: file?.uri,
      type: 'image',
    },
    android: {
      ...file,
      name: file?.name ?? file?.fileName ?? fallbackName,
      mimetype: isThumbnail ? 'image/jpeg' : `${type}/${fileType}`,
      type: isThumbnail ? 'image/jpeg' : `${type}/${fileType}`,
    },
    ios: {
      uri: uri.replace('file://', ''),
      name: isThumbnail ? file.fileName : fallbackName,
      type: isThumbnail ? 'image/jpeg' : type,
      size: file?.size,
    },
    default: {
      ...file,
      name: file?.name ?? file?.fileName ?? fallbackName,
      mimetype: file?.type ?? 'image/jpeg',
      type: 'image',
    },
  })

  if (isThumbnail) {
    fileData = {
      ...fileData,
      name: file.fileName,
      type: 'image/jpeg',
      uri: file.uri,
    }
  }

  Object.keys(fileData).forEach(k => fileData[k] == null && delete fileData[k])

  const formData = new FormData()
  
  if (Platform.OS === 'android' && isThumbnail) {
    formData.append('file', {
      uri: file.uri,
      type: 'image/jpeg',
      name: file.fileName,
    })
  } else {
    formData.append('file', fileData)
  }

  console.log('Prepared file data:', fileData)
  
  try {
    const res = await fetch(uploadMediaFunctionURL, {
      method: 'POST',
      body: formData,
      mode: 'no-cors',
      headers: Platform.select({
        web: new Headers({
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data;boundary="boundary"',
        }),
        android: new Headers({
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data',
        }),
        default: new Headers({
          'Content-Type': 'multipart/form-data',
        }),
      }),
    })

    const jsonData = await res.json()
    console.log("json data", jsonData)
    return jsonData?.downloadURL
  } catch (error) {
    console.error('Error uploading file:', error)
    return null
  }
}

const processAndUploadMediaFile = file => {
  return new Promise((resolve, _reject) => {
    if (!file) {
      resolve({ error: 'No file provided' })
      return
    }

    console.log('[firebaseStorage] Starting processAndUploadMediaFile for file:', file)

    processMediaFile(file, ({ processedUri, thumbnail }) => {
      console.log('[firebaseStorage] Media processed:', { 
        processedUri, 
        thumbnail: thumbnail ? { ...thumbnail, uri: thumbnail.uri } : null 
      })

      if (!processedUri) {
        resolve({ error: 'No processed URI returned from media processor' })
        return
      }

      uploadFile(file)
        .then(downloadURL => {
          if (!downloadURL) {
            resolve({ error: 'File upload failed' })
            return
          }

          if (thumbnail) {
            uploadFile(thumbnail)
              .then(thumbnailURL => {
                if (thumbnailURL) {
                  resolve({ downloadURL, thumbnailURL })
                } else {
                  // Fallback to main URL if thumbnail upload fails
                  console.log('[firebaseStorage] Thumbnail upload failed, using main URL')
                  resolve({ downloadURL, thumbnailURL: downloadURL })
                }
              })
              .catch(e => {
                console.error('[firebaseStorage] Thumbnail upload error:', e)
                resolve({ downloadURL, thumbnailURL: downloadURL })
              })
            return
          }
          resolve({ downloadURL })
        })
        .catch(e => {
          console.error('[firebaseStorage] File upload error:', e)
          resolve({ error: 'photoUploadFailed', details: e.message })
        })
    })
  })
}

const processAndUploadMediaFileWithProgressTracking = async (
  file,
  callbackProgress,
  callbackSuccess,
  callbackError,
) => {
  if (!file) {
    callbackError({ error: 'No file provided' })
    return
  }

  try {
    console.log('[firebaseStorage] Starting processAndUploadMediaFileWithProgressTracking for file:', file)
    // Simulate progress
    callbackProgress(0.1)
    
    // Process the file first
    processMediaFile(file, async ({ processedUri, thumbnail }) => {
      try {
        console.log('[firebaseStorage] Media processed:', { processedUri, thumbnail })
        callbackProgress(0.5)
        
        if (!processedUri) {
          throw new Error('No processed URI returned from media processor')
        }
        
        // Upload the main file
        const downloadURL = await uploadFile(file)
        if (!downloadURL) {
          throw new Error('File upload failed')
        }
        
        console.log('[firebaseStorage] File uploaded at:', downloadURL)
        callbackProgress(0.8)
        
        // Upload thumbnail if available
        let thumbnailURL = downloadURL
        if (thumbnail) {
          try {
            thumbnailURL = await uploadFile(thumbnail) || downloadURL
          } catch (thumbError) {
            console.error('[firebaseStorage] Thumbnail upload failed:', thumbError)
            thumbnailURL = downloadURL
          }
        }
        
        callbackProgress(1)
        callbackSuccess({ 
          downloadURL,
          thumbnailURL
        })
      } catch (error) {
        console.error('[firebaseStorage] Error in processing media file with tracking:', error)
        callbackError({ error: 'photoUploadFailed', details: error.message })
      }
    })
  } catch (error) {
    console.error('[firebaseStorage] Error in processing media file with tracking:', error)
    callbackError({ error: 'photoUploadFailed', details: error.message })
  }
}

const uploadMedia = async mediaAsset => {
  try {
    if (!mediaAsset) {
      console.error('[firebaseStorage] No media asset provided to uploadMedia')
      return null
    }
    
    console.log('[firebaseStorage] Starting uploadMedia for asset:', mediaAsset)
    const response = await processAndUploadMediaFile(mediaAsset)
    console.log('[firebaseStorage] uploadMedia response:', response)
    
    if (response.error) {
      console.error('[firebaseStorage] Error in uploadMedia:', response.error)
      return null
    }
    
    return {
      ...mediaAsset,
      downloadURL: response.downloadURL,
      thumbnailURL: response.thumbnailURL ?? response.downloadURL,
      type: mediaAsset.type || mediaAsset.mime || 'image/jpeg'
    }
  } catch (error) {
    console.error('[firebaseStorage] error uploading media', error)
    return null
  }
}

const firebaseStorage = {
  processAndUploadMediaFile,
  processAndUploadMediaFileWithProgressTracking,
  uploadMedia,
}

export default firebaseStorage