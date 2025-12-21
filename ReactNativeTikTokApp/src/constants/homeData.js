/**
 * Home Screen Data Constants
 * Mock data for the music feed sections
 */

// Tab definitions - integrates existing Videos with new music features
export const TopTabsList = [
  { id: 0, label: 'All' },
  { id: 1, label: 'Music' },
  { id: 2, label: 'Videos' },  // Maps to existing TikTok-style video feed
  { id: 3, label: 'Podcast' },
  { id: 4, label: 'Radio' },
  { id: 5, label: 'Events' },
]

// Today's picks carousel items
export const TodaysPickList = [
  {
    id: '1',
    label: 'Morning Vibes',
    subLabel: 'Start your day right',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: '2',
    label: 'Chill Beats',
    subLabel: 'Lo-fi for focus',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: '3',
    label: 'Workout Mix',
    subLabel: 'Get moving',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    id: '4',
    label: 'Evening Jazz',
    subLabel: 'Wind down',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  },
]

// Songs list for "Your Favorites" section
export const SongsList = [
  {
    id: '1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    album: 'After Hours',
    duration: '3:20',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: '2',
    title: 'Levitating',
    artist: 'Dua Lipa',
    album: 'Future Nostalgia',
    duration: '3:23',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: '3',
    title: 'Stay',
    artist: 'Kid Laroi & Justin Bieber',
    album: 'F*ck Love 3',
    duration: '2:21',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    id: '4',
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    album: 'SOUR',
    duration: '2:58',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  },
  {
    id: '5',
    title: 'Montero',
    artist: 'Lil Nas X',
    album: 'Montero',
    duration: '2:17',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  },
]

// Playlists for "Playlist for you" section
export const PlaylistList = [
  {
    id: '1',
    name: 'Today\'s Top Hits',
    description: 'The hottest tracks right now',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
    songCount: 50,
  },
  {
    id: '2',
    name: 'RapCaviar',
    description: 'Hip-hop\'s heavyweight playlist',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300',
    songCount: 50,
  },
  {
    id: '3',
    name: 'All Out 2020s',
    description: 'The biggest songs of the 2020s',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300',
    songCount: 100,
  },
  {
    id: '4',
    name: 'Chill Hits',
    description: 'Kick back to the best new chill hits',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
    songCount: 75,
  },
]

// Artists for horizontal scroll
export const ArtistsList = [
  {
    id: '1',
    name: 'The Weeknd',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=200',
    followers: '85M',
  },
  {
    id: '2',
    name: 'Dua Lipa',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200',
    followers: '72M',
  },
  {
    id: '3',
    name: 'Drake',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200',
    followers: '95M',
  },
  {
    id: '4',
    name: 'Billie Eilish',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200',
    followers: '68M',
  },
  {
    id: '5',
    name: 'Ed Sheeran',
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200',
    followers: '82M',
  },
  {
    id: '6',
    name: 'Taylor Swift',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=200',
    followers: '92M',
  },
]

// Radio stations for "Radio for you" section
export const RadioList = [
  {
    id: '1',
    name: 'Pop Radio',
    description: 'Based on your listening',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
  },
  {
    id: '2',
    name: 'Hip-Hop Radio',
    description: 'Non-stop hip-hop',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300',
  },
  {
    id: '3',
    name: 'Chill Radio',
    description: 'Relaxing vibes',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300',
  },
  {
    id: '4',
    name: 'Rock Radio',
    description: 'Classic and modern rock',
    imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300',
  },
]

// Podcast list
export const PodcastList = [
  {
    id: '1',
    name: 'The Joe Rogan Experience',
    host: 'Joe Rogan',
    imageUrl: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=300',
    episodeCount: 2000,
  },
  {
    id: '2',
    name: 'Crime Junkie',
    host: 'Ashley Flowers',
    imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=300',
    episodeCount: 350,
  },
  {
    id: '3',
    name: 'The Daily',
    host: 'Michael Barbaro',
    imageUrl: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300',
    episodeCount: 1500,
  },
]

// Events list
export const EventsList = [
  {
    id: '1',
    name: 'Summer Music Festival',
    date: 'July 15, 2024',
    location: 'Los Angeles, CA',
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
  },
  {
    id: '2',
    name: 'Jazz Night',
    date: 'August 20, 2024',
    location: 'New York, NY',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400',
  },
  {
    id: '3',
    name: 'Electronic Music Expo',
    date: 'September 5, 2024',
    location: 'Miami, FL',
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400',
  },
]
