const admin = require('firebase-admin')
const functions = require('firebase-functions')
const cors = require('cors')({ origin: true })

const db = admin.firestore()

exports.uploadMedia = functions
  .runWith({
    minInstances: 1,
  })
  .https.onRequest((req, res) => {
    cors(req, res, () => {
      console.log('uploadMedia')

      res.set('Access-Control-Allow-Origin', '*')
      res.set('Access-Control-Allow-Methods', 'POST')
      res.set('Access-Control-Allow-Headers', 'Content-Type')
      res.set('Access-Control-Max-Age', '3600')

      const BusBoy = require('busboy')
      const path = require('path')
      const os = require('os')
      const fs = require('fs')

      const storageBucket = 'letsmakemusic-4e0fe.firebasestorage.app'

      const busboy = BusBoy({ headers: req.headers })

      let imageToBeUploaded = {}
      let imageFileName

      busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
        console.log('on file')
        console.log(`filename: ${JSON.stringify(filename)}`)
        console.log(`mimetype: ${mimetype}`)
        console.log(`encoding: ${encoding}`)
        console.log(`fieldname: ${fieldname}`)
        const { filename: name, mimeType } = filename
        console.log(`name: ${name}`)
        console.log(`mimeType: ${mimeType}`)
        // if (mimetype !== `image/jpeg` && mimetype !== `image/png`) {
        //   console.log(`Not an acceptable file type: ${mimetype}`)
        //   return res
        //     .status(400)
        //     .json({ error: `Not an acceptable file type: ${mimetype}` })
        // }

        // my.image.png => ['my', 'image', 'png']
        const imageExtension = name.split('.')[name.split('.').length - 1]
        // 32756238461724837.png
        imageFileName = `${Math.round(
          Math.random() * 1000000000000,
        ).toString()}.${imageExtension}`
        console.log(`imageFileName: ${imageFileName}`)
        const filepath = path.join(os.tmpdir(), imageFileName)
        imageToBeUploaded = { filepath, mimetype: mimeType }
        file.pipe(fs.createWriteStream(filepath))
      })

      busboy.on('finish', async () => {
        console.log('on finish')
        console.log(imageToBeUploaded)
        try {
          const bucket = admin.storage().bucket(storageBucket)
          await bucket.upload(imageToBeUploaded.filepath, {
            destination: imageFileName,
            resumable: false,
            metadata: {
              metadata: {
                contentType: imageToBeUploaded.mimetype,
              },
            },
          })

          // Make file publicly readable (no IAM permissions needed)
          const file = bucket.file(imageFileName)
          await file.makePublic()

          // Construct the public URL
          const publicUrl = `https://storage.googleapis.com/${storageBucket}/${imageFileName}`

          console.log('media uploaded successfully ' + publicUrl)
          return res.status(200).json({
            downloadURL: publicUrl,
          })
        } catch (err) {
          console.error(err)
          return res.status(500).json({ error: 'something went wrong' })
        }
      })

      busboy.end(req.rawBody)
      return null
    })
  })
