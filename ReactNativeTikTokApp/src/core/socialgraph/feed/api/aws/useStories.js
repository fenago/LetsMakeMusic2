import { useEffect, useRef, useState } from 'react'
import { groupBy } from '../../../../helpers/collections'
import { useCurrentUser } from '../../../../onboarding'
import {
  subscribeToStories as subscribeToStoriesAPI,
  listStories as listStoriesAPI,
} from './awsFeedClient'

const batchSize = 25

export const useStories = () => {
  const currentUser = useCurrentUser()

  const [groupedStories, setGroupedStories] = useState(null)
  const [myStories, setMyStories] = useState(null)
  const [stories, setStories] = useState(null)
  const pagination = useRef({ page: 0, size: batchSize, exhausted: false })

  useEffect(() => {
    if (stories?.length) {
      updateGroupedAndSelfStories(stories)
    } else {
      setGroupedStories(null)
      setMyStories(null)
    }
  }, [stories?.length])

  const loadStories = async userID => {
    if (pagination.current.exhausted) {
      return
    }
    const res = await listStoriesAPI(
      userID,
      pagination.current.nextToken,
      pagination.current.size,
    )
    if (res.items?.length === 0) {
      pagination.current.exhausted = true
    }
    pagination.current.nextToken = res.nextToken

    return res.items
  }

  const loadMoreStories = async userID => {
    const newStories = await loadStories(userID)

    setStories(oldStories => deduplicatedStories(oldStories, newStories, true))
  }

  const subscribeToStories = userID => {
    loadMoreStories(userID)
    return subscribeToStoriesAPI(userID, newStories => {
      setStories(oldStories =>
        deduplicatedStories(oldStories, newStories, false),
      )
    })
  }

  const deduplicatedStories = (oldStories, newStories, appendToBottom) => {
    const oldList = [...(oldStories ?? [])]
    const newList = [...(newStories ?? [])]

    const all = oldStories
      ? appendToBottom
        ? [...oldList, ...newList]
        : [...newList, ...oldList]
      : newList
    const deduplicatedStories = all.reduce((acc, curr) => {
      if (!acc.some(story => story.id === curr.id)) {
        acc.push(curr)
      }
      return acc
    }, [])

    const filteredStories = filterExpiredStories(deduplicatedStories)

    return filteredStories
  }

  const filterExpiredStories = stories => {
    const oneDay = 60 * 60 * 24 * 1000
    const now = +new Date()
    return stories.filter(story => {
      if (!story.createdAt) {
        return false
      }
      const createdAt = story.createdAt.seconds
        ? +new Date(story.createdAt.seconds * 1000)
        : +new Date(story.createdAt * 1000)

      if (now - createdAt < oneDay) {
        return true
      }
      return false
    })
  }

  const updateGroupedAndSelfStories = stories => {
    var groups = []
    var myStoryGroup = null
    const groupedByAuthorID = groupBy('authorID')
    const groupedStories = groupedByAuthorID(stories)

    for (var key of Object.keys(groupedStories)) {
      const rawStory = groupedStories[key]
      const firstStoryInGroup = rawStory[0]
      const author = firstStoryInGroup.author
      if (!author) {
        continue
      }
      const groupOfStories = {
        authorID: firstStoryInGroup.authorID,
        id: firstStoryInGroup.storyID,
        idx: 0,
        profilePictureURL: author.profilePictureURL,
        firstName: author.firstName || author.username || author.lastName || '',
        items: rawStory.map(item => {
          return {
            src: item.storyMediaURL,
            type: item.storyType,
            createdAt: item.createdAt,
          }
        }),
      }
      if (groupOfStories.authorID === currentUser?.id) {
        myStoryGroup = groupOfStories
      } else {
        groups.push(groupOfStories)
      }
    }
    setGroupedStories(groups)
    setMyStories(myStoryGroup)
  }

  return {
    batchSize,
    groupedStories,
    myStories,
    stories,
    subscribeToStories,
    loadMoreStories,
  }
}
