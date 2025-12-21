/**
 * System Status Screen
 *
 * Comprehensive diagnostics page showing health status of all app systems:
 * - Firebase connection
 * - Suno API connection
 * - Audio playback
 * - Song migration status
 * - Latency measurements
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Audio } from 'expo-av'
import { db } from '../../core/firebase/config'
import { VERSION_STRING, APP_VERSION, BUILD_NUMBER } from '../../config/appVersion'

// Status indicator colors
const STATUS_COLORS = {
  success: '#22c55e', // green
  warning: '#f59e0b', // yellow/orange
  error: '#ef4444',   // red
  pending: '#6b7280', // gray
}

// Test audio URL
const TEST_AUDIO_URL = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'

// Firebase config
const FIREBASE_PROJECT_ID = 'letsmakemusic-4e0fe'
const CORRECT_BUCKET = 'letsmakemusic-4e0fe.firebasestorage.app'

export default function SystemStatusScreen() {
  const navigation = useNavigation()
  const [isLoading, setIsLoading] = useState(true)
  const [debugMode, setDebugMode] = useState(false)

  // Test results state
  const [tests, setTests] = useState({
    firebase: { status: 'pending', message: 'Testing...', latency: null },
    firebaseStorage: { status: 'pending', message: 'Testing...', latency: null },
    songsCollection: { status: 'pending', message: 'Testing...', count: 0, migrated: 0, needsMigration: 0 },
    audioPlayback: { status: 'pending', message: 'Testing...', latency: null },
  })

  // Run all tests
  const runAllTests = useCallback(async () => {
    setIsLoading(true)

    // Run tests in parallel
    await Promise.all([
      testFirebaseConnection(),
      testSongsCollection(),
      testAudioPlayback(),
    ])

    setIsLoading(false)
  }, [])

  // Test Firebase Firestore connection
  const testFirebaseConnection = async () => {
    const startTime = Date.now()
    try {
      // Try to read a document to verify connection
      const usersRef = db.collection('users')
      const snapshot = await usersRef.limit(1).get()
      const latency = Date.now() - startTime

      setTests(prev => ({
        ...prev,
        firebase: {
          status: 'success',
          message: `Connected to Firestore (${FIREBASE_PROJECT_ID})`,
          latency,
        },
      }))
    } catch (error) {
      const latency = Date.now() - startTime
      setTests(prev => ({
        ...prev,
        firebase: {
          status: 'error',
          message: `Connection failed: ${error.message}`,
          latency,
        },
      }))
    }
  }

  // Test songs collection and check migration status
  const testSongsCollection = async () => {
    const startTime = Date.now()
    try {
      const songsRef = db.collection('songs')
      const snapshot = await songsRef.get()
      const latency = Date.now() - startTime

      let migrated = 0
      let needsMigration = 0
      let wrongBucket = 0

      snapshot.docs.forEach(doc => {
        const song = doc.data()
        if (song.firebaseAudioUrl) {
          if (song.firebaseAudioUrl.includes(CORRECT_BUCKET)) {
            migrated++
          } else {
            wrongBucket++
            needsMigration++
          }
        } else {
          needsMigration++
        }
      })

      const total = snapshot.docs.length
      const status = needsMigration === 0 ? 'success' : (needsMigration < total / 2 ? 'warning' : 'error')

      setTests(prev => ({
        ...prev,
        songsCollection: {
          status,
          message: needsMigration === 0
            ? `All ${total} songs migrated to Firebase Storage`
            : `${needsMigration} of ${total} songs need migration`,
          count: total,
          migrated,
          needsMigration,
          wrongBucket,
          latency,
        },
        firebaseStorage: {
          status: wrongBucket === 0 ? 'success' : 'error',
          message: wrongBucket === 0
            ? `All songs using correct bucket (${CORRECT_BUCKET})`
            : `${wrongBucket} songs using wrong bucket`,
          latency,
        },
      }))
    } catch (error) {
      const latency = Date.now() - startTime
      setTests(prev => ({
        ...prev,
        songsCollection: {
          status: 'error',
          message: `Failed to read songs: ${error.message}`,
          count: 0,
          migrated: 0,
          needsMigration: 0,
          latency,
        },
        firebaseStorage: {
          status: 'error',
          message: `Cannot verify storage: ${error.message}`,
          latency,
        },
      }))
    }
  }

  // Test audio playback capability
  const testAudioPlayback = async () => {
    const startTime = Date.now()
    let sound = null

    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
      })

      // Create and load sound
      const { sound: loadedSound } = await Audio.Sound.createAsync(
        { uri: TEST_AUDIO_URL },
        { shouldPlay: false }
      )
      sound = loadedSound

      const loadLatency = Date.now() - startTime

      // Try to play briefly
      await sound.setStatusAsync({ shouldPlay: true })
      await new Promise(resolve => setTimeout(resolve, 500))
      await sound.setStatusAsync({ shouldPlay: false })

      const totalLatency = Date.now() - startTime

      setTests(prev => ({
        ...prev,
        audioPlayback: {
          status: 'success',
          message: 'Audio playback working correctly',
          latency: loadLatency,
          playLatency: totalLatency - loadLatency,
        },
      }))
    } catch (err) {
      const latency = Date.now() - startTime
      const errorMessage = err?.message || 'Unknown error'
      setTests(prev => ({
        ...prev,
        audioPlayback: {
          status: 'error',
          message: `Playback failed: ${errorMessage}`,
          latency,
        },
      }))
    } finally {
      if (sound) {
        await sound.unloadAsync()
      }
    }
  }

  // Run tests on mount
  useEffect(() => {
    runAllTests()
  }, [runAllTests])

  // Set navigation options
  useEffect(() => {
    navigation.setOptions({
      headerTitle: 'System Status',
      headerStyle: {
        backgroundColor: '#000',
      },
      headerTintColor: '#fff',
    })
  }, [navigation])

  // Render status indicator
  const StatusIndicator = ({ status }) => (
    <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
  )

  // Render a test result card
  const TestCard = ({ title, test, details }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <StatusIndicator status={test.status} />
        <Text style={styles.cardTitle}>{title}</Text>
        {test.latency && (
          <Text style={styles.latencyText}>{test.latency}ms</Text>
        )}
      </View>
      <Text style={[styles.cardMessage, { color: STATUS_COLORS[test.status] }]}>
        {test.message}
      </Text>
      {details && debugMode && (
        <View style={styles.detailsContainer}>
          {details}
        </View>
      )}
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>System Status</Text>
          <Text style={styles.version}>{VERSION_STRING}</Text>
        </View>

        {/* Overall status */}
        <View style={styles.overallStatus}>
          {isLoading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <View style={styles.overallContent}>
              <Text style={styles.overallLabel}>Overall Health</Text>
              <View style={styles.overallIndicators}>
                {Object.values(tests).map((test, index) => (
                  <View
                    key={index}
                    style={[styles.overallDot, { backgroundColor: STATUS_COLORS[test.status] }]}
                  />
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Test Results */}
        <View style={styles.testsContainer}>
          <TestCard
            title="Firebase Firestore"
            test={tests.firebase}
            details={
              <Text style={styles.detailText}>
                Project: {FIREBASE_PROJECT_ID}
              </Text>
            }
          />

          <TestCard
            title="Firebase Storage"
            test={tests.firebaseStorage}
            details={
              <Text style={styles.detailText}>
                Bucket: {CORRECT_BUCKET}
              </Text>
            }
          />

          <TestCard
            title="Songs Collection"
            test={tests.songsCollection}
            details={
              <>
                <Text style={styles.detailText}>
                  Total songs: {tests.songsCollection.count}
                </Text>
                <Text style={styles.detailText}>
                  Migrated: {tests.songsCollection.migrated}
                </Text>
                <Text style={styles.detailText}>
                  Needs migration: {tests.songsCollection.needsMigration}
                </Text>
                {tests.songsCollection.wrongBucket > 0 && (
                  <Text style={[styles.detailText, { color: STATUS_COLORS.error }]}>
                    Wrong bucket: {tests.songsCollection.wrongBucket}
                  </Text>
                )}
              </>
            }
          />

          <TestCard
            title="Audio Playback"
            test={tests.audioPlayback}
            details={
              tests.audioPlayback.playLatency && (
                <Text style={styles.detailText}>
                  Play latency: {tests.audioPlayback.playLatency}ms
                </Text>
              )
            }
          />
        </View>

        {/* Debug Mode Toggle */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setDebugMode(!debugMode)}
          activeOpacity={0.7}
        >
          <Text style={styles.settingLabel}>Debug Mode</Text>
          <View style={[
            styles.toggleButton,
            debugMode && styles.toggleButtonActive
          ]}>
            <Text style={styles.toggleButtonText}>
              {debugMode ? 'ON' : 'OFF'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={runAllTests}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>
              {isLoading ? 'Running Tests...' : 'Run All Tests'}
            </Text>
          </TouchableOpacity>

          {tests.songsCollection.needsMigration > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, styles.warningButton]}
              onPress={() => {
                Alert.alert(
                  'Song Migration',
                  `${tests.songsCollection.needsMigration} songs need to be migrated to Firebase Storage.\n\nRun this command to migrate:\n\ncurl "https://us-central1-letsmakemusic-4e0fe.cloudfunctions.net/migrateSongsToCorrectBucketHTTP"`,
                  [{ text: 'OK' }]
                )
              }}
            >
              <Text style={styles.actionButtonText}>
                View Migration Instructions
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Build Info (Debug Mode only) */}
        {debugMode && (
          <View style={styles.buildInfo}>
            <Text style={styles.buildInfoTitle}>Build Information</Text>
            <Text style={styles.buildInfoText}>Version: {APP_VERSION}</Text>
            <Text style={styles.buildInfoText}>Build: {BUILD_NUMBER}</Text>
            <Text style={styles.buildInfoText}>Firebase Project: {FIREBASE_PROJECT_ID}</Text>
            <Text style={styles.buildInfoText}>Storage Bucket: {CORRECT_BUCKET}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: '#888',
  },
  overallStatus: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  overallContent: {
    alignItems: 'center',
  },
  overallLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  overallIndicators: {
    flexDirection: 'row',
    gap: 8,
  },
  overallDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  testsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  latencyText: {
    fontSize: 12,
    color: '#888',
  },
  cardMessage: {
    fontSize: 14,
    marginLeft: 22,
  },
  detailsContainer: {
    marginTop: 12,
    marginLeft: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  detailText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    color: '#fff',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#555',
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#22c55e',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#3875e8',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buildInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  buildInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  buildInfoText: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    fontFamily: 'Menlo',
  },
})
