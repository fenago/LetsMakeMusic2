import React, { useLayoutEffect } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useTheme, useTranslations } from '../../core/dopebase'

const AboutUsScreen = props => {
  const { navigation } = props
  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const colorSet = theme.colors[appearance]

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: localized('About Us'),
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
    logoSection: {
      alignItems: 'center',
      marginBottom: 30,
    },
    brandName: {
      fontSize: 28,
      fontWeight: '700',
      color: colorSet.primaryText,
      marginBottom: 4,
    },
    tagline: {
      fontSize: 14,
      color: colorSet.secondaryText,
      fontStyle: 'italic',
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colorSet.primaryText,
      marginBottom: 12,
    },
    paragraph: {
      fontSize: 15,
      lineHeight: 24,
      color: colorSet.secondaryText,
      marginBottom: 12,
    },
    valuesContainer: {
      marginTop: 8,
    },
    valueItem: {
      flexDirection: 'row',
      marginBottom: 12,
      alignItems: 'flex-start',
    },
    valueBullet: {
      fontSize: 16,
      color: '#00D4AA',
      marginRight: 10,
      fontWeight: '600',
    },
    valueText: {
      flex: 1,
      fontSize: 15,
      lineHeight: 22,
      color: colorSet.secondaryText,
    },
    valueTitle: {
      fontWeight: '600',
      color: colorSet.primaryText,
    },
  })

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <Text style={styles.brandName}>LetsMake.Music</Text>
          <Text style={styles.tagline}>Create. Share. Inspire.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Vision</Text>
          <Text style={styles.paragraph}>
            LetsMake.Music was born from a simple yet powerful belief: everyone has a song inside them waiting to be heard. We're building a platform where creativity knows no boundaries, where the next great hit could come from anyone, anywhere. Our AI-powered music creation tools break down the technical barriers that have traditionally kept music production in the hands of a select few.
          </Text>
          <Text style={styles.paragraph}>
            We envision a world where a teenager in their bedroom, a grandmother with a melody in her heart, or a group of friends hanging out can all create professional-quality music. Music is the universal language, and we're making sure everyone gets to speak it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Who We Are</Text>
          <Text style={styles.paragraph}>
            We're a team of musicians, technologists, and dreamers united by our love for music and our belief in technology's power to democratize creativity. From data scientists to product visionaries, from lead developers to sales engineers, every member of our team brings a unique perspective to our mission.
          </Text>
          <Text style={styles.paragraph}>
            What sets us apart is that we're not just building an app—we're nurturing a community. A community where aspiring artists support each other, where collaborations happen across continents, and where every creator has the chance to be discovered.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Our Values</Text>
          <View style={styles.valuesContainer}>
            <View style={styles.valueItem}>
              <Text style={styles.valueBullet}>*</Text>
              <Text style={styles.valueText}>
                <Text style={styles.valueTitle}>Creativity Without Limits: </Text>
                We believe everyone is creative. Our tools remove technical barriers so your imagination is the only limit.
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Text style={styles.valueBullet}>*</Text>
              <Text style={styles.valueText}>
                <Text style={styles.valueTitle}>Community First: </Text>
                Music is better together. We foster genuine connections between creators, celebrating collaboration over competition.
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Text style={styles.valueBullet}>*</Text>
              <Text style={styles.valueText}>
                <Text style={styles.valueTitle}>Respect for Artists: </Text>
                Every creator deserves recognition. We're committed to fair attribution and helping artists build sustainable careers.
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Text style={styles.valueBullet}>*</Text>
              <Text style={styles.valueText}>
                <Text style={styles.valueTitle}>Technology for Good: </Text>
                AI is a tool to amplify human creativity, not replace it. We use technology responsibly to empower, not diminish, the artist's voice.
              </Text>
            </View>
            <View style={styles.valueItem}>
              <Text style={styles.valueBullet}>*</Text>
              <Text style={styles.valueText}>
                <Text style={styles.valueTitle}>Positive Impact: </Text>
                Music heals, unites, and inspires. We're committed to being a force for good, creating a platform where positivity and creativity thrive.
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join the Movement</Text>
          <Text style={styles.paragraph}>
            LetsMake.Music is more than an app—it's a movement. Every song created on our platform represents a moment of human expression, a story told, an emotion shared. Whether you're here to make your first beat or your hundredth track, you're part of something bigger.
          </Text>
          <Text style={styles.paragraph}>
            Together, let's make music that matters. Let's create, share, and inspire. Let's make music.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

export default AboutUsScreen
