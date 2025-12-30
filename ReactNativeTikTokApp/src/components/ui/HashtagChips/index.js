import React, { useState, useMemo, memo } from 'react'
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

  const styles = useMemo(() => getStyles(isDark), [isDark])

  const formatTag = (text) => {
    let tag = text.trim().toLowerCase()
    if (!tag.startsWith('#')) tag = `#${tag}`
    return tag.replace(/[^#a-z0-9]/g, '')
  }

  const handleAdd = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || tags.length >= maxTags) return

    const tag = formatTag(trimmed)
    if (tag.length > 1 && !tags.includes(tag)) {
      onAdd?.(tag)
    }
    setInputValue('')
  }

  const handleInputChange = (text) => {
    // If user types space or comma, treat as submit
    if (text.endsWith(' ') || text.endsWith(',')) {
      const trimmed = text.slice(0, -1).trim()
      if (trimmed && tags.length < maxTags) {
        const tag = formatTag(trimmed)
        if (tag.length > 1 && !tags.includes(tag)) {
          onAdd?.(tag)
        }
      }
      setInputValue('')
    } else {
      setInputValue(text)
    }
  }

  const canAdd = inputValue.trim().length > 0 && tags.length < maxTags

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
              !canAdd && styles.addBtnDisabled,
            ]}
            disabled={!canAdd}
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

export default memo(HashtagChips)
