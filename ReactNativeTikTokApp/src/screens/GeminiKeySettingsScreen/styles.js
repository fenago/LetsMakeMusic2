import { StyleSheet, Platform } from 'react-native'

const dynamicStyles = (theme, colorScheme) => {
  const colorSet = theme.colors[colorScheme]

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorSet.primaryBackground,
    },
    keyboardView: {
      flex: 1,
    },

    // Header
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colorSet.grey3,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colorSet.primaryForeground,
    },
    headerSpacer: {
      width: 32,
    },

    // Content
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 40,
    },

    // Icon
    iconContainer: {
      alignItems: 'center',
      marginBottom: 20,
      marginTop: 10,
    },

    // Title
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: colorSet.primaryForeground,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colorSet.secondaryText,
      textAlign: 'center',
      marginBottom: 24,
      lineHeight: 20,
    },

    // Instructions Card
    instructionsCard: {
      backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F5F5F5',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
    },
    instructionsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colorSet.primaryForeground,
      marginBottom: 12,
    },
    stepContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    stepNumber: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: '#1F979E',
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 24,
      marginRight: 12,
      overflow: 'hidden',
    },
    stepText: {
      fontSize: 14,
      color: colorSet.primaryForeground,
      flex: 1,
    },
    linkButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#E0F2F1',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginTop: 12,
      gap: 8,
    },
    linkButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#1F979E',
    },

    // Note Card
    noteCard: {
      backgroundColor: colorScheme === 'dark' ? '#1A2A1A' : '#E8F5E9',
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderLeftWidth: 4,
      borderLeftColor: '#22c55e',
    },
    noteTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#22c55e',
      marginBottom: 4,
    },
    noteText: {
      fontSize: 13,
      color: colorSet.secondaryText,
      lineHeight: 18,
    },

    // Input Section
    inputSection: {
      marginBottom: 24,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colorSet.primaryForeground,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colorScheme === 'dark' ? '#1E1E1E' : '#F5F5F5',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colorSet.grey3,
      paddingHorizontal: 12,
    },
    input: {
      flex: 1,
      height: 48,
      fontSize: 15,
      color: colorSet.primaryForeground,
      fontFamily: Platform?.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    eyeButton: {
      padding: 8,
    },

    // Test Result
    testResultContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
      gap: 6,
    },
    testSuccess: {
      backgroundColor: colorScheme === 'dark' ? '#1A2A1A' : '#E8F5E9',
    },
    testError: {
      backgroundColor: colorScheme === 'dark' ? '#2A1A1A' : '#FFEBEE',
    },
    testSuccessText: {
      fontSize: 13,
      color: '#22c55e',
    },
    testErrorText: {
      fontSize: 13,
      color: '#ef4444',
    },

    // Buttons
    buttonContainer: {
      gap: 12,
      marginBottom: 16,
    },
    saveButton: {
      backgroundColor: '#ec4899',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    removeButton: {
      backgroundColor: 'transparent',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#ef4444',
    },
    removeButtonText: {
      color: '#ef4444',
      fontSize: 16,
      fontWeight: '600',
    },

    // Privacy Note
    privacyNote: {
      fontSize: 12,
      color: colorSet.secondaryText,
      textAlign: 'center',
      lineHeight: 18,
    },
  })
}

export default dynamicStyles
