import { addComment as addCommentAPI } from './firebaseFeedClient'

export const useCommentMutations = () => {
  const addComment = async (commentText, postID, authorID) => {
    console.log('[useCommentMutations] addComment called:', { commentText, postID, authorID })
    const result = await addCommentAPI(commentText, postID, authorID)
    console.log('[useCommentMutations] addComment result:', result)
    return result
  }

  return {
    addComment,
  }
}
