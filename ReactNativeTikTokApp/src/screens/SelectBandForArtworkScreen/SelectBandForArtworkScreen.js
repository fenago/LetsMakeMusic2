/**
 * SelectBandForArtworkScreen - Select a band to apply artwork as image
 */
import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ChevronLeft, Users, Check } from 'lucide-react-native'
import { useTheme } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { subscribeToUserBands } from '../../services/bandsService'
import { applyArtworkToBand, getArtwork } from '../../services/artworkService'

const SelectBandForArtworkScreen = ({ navigation, route }) => {
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()

  const { artworkId, onSuccess } = route?.params || {}

  const [bands, setBands] = useState([])
  const [loading, setLoading] = useState(true)
  const [artwork, setArtwork] = useState(null)
  const [selectedBandId, setSelectedBandId] = useState(null)
  const [applying, setApplying] = useState(false)

  // Fetch artwork info
  useEffect(() => {
    const fetchArtwork = async () => {
      if (artworkId) {
        const result = await getArtwork(artworkId)
        if (result.success) {
          setArtwork(result.artwork)
        }
      }
    }
    fetchArtwork()
  }, [artworkId])

  // Subscribe to user's bands
  useEffect(() => {
    if (!currentUser?.id) {
      setLoading(false)
      return
    }

    const unsubscribe = subscribeToUserBands(currentUser.id, (fetchedBands) => {
      // Only show bands where user is admin
      const adminBands = fetchedBands.filter(band => {
        const participant = band.participants?.find(
          p => p.id === currentUser.id || p.userID === currentUser.id
        )
        return participant?.role === 'admin'
      })
      setBands(adminBands)
      setLoading(false)
    })

    return () => unsubscribe?.()
  }, [currentUser?.id])

  const handleSelectBand = useCallback((band) => {
    setSelectedBandId(selectedBandId === band.id ? null : band.id)
  }, [selectedBandId])

  const handleApply = useCallback(async () => {
    if (!selectedBandId || !artworkId || !currentUser?.id) return

    setApplying(true)
    try {
      const result = await applyArtworkToBand(artworkId, selectedBandId, currentUser.id)
      if (result.success) {
        onSuccess?.()
        navigation.goBack()
      } else {
        Alert.alert('Error', result.error || 'Failed to apply artwork')
      }
    } catch (error) {
      Alert.alert('Error', error.message)
    } finally {
      setApplying(false)
    }
  }, [selectedBandId, artworkId, currentUser?.id, onSuccess, navigation])

  const renderBandItem = ({ item }) => {
    const isSelected = selectedBandId === item.id
    const memberCount = item.participants?.length || 0

    return (
      <TouchableOpacity
        style={[
          styles.bandItem,
          { backgroundColor: colorSet.grey3 },
          isSelected && { backgroundColor: colorSet.primaryForeground + '20' },
        ]}
        onPress={() => handleSelectBand(item)}
        activeOpacity={0.7}
      >
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.bandImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.bandImage, styles.placeholderImage]}>
            <Users size={24} color={colorSet.secondaryText} />
          </View>
        )}
        <View style={styles.bandInfo}>
          <Text style={[styles.bandName, { color: colorSet.primaryText }]} numberOfLines={1}>
            {item.name || 'Unnamed Band'}
          </Text>
          <Text style={[styles.bandMembers, { color: colorSet.secondaryText }]} numberOfLines={1}>
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </Text>
        </View>
        {isSelected && (
          <View style={[styles.checkCircle, { backgroundColor: colorSet.primaryForeground }]}>
            <Check size={16} color="#fff" strokeWidth={3} />
          </View>
        )}
      </TouchableOpacity>
    )
  }

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      )
    }

    return (
      <View style={styles.emptyContainer}>
        <Users size={64} color={colorSet.grey6} strokeWidth={1} />
        <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
          No Bands Available
        </Text>
        <Text style={[styles.emptySubtitle, { color: colorSet.secondaryText }]}>
          You need to be an admin of a band to change its image
        </Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colorSet.primaryBackground }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colorSet.grey3 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft size={28} color={colorSet.primaryText} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colorSet.primaryText }]}>
          Select Band
        </Text>
        <TouchableOpacity
          style={[
            styles.applyButton,
            !selectedBandId && styles.applyButtonDisabled,
          ]}
          onPress={handleApply}
          disabled={!selectedBandId || applying}
        >
          {applying ? (
            <ActivityIndicator size="small" color={colorSet.primaryForeground} />
          ) : (
            <Text style={[
              styles.applyText,
              { color: selectedBandId ? colorSet.primaryForeground : colorSet.grey6 },
            ]}>
              Apply
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Artwork Preview */}
      {artwork && (
        <View style={[styles.artworkPreview, { backgroundColor: colorSet.grey3 }]}>
          <Image
            source={{ uri: artwork.thumbnailUrl || artwork.imageUrl }}
            style={styles.artworkImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
          <Text style={[styles.previewText, { color: colorSet.secondaryText }]}>
            Applying artwork as band image
          </Text>
        </View>
      )}

      {/* Bands List */}
      <FlatList
        data={bands}
        renderItem={renderBandItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    minWidth: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  applyButton: {
    padding: 4,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  applyButtonDisabled: {
    opacity: 0.5,
  },
  applyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  artworkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  artworkImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  previewText: {
    fontSize: 14,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  bandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  bandImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bandInfo: {
    flex: 1,
    marginLeft: 12,
  },
  bandName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  bandMembers: {
    fontSize: 13,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
})

export default SelectBandForArtworkScreen
