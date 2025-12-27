import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Video, Audio } from 'expo-av';
import { getPlayableUrl } from '../../../utils/audioUtils';

const VideoPlayer = ({ video, isMounted, paused, onTouchStart, song, onComplete, onPlaybackUpdate }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // CRITICAL DEBUG: Log all props received
  console.log('[VideoPlayer] === PROPS RECEIVED ===', {
    hasVideo: !!video,
    videoUrl: video?.url?.substring(0, 50),
    videoType: video?.type,
    thumbnailURL: video?.thumbnailURL?.substring(0, 50),
    isMounted,
    paused,
    hasSong: !!song,
    songTitle: song?.title,
  });

  // Get resolved audio URL using centralized utility
  // Handles: firebaseAudioUrl > audioUrl > streamUrl > Suno CDN fallback
  const resolvedAudioUrl = song ? getPlayableUrl(song) : null;

  useEffect(() => {
    async function setupAudio() {
      // Use resolved URL instead of song.streamURL (fixes case sensitivity issue)
      if (resolvedAudioUrl) {
        console.log('[VideoPlayer] Setting up audio with URL:', resolvedAudioUrl?.substring(0, 60));
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });

          const { sound } = await Audio.Sound.createAsync(
            { uri: resolvedAudioUrl },
            { shouldPlay: false }
          );

          audioRef.current = sound;
          console.log('[VideoPlayer] Audio loaded successfully');
        } catch (error) {
          console.log('[VideoPlayer] Error loading audio:', error);
        }
      } else {
        console.log('[VideoPlayer] No audio URL available for song');
      }
    }

    setupAudio();
    return () => {
      if (audioRef.current) {
        audioRef.current.unloadAsync();
      }
    };
  }, [resolvedAudioUrl]);

  useEffect(() => {
    playMediaIfShould();
  }, [paused, isMounted]);

  const playMediaIfShould = async () => {
    console.log('[VideoPlayer] 🎮 playMediaIfShould called:', {
      isMounted,
      paused,
      hasVideoRef: !!videoRef.current,
      hasAudioRef: !!audioRef.current,
    });

    if (!isMounted || paused) {
      console.log('[VideoPlayer] ⏸️ Stopping playback (not mounted or paused)');
      videoRef.current?.setStatusAsync({ shouldPlay: false });
      if (audioRef.current) {
        await audioRef.current.setStatusAsync({ shouldPlay: false });
      }
      return;
    }

    console.log('[VideoPlayer] ▶️ Starting playback');
    videoRef.current?.setStatusAsync({ shouldPlay: true });
    if (audioRef.current) {
      try {
        await audioRef.current.setStatusAsync({ shouldPlay: true, isLooping: false });
        console.log('[VideoPlayer] ✅ Audio playback started');
      } catch (error) {
        console.log('[VideoPlayer] ❌ Error playing audio:', error);
      }
    }
  };

  if (!video.url) {
    return null;
  }

  return (
    <View style={{ flex: 1 }}>
      <Video
        ref={videoRef}
        removeClippedSubviews={true}
        key={video.url}
        style={{ height: '100%', width: '100%' }}
        volume={1.0}
        useNativeControls={false}
        rate={video.rate ?? 1.0}
        shouldCorrectPitch={true}
        source={isMounted ? { uri: video.url } : undefined}
        onTouchStart={onTouchStart}
        resizeMode={'cover'}
        isLooping={false}
        onLoad={playMediaIfShould}
        onPlaybackStatusUpdate={(status) => {
          // Report position/duration for video timer UI
          if (status.isLoaded && onPlaybackUpdate) {
            onPlaybackUpdate({
              position: status.positionMillis || 0,
              duration: status.durationMillis || 0,
              isPlaying: status.isPlaying,
            })
          }
          if (status.didJustFinish && !status.isLooping) {
            console.log('[VideoPlayer] ✅ Video finished, triggering auto-advance')
            onComplete?.()
          }
        }}
        posterSource={{ uri: video.thumbnailURL }}
        posterStyle={{
          height: '100%',
          width: '100%',
          resizeMode: 'cover',
        }}
        usePoster={true}
      />
    </View>
  );
};

export default VideoPlayer;