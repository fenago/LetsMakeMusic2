/**
 * Utility functions for parsing and handling mentions and hashtags
 * in posts, comments, and other content.
 *
 * Mention format: @[Display Name](id:userId123)
 * Hashtag format: #tagname
 */

/**
 * Extract user IDs from mention markup in text
 * @param {string} text - Text containing @[name](id:userId) patterns
 * @returns {string[]} - Array of unique user IDs mentioned
 */
export const extractMentionIds = (text) => {
  if (!text) return []

  const regex = /@\[([^\]]+?)\]\(id:([^\]]+?)\)/gim
  const ids = []
  let match

  while ((match = regex.exec(text)) !== null) {
    ids.push(match[2])
  }

  return [...new Set(ids)] // Remove duplicates
}

/**
 * Extract full mention objects from text
 * @param {string} text - Text containing @[name](id:userId) patterns
 * @returns {Array<{username: string, id: string, start: number, end: number}>}
 */
export const extractMentions = (text) => {
  if (!text) return []

  const regex = /@\[([^\]]+?)\]\(id:([^\]]+?)\)/gim
  const mentions = []
  let match

  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      id: match[2],
      start: match.index,
      end: regex.lastIndex - 1,
    })
  }

  return mentions
}

/**
 * Extract hashtags from text
 * @param {string} text - Text containing #hashtag patterns
 * @returns {string[]} - Array of unique hashtags (without # prefix, lowercase)
 */
export const extractHashtags = (text) => {
  if (!text) return []

  const regex = /#(\w+)/g
  const tags = []
  let match

  while ((match = regex.exec(text)) !== null) {
    tags.push(match[1].toLowerCase())
  }

  return [...new Set(tags)] // Remove duplicates
}

/**
 * Strip mention markup to display text only
 * Converts @[Display Name](id:userId) to @Display Name
 * @param {string} text - Text with mention markup
 * @returns {string} - Text with simplified @mentions
 */
export const stripMentionMarkup = (text) => {
  if (!text) return ''

  return text.replace(/@\[([^\]]+?)\]\(id:([^\]]+?)\)/gim, '@$1')
}

/**
 * Format a user object into mention markup
 * @param {Object} user - User object with id and display name
 * @returns {string} - Formatted mention markup @[name](id:userId)
 */
export const formatUserMention = (user) => {
  if (!user || !user.id) return ''

  const displayName = user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`.trim()
    : user.username || user.firstName || 'User'

  return `@[${displayName}](id:${user.id})`
}

/**
 * Check if text contains any mentions
 * @param {string} text - Text to check
 * @returns {boolean}
 */
export const hasMentions = (text) => {
  if (!text) return false
  return /@\[([^\]]+?)\]\(id:([^\]]+?)\)/gim.test(text)
}

/**
 * Check if text contains any hashtags
 * @param {string} text - Text to check
 * @returns {boolean}
 */
export const hasHashtags = (text) => {
  if (!text) return false
  return /#\w+/g.test(text)
}

/**
 * Get a preview of text with mentions simplified
 * Useful for notifications and previews
 * @param {string} text - Original text with markup
 * @param {number} maxLength - Maximum length of preview
 * @returns {string} - Truncated preview text
 */
export const getMentionPreview = (text, maxLength = 100) => {
  if (!text) return ''

  const stripped = stripMentionMarkup(text)

  if (stripped.length <= maxLength) {
    return stripped
  }

  return stripped.substring(0, maxLength - 3) + '...'
}

/**
 * Find new mentions that weren't in the original text
 * Used for edit functionality to only notify new mentions
 * @param {string[]} oldMentionIds - Array of previously mentioned user IDs
 * @param {string[]} newMentionIds - Array of currently mentioned user IDs
 * @returns {string[]} - Array of newly added user IDs
 */
export const findNewMentions = (oldMentionIds = [], newMentionIds = []) => {
  return newMentionIds.filter(id => !oldMentionIds.includes(id))
}

/**
 * Parse text and return structured data for post/comment creation
 * @param {string} text - Raw text with mentions and hashtags
 * @returns {Object} - Parsed data with mentions, hashtags, and display text
 */
export const parseContentText = (text) => {
  if (!text) {
    return {
      rawText: '',
      displayText: '',
      mentionedUserIds: [],
      mentions: [],
      hashtags: [],
    }
  }

  return {
    rawText: text,
    displayText: stripMentionMarkup(text),
    mentionedUserIds: extractMentionIds(text),
    mentions: extractMentions(text),
    hashtags: extractHashtags(text),
  }
}

export default {
  extractMentionIds,
  extractMentions,
  extractHashtags,
  stripMentionMarkup,
  formatUserMention,
  hasMentions,
  hasHashtags,
  getMentionPreview,
  findNewMentions,
  parseContentText,
}
