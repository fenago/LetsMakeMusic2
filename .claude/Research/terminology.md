# LetsMakeMusic - Brand Terminology Guide

This document defines the music-centric terminology used throughout the app to create a cohesive experience for musicians and music enthusiasts.

---

## Navigation / Main Sections

| Current Term | Music-Inspired Alternatives | Recommended | Notes |
|--------------|----------------------------|-------------|-------|
| Feed | Stage, The Mix, Sessions, Airwaves, Soundscape | **Stage** | Where performances are seen/enjoyed |
| Library | My Catalog, Vault, Setlist, My Tracks, Discography | **My Catalog** | Professional artist term for their work |
| Discover | Explore, Tune In, Charts, New Drops | **Explore** | Finding new music and artists |
| Create | Studio, Compose, Produce, Make a Track | **Studio** | Fits the creation vibe |
| Profile | Backstage, Artist Profile, Green Room, Bio | **Backstage** | Personal/behind the scenes |
| Groups | Bands, Crews, Collabs, Ensembles | **Bands** | Perfect for music community |

---

## Social Actions

| Current Term | Music-Inspired Alternatives | Recommended | Notes |
|--------------|----------------------------|-------------|-------|
| Like/Heart | Encore, Vibe, Spin It | **Encore** | Wanting more of the performance |
| Follow | Fan, Subscribe, Tune In | **Fan** | Artists have fans |
| Followers | Fans, Listeners, Audience | **Fans** | Community around an artist |
| Following | Artists I Dig, My Artists, Favorites | **My Artists** | Personal curation |
| Share | Broadcast, Drop, Airplay | **Share** | Keep it simple |
| Comments | Notes, Feedback, Reviews | **Notes** | Double meaning with music notes |

---

## Content Terms

| Current Term | Music-Inspired Alternatives | Recommended | Notes |
|--------------|----------------------------|-------------|-------|
| Posts | Tracks, Drops, Releases | **Tracks** | Standard music term |
| Trending | Charting, Hot Tracks, Rising | **Charting** | Music industry term |
| For You | Your Mix, Curated, Recommended Listens | **Your Mix** | Personalized playlist feel |
| Notifications | Backstage Pass, Alerts | **Alerts** | Keep it functional |

---

## User Identity Terms

| Current Term | Music-Inspired Term | Implementation | Notes |
|--------------|---------------------|----------------|-------|
| Username | **Stage Name** | Same field, synced | The name artists perform under |
| Profile Picture | **Artist Photo** | Display label only | Visual identity |
| Bio | **Bio** | Keep as-is | Already music-appropriate |

---

## Recommended Implementation

### App Venue Metaphor

The app uses a **music venue metaphor** where:

- **Stage** - Where users watch performances (Feed)
- **Studio** - Where users create music (Create/Generate)
- **My Catalog** - Personal music collection (Library)
- **Backstage** - Personal profile and settings (Profile)
- **Bands** - Group collaborations (Groups)

### User Identity

- **Stage Name** = Username (they are the same field, synced)
- Users choose their Stage Name during signup
- This becomes their public identity across the platform

---

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Stage Name = Username | ✅ Implemented | Synced during signup and for existing users |
| Stage terminology in UI | 🔄 Planned | Feed → Stage |
| Catalog terminology | 🔄 Planned | Library → My Catalog |
| Fans/Following | 🔄 Planned | Followers → Fans |

---

## Icon Mapping (Lucide React Native)

Icons from `lucide-react-native` for each music-inspired term:

### Navigation Icons

| Term | Primary Icon | Alternatives | Import |
|------|-------------|--------------|--------|
| **Stage** (Feed) | `Mic2` | `Radio`, `AudioWaveform`, `Theater` | `import { Mic2 } from 'lucide-react-native'` |
| **My Catalog** (Library) | `Library` | `Disc3`, `FolderMusic`, `Album` | `import { Library } from 'lucide-react-native'` |
| **Explore** (Discover) | `Compass` | `Search`, `Globe`, `Telescope` | `import { Compass } from 'lucide-react-native'` |
| **Studio** (Create) | `Sliders` | `Mic`, `Music4`, `PenTool` | `import { Sliders } from 'lucide-react-native'` |
| **Backstage** (Profile) | `User` | `UserCircle`, `CircleUser`, `IdCard` | `import { User } from 'lucide-react-native'` |
| **Bands** (Groups) | `Users` | `UsersRound`, `Contact2`, `Group` | `import { Users } from 'lucide-react-native'` |

### Social Action Icons

| Term | Primary Icon | Alternatives | Import |
|------|-------------|--------------|--------|
| **Encore** (Like) | `Heart` | `Star`, `Sparkles`, `ThumbsUp` | `import { Heart } from 'lucide-react-native'` |
| **Fan** (Follow) | `UserPlus` | `Star`, `HeartHandshake` | `import { UserPlus } from 'lucide-react-native'` |
| **Fans** (Followers) | `Users` | `Heart`, `Headphones` | `import { Users } from 'lucide-react-native'` |
| **Share** | `Share2` | `Forward`, `Send`, `Megaphone` | `import { Share2 } from 'lucide-react-native'` |
| **Notes** (Comments) | `MessageSquare` | `Music`, `StickyNote`, `Pencil` | `import { MessageSquare } from 'lucide-react-native'` |

### Content Icons

| Term | Primary Icon | Alternatives | Import |
|------|-------------|--------------|--------|
| **Tracks** (Posts) | `Disc3` | `Music`, `Play`, `CirclePlay` | `import { Disc3 } from 'lucide-react-native'` |
| **Charting** (Trending) | `TrendingUp` | `BarChart3`, `ArrowUp`, `Flame` | `import { TrendingUp } from 'lucide-react-native'` |
| **Your Mix** (For You) | `Shuffle` | `ListMusic`, `Radio`, `Sparkles` | `import { Shuffle } from 'lucide-react-native'` |
| **Alerts** (Notifications) | `Bell` | `BellRing`, `Megaphone` | `import { Bell } from 'lucide-react-native'` |

### Band Feature Icons (Recently Added)

| Feature | Icon | Import |
|---------|------|--------|
| Band Detail | `Users` | `import { Users } from 'lucide-react-native'` |
| Band Chat | `MessageCircle` | `import { MessageCircle } from 'lucide-react-native'` |
| Band Members | `Users` | `import { Users } from 'lucide-react-native'` |
| Add Member | `UserPlus` | `import { UserPlus } from 'lucide-react-native'` |
| Band Songs | `Music` | `import { Music } from 'lucide-react-native'` |
| Add Song | `Plus` | `import { Plus } from 'lucide-react-native'` |
| Remove Song | `Trash2` | `import { Trash2 } from 'lucide-react-native'` |
| Band Playlists | `ListMusic` | `import { ListMusic } from 'lucide-react-native'` |
| Band Admin | `Crown` | `import { Crown } from 'lucide-react-native'` |
| Create for Band | `Music` | (with pink `#ec4899` background) |

### Color Palette for Band Features

| Element | Color | Usage |
|---------|-------|-------|
| Members Icon Background | `#7c3aed20` | Purple 20% opacity |
| Members Icon | `#7c3aed` | Purple |
| Songs Icon Background | `#ec489920` | Pink 20% opacity |
| Songs Icon | `#ec4899` | Pink |
| Playlists Icon Background | `#06b6d420` | Cyan 20% opacity |
| Playlists Icon | `#06b6d4` | Cyan |
| Admin Crown | `colorSet.primaryForeground` | Theme primary |

---

## Usage Guidelines

1. **Consistency**: Always use the recommended term in UI, notifications, and messaging
2. **Context**: Use formal terms (Catalog, Stage) in navigation, casual terms (Tracks, Fans) in social interactions
3. **Onboarding**: Introduce music terminology early so users understand the metaphor
4. **Accessibility**: Keep labels clear - don't sacrifice usability for creativity

---

*Last Updated: December 2024*
