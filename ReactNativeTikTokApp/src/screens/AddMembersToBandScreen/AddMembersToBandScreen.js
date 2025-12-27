/**
 * AddMembersToBandScreen - Add new members to a band
 *
 * Shows friends who are not already in the band and allows
 * adding them as new members.
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, UserPlus, Check, Users } from 'lucide-react-native'
import { useTheme, ActivityIndicator } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { useChatChannels } from '../../core/chat/api'
import firestore from '@react-native-firebase/firestore'

const AddMembersToBandScreen = ({ navigation, route }) => {
  const { band } = route.params || {}
  const insets = useSafeAreaInsets()
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]
  const currentUser = useCurrentUser()
  const { updateGroup } = useChatChannels()

  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [saving, setSaving] = useState(false)

  // Get current band member IDs
  const bandMemberIds = (band?.participants || []).map(p => p.id || p.userID)

  // Fetch user's friends from friendships_live collection
  useEffect(() => {
    if (!currentUser?.id) return

    console.log('[AddMembersToBand] Fetching friends for user:', currentUser.id)
    console.log('[AddMembersToBand] Band member IDs:', bandMemberIds)

    const unsubscribe = firestore()
      .collection('social_graph')
      .doc(currentUser.id)
      .collection('friendships_live')
      .where('type', '==', 'reciprocal')
      .onSnapshot(
        snapshot => {
          console.log('[AddMembersToBand] Friendships snapshot size:', snapshot?.docs?.length || 0)

          const friendsList = snapshot?.docs?.map(doc => {
            const data = doc.data()
            // The user data may be nested under 'user' or at the root level
            const userData = data.user || data
            return {
              id: doc.id,
              ...userData,
            }
          }) || []

          console.log('[AddMembersToBand] Friends list:', friendsList.map(f => ({ id: f.id, name: f.firstName })))

          // Filter out users already in the band
          const availableFriends = friendsList.filter(
            friend => !bandMemberIds.includes(friend.id)
          )

          console.log('[AddMembersToBand] Available friends after filtering:', availableFriends.length)

          setFriends(availableFriends)
          setLoading(false)
        },
        error => {
          console.error('[AddMembersToBand] Error fetching friends:', error)
          setLoading(false)
        }
      )

    return () => unsubscribe && unsubscribe()
  }, [currentUser?.id, bandMemberIds.join(',')])

  const handleGoBack = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  const toggleSelect = useCallback((friendId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(friendId)) {
        newSet.delete(friendId)
      } else {
        newSet.add(friendId)
      }
      return newSet
    })
  }, [])

  const handleAddMembers = useCallback(async () => {
    if (selectedIds.size === 0) {
      Alert.alert('No Selection', 'Please select at least one artist to add.')
      return
    }

    const selectedFriends = friends.filter(f => selectedIds.has(f.id))
    const selectedNames = selectedFriends.map(f => f.firstName || f.username || 'Someone').join(', ')

    Alert.alert(
      'Add Members',
      `Add ${selectedNames} to ${band?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async () => {
            setSaving(true)
            try {
              const channelID = band.channelID || band.id
              const newParticipants = [...(band.participants || []), ...selectedFriends]

              const response = await updateGroup(channelID, currentUser.id, {
                participants: newParticipants,
                content: `${currentUser.firstName || 'Someone'} added ${selectedNames} to the band.`,
              })

              if (response?.success) {
                Alert.alert('Success', 'Members added to the band!')
                navigation.goBack()
              } else {
                Alert.alert('Error', 'Failed to add members. Please try again.')
              }
            } catch (error) {
              console.error('[AddMembersToBand] Error adding members:', error)
              Alert.alert('Error', 'Failed to add members. Please try again.')
            } finally {
              setSaving(false)
            }
          },
        },
      ]
    )
  }, [selectedIds, friends, band, currentUser, updateGroup, navigation])

  const renderFriend = ({ item }) => {
    const isSelected = selectedIds.has(item.id)
    return (
      <TouchableOpacity
        style={[
          styles.friendRow,
          { borderBottomColor: colorSet.hairline },
          isSelected && { backgroundColor: colorSet.primaryForeground + '15' },
        ]}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={0.7}
      >
        <Image
          source={{
            uri: item.profilePictureURL || item.profilePhoto ||
              'https://via.placeholder.com/50x50?text=User',
          }}
          style={styles.avatar}
        />
        <View style={styles.friendInfo}>
          <Text style={[styles.friendName, { color: colorSet.primaryText }]} numberOfLines={1}>
            {item.firstName} {item.lastName}
          </Text>
          {item.username && (
            <Text style={[styles.friendUsername, { color: colorSet.secondaryText }]} numberOfLines={1}>
              @{item.username}
            </Text>
          )}
        </View>
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isSelected ? colorSet.primaryForeground : colorSet.hairline,
              backgroundColor: isSelected ? colorSet.primaryForeground : 'transparent',
            },
          ]}
        >
          {isSelected && <Check size={16} color="#fff" />}
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colorSet.secondaryBackground }]}>
        <Users size={40} color={colorSet.secondaryText} />
      </View>
      <Text style={[styles.emptyTitle, { color: colorSet.primaryText }]}>
        No Friends Available
      </Text>
      <Text style={[styles.emptyText, { color: colorSet.secondaryText }]}>
        All your friends are already in this band, or you haven't added any friends yet.
      </Text>
    </View>
  )

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorSet.primaryBackground,
          paddingTop: insets.top,
        },
      ]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colorSet.hairline }]}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ChevronLeft size={28} color={colorSet.primaryText} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colorSet.primaryText }]}>
            Add Members
          </Text>
          <Text style={[styles.headerSubtitle, { color: colorSet.secondaryText }]}>
            {band?.name}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleAddMembers}
          style={[
            styles.addButton,
            selectedIds.size === 0 && styles.addButtonDisabled,
          ]}
          disabled={selectedIds.size === 0 || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colorSet.primaryForeground} />
          ) : (
            <Text
              style={[
                styles.addButtonText,
                {
                  color: selectedIds.size > 0
                    ? colorSet.primaryForeground
                    : colorSet.secondaryText,
                },
              ]}
            >
              Add ({selectedIds.size})
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colorSet.primaryForeground} />
        </View>
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriend}
          keyExtractor={(item) => item.id}
          contentContainerStyle={friends.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
    marginRight: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  friendUsername: {
    fontSize: 14,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
})

export default AddMembersToBandScreen
