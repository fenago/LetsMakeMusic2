/**
 * Mention handling utilities for Firebase Cloud Functions
 * Handles @mention notifications - both push notifications and DM messages
 */

const admin = require('firebase-admin')
const { v4: uuidv4 } = require('uuid')

const db = admin.firestore()
const chatChannelsRef = db.collection('channels')
const socialFeedsRef = db.collection('social_feeds')

const userClient = require('../core/user')
const { fetchUser } = userClient

const { sendPushNotification } = require('../notifications/utils')
const collectionsUtils = require('../core/collections')
const { add } = collectionsUtils

/**
 * Extract user IDs from mention markup: @[name](id:userId)
 * @param {string} text - Text containing mentions
 * @returns {string[]} - Array of unique user IDs
 */
const extractMentionIds = (text) => {
  if (!text) return []

  const regex = /@\[([^\]]+?)\]\(id:([^\]]+?)\)/gim
  const ids = []
  let match

  while ((match = regex.exec(text)) !== null) {
    ids.push(match[2])
  }

  return [...new Set(ids)]
}

/**
 * Extract full mention objects from text
 * @param {string} text - Text containing mentions
 * @returns {Array<{username: string, id: string}>}
 */
const extractMentions = (text) => {
  if (!text) return []

  const regex = /@\[([^\]]+?)\]\(id:([^\]]+?)\)/gim
  const mentions = []
  let match

  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      id: match[2],
    })
  }

  return mentions
}

/**
 * Extract hashtags from text: #word
 * @param {string} text - Text containing hashtags
 * @returns {string[]} - Array of unique hashtags (lowercase, without #)
 */
const extractHashtags = (text) => {
  if (!text) return []

  const regex = /#(\w+)/g
  const tags = []
  let match

  while ((match = regex.exec(text)) !== null) {
    tags.push(match[1].toLowerCase())
  }

  return [...new Set(tags)]
}

/**
 * Strip mention markup to display text
 * @param {string} text - Text with mention markup
 * @returns {string} - Text with @names only
 */
const stripMentionMarkup = (text) => {
  if (!text) return ''
  return text.replace(/@\[([^\]]+?)\]\(id:([^\]]+?)\)/gim, '@$1')
}

/**
 * Truncate text for preview
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string}
 */
const truncateText = (text, maxLength = 100) => {
  if (!text) return ''
  const stripped = stripMentionMarkup(text)
  if (stripped.length <= maxLength) return stripped
  return stripped.substring(0, maxLength - 3) + '...'
}

/**
 * Generate 1-1 channel ID (alphabetically sorted concatenation)
 * @param {string} userId1
 * @param {string} userId2
 * @returns {string}
 */
const generateChannelId = (userId1, userId2) => {
  return userId1 < userId2 ? userId1 + userId2 : userId2 + userId1
}

/**
 * Send a DM message for a mention
 * Creates or reuses existing 1-1 channel and sends a mention_link message
 */
const sendMentionDM = async ({
  mentionerID,
  mentionerUser,
  mentionedUserId,
  postId,
  commentId = null,
  contentType,
  contentText,
}) => {
  try {
    const channelId = generateChannelId(mentionerID, mentionedUserId)

    // Fetch mentioned user
    const mentionedUser = await fetchUser(mentionedUserId)
    if (!mentionedUser) {
      console.log(`[sendMentionDM] Could not find mentioned user ${mentionedUserId}`)
      return
    }

    // Check if channel exists
    const channelDoc = await chatChannelsRef.doc(channelId).get()

    if (!channelDoc.exists) {
      // Create new channel
      const channelData = {
        id: channelId,
        channelID: channelId,
        creatorID: mentionerID,
        name: '', // Empty for 1-1 chats
        participants: [
          {
            id: mentionerID,
            firstName: mentionerUser.firstName || '',
            lastName: mentionerUser.lastName || '',
            profilePictureURL: mentionerUser.profilePictureURL || '',
          },
          {
            id: mentionedUserId,
            firstName: mentionedUser.firstName || '',
            lastName: mentionedUser.lastName || '',
            profilePictureURL: mentionedUser.profilePictureURL || '',
          },
        ],
        createdAt: Math.floor(Date.now() / 1000),
        readUserIDs: [mentionerID],
      }

      await chatChannelsRef.doc(channelId).set(channelData)
      console.log(`[sendMentionDM] Created new channel ${channelId}`)
    }

    // Create mention_link message
    const messageId = uuidv4()
    const messageContent = contentType === 'post'
      ? 'mentioned you in a post'
      : 'mentioned you in a comment'

    const message = {
      id: messageId,
      senderID: mentionerID,
      content: messageContent,
      createdAt: Math.floor(Date.now() / 1000),
      readUserIDs: [mentionerID],
      type: 'mention_link',
      mentionData: {
        postId,
        commentId,
        mentionType: contentType,
        postPreview: truncateText(contentText, 100),
      },
    }

    // Add message to channel
    await add(chatChannelsRef.doc(channelId), 'messages', message, true)

    // Update channel metadata
    const updatedMetadata = {
      lastMessage: messageContent,
      lastMessageDate: message.createdAt,
      lastMessageSenderId: mentionerID,
      lastThreadMessageId: messageId,
      readUserIDs: [mentionerID],
    }
    await chatChannelsRef.doc(channelId).set(updatedMetadata, { merge: true })

    // Hydrate chat feeds for both participants
    const channelSnap = await chatChannelsRef.doc(channelId).get()
    const channel = channelSnap.data()

    // Update sender's chat feed
    const senderFeedData = {
      id: channelId,
      title: `${mentionedUser.firstName} ${mentionedUser.lastName}`,
      content: messageContent,
      media: {},
      markedAsRead: true,
      createdAt: message.createdAt,
      participants: channel.participants,
      creatorID: channel.creatorID,
      admins: [],
    }
    await add(socialFeedsRef.doc(mentionerID), 'chat_feed', senderFeedData, true)

    // Update recipient's chat feed
    const recipientFeedData = {
      id: channelId,
      title: `${mentionerUser.firstName} ${mentionerUser.lastName}`,
      content: messageContent,
      media: {},
      markedAsRead: false,
      createdAt: message.createdAt,
      participants: channel.participants,
      creatorID: channel.creatorID,
      admins: [],
    }
    await add(socialFeedsRef.doc(mentionedUserId), 'chat_feed', recipientFeedData, true)

    console.log(`[sendMentionDM] Sent mention DM to ${mentionedUserId} in channel ${channelId}`)
  } catch (error) {
    console.error(`[sendMentionDM] Error:`, error)
  }
}

/**
 * Process mention notifications for a post or comment
 * Sends push notification AND DM to each mentioned user
 *
 * @param {Object} params
 * @param {string} params.mentionerID - ID of user who made the mention
 * @param {Object} params.mentionerUser - User object of mentioner
 * @param {string[]} params.mentionedUserIds - Array of mentioned user IDs
 * @param {string} params.postId - ID of the post
 * @param {string} [params.commentId] - ID of comment (if mention is in comment)
 * @param {string} params.contentType - 'post' or 'comment'
 * @param {string} params.contentText - The full text content
 * @param {string[]} [params.alreadyNotified] - IDs already notified (for edits)
 * @returns {Promise<string[]>} - Array of user IDs that were notified
 */
const processMentionNotifications = async ({
  mentionerID,
  mentionerUser,
  mentionedUserIds,
  postId,
  commentId = null,
  contentType,
  contentText,
  alreadyNotified = [],
}) => {
  if (!mentionedUserIds || mentionedUserIds.length === 0) {
    return []
  }

  // Filter out self-mentions and already notified users
  const usersToNotify = mentionedUserIds.filter(
    id => id !== mentionerID && !alreadyNotified.includes(id)
  )

  if (usersToNotify.length === 0) {
    console.log('[processMentionNotifications] No new users to notify')
    return []
  }

  const mentionerName = mentionerUser?.firstName
    ? `${mentionerUser.firstName} ${mentionerUser.lastName || ''}`.trim()
    : 'Someone'

  const notificationTitle = `${mentionerName} mentioned you`
  const notificationBody = contentType === 'post'
    ? `${mentionerName} mentioned you in a post`
    : `${mentionerName} mentioned you in a comment`

  const notifiedUserIds = []

  const promises = usersToNotify.map(async (mentionedUserId) => {
    try {
      // 1. Send push notification
      await sendPushNotification(
        mentionedUserId,
        notificationTitle,
        notificationBody,
        'mention',
        {
          postId,
          commentId,
          mentionType: contentType,
          mentionerID,
          mentionerName,
        }
      )

      // 2. Send DM with link to post/comment
      await sendMentionDM({
        mentionerID,
        mentionerUser,
        mentionedUserId,
        postId,
        commentId,
        contentType,
        contentText,
      })

      notifiedUserIds.push(mentionedUserId)
      console.log(`[processMentionNotifications] Notified user ${mentionedUserId}`)
    } catch (error) {
      console.error(`[processMentionNotifications] Error notifying ${mentionedUserId}:`, error)
    }
  })

  await Promise.all(promises)

  console.log(`[processMentionNotifications] Notified ${notifiedUserIds.length} users`)
  return notifiedUserIds
}

module.exports = {
  extractMentionIds,
  extractMentions,
  extractHashtags,
  stripMentionMarkup,
  truncateText,
  generateChannelId,
  sendMentionDM,
  processMentionNotifications,
}
