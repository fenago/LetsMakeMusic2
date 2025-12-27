import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react'
import { FlatList, Text, TouchableOpacity, View, Image, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, UserPlus, Trash2, Crown, Check, Users } from 'lucide-react-native'
import firestore from '@react-native-firebase/firestore'
import dynamicStyles from './styles'
import {
  useActionSheet,
  useTheme,
  useTranslations,
  ActivityIndicator,
  Alert,
} from '../../../dopebase'
import IMConversationIconView from '../../IMConversationView/IMConversationIconView/IMConversationIconView'
import { useCurrentUser } from '../../../onboarding'
import { useChatChannels } from '../../api'

const IMViewGroupMembersScreen = props => {

  const { navigation, route } = props
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const currentUser = useCurrentUser()
  const styles = dynamicStyles(theme, appearance)
  const colorSet = theme.colors[appearance]
  const insets = useSafeAreaInsets()

  const [channel, setChannel] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isAddMode, setIsAddMode] = useState(false)
  const [friends, setFriends] = useState([])
  const [friendsLoading, setFriendsLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const selectedMemberRef = useRef(null)

  const { updateGroup, leaveGroup } = useChatChannels()

  const { showActionSheetWithOptions } = useActionSheet()

  const isAdmin = channel?.admins?.includes(currentUser?.id)
  const isBand = channel?.isBand === true

  const addAdminActionSheet = useMemo(() => {
    return {
      title: localized('settings'),
      options: [
        localized('Make Admin'),
        localized('Remove From Group'),
        localized('Cancel'),
      ],
      cancelButtonIndex: 2,
    }
  }, [])

  const removeAdminActionSheet = useMemo(() => {
    return {
      title: localized('settings'),
      options: [
        localized('Remove as Admin'),
        localized('Remove From Group'),
        localized('Cancel'),
      ],
      cancelButtonIndex: 2,
    }
  }, [])

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    })
    setChannel(route?.params?.channel)
  }, [])

  const onPressMember = memberIndex => {
    // if selected member is not already admin and current user is admin and current user cannot make itself admin
    if (
      !channel?.admins?.includes(channel?.participants[memberIndex]?.id) &&
      channel?.admins?.includes(currentUser?.id) &&
      channel?.participants[memberIndex]?.id !== currentUser?.id
    ) {
      selectedMemberRef.current = memberIndex
      showActionSheetWithOptions(
        {
          title: addAdminActionSheet.title,
          options: addAdminActionSheet.options,
          cancelButtonIndex: addAdminActionSheet.cancelButtonIndex,
        },
        onMakeAdminActionDone,
      )
    } else if (
      channel?.admins?.includes(channel?.participants[memberIndex]?.id) &&
      channel?.admins?.includes(currentUser?.id) &&
      channel?.participants[memberIndex]?.id !== currentUser?.id
    ) {
      selectedMemberRef.current = memberIndex
      showActionSheetWithOptions(
        {
          title: removeAdminActionSheet.title,
          options: removeAdminActionSheet.options,
          cancelButtonIndex: removeAdminActionSheet.cancelButtonIndex,
        },
        onRemoveAdminActionDone,
      )
    }
  }

  const renderItem = ({ item, index }) => {
    return (
      <TouchableOpacity
        onPress={() => onPressMember(index)}
        style={styles.itemContainer}>
        <View style={styles.chatIconContainer}>
          <IMConversationIconView
            style={styles.photo}
            imageStyle={styles.photo}
            participants={[item]}
          />
          <Text style={styles.name}>
            {item?.firstName + ' ' + item?.lastName}
          </Text>
        </View>
        <View style={styles.addFlexContainer}>
          {channel?.admins?.includes(item?.id) && (
            <Text style={styles.adminText}>{localized('admin')}</Text>
          )}
        </View>
        <View style={styles.divider} />
      </TouchableOpacity>
    )
  }

  const onMakeAdmin = useCallback(async () => {
    const channelID = channel.channelID || channel?.id
    setLoading(true)
    const data = {
      admins: [
        ...channel?.admins,
        channel?.participants[selectedMemberRef.current]?.id,
      ],
      content: `${currentUser?.firstName ?? 'Someone'} added ${
        channel?.participants[selectedMemberRef.current]?.firstName
      } as a group admin.`,
    }
    let response = await updateGroup(channelID, currentUser?.id, data)
    if (response.success) {
      setChannel({ ...channel, ...data })
    }
    setLoading(false)
  }, [channel, currentUser?.firstName, currentUser?.id, updateGroup])

  const onRemoveAdmin = useCallback(async () => {
    const channelID = channel.channelID || channel?.id
    setLoading(true)
    const data = {
      admins: channel?.admins.filter(
        item => item !== channel?.participants[selectedMemberRef.current]?.id,
      ),
      content: `${currentUser?.firstName ?? 'Someone'} removed ${
        channel?.participants[selectedMemberRef.current]?.firstName
      } as a group admin.`,
    }
    console.log(data)
    let response = await updateGroup(channelID, currentUser?.id, data)
    if (response.success) {
      setChannel({ ...channel, ...data })
    }
    setLoading(false)
  }, [channel, currentUser?.firstName, currentUser?.id, updateGroup])

  const onMakeAdminActionDone = useCallback(
    index => {
      if (index === 0) {
        Alert.alert(
          localized('Add group admin'),
          localized('As a group admin, "') +
            channel?.participants[selectedMemberRef.current]?.firstName +
            localized(
              ' " will be able to manage who can join and customise the conversation',
            ),
          [
            {
              text: localized('Cancel'),
              onPress: () => console.log('Cancel Pressed'),
            },
            {
              text: localized('Make Admin'),
              onPress: () => onMakeAdmin(),
            },
          ],
        )
      } else if (index === 1) {
        onRemoveParticipant()
      }
    },
    [channel?.participants, localized, onMakeAdmin],
  )

  const onRemoveAdminActionDone = useCallback(
    index => {
      if (index === 0) {
        Alert.alert(
          localized('Remove from being a group admin?'),
          '"' +
            channel?.participants[selectedMemberRef.current]?.firstName +
            localized(
              '" will no longer be able to manage who can join and customise this conversation.',
            ),
          [
            {
              text: localized('Remove as Admin'),
              onPress: () => onRemoveAdmin(),
              style: 'destructive',
            },
            {
              text: localized('Cancel'),
              onPress: () => console.log('Cancel Pressed'),
            },
          ],
        )
      } else if (index === 1) {
        onRemoveParticipant()
      }
    },
    [channel?.participants, localized, onRemoveAdmin, onRemoveParticipant],
  )

  const onRemoveParticipant = useCallback(async () => {
    const channelID = channel.channelID || channel?.id
    setLoading(true)
    const data = {
      admins: channel?.admins.filter(
        item => item !== channel?.participants[selectedMemberRef.current]?.id,
      ),
      participants: channel?.participants.filter(
        item =>
          item?.id !== channel?.participants[selectedMemberRef.current]?.id,
      ),
    }

    let response = await leaveGroup(
      channelID,
      channel?.participants[selectedMemberRef.current]?.id,
      `${currentUser?.firstName ?? 'Someone'} removed ${
        channel?.participants[selectedMemberRef.current]?.firstName
      } from group.`,
    )
    if (response.success) {
      setChannel({ ...channel, ...data })
    }
    setLoading(false)
  }, [channel, currentUser?.firstName, currentUser?.id, leaveGroup])

  // Direct remove member by index
  const handleRemoveMember = useCallback((member, index) => {
    if (!isAdmin || member?.id === currentUser?.id) return

    Alert.alert(
      'Remove Member',
      `Remove ${member?.firstName || 'this member'} from the ${isBand ? 'band' : 'group'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            selectedMemberRef.current = index
            await onRemoveParticipant()
          },
        },
      ]
    )
  }, [isAdmin, currentUser?.id, isBand, onRemoveParticipant])

  // Fetch friends for add mode
  useEffect(() => {
    if (!isAddMode || !currentUser?.id) return

    setFriendsLoading(true)
    const memberIds = (channel?.participants || []).map(p => p.id || p.userID)

    const unsubscribe = firestore()
      .collection('social_graph')
      .doc(currentUser.id)
      .collection('friendships_live')
      .where('type', '==', 'reciprocal')
      .onSnapshot(
        snapshot => {
          const friendsList = snapshot?.docs?.map(doc => {
            const data = doc.data()
            const userData = data.user || data
            return { id: doc.id, ...userData }
          }) || []

          const availableFriends = friendsList.filter(
            friend => !memberIds.includes(friend.id)
          )
          setFriends(availableFriends)
          setFriendsLoading(false)
        },
        error => {
          console.error('[ViewGroupMembers] Error fetching friends:', error)
          setFriendsLoading(false)
        }
      )

    return () => unsubscribe?.()
  }, [isAddMode, currentUser?.id, channel?.participants])

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

  const handleAddSelectedMembers = useCallback(async () => {
    if (selectedIds.size === 0) return

    const selectedFriends = friends.filter(f => selectedIds.has(f.id))
    const selectedNames = selectedFriends.map(f => f.firstName || f.username || 'Someone').join(', ')

    setLoading(true)
    try {
      const channelID = channel.channelID || channel.id
      const newParticipants = [...(channel.participants || []), ...selectedFriends]

      const response = await updateGroup(channelID, currentUser.id, {
        participants: newParticipants,
        content: `${currentUser.firstName || 'Someone'} added ${selectedNames} to the ${isBand ? 'band' : 'group'}.`,
      })

      if (response?.success) {
        setChannel({ ...channel, participants: newParticipants })
        setSelectedIds(new Set())
        setIsAddMode(false)
        Alert.alert('Success', `Added ${selectedNames}!`)
      } else {
        Alert.alert('Error', 'Failed to add members.')
      }
    } catch (error) {
      console.error('[ViewGroupMembers] Error adding members:', error)
      Alert.alert('Error', 'Failed to add members.')
    } finally {
      setLoading(false)
    }
  }, [selectedIds, friends, channel, currentUser, updateGroup, isBand])

  const handleGoBack = useCallback(() => {
    if (isAddMode) {
      setIsAddMode(false)
      setSelectedIds(new Set())
    } else {
      navigation.goBack()
    }
  }, [isAddMode, navigation])

  const renderMemberItem = ({ item, index }) => {
    const isMemberAdmin = channel?.admins?.includes(item?.id)
    const isCurrentUser = item?.id === currentUser?.id
    const canRemove = isAdmin && !isCurrentUser

    return (
      <View style={localStyles.memberRow}>
        <View style={localStyles.memberInfo}>
          <IMConversationIconView
            style={localStyles.avatar}
            imageStyle={localStyles.avatar}
            participants={[item]}
          />
          <View style={localStyles.nameContainer}>
            <Text style={[localStyles.memberName, { color: colorSet.primaryText }]} numberOfLines={1}>
              {item?.firstName} {item?.lastName}
            </Text>
            {isMemberAdmin && (
              <View style={localStyles.adminBadge}>
                <Crown size={12} color={colorSet.primaryForeground} />
                <Text style={[localStyles.adminText, { color: colorSet.primaryForeground }]}>Admin</Text>
              </View>
            )}
          </View>
        </View>
        {canRemove && (
          <TouchableOpacity
            style={[localStyles.removeButton, { backgroundColor: '#ff4444' + '20' }]}
            onPress={() => handleRemoveMember(item, index)}
          >
            <Trash2 size={18} color="#ff4444" />
          </TouchableOpacity>
        )}
      </View>
    )
  }

  const renderFriendItem = ({ item }) => {
    const isSelected = selectedIds.has(item.id)
    return (
      <TouchableOpacity
        style={[
          localStyles.memberRow,
          isSelected && { backgroundColor: colorSet.primaryForeground + '15' },
        ]}
        onPress={() => toggleSelect(item.id)}
        activeOpacity={0.7}
      >
        <View style={localStyles.memberInfo}>
          <Image
            source={{
              uri: item.profilePictureURL || item.profilePhoto ||
                'https://via.placeholder.com/50x50?text=User',
            }}
            style={localStyles.avatar}
          />
          <View style={localStyles.nameContainer}>
            <Text style={[localStyles.memberName, { color: colorSet.primaryText }]} numberOfLines={1}>
              {item.firstName} {item.lastName}
            </Text>
            {item.username && (
              <Text style={[localStyles.username, { color: colorSet.secondaryText }]} numberOfLines={1}>
                @{item.username}
              </Text>
            )}
          </View>
        </View>
        <View
          style={[
            localStyles.checkbox,
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

  const renderEmptyFriends = () => (
    <View style={localStyles.emptyContainer}>
      <Users size={40} color={colorSet.secondaryText} />
      <Text style={[localStyles.emptyTitle, { color: colorSet.primaryText }]}>
        No Friends Available
      </Text>
      <Text style={[localStyles.emptyText, { color: colorSet.secondaryText }]}>
        All your friends are already in this {isBand ? 'band' : 'group'}.
      </Text>
    </View>
  )

  return (
    <View style={[localStyles.container, { backgroundColor: colorSet.primaryBackground, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[localStyles.header, { borderBottomColor: colorSet.hairline }]}>
        <TouchableOpacity onPress={handleGoBack} style={localStyles.backButton}>
          <ChevronLeft size={28} color={colorSet.primaryText} />
        </TouchableOpacity>
        <View style={localStyles.headerCenter}>
          <Text style={[localStyles.headerTitle, { color: colorSet.primaryText }]}>
            {isAddMode ? 'Add Members' : 'Members'}
          </Text>
          <Text style={[localStyles.headerSubtitle, { color: colorSet.secondaryText }]}>
            {channel?.name} • {channel?.participants?.length || 0} members
          </Text>
        </View>
        {isAddMode ? (
          <TouchableOpacity
            onPress={handleAddSelectedMembers}
            style={localStyles.headerButton}
            disabled={selectedIds.size === 0 || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colorSet.primaryForeground} />
            ) : (
              <Text
                style={[
                  localStyles.headerButtonText,
                  { color: selectedIds.size > 0 ? colorSet.primaryForeground : colorSet.secondaryText },
                ]}
              >
                Add ({selectedIds.size})
              </Text>
            )}
          </TouchableOpacity>
        ) : isAdmin ? (
          <TouchableOpacity
            onPress={() => setIsAddMode(true)}
            style={[localStyles.addButton, { backgroundColor: colorSet.primaryForeground }]}
          >
            <UserPlus size={16} color="#fff" />
            <Text style={localStyles.addButtonText}>Add</Text>
          </TouchableOpacity>
        ) : (
          <View style={localStyles.headerButton} />
        )}
      </View>

      {/* Content */}
      {isAddMode ? (
        friendsLoading ? (
          <View style={localStyles.loadingContainer}>
            <ActivityIndicator size="large" color={colorSet.primaryForeground} />
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={friends.length === 0 ? localStyles.emptyList : localStyles.listContent}
            ListEmptyComponent={renderEmptyFriends}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <>
          {channel && channel?.participants?.length > 0 && (
            <FlatList
              data={channel?.participants}
              renderItem={renderMemberItem}
              keyExtractor={item => `${item.id}`}
              contentContainerStyle={localStyles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
          {loading && (
            <View style={localStyles.loadingOverlay}>
              <ActivityIndicator size="large" color={colorSet.primaryForeground} />
            </View>
          )}
        </>
      )}
    </View>
  )
}

const localStyles = StyleSheet.create({
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
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: 'flex-end',
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 100,
  },
  emptyList: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  nameContainer: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  username: {
    fontSize: 14,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  adminText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
})

export default IMViewGroupMembersScreen
