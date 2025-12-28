import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDispatch } from 'react-redux'
import { useTheme } from '../../core/dopebase'
import { useCurrentUser } from '../../core/onboarding'
import { setUserData } from '../../core/onboarding/redux/auth'
import { updateUserIntegrations, getUserByID } from '../../core/users/api/firebase/userClient'
import { ChevronLeft, Key, ExternalLink, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react-native'
import dynamicStyles from './styles'

const GOOGLE_AI_STUDIO_URL = 'https://aistudio.google.com/apikey'

const GeminiKeySettingsScreen = ({ navigation }) => {
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)
  const currentUser = useCurrentUser()
  const dispatch = useDispatch()

  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // null, 'success', 'error'
  const [hasExistingKey, setHasExistingKey] = useState(false)

  // Load existing key on mount
  useEffect(() => {
    const loadExistingKey = async () => {
      if (currentUser?.id) {
        try {
          console.log('[GeminiKeySettings] Loading key for user:', currentUser.id)
          const userData = await getUserByID(currentUser.id)
          console.log('[GeminiKeySettings] User data loaded:', {
            hasIntegrations: !!userData?.integrations,
            hasGemini: !!userData?.integrations?.gemini,
            hasApiKey: !!userData?.integrations?.gemini?.apiKey,
          })
          const existingKey = userData?.integrations?.gemini?.apiKey
          if (existingKey) {
            console.log('[GeminiKeySettings] Found existing key, length:', existingKey.length)
            setApiKey(existingKey)
            setHasExistingKey(true)
          } else {
            console.log('[GeminiKeySettings] No existing key found')
          }
        } catch (error) {
          console.error('[GeminiKeySettings] Error loading key:', error)
        }
      }
    }
    loadExistingKey()
  }, [currentUser?.id])

  const testApiKey = async (keyToTest) => {
    setTesting(true)
    setTestResult(null)

    try {
      // Call a test endpoint via Cloud Function or direct API
      // For now, we'll do a simple validation check
      // A proper implementation would call a Cloud Function to test the key

      // Basic format validation
      if (!keyToTest || keyToTest.length < 20) {
        setTestResult('error')
        setTesting(false)
        return false
      }

      // The key looks valid format-wise
      // In production, we'd make a test API call through a Cloud Function
      setTestResult('success')
      setTesting(false)
      return true
    } catch (error) {
      console.error('[GeminiKeySettings] Test error:', error)
      setTestResult('error')
      setTesting(false)
      return false
    }
  }

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Missing Key', 'Please enter your Gemini API key.')
      return
    }

    setLoading(true)

    try {
      // Test the key first
      const isValid = await testApiKey(apiKey.trim())

      if (!isValid) {
        Alert.alert(
          'Invalid Key',
          'The API key format appears to be invalid. Please check and try again.'
        )
        setLoading(false)
        return
      }

      // Prepare the new integrations data
      const newIntegrations = {
        gemini: {
          apiKey: apiKey.trim(),
          keyAddedAt: new Date(),
          keyVerified: true,
          lastUsedAt: null,
        },
      }

      // Save to Firestore
      const result = await updateUserIntegrations(currentUser.id, newIntegrations)

      if (result.success) {
        setHasExistingKey(true)

        // Update Redux state so other screens see the new API key immediately
        const updatedUser = {
          ...currentUser,
          integrations: {
            ...currentUser.integrations,
            ...newIntegrations,
          },
        }
        dispatch(setUserData({ user: updatedUser }))
        console.log('[GeminiKeySettings] Redux state updated with new API key')

        Alert.alert(
          'Key Saved',
          'Your Gemini API key has been saved. You can now use AI image generation in Artwork Studio.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        )
      } else {
        Alert.alert('Error', 'Failed to save API key. Please try again.')
      }
    } catch (error) {
      console.error('[GeminiKeySettings] Save error:', error)
      Alert.alert('Error', 'An error occurred while saving your key.')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveKey = () => {
    Alert.alert(
      'Remove API Key',
      'Are you sure you want to remove your Gemini API key? You will not be able to generate images until you add a new key.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setLoading(true)
            try {
              const clearedIntegrations = {
                gemini: {
                  apiKey: null,
                  keyAddedAt: null,
                  keyVerified: false,
                  lastUsedAt: null,
                },
              }

              await updateUserIntegrations(currentUser.id, clearedIntegrations)

              // Update Redux state to reflect the removed key
              const updatedUser = {
                ...currentUser,
                integrations: {
                  ...currentUser.integrations,
                  ...clearedIntegrations,
                },
              }
              dispatch(setUserData({ user: updatedUser }))

              setApiKey('')
              setHasExistingKey(false)
              setTestResult(null)
            } catch (error) {
              Alert.alert('Error', 'Failed to remove API key.')
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  const openGoogleAIStudio = () => {
    Linking.openURL(GOOGLE_AI_STUDIO_URL)
  }

  const maskApiKey = (key) => {
    if (!key || key.length < 8) return key
    return key.substring(0, 4) + '••••••••••••••••' + key.substring(key.length - 4)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={theme.colors[appearance].primaryForeground} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gemini API Key</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Key size={48} color="#ec4899" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Connect Your Gemini AI</Text>
          <Text style={styles.subtitle}>
            Add your personal API key to unlock AI image generation in Artwork Studio.
          </Text>

          {/* Instructions Card */}
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>Get Your Free API Key</Text>
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>1</Text>
              <Text style={styles.stepText}>Visit Google AI Studio</Text>
            </View>
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>2</Text>
              <Text style={styles.stepText}>Sign in with your Google account</Text>
            </View>
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>3</Text>
              <Text style={styles.stepText}>Click "Create API Key"</Text>
            </View>
            <View style={styles.stepContainer}>
              <Text style={styles.stepNumber}>4</Text>
              <Text style={styles.stepText}>Copy your key and paste it below</Text>
            </View>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={openGoogleAIStudio}
            >
              <Text style={styles.linkButtonText}>Open Google AI Studio</Text>
              <ExternalLink size={16} color="#1F979E" />
            </TouchableOpacity>
          </View>

          {/* Note */}
          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>Free Tier Included</Text>
            <Text style={styles.noteText}>
              Google offers generous free usage limits for Gemini. Your API key is stored securely
              and only used for generating images on your behalf.
            </Text>
          </View>

          {/* API Key Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Your API Key</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={(text) => {
                  setApiKey(text)
                  setTestResult(null)
                }}
                placeholder="Paste your Gemini API key here"
                placeholderTextColor={theme.colors[appearance].secondaryText}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showKey}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowKey(!showKey)}
              >
                {showKey ? (
                  <EyeOff size={20} color={theme.colors[appearance].secondaryText} />
                ) : (
                  <Eye size={20} color={theme.colors[appearance].secondaryText} />
                )}
              </TouchableOpacity>
            </View>

            {/* Test Result */}
            {testResult && (
              <View style={[
                styles.testResultContainer,
                testResult === 'success' ? styles.testSuccess : styles.testError
              ]}>
                {testResult === 'success' ? (
                  <>
                    <CheckCircle size={16} color="#22c55e" />
                    <Text style={styles.testSuccessText}>Key format is valid</Text>
                  </>
                ) : (
                  <>
                    <XCircle size={16} color="#ef4444" />
                    <Text style={styles.testErrorText}>Invalid key format</Text>
                  </>
                )}
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.buttonDisabled]}
              onPress={handleSaveKey}
              disabled={loading || !apiKey.trim()}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {hasExistingKey ? 'Update Key' : 'Save Key'}
                </Text>
              )}
            </TouchableOpacity>

            {hasExistingKey && (
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveKey}
                disabled={loading}
              >
                <Text style={styles.removeButtonText}>Remove Key</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Privacy Note */}
          <Text style={styles.privacyNote}>
            Your API key is stored in your private account data and is never shared with other users.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default GeminiKeySettingsScreen
