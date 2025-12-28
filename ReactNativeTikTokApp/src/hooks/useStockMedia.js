/**
 * useStockMedia Hook - Stock photo and video search
 *
 * Provides interface for searching royalty-free stock media
 * for use as artwork, covers, and promotional images.
 */

import { useState, useCallback } from 'react'
import {
  searchPhotos,
  getCuratedPhotos,
  getPhoto,
  searchVideos,
  getPopularVideos,
  getVideo,
  getPhotoUrl,
  getThumbnailUrl,
  getVideoFile,
  getPhotoAttribution,
  getPhotoAttributionData,
  searchMusicCategory,
  ORIENTATION,
  SIZE,
  COLORS,
  MUSIC_CATEGORIES,
} from '../services/pexelsService'

/**
 * Hook for searching stock photos
 *
 * @returns {Object} Photo search state and methods
 */
export const useStockPhotos = () => {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalResults, setTotalResults] = useState(0)
  const [lastQuery, setLastQuery] = useState('')

  /**
   * Search for photos
   */
  const search = useCallback(async (query, options = {}) => {
    setLoading(true)
    setError(null)
    setLastQuery(query)

    try {
      const response = await searchPhotos(query, { ...options, page: 1 })

      if (response.success) {
        setPhotos(response.photos || [])
        setPage(1)
        setTotalResults(response.totalResults || 0)
        setHasMore((response.photos?.length || 0) >= (options.perPage || 20))
        return { success: true, photos: response.photos }
      } else {
        setError(response.error)
        setPhotos([])
        return { success: false, error: response.error }
      }
    } catch (err) {
      const errorMsg = err.message || 'Search failed'
      setError(errorMsg)
      setPhotos([])
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Load more results (pagination)
   */
  const loadMore = useCallback(
    async (options = {}) => {
      if (loading || !hasMore || !lastQuery) return { success: false }

      setLoading(true)

      try {
        const nextPage = page + 1
        const response = await searchPhotos(lastQuery, { ...options, page: nextPage })

        if (response.success) {
          setPhotos((prev) => [...prev, ...(response.photos || [])])
          setPage(nextPage)
          setHasMore((response.photos?.length || 0) >= (options.perPage || 20))
          return { success: true }
        } else {
          setError(response.error)
          return { success: false, error: response.error }
        }
      } catch (err) {
        setError(err.message)
        return { success: false, error: err.message }
      } finally {
        setLoading(false)
      }
    },
    [page, loading, hasMore, lastQuery]
  )

  /**
   * Get curated/featured photos
   */
  const getCurated = useCallback(async (options = {}) => {
    setLoading(true)
    setError(null)
    setLastQuery('')

    try {
      const response = await getCuratedPhotos(options)

      if (response.success) {
        setPhotos(response.photos || [])
        setPage(1)
        setHasMore((response.photos?.length || 0) >= (options.perPage || 20))
        return { success: true, photos: response.photos }
      } else {
        setError(response.error)
        return { success: false, error: response.error }
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to get curated photos'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Search by music-related category
   */
  const searchCategory = useCallback(async (categoryId, options = {}) => {
    setLoading(true)
    setError(null)

    const category = MUSIC_CATEGORIES.find((c) => c.id === categoryId)
    setLastQuery(category?.query || 'music')

    try {
      const response = await searchMusicCategory(categoryId, { ...options, page: 1 })

      if (response.success) {
        setPhotos(response.photos || [])
        setPage(1)
        setTotalResults(response.totalResults || 0)
        setHasMore((response.photos?.length || 0) >= (options.perPage || 20))
        return { success: true, photos: response.photos }
      } else {
        setError(response.error)
        return { success: false, error: response.error }
      }
    } catch (err) {
      const errorMsg = err.message || 'Category search failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Get a single photo by ID
   */
  const getPhotoById = useCallback(async (photoId) => {
    try {
      const response = await getPhoto(photoId)
      return response
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Clear results
   */
  const clear = useCallback(() => {
    setPhotos([])
    setError(null)
    setPage(1)
    setHasMore(true)
    setTotalResults(0)
    setLastQuery('')
  }, [])

  return {
    // State
    photos,
    loading,
    error,
    hasMore,
    totalResults,
    page,

    // Methods
    search,
    loadMore,
    getCurated,
    searchCategory,
    getPhotoById,
    clear,

    // Helpers
    getPhotoUrl,
    getThumbnailUrl,
    getAttribution: getPhotoAttribution,
    getAttributionData: getPhotoAttributionData,

    // Constants
    categories: MUSIC_CATEGORIES,
    orientations: ORIENTATION,
    sizes: SIZE,
    colors: COLORS,
  }
}

/**
 * Hook for searching stock videos
 *
 * @returns {Object} Video search state and methods
 */
export const useStockVideos = () => {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalResults, setTotalResults] = useState(0)
  const [lastQuery, setLastQuery] = useState('')

  /**
   * Search for videos
   */
  const search = useCallback(async (query, options = {}) => {
    setLoading(true)
    setError(null)
    setLastQuery(query)

    try {
      const response = await searchVideos(query, { ...options, page: 1 })

      if (response.success) {
        setVideos(response.videos || [])
        setPage(1)
        setTotalResults(response.totalResults || 0)
        setHasMore((response.videos?.length || 0) >= (options.perPage || 15))
        return { success: true, videos: response.videos }
      } else {
        setError(response.error)
        setVideos([])
        return { success: false, error: response.error }
      }
    } catch (err) {
      const errorMsg = err.message || 'Search failed'
      setError(errorMsg)
      setVideos([])
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Load more results (pagination)
   */
  const loadMore = useCallback(
    async (options = {}) => {
      if (loading || !hasMore || !lastQuery) return { success: false }

      setLoading(true)

      try {
        const nextPage = page + 1
        const response = await searchVideos(lastQuery, { ...options, page: nextPage })

        if (response.success) {
          setVideos((prev) => [...prev, ...(response.videos || [])])
          setPage(nextPage)
          setHasMore((response.videos?.length || 0) >= (options.perPage || 15))
          return { success: true }
        } else {
          setError(response.error)
          return { success: false, error: response.error }
        }
      } catch (err) {
        setError(err.message)
        return { success: false, error: err.message }
      } finally {
        setLoading(false)
      }
    },
    [page, loading, hasMore, lastQuery]
  )

  /**
   * Get popular/trending videos
   */
  const getPopular = useCallback(async (options = {}) => {
    setLoading(true)
    setError(null)
    setLastQuery('')

    try {
      const response = await getPopularVideos(options)

      if (response.success) {
        setVideos(response.videos || [])
        setPage(1)
        setHasMore((response.videos?.length || 0) >= (options.perPage || 15))
        return { success: true, videos: response.videos }
      } else {
        setError(response.error)
        return { success: false, error: response.error }
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to get popular videos'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Get a single video by ID
   */
  const getVideoById = useCallback(async (videoId) => {
    try {
      const response = await getVideo(videoId)
      return response
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Clear results
   */
  const clear = useCallback(() => {
    setVideos([])
    setError(null)
    setPage(1)
    setHasMore(true)
    setTotalResults(0)
    setLastQuery('')
  }, [])

  return {
    // State
    videos,
    loading,
    error,
    hasMore,
    totalResults,
    page,

    // Methods
    search,
    loadMore,
    getPopular,
    getVideoById,
    clear,

    // Helpers
    getVideoFile,

    // Constants
    orientations: ORIENTATION,
    sizes: SIZE,
  }
}

/**
 * Combined hook for both photos and videos
 */
export const useStockMedia = () => {
  const photos = useStockPhotos()
  const videoSearch = useStockVideos()

  return {
    photos,
    videos: videoSearch,
    categories: MUSIC_CATEGORIES,
  }
}

export default useStockMedia
