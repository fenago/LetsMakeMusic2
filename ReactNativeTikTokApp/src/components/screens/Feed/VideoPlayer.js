import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { Video, Audio } from 'expo-av';

const VideoPlayer = ({ video, isMounted, paused, onTouchStart, song }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    async function setupAudio() {
      if (song?.streamURL) {
        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });

          const { sound } = await Audio.Sound.createAsync(
            { uri: song.streamURL },
            { shouldPlay: false }
          );
          
          audioRef.current = sound;
        } catch (error) {
          console.log('Error loading audio:', error);
        }
      }
    }

    setupAudio();
    return () => {
      if (audioRef.current) {
        audioRef.current.unloadAsync();
      }
    };
  }, [song?.streamURL]);

  useEffect(() => {
    playMediaIfShould();
  }, [paused, isMounted]);

  const playMediaIfShould = async () => {
    if (!isMounted || paused) {
      videoRef.current?.setStatusAsync({ shouldPlay: false });
      if (audioRef.current) {
        await audioRef.current.setStatusAsync({ shouldPlay: false });
      }
      return;
    }

    videoRef.current?.setStatusAsync({ shouldPlay: true });
    if (audioRef.current) {
      try {
        await audioRef.current.setStatusAsync({ shouldPlay: true });
        await audioRef.current.setStatusAsync({
          isLooping: true,
        })
      } catch (error) {
        console.log('Error playing audio:', error);
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
        isLooping={true}
        onLoad={playMediaIfShould}
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