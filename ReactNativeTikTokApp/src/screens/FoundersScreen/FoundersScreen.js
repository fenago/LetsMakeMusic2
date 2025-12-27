import React, { useLayoutEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native'
import { useTheme, useTranslations } from '../../core/dopebase'

const teamMembers = [
  {
    name: 'Dr. Ernesto Lee',
    role: 'Lead Architect and Data Scientist',
    website: 'https://drlee.ai',
  },
  {
    name: 'Candace Lyons',
    role: 'Lead Product Manager',
  },
  {
    name: 'Wesley Jones',
    role: 'Lead Technologist',
  },
  {
    name: 'Khalil Lyons',
    role: 'Lead Developer and Sr. Architect',
  },
  {
    name: 'Khyla Lyons',
    role: 'Programmer and Sales Engineer',
  },
]

const FoundersScreen = props => {
  const { navigation } = props
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: localized('Founders & Dev Team'),
      headerStyle: {
        backgroundColor: colorSet.primaryBackground,
        borderBottomColor: colorSet.hairline,
      },
      headerTintColor: colorSet.primaryText,
    })
  }, [])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorSet.primaryBackground,
    },
    scrollContent: {
      padding: 20,
    },
    headerSection: {
      marginBottom: 30,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colorSet.primaryText,
      marginBottom: 8,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colorSet.secondaryText,
      textAlign: 'center',
    },
    teamContainer: {
      gap: 16,
    },
    memberCard: {
      backgroundColor: colorSet.secondaryBackground,
      borderRadius: 12,
      padding: 20,
      marginBottom: 12,
    },
    memberName: {
      fontSize: 18,
      fontWeight: '600',
      color: colorSet.primaryText,
      marginBottom: 4,
    },
    memberRole: {
      fontSize: 14,
      color: colorSet.secondaryText,
    },
    websiteLink: {
      fontSize: 14,
      color: '#00D4AA',
      marginTop: 6,
    },
  })

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <Text style={styles.headerTitle}>Meet the Team</Text>
          <Text style={styles.headerSubtitle}>
            The passionate people behind LetsMake.Music
          </Text>
        </View>

        <View style={styles.teamContainer}>
          {teamMembers.map((member, index) => (
            <View key={index} style={styles.memberCard}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRole}>{member.role}</Text>
              {member.website && (
                <TouchableOpacity onPress={() => Linking.openURL(member.website)}>
                  <Text style={styles.websiteLink}>{member.website}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

export default FoundersScreen
