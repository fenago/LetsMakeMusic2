import { addComment as addCommentAPI, deleteComment as deleteCommentAPI } from './firebaseFeedClient'

export const useCommentMutations = () => {
  const addComment = async (commentText, postID, authorID) => {
    console.log('[useCommentMutations] addComment called:', { commentText, postID, authorID })
    const result = await addCommentAPI(commentText, postID, authorID)
    console.log('[useCommentMutations] addComment result:', result)
    return result
  }

  const deleteComment = async (postID, commentID, authorID) => {
    console.log('[useCommentMutations] deleteComment called:', { postID, commentID, authorID })
    const result = await deleteCommentAPI(postID, commentID, authorID)
    console.log('[useCommentMutations] deleteComment result:', result)
    return result
  }

  return {
    addComment,
    deleteComment,
  }
}
