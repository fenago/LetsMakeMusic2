/**
 * useArtistVoices - Hook for subscribing to user's Artist Voices
 *
 * Provides real-time subscription to Artist Voices (Suno Personas)
 * with loading state and count tracking.
 */

import { useState, useEffect } from 'react'
import { subscribeToUserVoices } from '../services/artistVoiceService'

/**
 * Hook to subscribe to user's Artist Voices
 *
 * @param {string} userId - User ID to fetch voices for
 * @returns {Object} { voices, voicesLoading, voicesCount }
 */
export const useArtistVoices = (userId) => {
  const [voices, setVoices] = useState([])
  const [voicesLoading, setVoicesLoading] = useState(true)
  const [voicesCount, setVoicesCount] = useState(0)

  useEffect(() => {
    if (!userId) {
      setVoices([])
      setVoicesLoading(false)
      setVoicesCount(0)
      return
    }

    setVoicesLoading(true)

    const unsubscribe = subscribeToUserVoices(
      userId,
      (updatedVoices) => {
        setVoices(updatedVoices)
        setVoicesCount(updatedVoices.length)
        setVoicesLoading(false)
      },
      (error) => {
        console.error('[useArtistVoices] Error:', error)
        setVoices([])
        setVoicesCount(0)
        setVoicesLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userId])

  return {
    voices,
    voicesLoading,
    voicesCount,
  }
}

export default useArtistVoices
