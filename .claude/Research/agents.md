# LetsMakeMusic - Agent Architecture

## Overview

This document defines the specialized agents needed to continue building the LetsMakeMusic application. The architecture follows a hierarchical pattern with meta-level coordination agents and domain-specific implementation agents.

## Research Folder Structure

**Two research folders exist with different purposes:**

| Folder | Purpose | Key Documents |
|--------|---------|---------------|
| `.claude/Research/` | Claude/development docs | Commands, iOSBuild, KnownIssues, APIs, Feature Specs |
| `/Research/` | Project planning & architecture | TokenEconomy, DataArchitecture, Phases, LessonsLearned |

**Critical Planning Documents:**
- [TokenEconomy_Analysis.md](../../../Research/TokenEconomy_Analysis.md) - 3-tier token system design
- [DataArchitecture.md](../../../Research/DataArchitecture.md) - Firestore schema & feed propagation
- [phases2.md](../../../Research/phases2.md) - Implementation roadmap (125KB!)
- [LessonsLearned.md](../../../Research/LessonsLearned.md) - Debugging tips

---

## Meta-Level Agents

### 1. `orchestrator-agent` - Task Orchestration & Workflow Management

**Purpose:** Coordinate multi-agent workflows, manage task dependencies, and ensure efficient parallel execution.

**Responsibilities:**
- Decompose complex user requests into atomic tasks
- Assign tasks to appropriate specialized agents
- Manage task queues and priorities
- Handle inter-agent communication
- Track progress across all active agents
- Resolve conflicts when agents have overlapping concerns
- Aggregate results from multiple agents into coherent responses

**Tools Access:**
- TodoWrite (task tracking)
- Task (spawn sub-agents)
- TaskOutput (monitor agent results)

**Triggers:**
- User requests involving multiple domains (e.g., "Add a new song feature with UI, API integration, and tests")
- Complex features requiring coordination
- When single-agent approach would be inefficient

**Example Workflow:**
```
User: "Add the stem separation feature"
Orchestrator:
  1. Spawn suno-api-agent → Implement stem separation API call
  2. Spawn ui-agent → Build StemSongScreen UI
  3. Spawn firebase-agent → Add Cloud Function for processing
  4. Spawn testing-agent → Write tests for the feature
  5. Aggregate results and report to user
```

---

### 2. `meta-agent` - High-Level Planning & Decision Making

**Purpose:** Make architectural decisions, evaluate trade-offs, and provide strategic guidance for the project.

**Responsibilities:**
- Evaluate feature proposals against project goals
- Make technology selection decisions
- Identify potential technical debt
- Suggest refactoring opportunities
- Balance short-term delivery vs long-term maintainability
- Review agent outputs for quality and consistency
- Provide "second opinion" on complex decisions

**Tools Access:**
- Read (analyze codebase)
- Grep/Glob (search patterns)
- WebSearch (research alternatives)
- mcp__sequential-thinking__sequentialthinking (structured reasoning)

**Triggers:**
- "Should we..." questions
- Architecture decisions
- Technology evaluations
- Code review requests
- When trade-offs need explicit analysis

---

### 3. `architecture-agent` - System Design & Technical Architecture

**Purpose:** Design system architecture, define interfaces, and ensure technical coherence across the codebase.

**Responsibilities:**
- Design new features at the system level
- Define data models and schemas
- Create API contracts between services
- Document architectural decisions (ADRs)
- Review PRs for architectural compliance
- Identify scaling concerns
- Plan migration strategies

**Knowledge Domains:**
- React Native architecture patterns
- Firebase/Firestore data modeling
- Cloud Functions design
- State management (Redux, Context)
- Navigation patterns
- API design principles

**Outputs:**
- Architecture diagrams (Mermaid)
- Data model definitions
- Interface contracts
- Migration plans
- Technical specifications

---

### 4. `github-agent` - Repository & Version Control Management

**Purpose:** Manage GitHub operations, PR workflows, branching strategies, and release management.

**Responsibilities:**
- Create and manage branches
- Generate meaningful commit messages
- Create pull requests with proper descriptions
- Review PR diffs and suggest improvements
- Manage GitHub Issues (create, label, close)
- Handle merge conflicts
- Manage releases and tags
- Update CHANGELOG
- Manage GitHub Actions workflows

**Tools Access:**
- Bash (git commands, gh CLI)
- Read/Write (file operations)
- Grep (code search)

**Commands:**
```bash
# Branch management
git checkout -b feature/stem-separation
git push -u origin feature/stem-separation

# PR creation
gh pr create --title "Add stem separation feature" --body "..."

# Issue management
gh issue create --title "..." --label "enhancement"
gh issue close 123

# Release management
gh release create v1.2.0 --notes "..."
```

**Branching Strategy:**
- `main` - Production-ready code
- `V2` - Current development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches
- `release/*` - Release preparation

---

## API-Specific Agents

### 5. `suno-api-agent` - Suno API Integration Specialist

**Purpose:** Expert in Suno API (sunoapi.org) for all AI music generation features.

**API Capabilities:**

| Category | Endpoints | Status |
|----------|-----------|--------|
| **Music Generation** | `generate`, `extend`, `cover` | Implemented |
| **Vocals/Instruments** | `add-vocals`, `add-instrumental` | Planned |
| **Audio Processing** | `separate-vocals`, `convert-wav`, `boost-style` | Planned |
| **Lyrics** | `generate-lyrics`, `get-timestamped-lyrics` | Partial |
| **Video** | `create-music-video` | Planned |
| **Utility** | `get-details`, `get-credits` | Implemented |

**Responsibilities:**
- Implement new Suno API integrations
- Optimize existing API calls
- Handle API errors and retries
- Manage credit consumption
- Implement webhook callbacks
- Keep up with API version changes (V4 → V5)

**Key Endpoints Reference:**
```javascript
// Base URL
const BASE_URL = 'https://api.sunoapi.org';

// Music Generation
POST /api/v1/suno/generate
POST /api/v1/suno/extend
POST /api/v1/suno/cover

// Audio Processing
POST /api/v1/suno/separate-vocals
POST /api/v1/suno/add-vocals
POST /api/v1/suno/add-instrumental
POST /api/v1/suno/convert-wav

// Lyrics
POST /api/v1/suno/generate-lyrics
GET /api/v1/suno/get-timestamped-lyrics/{taskId}

// Video
POST /api/v1/suno/create-music-video

// Status/Details
GET /api/v1/suno/get-details/{taskId}
GET /api/v1/suno/credits
```

**Model Versions:**
- `V5` - Latest, cutting-edge
- `V4_5PLUS` - Richer tones, up to 8 min
- `V4_5ALL` - Better song structure
- `V4_5` - Smart prompts, faster
- `V4` - Improved vocals, up to 4 min

**Files to Modify:**
- [sunoApi.js](../../ReactNativeTikTokApp/src/services/sunoApi.js)
- Song feature screens in `src/screens/SongFeatures/`

---

### 6. `privy-agent` - Privy Authentication & Wallet Integration

**Purpose:** Integrate Privy for Web3 authentication, embedded wallets, and the 3-tier token economy.

**Reference:** [TokenEconomy_Analysis.md](../../../Research/TokenEconomy_Analysis.md)

**Privy Capabilities:**

| Feature | Description |
|---------|-------------|
| **Authentication** | Email, SMS, social logins, wallet connect |
| **Embedded Wallets** | Create wallets for users without crypto experience |
| **Connectors** | Connect external wallets (MetaMask, etc.) |
| **User Management** | User profiles, linking accounts |
| **Transaction Management** | Sign transactions, manage gas |

**Token Economy Integration (from TokenEconomy_Analysis.md):**

The project has a planned 3-tier token system on Solana:

| Token | Purpose | Blockchain |
|-------|---------|------------|
| **$LMM** | Company equity/governance | Solana |
| **$MUSIC Credits** | Platform utility/transactions | Solana (or L2) |
| **Song Rights Tokens** | Individual song ownership (ERC-1155 style) | Solana |

**Planned Integration Approach: Option C (Firebase Auth + Privy Wallet)**
```
Firebase Auth (Primary)          Privy (Wallet Only)
─────────────────────────        ─────────────────────
• Email/Google/Apple login       • Solana wallet creation
• Session management             • Transaction signing
• User profile data              • MPC key management
• Existing app auth flow         • External wallet linking
```

**Use Cases for LetsMakeMusic:**
1. **Creator Wallets** - Embedded wallets for artists (Solana)
2. **$MUSIC Credits** - Purchase/spend credits for AI generation
3. **Song Rights Tokens** - Mint songs as fractional NFTs
4. **Tipping System** - "Encore" tips using $MUSIC
5. **Royalty Distribution** - Smart contract-based royalty splits
6. **$LMM Staking** - Governance and revenue sharing

**SDK Integration (React Native):**
```javascript
import { PrivyProvider, usePrivy } from '@privy-io/expo';

// Configuration (from TokenEconomy_Analysis.md)
const privyConfig = {
  appId: 'YOUR_APP_ID',
  loginMethods: ['email', 'sms', 'google', 'apple'],
  embeddedWallets: {
    createOnLogin: 'users-without-wallets', // Lazy creation
  },
};

// One wallet holds all three token types
// $LMM (Governance) + $MUSIC (Utility) + Song Rights (NFTs)
```

**Privy Pricing (from TokenEconomy_Analysis.md):**
| Tier | MAU | Price |
|------|-----|-------|
| Developer | 0-499 | Free |
| Core | 500-2,499 | $299/mo |
| Scale | 2,500-9,999 | $499/mo |
| Enterprise | 10,000+ | Custom |

**Implementation Phases:**
1. **Phase 1 (Months 1-3):** Off-chain $MUSIC credits (database)
2. **Phase 2 (Months 4-6):** Song NFT minting on Solana devnet
3. **Phase 3 (Months 7-12):** Fractional rights + marketplace
4. **Phase 4 (Months 12-18):** $LMM governance token

**Files to Create/Modify:**
- `src/services/privyService.js` (new)
- `src/services/tokenService.js` (new - $MUSIC credits)
- `src/services/songTokenService.js` (new - Song Rights)
- `src/contexts/PrivyContext.js` (new)
- `src/contexts/WalletContext.js` (new)
- `src/screens/WalletScreen/` (new)
- `src/screens/TokensScreen/` (new)
- `src/core/onboarding/` (modify for wallet creation)

---

### 7. `pexels-agent` - Pexels API Integration for Stock Media

**Purpose:** Integrate Pexels API for royalty-free photos and videos for music video creation.

**API Capabilities:**

| Endpoint | Purpose |
|----------|---------|
| `GET /v1/search` | Search photos by query |
| `GET /v1/curated` | Curated photos collection |
| `GET /videos/search` | Search videos by query |
| `GET /videos/popular` | Popular videos |
| `GET /collections` | User collections |

**Key Features:**
- **Free for commercial use** - No attribution required (but appreciated)
- **High quality** - HD and 4K content
- **Large library** - Millions of assets
- **Rate limiting** - 200 requests/hour, 20,000/month

**Implementation:**
```javascript
// pexelsService.js
const PEXELS_API_KEY = 'YOUR_API_KEY';
const BASE_URL = 'https://api.pexels.com';

export const searchPhotos = async (query, options = {}) => {
  const { page = 1, perPage = 15, orientation, size, color } = options;
  const response = await fetch(
    `${BASE_URL}/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  return response.json();
};

export const searchVideos = async (query, options = {}) => {
  const { page = 1, perPage = 15, orientation, size } = options;
  const response = await fetch(
    `${BASE_URL}/videos/search?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  return response.json();
};

export const getCuratedPhotos = async (page = 1, perPage = 15) => {
  const response = await fetch(
    `${BASE_URL}/v1/curated?page=${page}&per_page=${perPage}`,
    { headers: { Authorization: PEXELS_API_KEY } }
  );
  return response.json();
};
```

**UI Components to Build:**
- `MediaBrowser` - Grid view of photos/videos
- `MediaSearch` - Search input with filters
- `MediaPreview` - Full-screen preview with selection
- `MediaPicker` - Modal for selecting media

**Integration with Music Video Creator:**
1. User creates/selects a song
2. Opens video creator
3. Searches Pexels for relevant media (based on lyrics, mood, genre)
4. Selects and arranges media on timeline
5. Syncs to beat using timestamped lyrics
6. Exports final video

**Files to Create:**
- `src/services/pexelsService.js`
- `src/components/ui/MediaBrowser/`
- `src/screens/CreateMusicVideoScreen/` (enhance)

---

## Implementation Agents

### 8. `ui-agent` - React Native UI Development

**Purpose:** Build and enhance UI components following the app's design system.

**Responsibilities:**
- Create new screen components
- Build reusable UI components
- Implement animations and transitions
- Ensure accessibility compliance
- Apply music-centric terminology
- Maintain consistent styling

**Design System:**
- Uses React Native Paper/Elements base
- Custom theme with music branding
- Lucide icons for consistency
- Supports Light/Dark/System themes

---

### 9. `firebase-agent` - Firebase Backend Development

**Purpose:** Manage all Firebase services including Firestore, Auth, Storage, and Cloud Functions.

**Reference:** [DataArchitecture.md](../../../Research/DataArchitecture.md)

**Current Architecture (from DataArchitecture.md):**

Two parallel systems exist:
1. **Social System** (Instamobile) - posts, feeds, hashtags
2. **Music System** (custom) - AI songs, videos, favorites

```
Firestore Database
├── users/{userId}
│   └── likedSongs/{songId}          # Song likes
├── posts/{postId}                    # Social posts
├── songs/{songId}                    # AI-generated songs
├── videos/{videoId}                  # Music videos
├── social_feeds/{userId}
│   ├── main_feed/{docId}
│   ├── home_feed_live/{docId}       # Real-time (max 50)
│   └── home_feed_historical/{docId}  # Overflow
├── social_graph/{userId}
│   ├── outbound/                     # Who I follow
│   ├── inbound/                      # Who follows me
│   └── friendships_live/
└── hashtags/{hashtag}/feed_live/
```

**Critical Tasks:**
- **SECURITY:** Implement proper Firestore rules (currently wide open!)
- **Integration:** Unify Music + Social systems (per phases2.md)
- Create new Cloud Functions for token economy
- Optimize feed propagation (fanout writes)
- Implement real-time listeners
- Manage Storage rules and structure

**Key Patterns (from DataArchitecture.md):**
| Pattern | Description |
|---------|-------------|
| **Fanout Write** | 1 write → N copies to followers |
| **Denormalization** | Author info on songs/posts |
| **Live/Historical Split** | Max 50 in _live, overflow to _historical |
| **Dual Storage** | Song likes on both entity and user |

**Security Rules Template:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;

      match /likedSongs/{songId} {
        allow read, write: if request.auth.uid == userId;
      }
    }

    // Songs are public read, owner write
    match /songs/{songId} {
      allow read: if true;
      allow write: if request.auth.uid == resource.data.userId;

      match /likes/{likeId} {
        allow read: if true;
        allow write: if request.auth.uid == likeId;
      }
    }

    // Posts with author check
    match /posts/{postId} {
      allow read: if true;
      allow write: if request.auth.uid == resource.data.authorID;
    }
  }
}
```

---

### 10. `testing-agent` - Quality Assurance & Testing

**Purpose:** Create and maintain test suites for the application.

**Test Types:**
- Unit tests (Jest)
- Component tests (React Native Testing Library)
- Integration tests
- E2E tests (Detox)

---

## Agent Interaction Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      USER REQUEST                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR-AGENT                        │
│         (Decomposes tasks, coordinates agents)               │
└─────────────────────────────────────────────────────────────┘
           │              │              │              │
           ▼              ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  META    │   │  ARCH    │   │  GITHUB  │   │ DOMAIN   │
    │  AGENT   │   │  AGENT   │   │  AGENT   │   │ AGENTS   │
    └──────────┘   └──────────┘   └──────────┘   └──────────┘
                                                       │
                   ┌───────────────────────────────────┤
                   │              │              │     │
                   ▼              ▼              ▼     ▼
            ┌──────────┐   ┌──────────┐   ┌──────────┐
            │  SUNO    │   │  PRIVY   │   │  PEXELS  │ ...
            │  AGENT   │   │  AGENT   │   │  AGENT   │
            └──────────┘   └──────────┘   └──────────┘
```

---

## Priority Implementation Order

| Phase | Agent | Rationale |
|-------|-------|-----------|
| **1** | `orchestrator-agent` | Foundation for all other agents |
| **1** | `github-agent` | Essential for workflow management |
| **2** | `suno-api-agent` | Core music functionality |
| **2** | `firebase-agent` | Security is critical |
| **3** | `pexels-agent` | Music video creator |
| **3** | `architecture-agent` | Guide feature development |
| **4** | `privy-agent` | Web3 features (future) |
| **4** | `meta-agent` | Quality and consistency |
| **5** | `ui-agent` | Ongoing UI work |
| **5** | `testing-agent` | Quality assurance |

---

## Agent Configuration Template

Each agent should be configured with:

```javascript
const agentConfig = {
  name: 'agent-name',
  description: 'What this agent does',
  triggers: ['keywords', 'patterns', 'commands'],
  tools: ['allowed', 'tools'],
  context: {
    files: ['relevant/files.js'],
    docs: ['https://api-docs.com'],
  },
  prompts: {
    system: 'You are a specialist in...',
    examples: ['Example task 1', 'Example task 2'],
  },
};
```

---

## Next Steps

1. **Create agent definition files** in `.claude/agents/`
2. **Implement orchestrator** for multi-agent coordination
3. **Set up Privy** for Web3 authentication
4. **Enhance Suno integration** with missing endpoints
5. **Build Pexels service** for music video creator
6. **Secure Firebase** with proper rules

---

*Last Updated: December 2024*
