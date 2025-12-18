import { addComment as addCommentAPI } from './awsFeedClient'

export const useCommentMutations = () => {
  const addComment = async (commentText, postID, authorID) => {
    return await addCommentAPI(commentText, postID, authorID)
  }

  return {
    addComment,
  }
}
