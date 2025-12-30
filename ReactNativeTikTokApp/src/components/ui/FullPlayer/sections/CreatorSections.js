import React, { memo, useState, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import {
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Video,
  Wand2,
  ImageIcon,
  AudioWaveform,
  Film,
  Music,
  Mic,
  Guitar,
  FileText,
  Upload,
  Layers,
} from 'lucide-react-native'

// Replace ImageIcon import since it conflicts with React Native
const ImageIconLucide = ImageIcon

/**
 * Single expandable section component
 */
const ExpandableSection = memo(({
  title,
  icon: Icon,
  iconColor,
  isExpanded,
  onToggle,
  isDark,
  children,
  isLast = false,
}) => (
  <View style={[styles.section, isLast && styles.lastSection]}>
    <TouchableOpacity
      style={styles.sectionHeader}
      activeOpacity={0.7}
      onPress={onToggle}
    >
      <View style={styles.sectionHeaderLeft}>
        <Icon size={20} color={iconColor} strokeWidth={2} />
        <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>{title}</Text>
      </View>
      {isExpanded ? (
        <ChevronUp size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
      ) : (
        <ChevronDown size={20} color={isDark ? '#c5c5c5' : '#7e7e7e'} strokeWidth={2} />
      )}
    </TouchableOpacity>
    {isExpanded && children}
  </View>
))

/**
 * Action item for navigation
 */
const ActionItem = memo(({ icon: Icon, label, onPress, isDark }) => (
  <TouchableOpacity style={styles.actionItem} onPress={onPress}>
    <View style={styles.actionItemLeft}>
      <Icon size={20} color={isDark ? '#c5c5c5' : '#666666'} strokeWidth={1.5} />
      <Text style={[styles.actionItemText, isDark && styles.actionItemTextDark]}>{label}</Text>
    </View>
    <ChevronRight size={18} color={isDark ? '#666666' : '#aaaaaa'} strokeWidth={2} />
  </TouchableOpacity>
))

/**
 * CreatorSections - Consolidated creator tools (Video, Music Gen, Cover, Audio)
 * Each has its own collapsed state to prevent parent re-renders
 */
const CreatorSections = ({
  onNavigateToFeature,
  isDark,
}) => {
  const [showCreateVideo, setShowCreateVideo] = useState(false)
  const [showMusicGeneration, setShowMusicGeneration] = useState(false)
  const [showSongCover, setShowSongCover] = useState(false)
  const [showAudioProcessing, setShowAudioProcessing] = useState(false)

  const toggleCreateVideo = useCallback(() => setShowCreateVideo(prev => !prev), [])
  const toggleMusicGeneration = useCallback(() => setShowMusicGeneration(prev => !prev), [])
  const toggleSongCover = useCallback(() => setShowSongCover(prev => !prev), [])
  const toggleAudioProcessing = useCallback(() => setShowAudioProcessing(prev => !prev), [])

  return (
    <>
      {/* Create Video Section */}
      <ExpandableSection
        title="Create Video"
        icon={Video}
        iconColor="#3875e8"
        isExpanded={showCreateVideo}
        onToggle={toggleCreateVideo}
        isDark={isDark}
      >
        <View style={[styles.actionsList, isDark && styles.actionsListDark]}>
          <ActionItem
            icon={Film}
            label="Create built-in music video"
            onPress={() => onNavigateToFeature('CreateMusicVideo')}
            isDark={isDark}
          />
        </View>
      </ExpandableSection>

      {/* Music Generation Section */}
      <ExpandableSection
        title="Music Generation"
        icon={Wand2}
        iconColor="#a855f7"
        isExpanded={showMusicGeneration}
        onToggle={toggleMusicGeneration}
        isDark={isDark}
      >
        <View style={[styles.actionsList, isDark && styles.actionsListDark]}>
          <ActionItem
            icon={Music}
            label="Extend your song"
            onPress={() => onNavigateToFeature('ExtendSong')}
            isDark={isDark}
          />
          <ActionItem
            icon={Wand2}
            label="Reinterpret your song (new style)"
            onPress={() => onNavigateToFeature('ReinterpretSong')}
            isDark={isDark}
          />
          <ActionItem
            icon={Mic}
            label="Add vocals to an instrumental"
            onPress={() => onNavigateToFeature('AddVocals')}
            isDark={isDark}
          />
          <ActionItem
            icon={Guitar}
            label="Add instruments to an acapella"
            onPress={() => onNavigateToFeature('AddInstruments')}
            isDark={isDark}
          />
          <ActionItem
            icon={FileText}
            label="Get timestamped lyrics"
            onPress={() => onNavigateToFeature('GetTimestampedLyrics')}
            isDark={isDark}
          />
        </View>
      </ExpandableSection>

      {/* Change Song Cover Section */}
      <ExpandableSection
        title="Change Song Cover"
        icon={ImageIconLucide}
        iconColor="#22c55e"
        isExpanded={showSongCover}
        onToggle={toggleSongCover}
        isDark={isDark}
      >
        <View style={[styles.actionsList, isDark && styles.actionsListDark]}>
          <ActionItem
            icon={Upload}
            label="Upload a new image for song cover"
            onPress={() => onNavigateToFeature('ChangeSongCover')}
            isDark={isDark}
          />
          <ActionItem
            icon={Film}
            label="Add pics and vids for custom video"
            onPress={() => onNavigateToFeature('AddMediaForVideo')}
            isDark={isDark}
          />
        </View>
      </ExpandableSection>

      {/* Audio Processing Section */}
      <ExpandableSection
        title="Audio Processing"
        icon={AudioWaveform}
        iconColor="#f97316"
        isExpanded={showAudioProcessing}
        onToggle={toggleAudioProcessing}
        isDark={isDark}
        isLast={true}
      >
        <View style={[styles.actionsList, isDark && styles.actionsListDark]}>
          <ActionItem
            icon={Mic}
            label="Get Acapella"
            onPress={() => onNavigateToFeature('GetAcapella')}
            isDark={isDark}
          />
          <ActionItem
            icon={Layers}
            label="Stem your song"
            onPress={() => onNavigateToFeature('StemSong')}
            isDark={isDark}
          />
        </View>
      </ExpandableSection>
    </>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#151723',
  },
  sectionTitleDark: {
    color: '#ffffff',
  },
  actionsList: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionsListDark: {
    backgroundColor: '#2c2c2e',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0e0e0',
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionItemText: {
    fontSize: 15,
    color: '#151723',
    flex: 1,
  },
  actionItemTextDark: {
    color: '#ffffff',
  },
})

export default memo(CreatorSections)
