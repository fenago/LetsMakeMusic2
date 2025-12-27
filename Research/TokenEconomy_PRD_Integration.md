# Product Requirements Document: Token Economy Integration with LetsMake.Music

## Document Info

| Field | Value |
|-------|-------|
| Document Version | 1.0 |
| Status | Draft |
| Last Updated | December 2024 |
| Author | Product Team |

---

## 1. Overview

### 1.1 Problem Statement

Creators on LetsMake.Music can generate AI-powered music but have limited options to monetize their creations beyond the platform's social features. Meanwhile, fans have no way to invest in creators they believe in, and the platform lacks mechanisms to align stakeholder incentives with company growth.

### 1.2 Proposed Solution

Implement a three-tier token economy that enables:
1. Company stakeholders to participate in platform success via governance tokens
2. Users to transact seamlessly with platform credits
3. Creators to tokenize and sell fractional ownership of their song rights

### 1.3 Goals & Success Metrics

| Goal | Metric | Target (Year 1) |
|------|--------|-----------------|
| Creator monetization | Total creator earnings | $100,000+ |
| User engagement | Credit purchases | 10,000+ transactions |
| Song tokenization | Songs minted as tokens | 1,000+ |
| Secondary market activity | Song token trades | 5,000+ |
| Revenue from token fees | Platform fee revenue | $50,000+ |

---

## 2. User Personas

### 2.1 Creator Alex (Song Creator/Seller)

**Profile:** 24-year-old aspiring artist, creates 5-10 songs/month on the platform

**Current Pain Points:**
- Earns nothing from songs despite having 10K+ plays
- Can't monetize without traditional record deal
- No way to raise funds to invest in better equipment/marketing

**Token Economy Value:**
- Tokenize best songs and sell 30% of streaming rights
- Earn upfront capital while retaining majority ownership
- Build community of invested fans who promote their music

### 2.2 Fan Investor Maya (Token Buyer)

**Profile:** 28-year-old music enthusiast, active on social platforms

**Current Pain Points:**
- Loves discovering new artists but can't invest in their success
- Wants more than just "liking" - wants real stake
- Interested in crypto but finds most projects abstract

**Token Economy Value:**
- Buy shares in songs from creators she believes in
- Earn royalties when those songs succeed
- Feel connected to creator's journey as an investor

### 2.3 Casual User Jordan (Credit User)

**Profile:** 19-year-old student, creates occasional songs for fun

**Current Pain Points:**
- Doesn't want to pay subscription for occasional use
- Would create more if it was affordable
- Confused by complex pricing tiers

**Token Economy Value:**
- Buy credits as needed, no commitment
- Earn free credits through engagement
- Simple, predictable costs per song

### 2.4 Platform Investor (Governance Token Holder)

**Profile:** Angel investor or crypto fund

**Current Pain Points:**
- Traditional equity is illiquid
- Can't participate in day-to-day governance
- Revenue sharing requires manual distributions

**Token Economy Value:**
- Liquid token with governance rights
- Automatic staking rewards from platform revenue
- Transparent, on-chain cap table

---

## 3. Feature Requirements

### 3.1 Phase 1: Platform Credits ($MUSIC)

**Priority:** P0 (Must Have)
**Timeline:** Months 1-3

#### 3.1.1 Credit Purchase Flow

**User Story:** As a user, I want to buy credits so I can create songs without a subscription.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| CR-001 | Display credit balance prominently in app header | P0 |
| CR-002 | Offer credit packages: $4.99, $9.99, $24.99, $99.99 | P0 |
| CR-003 | Support Apple Pay, Google Pay, credit cards via Stripe | P0 |
| CR-004 | Show bonus credits for larger packages | P0 |
| CR-005 | Display purchase history in profile/settings | P1 |
| CR-006 | Send email receipt after purchase | P1 |

**UI Mockup Requirements:**
```
┌─────────────────────────────────────┐
│  LetsMake.Music          🪙 500     │  <- Credit balance in header
├─────────────────────────────────────┤
│                                     │
│  Get More Credits                   │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Starter        $4.99      │    │
│  │  500 credits               │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Creator        $9.99      │    │  <- Most popular badge
│  │  1,100 credits  +10% bonus │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Pro            $24.99     │    │
│  │  3,000 credits  +20% bonus │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │  Studio         $99.99     │    │
│  │  13,000 credits +30% bonus │    │
│  └─────────────────────────────┘    │
│                                     │
└─────────────────────────────────────┘
```

#### 3.1.2 Credit Spending

**User Story:** As a user, I want to spend credits on platform services with clear pricing.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| CR-010 | Show credit cost before each action (song generation, etc.) | P0 |
| CR-011 | Deduct credits atomically with service delivery | P0 |
| CR-012 | Show "insufficient credits" prompt with purchase option | P0 |
| CR-013 | Display spending history with category breakdown | P1 |
| CR-014 | Allow setting spending alerts/limits | P2 |

**Credit Pricing Table:**

| Action | Credits | Approx USD |
|--------|---------|------------|
| Generate Song (Standard) | 50 | $0.50 |
| Generate Song (HD Audio) | 100 | $1.00 |
| Generate Music Video | 150 | $1.50 |
| Extend Existing Song | 75 | $0.75 |
| Extract Stems (Vocals/Instrumental) | 100 | $1.00 |
| Voice Clone Training | 500 | $5.00 |
| Mint Song as NFT | 200 | $2.00 |

#### 3.1.3 Credit Earning (Non-Purchase)

**User Story:** As an active user, I want to earn free credits through engagement.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| CR-020 | Award 5 credits daily for opening app (streak bonus up to 25) | P1 |
| CR-021 | Award 100 credits for each successful referral | P1 |
| CR-022 | Award 1-5 credits per 1000 plays on user's songs | P2 |
| CR-023 | Award credits for completing challenges/achievements | P2 |
| CR-024 | Display earning history separate from purchases | P1 |

---

### 3.2 Phase 2: Song Tokenization

**Priority:** P0 (Must Have)
**Timeline:** Months 4-8

#### 3.2.1 Monetization Toggle

**User Story:** As a creator, I want to easily enable monetization for songs I want to sell rights to.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| ST-001 | Add "Monetize This Song" toggle in song settings | P0 |
| ST-002 | Show educational modal explaining tokenization on first toggle | P0 |
| ST-003 | Require identity verification (KYC) before first monetization | P0 |
| ST-004 | Allow selecting which rights to tokenize (checklist) | P0 |
| ST-005 | Show preview of how song will appear in marketplace | P1 |

**Integration with Existing Song Rights:**

The existing `songRights.js` schema maps to tokenizable rights:

| Existing Right | Token Right | Default Tokenizable? |
|----------------|-------------|---------------------|
| `allowExtend` | Extension Rights | No |
| `allowStemExtraction` | Stem Access Rights | Yes |
| `allowWavExport` | Download Rights | Yes |
| `allowLyricsUse` | Lyrics Rights | No |
| `allowReinterpret` | Remix Rights | Yes |
| `allowSampling` | Sample Rights | Yes |
| `allowVideoCreation` | Sync Rights | Yes |
| `allowCommercialUse` | Commercial Use Rights | Yes |
| NEW | Streaming Royalties | Yes |
| NEW | Master Recording | Yes |

#### 3.2.2 Wallet Integration (Zero-Friction Embedded Wallets)

**User Story:** As a user, I want to receive payments and manage tokens without dealing with crypto wallet setup.

**Approach:** Use **embedded wallets** (Privy) with lazy wallet creation. Users authenticate via existing Firebase Auth and a Solana wallet is created invisibly when first needed (not on signup).

##### Implementation Approach: Option C (Firebase Auth + Privy Wallet) - RECOMMENDED

Keep Firebase Auth as the primary authentication system. Add Privy only for wallet functionality with lazy creation.

```
┌─────────────────────────────────────────────────────────────────┐
│                   OPTION C: HYBRID APPROACH                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User signs up/logs in via Firebase Auth (existing flow)       │
│                         │                                       │
│                         ▼                                       │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Firebase Auth (PRIMARY)                                │     │
│  │ • Email/Google/Apple login                             │     │
│  │ • Session management                                   │     │
│  │ • User profile in Firestore                            │     │
│  │ • All existing app features work normally              │     │
│  └───────────────────────────────────────────────────────┘     │
│                         │                                       │
│                         │ User clicks "Monetize Song" or        │
│                         │ "Buy Song Rights" for first time      │
│                         ▼                                       │
│  ┌───────────────────────────────────────────────────────┐     │
│  │ Privy Wallet (LAZY ACTIVATION)                         │     │
│  │ • Creates Solana wallet on-demand                      │     │
│  │ • Links to Firebase user via email                     │     │
│  │ • MPC key management (no seed phrase)                  │     │
│  │ • Signs transactions invisibly                         │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why Option C?**
- **Zero migration:** Existing Firebase auth works unchanged
- **Zero friction for casual users:** Most users never need a wallet
- **Zero friction for creators:** Wallet created invisibly when monetizing
- **Familiar UX:** Users sign in normally - no wallet prompts at signup
- **Same email linking:** Privy uses same email for account association

**Privy Pricing Consideration:**

| MAU | Cost | Notes |
|-----|------|-------|
| 0-499 | Free | Perfect for launch/beta |
| 500-2,499 | $299/mo | Growth phase |
| 2,500-9,999 | $499/mo | Scale phase |
| 10,000+ | Custom | Enterprise pricing |

**Cost Optimization:** With lazy wallet creation, you only pay for users who actually activate wallets (monetize or buy), not all registered users.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| ST-010 | Auto-create embedded Solana wallet on user signup | P0 |
| ST-011 | Support email, Google, Apple, SMS login methods | P0 |
| ST-012 | Display wallet balance in profile (no "connect" step needed) | P0 |
| ST-013 | Use MPC security (no seed phrase required) | P0 |
| ST-014 | Allow linking external wallet (Phantom, Backpack) for power users | P1 |
| ST-015 | Allow exporting wallet (advanced users who want seed phrase) | P2 |
| ST-016 | Show wallet address (truncated) with copy/share option | P1 |

**Why Embedded Wallets?**
- **Zero friction:** Users never see "connect wallet" prompts
- **Familiar auth:** Sign in with email/social - wallet created automatically
- **MPC security:** Keys split into 3 encrypted shares (user device, Privy servers, backup)
- **No seed phrase:** Users can't lose access by losing 12 words
- **Gradual disclosure:** Power users can link external wallets or export keys later

**UI Flow (Simplified):**
```
User Signs Up (email/Google/Apple)
     │
     ▼ (Invisible to user)
┌─────────────────────────────────┐
│  Embedded Wallet Created        │
│  - Solana address generated     │
│  - MPC key shares distributed   │
│  - Ready for transactions       │
└─────────────────────────────────┘
     │
     ▼ (User sees normal profile)
┌─────────────────────────────────┐
│  Profile                        │
│  ─────────────────────────      │
│  @username                      │
│                                 │
│  Wallet Balance:                │
│  0.5 SOL ($50.00) │ 25 USDC     │
│                                 │
│  🪙 Credits: 500                │
│                                 │
│  [ View Wallet Details ]        │
└─────────────────────────────────┘
     │
     │ (Optional - Advanced settings)
     ▼
┌─────────────────────────────────┐
│  Wallet Settings                │
│  ─────────────────────────      │
│  Your Wallet Address:           │
│  7xKX...9fHm  [Copy] [Share]    │
│                                 │
│  Advanced Options:              │
│  [ Link External Wallet ]       │
│  [ Export Private Key ]         │
│  [ View on Solscan ]            │
└─────────────────────────────────┘
```

**Progressive Disclosure Model:**

| User Type | Experience |
|-----------|------------|
| Casual User | Never sees wallet UI - just earns/spends credits |
| Creator | Sees balance when monetizing - no setup needed |
| Investor | Portfolio view shows holdings - wallet just works |
| Power User | Can link Phantom, export keys, full control |

#### 3.2.3 Minting Flow

**User Story:** As a creator, I want to mint my song as a blockchain asset so I can sell rights.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| ST-020 | Upload song metadata to IPFS before minting | P0 |
| ST-021 | Upload audio file to IPFS (alongside Firebase) | P0 |
| ST-022 | Create Solana NFT representing the song | P0 |
| ST-023 | Create fungible tokens for each right type (100 units each) | P0 |
| ST-024 | Show minting progress (uploading, minting, confirming) | P0 |
| ST-025 | Store token addresses in Firestore song document | P0 |
| ST-026 | Deduct 200 credits for minting | P0 |
| ST-027 | Show success screen with link to view on blockchain | P1 |

**Firestore Schema Addition:**
```javascript
songs/{songId} = {
  // ... existing fields ...

  // Token Economy Fields (new)
  monetizationEnabled: boolean,
  mintedAt: timestamp,
  tokenData: {
    masterNftAddress: string,      // Solana address of master NFT
    rightTokens: {
      streamingRoyalties: {
        mintAddress: string,
        totalSupply: 100,
        creatorRetained: number,   // How many units creator kept
      },
      masterRecording: { ... },
      syncRights: { ... },
      // ... etc for each right type
    },
    ipfsMetadataUri: string,       // ipfs://Qm...
    ipfsAudioUri: string,          // ipfs://Qm...
  },
  verificationStatus: 'pending' | 'verified' | 'rejected',
}
```

#### 3.2.4 Listing & Selling Rights

**User Story:** As a creator, I want to list portions of my song rights for sale.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| ST-030 | Allow setting asking price per unit (in USDC) | P0 |
| ST-031 | Allow listing any number of units (1-90, must keep 10%) | P0 |
| ST-032 | Show order book / current listings for the song | P1 |
| ST-033 | Support "Buy Now" fixed price listings | P0 |
| ST-034 | Support auction-style listings (future) | P2 |
| ST-035 | Allow canceling active listings | P0 |
| ST-036 | Show estimated earnings calculator | P1 |

**Listing UI:**
```
┌─────────────────────────────────────────┐
│  List Rights for Sale                   │
│  ─────────────────────────────────      │
│  Song: Summer Vibes                     │
│                                         │
│  Right Type: [Streaming Royalties ▼]    │
│                                         │
│  You own: 100 units (100%)              │
│  Minimum to keep: 10 units (10%)        │
│                                         │
│  Units to sell: [ 30 ]                  │
│  Price per unit: [ $0.50 ] USDC         │
│                                         │
│  ────────────────────────────────       │
│  Total listing: 30 units @ $0.50        │
│  You will receive: $15.00 USDC          │
│  Platform fee (15%): $2.25              │
│  Net to you: $12.75 USDC                │
│                                         │
│  [ Cancel ]        [ List for Sale ]    │
└─────────────────────────────────────────┘
```

#### 3.2.5 Buying Rights

**User Story:** As a fan, I want to buy rights to songs I believe in.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| ST-040 | Show marketplace of available song right listings | P0 |
| ST-041 | Allow filtering by genre, price, creator, right type | P1 |
| ST-042 | Show song preview (play audio) before purchase | P0 |
| ST-043 | Support USDC payments from connected wallet | P0 |
| ST-044 | Execute purchase atomically (payment + token transfer) | P0 |
| ST-045 | Show purchase confirmation with transaction link | P0 |
| ST-046 | Display owned rights in "My Portfolio" section | P0 |

**Marketplace UI:**
```
┌─────────────────────────────────────────┐
│  Marketplace                    🔍      │
├─────────────────────────────────────────┤
│  [All Rights ▼] [All Genres ▼] [Sort ▼]│
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │ 🎵 Summer Vibes                 │    │
│  │ by @CreatorAlex                 │    │
│  │ ───────────────────────────     │    │
│  │ Streaming Royalties             │    │
│  │ 30 units available @ $0.50 each │    │
│  │                                 │    │
│  │ 🔊 [Play Preview]   [ Buy ]     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🎵 Midnight Dreams              │    │
│  │ by @BeatMaker99                 │    │
│  │ ───────────────────────────     │    │
│  │ Sync Rights                     │    │
│  │ 50 units available @ $1.00 each │    │
│  │                                 │    │
│  │ 🔊 [Play Preview]   [ Buy ]     │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

#### 3.2.6 Portfolio & Royalties

**User Story:** As a rights holder, I want to see my portfolio and receive royalties.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| ST-050 | Display all owned song rights with current value | P0 |
| ST-051 | Show pending/accrued royalties | P0 |
| ST-052 | Allow claiming royalties to wallet | P0 |
| ST-053 | Show royalty history by song | P1 |
| ST-054 | Display portfolio performance over time (chart) | P2 |
| ST-055 | Send push notification when royalties available | P1 |

**Portfolio UI:**
```
┌─────────────────────────────────────────┐
│  My Portfolio                           │
├─────────────────────────────────────────┤
│  Total Value: $127.50                   │
│  Pending Royalties: $3.25 [Claim]       │
├─────────────────────────────────────────┤
│  Holdings:                              │
│                                         │
│  🎵 Summer Vibes - Streaming            │
│     15 units (15%) │ Value: $15.00      │
│     Earned: $1.25 this month            │
│                                         │
│  🎵 Midnight Dreams - Sync              │
│     25 units (25%) │ Value: $37.50      │
│     Earned: $2.00 this month            │
│                                         │
│  🎵 Beat Drop - Master Recording        │
│     50 units (50%) │ Value: $75.00      │
│     Earned: $0.00 this month            │
│                                         │
│  [ View All ] [ Transaction History ]   │
└─────────────────────────────────────────┘
```

---

### 3.3 Phase 3: Governance Token ($LMM)

**Priority:** P1 (Should Have)
**Timeline:** Months 12-18

#### 3.3.1 Token Display & Staking

**User Story:** As a $LMM holder, I want to stake my tokens to earn rewards.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| GT-001 | Display $LMM balance in profile (if connected wallet holds any) | P0 |
| GT-002 | Allow staking $LMM with lock period selection (1mo, 6mo, 1yr, 4yr) | P0 |
| GT-003 | Show staking rewards (APY varies by lock period) | P0 |
| GT-004 | Allow claiming rewards without unstaking | P1 |
| GT-005 | Show unstaking countdown for locked tokens | P0 |

#### 3.3.2 Governance Voting

**User Story:** As a staked $LMM holder, I want to vote on platform decisions.

**Requirements:**

| ID | Requirement | Priority |
|----|-------------|----------|
| GT-010 | Display active governance proposals | P1 |
| GT-011 | Allow voting with staked $LMM (weighted by amount + lock period) | P1 |
| GT-012 | Show voting results in real-time | P1 |
| GT-013 | Send notification when new proposals are active | P2 |
| GT-014 | Show historical proposals and outcomes | P2 |

---

## 4. Non-Functional Requirements

### 4.1 Security

| ID | Requirement | Priority |
|----|-------------|----------|
| SEC-001 | All wallet connections must use standard protocols (WalletConnect, MWA) | P0 |
| SEC-002 | Never store private keys on platform servers | P0 |
| SEC-003 | Smart contracts must be audited before mainnet deployment | P0 |
| SEC-004 | Implement rate limiting on all blockchain-related endpoints | P0 |
| SEC-005 | KYC data must be encrypted at rest and in transit | P0 |

### 4.2 Performance

| ID | Requirement | Priority |
|----|-------------|----------|
| PERF-001 | Credit balance must load within 500ms | P0 |
| PERF-002 | Minting process should complete within 60 seconds | P0 |
| PERF-003 | Marketplace must support 10,000+ listings without degradation | P1 |
| PERF-004 | Portfolio view must load within 2 seconds | P1 |

### 4.3 Compliance

| ID | Requirement | Priority |
|----|-------------|----------|
| COMP-001 | Implement KYC for all users who monetize songs | P0 |
| COMP-002 | Block users from restricted jurisdictions | P0 |
| COMP-003 | Maintain transaction records for 7 years | P0 |
| COMP-004 | Provide 1099 tax forms for US creators earning >$600 | P1 |
| COMP-005 | Display required legal disclaimers on token purchases | P0 |

---

## 5. Integration Points

### 5.1 Existing System Touchpoints

| System Component | Integration Required |
|------------------|---------------------|
| User Authentication | Add wallet address field, KYC status |
| Song Creation Flow | Add credit cost display, deduction |
| Song Document Schema | Add tokenization fields (see 3.2.3) |
| Profile Screen | Add credit balance, wallet, portfolio sections |
| Settings Screen | Add wallet connection, monetization settings |
| Notifications | Add royalty, governance, transaction notifications |

### 5.2 New Screens Required

| Screen | Description | Priority |
|--------|-------------|----------|
| Credit Purchase | Package selection and checkout | P0 |
| Wallet Connection | Connect/manage external wallet | P0 |
| Song Monetization | Toggle and configure tokenization | P0 |
| Minting Progress | Show minting status and confirmation | P0 |
| Marketplace | Browse and buy song rights | P0 |
| My Portfolio | View holdings and royalties | P0 |
| Listing Creation | Create sale listing for rights | P0 |
| Governance | View and vote on proposals | P1 |
| Staking | Stake $LMM and view rewards | P1 |

### 5.3 External Service Integrations

| Service | Purpose | Priority |
|---------|---------|----------|
| Stripe | Credit purchases (fiat) | P0 |
| Phantom/Backpack | Wallet connections | P0 |
| Solana RPC | Blockchain interactions | P0 |
| IPFS (nft.storage) | Decentralized metadata storage | P0 |
| Helius/Alchemy | Solana indexing, webhooks | P1 |
| Persona/Veriff | KYC verification | P0 |

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Regulatory action on tokens | Medium | High | Legal counsel, conservative approach, jurisdiction restrictions |
| Low user adoption of tokenization | Medium | Medium | Extensive education, simple UX, creator success stories |
| Smart contract vulnerability | Low | Critical | Multiple audits, bug bounty, gradual rollout |
| IPFS content availability | Low | Medium | Multiple pinning services, Arweave backup |
| Wallet UX friction | Low | Medium | **MITIGATED:** Embedded wallets auto-created on signup (Privy), no seed phrase, familiar auth |
| Market manipulation | Medium | Medium | Trading limits, monitoring, circuit breakers |

---

## 7. Success Criteria

### 7.1 Phase 1 (Credits) - 3 Month Check

- [ ] 5,000+ users have purchased credits
- [ ] 80% of credit purchasers have spent credits
- [ ] <2% refund rate on credit purchases
- [ ] Credit system handles 100+ concurrent purchases

### 7.2 Phase 2 (Tokenization) - 8 Month Check

- [ ] 500+ songs minted as tokens
- [ ] 200+ unique buyers in marketplace
- [ ] $25,000+ total trading volume
- [ ] Zero smart contract security incidents
- [ ] 90%+ minting success rate

### 7.3 Phase 3 (Governance) - 18 Month Check

- [ ] $LMM token launched successfully
- [ ] 50%+ of tokens staked
- [ ] 3+ governance votes completed
- [ ] Staking APY sustainable from platform revenue

---

## 8. Open Questions

1. **Credit Expiration:** Should unused credits expire? (Currently proposed: 3 years inactivity)
2. **Minimum Sale:** What's the minimum units a creator must retain? (Currently proposed: 10%)
3. **Secondary Market Fee:** What platform fee on secondary sales? (Currently proposed: 2.5%)
4. **KYC Threshold:** At what earnings level is KYC required? ($0 for any monetization, or >$600?)
5. **International:** Which countries to support at launch?
6. **Royalty Frequency:** How often to calculate/distribute royalties? (Daily, weekly, monthly?)

---

## Appendix A: User Flows

### A.1 First Credit Purchase Flow

```
User taps "Create Song"
         │
         ▼
System checks credit balance
         │
         ├─── Has enough credits ──► Proceed to creation
         │
         └─── Insufficient credits
                    │
                    ▼
         Show "Get Credits" modal
                    │
                    ▼
         User selects package
                    │
                    ▼
         Stripe checkout (Apple Pay, etc.)
                    │
                    ▼
         Credits added to account
                    │
                    ▼
         Return to creation flow
```

### A.2 Song Monetization Flow

```
Creator views their song
         │
         ▼
Taps "Monetize" button
         │
         ├─── Wallet already exists ──► ✓ (embedded wallet created at signup)
         │
         ├─── KYC verified? ──► No ──► KYC flow (one-time)
         │
         └─── Ready to monetize
                    │
                    ▼
         Select rights to tokenize
                    │
                    ▼
         Review & confirm (200 credits)
                    │
                    ▼
         Upload to IPFS (show progress)
                    │
                    ▼
         Mint on Solana (show progress)
                    │
                    ▼
         Success! Song is now tokenized
                    │
                    ▼
         Prompt: "List rights for sale?"
```

### A.3 Buying Song Rights Flow

```
User browses Marketplace
         │
         ▼
Taps on a song listing
         │
         ▼
Views song details, plays preview
         │
         ▼
Taps "Buy X units"
         │
         ├─── Wallet already exists ──► ✓ (embedded wallet)
         │
         ├─── Sufficient USDC? ──► No ──► "Add funds" prompt (buy with card)
         │
         └─── Ready to purchase
                    │
                    ▼
         Confirm purchase (simple button tap - MPC signing happens invisibly)
                    │
                    ▼
         Transaction processing
                    │
                    ▼
         Success! Rights added to portfolio
```

---

## Appendix B: Data Models

### B.1 Credit Transaction Schema

```javascript
creditTransactions/{transactionId} = {
  userId: string,
  type: 'purchase' | 'spend' | 'earn' | 'refund',
  amount: number,           // Positive for credits in, negative for out
  balanceAfter: number,

  // For purchases
  purchaseData: {
    packageId: string,
    priceUsd: number,
    stripePaymentIntentId: string,
    bonusCredits: number,
  },

  // For spending
  spendData: {
    action: string,         // 'song_generation', 'minting', etc.
    referenceId: string,    // songId, etc.
  },

  // For earning
  earnData: {
    source: string,         // 'daily_login', 'referral', 'plays'
    referenceId: string,
  },

  createdAt: timestamp,
}
```

### B.2 Marketplace Listing Schema

```javascript
listings/{listingId} = {
  songId: string,
  sellerId: string,
  rightType: string,        // 'streamingRoyalties', 'masterRecording', etc.

  unitsAvailable: number,
  pricePerUnit: number,     // In USDC (e.g., 0.50)

  tokenMintAddress: string, // Solana token address
  escrowAddress: string,    // Where tokens are held during listing

  status: 'active' | 'sold' | 'cancelled',
  createdAt: timestamp,
  updatedAt: timestamp,

  // Denormalized for queries
  songTitle: string,
  songImageUrl: string,
  sellerName: string,
  genre: string,
}
```

### B.3 Portfolio Holding Schema

```javascript
users/{userId}/portfolio/{holdingId} = {
  songId: string,
  rightType: string,
  unitsOwned: number,

  purchasePrice: number,    // Total paid
  purchaseDate: timestamp,

  tokenMintAddress: string,

  // Denormalized
  songTitle: string,
  songImageUrl: string,
  creatorName: string,

  // Calculated (updated periodically)
  currentValue: number,
  totalRoyaltiesEarned: number,
  unclaimedRoyalties: number,
}
```

---

*End of PRD Document*
