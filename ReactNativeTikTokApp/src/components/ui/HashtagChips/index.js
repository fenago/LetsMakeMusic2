import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native'
import { X, Plus } from 'lucide-react-native'

/**
 * HashtagChips - Reusable component for displaying and editing hashtags
 *
 * Features:
 * - Display existing hashtags as removable chips
 * - Add new hashtags via input field
 * - Auto-format hashtags (lowercase, # prefix)
 * - Max tag limit with counter
 *
 * Props:
 * @param {string[]} tags - Array of hashtags (with or without # prefix)
 * @param {function} onRemove - Called with tag string when removed
 * @param {function} onAdd - Called with formatted tag when added
 * @param {boolean} editable - Whether tags can be added/removed (default: true)
 * @param {number} maxTags - Maximum number of tags allowed (default: 10)
 * @param {string} placeholder - Input placeholder text
 */
const HashtagChips = ({
  tags = [],
  onRemove,
  onAdd,
  editable = true,
  maxTags = 10,
  placeholder = 'Add hashtag...',
}) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [inputValue, setInputValue] = useState('')

  const styles = getStyles(isDark)

  const handleAdd = useCallback(() => {
    if (!inputValue.trim() || tags.length >= maxTags) return

    // Clean and format hashtag
    let tag = inputValue.trim().toLowerCase()
    if (!tag.startsWith('#')) tag = `#${tag}`
    tag = tag.replace(/[^#a-z0-9]/g, '')

    // Validate and add if unique
    if (tag.length > 1 && !tags.includes(tag)) {
      onAdd?.(tag)
      setInputValue('')
    }
  }, [inputValue, tags, maxTags, onAdd])

  const handleInputChange = useCallback((text) => {
    // If user types space or comma, treat as submit
    if (text.endsWith(' ') || text.endsWith(',')) {
      setInputValue(text.slice(0, -1))
      handleAdd()
    } else {
      setInputValue(text)
    }
  }, [handleAdd])

  return (
    <View style={styles.container}>
      {/* Existing tags as chips */}
      {tags.length > 0 && (
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.chip}>
              <Text style={styles.chipText}>{tag}</Text>
              {editable && (
                <TouchableOpacity
                  onPress={() => onRemove?.(tag)}
                  style={styles.removeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Add new tag input */}
      {editable && tags.length < maxTags && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={inputValue}
            onChangeText={handleInputChange}
            placeholder={placeholder}
            placeholderTextColor={isDark ? '#666' : '#999'}
            onSubmitEditing={handleAdd}
            returnKeyType="done"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            onPress={handleAdd}
            style={[
              styles.addBtn,
              !inputValue.trim() && styles.addBtnDisabled,
            ]}
            disabled={!inputValue.trim()}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Tag count indicator */}
      <Text style={styles.count}>
        {tags.length}/{maxTags} tags
        {tags.length >= maxTags && ' (max reached)'}
      </Text>
    </View>
  )
}

const getStyles = (isDark) =>
  StyleSheet.create({
    container: {
      marginVertical: 12,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 12,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#2126A2',
      borderRadius: 16,
      paddingHorizontal: 12,
      paddingVertical: 6,
      gap: 6,
    },
    chipText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '500',
    },
    removeBtn: {
      padding: 2,
    },
    inputRow: {
      flexDirection: 'row',
      gap: 8,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: isDark ? '#444' : '#ddd',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: isDark ? '#fff' : '#000',
      backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
      fontSize: 14,
    },
    addBtn: {
      backgroundColor: '#2126A2',
      borderRadius: 8,
      padding: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    addBtnDisabled: {
      backgroundColor: isDark ? '#333' : '#ccc',
    },
    count: {
      color: isDark ? '#666' : '#999',
      fontSize: 12,
      marginTop: 8,
    },
  })

export default HashtagChips
