# LetsMake.Music Token Economy - Implementation Plan

## Document Info

| Field | Value |
|-------|-------|
| Version | 1.0 |
| Created | December 2024 |
| Status | Ready for Review |
| Total Duration | 24 Weeks |
| Estimated Budget | $15-40K initial + $200-1000/mo |

---

## Executive Summary

This plan implements a **three-tier token economy** for LetsMake.Music while being **fully App Store compliant**.

### The Three Tokens

| Token | Purpose | Implementation |
|-------|---------|----------------|
| **$MUSIC Credits** | Platform currency for song generation | Phase 1 (Off-chain, Apple IAP) |
| **Song Rights Tokens** | Fractional song ownership NFTs | Phase 4 (Solana + Metaplex) |
| **$LMM Governance** | Company equity/staking | Deferred (legal review needed) |

### Critical Insight: App Store Compliance

**Apple does NOT allow in-app crypto purchases.** This fundamentally shapes our architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (iOS/Android)                  │
│  ───────────────────────────────────────────────────────    │
│  ✅ Create songs (credits via Apple IAP)                    │
│  ✅ View wallet balance & portfolio                          │
│  ✅ Mint songs as tokens (costs credits)                     │
│  ✅ Browse marketplace listings (read-only)                  │
│  ❌ Buy/sell tokens with crypto (NOT ALLOWED)               │
│  🔗 "Buy on Web" button → Opens Safari                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    WEB APP (marketplace.letsmake.music)      │
│  ───────────────────────────────────────────────────────    │
│  ✅ Connect wallet (Phantom, Privy)                          │
│  ✅ Buy song tokens with USDC/SOL                            │
│  ✅ Sell song tokens                                         │
│  ✅ List rights for sale                                     │
│  ✅ Claim royalties                                          │
│  ✅ No App Store restrictions                                │
└─────────────────────────────────────────────────────────────┘
```

**This is exactly how OpenSea, Magic Eden, and Coinbase mobile apps work.**

---

## Technology Stack

### Existing (Keep)
| Layer | Technology |
|-------|------------|
| Mobile | React Native 0.81.1 |
| Auth | Firebase Auth |
| Database | Firestore |
| Functions | Firebase Cloud Functions (Node 20) |
| Storage | Firebase Storage |

### New Additions
| Layer | Technology | Purpose |
|-------|------------|---------|
| Payments (iOS) | Apple IAP (`react-native-iap`) | Credit purchases |
| Payments (Android) | Google Play Billing | Credit purchases |
| Payments (Web) | Stripe | Token purchases |
| Wallets | Privy SDK | Embedded Solana wallets |
| Blockchain | Solana + Metaplex | Song NFTs & tokens |
| Decentralized Storage | nft.storage (IPFS) | Song metadata |
| KYC | Persona | Identity verification |
| Web App | Next.js 14 | Marketplace |

### Key Integration: Privy (Now Stripe-Owned)

**Why Privy:**
- Native Solana support
- React Native SDK available
- MPC security (no seed phrases)
- Just acquired by Stripe = better fiat integration coming
- Used by Jupiter, Magic Eden
- SOC 2 Type II certified

**Pricing:**
| MAU (with wallets) | Cost |
|-------------------|------|
| 0-499 | FREE |
| 500-2,499 | $299/mo |
| 2,500-9,999 | $499/mo |
| 10,000+ | Custom |

**Implementation Approach: Option C (Hybrid)**
- Firebase Auth remains PRIMARY (no migration)
- Privy activates LAZILY (only when wallet needed)
- Same email links both systems

---

## Phase Overview

```
Week:  1   2   3   4   5   6   7   8   9  10  11  12  13  14  15  16  17  18  19  20  21  22  23  24
       ├───────────────┤
       │ PHASE 1       │ Credits System (Apple IAP)
       │               │
           ├───────────────┤
           │ PHASE 2       │ Wallet Infrastructure (Privy)
           │               │
               ├───────────────┤
               │ PHASE 3       │ Web App Foundation (Next.js)
               │               │
                   ├───────────────────┤
                   │ PHASE 4           │ Song Tokenization (Minting)
                   │                   │
                           ├───────────────────┤
                           │ PHASE 5           │ Token Trading (Web)
                           │                   │
                                   ├───────────────────┤
                                   │ PHASE 6           │ Portfolio & Royalties
                                   │                   │
                                           ├───────────────────┤
                                           │ PHASE 7           │ Polish & Mainnet
```

---

## Phase 1: Credits System (Weeks 1-5)

### Goal
Enable pay-as-you-go song generation via platform credits, purchased through Apple IAP.

### Why First?
1. No blockchain complexity
2. Immediate revenue generation
3. Validates willingness to pay
4. Foundation for tokenization (minting costs credits)
5. App Store approval easier without crypto

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  User taps "Buy Credits"                                     │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐      ┌─────────────────┐               │
│  │  Apple IAP      │      │  Google Play    │               │
│  │  StoreKit       │      │  Billing        │               │
│  └────────┬────────┘      └────────┬────────┘               │
│           │                        │                         │
│           └────────────┬───────────┘                         │
│                        ▼                                     │
│           ┌─────────────────────────┐                        │
│           │  Cloud Function:        │                        │
│           │  validateReceipt()      │                        │
│           └────────────┬────────────┘                        │
│                        ▼                                     │
│           ┌─────────────────────────┐                        │
│           │  Firestore:             │                        │
│           │  users/{uid}.credits    │                        │
│           └─────────────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

### Credit Packages

| Package | Price | Credits | Bonus | Effective $/Credit |
|---------|-------|---------|-------|-------------------|
| Starter | $4.99 | 500 | - | $0.010 |
| Creator | $9.99 | 1,100 | +10% | $0.009 |
| Pro | $24.99 | 3,000 | +20% | $0.008 |
| Studio | $99.99 | 13,000 | +30% | $0.008 |

**Note:** Apple takes 30% (15% with Small Business Program). At $4.99, you receive $3.49-$4.24.

### Credit Costs

| Action | Credits | Approx USD |
|--------|---------|------------|
| Generate Song (Standard) | 50 | $0.50 |
| Generate Song (HD) | 100 | $1.00 |
| Generate Music Video | 150 | $1.50 |
| Extend Song | 75 | $0.75 |
| Extract Stems | 100 | $1.00 |
| Voice Clone Training | 500 | $5.00 |
| Mint Song as NFT | 200 | $2.00 |

### Firestore Schema

```javascript
// users/{userId} - Add fields
{
  credits: {
    balance: 0,
    lifetime: {
      purchased: 0,
      earned: 0,
      spent: 0
    },
    lastUpdated: Timestamp
  }
}

// creditTransactions/{transactionId} - New collection
{
  userId: string,
  type: 'purchase' | 'spend' | 'earn' | 'refund',
  amount: number,              // Positive = in, negative = out
  balanceAfter: number,
  metadata: {
    // For purchases
    productId?: string,        // 'credits_500', etc.
    transactionId?: string,    // Apple/Google transaction ID
    platform?: 'ios' | 'android',
    receiptData?: string,      // For validation
    priceUsd?: number,

    // For spending
    action?: string,           // 'song_generation', 'minting', etc.
    referenceId?: string,      // songId, etc.

    // For earning
    source?: string,           // 'daily_login', 'referral', etc.
  },
  createdAt: Timestamp
}
```

### Implementation Tasks

#### Week 1: Backend Foundation

**Day 1-2: Firestore Schema**
- [ ] Add `credits` field to user documents
- [ ] Create `creditTransactions` collection
- [ ] Add Firestore indexes for queries
- [ ] Update Firestore security rules

**Day 3-5: Cloud Functions**
```javascript
// functions/credits/index.js

// Validate Apple/Google receipt and add credits
exports.validateReceipt = functions.https.onCall(async (data, context) => {
  // 1. Verify user authenticated
  // 2. Validate receipt with Apple/Google
  // 3. Add credits atomically
  // 4. Create transaction record
  // 5. Return new balance
});

// Spend credits (called before costly actions)
exports.spendCredits = functions.https.onCall(async (data, context) => {
  // 1. Verify user authenticated
  // 2. Check sufficient balance
  // 3. Deduct atomically
  // 4. Create transaction record
  // 5. Return success + new balance
});

// Get credit balance
exports.getCreditsBalance = functions.https.onCall(async (data, context) => {
  // Return current balance
});
```

#### Week 2: App Store Setup & IAP

**Day 1: App Store Connect**
- [ ] Create consumable IAP products in App Store Connect
- [ ] Product IDs: `credits_500`, `credits_1100`, `credits_3000`, `credits_13000`
- [ ] Set pricing in all territories
- [ ] Add product descriptions

**Day 2: Google Play Console**
- [ ] Create managed products in Play Console
- [ ] Same product IDs for consistency
- [ ] Set pricing

**Day 3-5: React Native IAP**
```bash
cd ReactNativeTikTokApp
yarn add react-native-iap
cd ios && pod install && cd ..
```

```javascript
// src/services/creditsService.js
import * as RNIap from 'react-native-iap';
import functions from '@react-native-firebase/functions';

const productIds = [
  'credits_500',
  'credits_1100',
  'credits_3000',
  'credits_13000'
];

export const initializeIAP = async () => {
  await RNIap.initConnection();
  const products = await RNIap.getProducts({ skus: productIds });
  return products;
};

export const purchaseCredits = async (productId) => {
  const purchase = await RNIap.requestPurchase({ sku: productId });

  // Validate with backend
  const validateReceipt = functions().httpsCallable('validateReceipt');
  const result = await validateReceipt({
    receipt: purchase.transactionReceipt,
    productId: productId,
    platform: Platform.OS
  });

  // Acknowledge purchase
  await RNIap.finishTransaction({ purchase });

  return result.data;
};

export const getCreditsBalance = async () => {
  const getBalance = functions().httpsCallable('getCreditsBalance');
  const result = await getBalance();
  return result.data.balance;
};

export const spendCredits = async (amount, action, referenceId) => {
  const spend = functions().httpsCallable('spendCredits');
  const result = await spend({ amount, action, referenceId });
  return result.data;
};
```

#### Week 3: UI Components

**Credit Balance Header**
```javascript
// src/components/CreditBalanceHeader.js
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useCredits } from '../hooks/useCredits';

export const CreditBalanceHeader = ({ onPress }) => {
  const { balance, loading } = useCredits();

  return (
    <TouchableOpacity onPress={onPress}>
      <View style={styles.container}>
        <Text style={styles.icon}>🪙</Text>
        <Text style={styles.balance}>
          {loading ? '...' : balance.toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
```

**Credit Purchase Screen**
```
┌─────────────────────────────────────────┐
│  ← Get Credits                          │
├─────────────────────────────────────────┤
│                                         │
│  Current Balance: 🪙 125                │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Starter          $4.99         │    │
│  │  500 credits                    │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ⭐ Creator       $9.99         │    │  ← Best Value badge
│  │  1,100 credits   +10% bonus     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Pro              $24.99        │    │
│  │  3,000 credits   +20% bonus     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  Studio           $99.99        │    │
│  │  13,000 credits  +30% bonus     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [ Restore Purchases ]                  │
│                                         │
└─────────────────────────────────────────┘
```

#### Week 4: Integration

**Song Generation Integration**
```javascript
// In CreateScreen.js - Before generating song
const handleGenerateSong = async () => {
  const SONG_COST = 50; // or 100 for HD

  // Check balance
  const balance = await getCreditsBalance();
  if (balance < SONG_COST) {
    // Show insufficient credits modal
    setShowPurchaseModal(true);
    return;
  }

  // Spend credits first
  const spendResult = await spendCredits(
    SONG_COST,
    'song_generation',
    null // referenceId set after creation
  );

  if (!spendResult.success) {
    Alert.alert('Error', 'Failed to process credits');
    return;
  }

  // Generate song
  try {
    const song = await generateSong(params);
    // Update transaction with songId
  } catch (error) {
    // Refund credits on failure
    await refundCredits(SONG_COST, spendResult.transactionId);
    throw error;
  }
};
```

#### Week 5: Testing & Polish

- [ ] Sandbox testing (iOS)
- [ ] Test all purchase flows
- [ ] Test insufficient balance flows
- [ ] Test restore purchases
- [ ] Test refund scenarios
- [ ] Edge cases (network failures, etc.)
- [ ] Update privacy policy for IAP
- [ ] Prepare App Store update

### Deliverables
- [ ] Users can purchase credit packages via Apple IAP
- [ ] Credit balance visible in app header
- [ ] Song generation deducts credits
- [ ] Purchase history accessible
- [ ] "Insufficient credits" flow to purchase

---

## Phase 2: Wallet Infrastructure (Weeks 3-7)

### Goal
Integrate Privy embedded wallets with lazy activation - wallets only created when users need blockchain features.

### Why Parallel with Phase 1?
- No dependencies on credits system
- Privy setup is isolated
- Faster path to tokenization

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      USER JOURNEY                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User signs up via Firebase Auth (existing flow)         │
│     → No wallet created yet                                  │
│     → Normal app experience                                  │
│                                                              │
│  2. User taps "Monetize Song" or "View Marketplace"         │
│     → App calls ensureWallet()                               │
│     → Privy modal: "Continue with ernesto@email.com?"       │
│     → One tap to confirm                                     │
│     → Wallet created with MPC (invisible to user)           │
│     → Wallet address saved to Firestore                      │
│                                                              │
│  3. Future wallet actions                                    │
│     → Already linked, no prompts                             │
│     → Transactions sign seamlessly                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Tasks

#### Week 3: Setup & Configuration

**Day 1-2: Privy Account Setup**
- [ ] Create Privy developer account
- [ ] Create app in Privy dashboard
- [ ] Configure login methods (email, Google, Apple)
- [ ] Get App ID and API keys
- [ ] Configure Solana (devnet initially)

**Day 3-5: SDK Installation**
```bash
cd ReactNativeTikTokApp

# Privy SDK
yarn add @privy-io/react-auth @privy-io/expo

# Solana dependencies
yarn add @solana/web3.js

# Required polyfills for React Native
yarn add react-native-get-random-values buffer react-native-url-polyfill

cd ios && pod install && cd ..
```

**Polyfill Setup (index.js)**
```javascript
// Add at VERY TOP of index.js, before App import
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
```

#### Week 4: Integration

**Privy Provider Setup**
```javascript
// App.js or AppContent.js
import { PrivyProvider } from '@privy-io/react-auth';

const privyConfig = {
  appId: process.env.PRIVY_APP_ID,
  config: {
    loginMethods: ['email', 'google', 'apple'],
    appearance: {
      theme: 'dark',
      accentColor: '#FF6B35', // Brand color
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
      noPromptOnSignature: false,
    },
    solanaClusters: [
      { name: 'devnet', rpcUrl: 'https://api.devnet.solana.com' },
      // Add mainnet later:
      // { name: 'mainnet-beta', rpcUrl: 'https://api.mainnet-beta.solana.com' },
    ],
  },
};

export default function App() {
  return (
    <PrivyProvider {...privyConfig}>
      <AuthProvider>  {/* Existing Firebase Auth */}
        <NavigationContainer>
          <MainStackNavigator />
        </NavigationContainer>
      </AuthProvider>
    </PrivyProvider>
  );
}
```

**Lazy Wallet Hook**
```javascript
// src/hooks/useWalletOnDemand.js
import { useCallback, useMemo } from 'react';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { useAuth } from '../core/onboarding/hooks/useAuth';
import firestore from '@react-native-firebase/firestore';

export const useWalletOnDemand = () => {
  const { user: firebaseUser } = useAuth();
  const { login, authenticated, ready } = usePrivy();
  const { wallets } = useSolanaWallets();

  const embeddedWallet = useMemo(() => {
    return wallets.find(w => w.walletClientType === 'privy');
  }, [wallets]);

  const ensureWallet = useCallback(async () => {
    // Already have wallet
    if (embeddedWallet) {
      return embeddedWallet;
    }

    // Create wallet via Privy
    if (!authenticated && firebaseUser?.email) {
      await login({
        prefill: {
          type: 'email',
          value: firebaseUser.email
        }
      });
    }

    // Get newly created wallet
    const newWallet = wallets.find(w => w.walletClientType === 'privy');

    // Save to Firestore
    if (newWallet && firebaseUser?.uid) {
      await firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .update({
          'wallet.embedded': {
            address: newWallet.address,
            provider: 'privy',
            createdAt: firestore.FieldValue.serverTimestamp(),
          },
          'wallet.primaryWallet': 'embedded',
        });
    }

    return newWallet;
  }, [embeddedWallet, authenticated, firebaseUser, login, wallets]);

  return {
    wallet: embeddedWallet,
    walletAddress: embeddedWallet?.address,
    hasWallet: !!embeddedWallet,
    isReady: ready,
    ensureWallet,
  };
};
```

#### Week 5-6: UI & Testing

**Wallet Display in Profile**
```javascript
// In ProfileScreen.js
import { useWalletOnDemand } from '../hooks/useWalletOnDemand';

const ProfileScreen = () => {
  const { wallet, walletAddress, hasWallet } = useWalletOnDemand();

  return (
    <View>
      {/* Existing profile content */}

      {hasWallet && (
        <View style={styles.walletSection}>
          <Text style={styles.label}>Wallet</Text>
          <Text style={styles.address}>
            {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
          </Text>
          <TouchableOpacity onPress={() => copyToClipboard(walletAddress)}>
            <Text>Copy</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
```

#### Week 7: Polish & Edge Cases

- [ ] Test wallet creation flow
- [ ] Test with different login methods
- [ ] Handle Privy errors gracefully
- [ ] Offline handling
- [ ] Wallet recovery scenarios

### Firestore Schema Update

```javascript
// users/{userId} - Add wallet field
{
  // ... existing fields ...

  wallet: {
    embedded: {
      address: string,         // Solana public key
      provider: 'privy',
      createdAt: Timestamp,
    },
    external: {
      address: string | null,  // If user links Phantom later
      provider: 'phantom' | 'backpack' | null,
      connectedAt: Timestamp | null,
    },
    primaryWallet: 'embedded' | 'external',
  }
}
```

### Deliverables
- [ ] Privy SDK integrated
- [ ] Lazy wallet creation working
- [ ] Wallet address saved to Firestore
- [ ] Wallet visible in profile
- [ ] Works on Solana devnet

---

## Phase 3: Web Marketplace Foundation (Weeks 5-9)

### Goal
Create a Next.js web app to handle token trading (since App Store doesn't allow in-app crypto purchases).

### Why Needed?
- Apple prohibits in-app crypto transactions
- Web has no such restrictions
- This is how OpenSea, Magic Eden do it

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WEB APP STACK                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend: Next.js 14 (App Router)                          │
│  ├── /                    Landing page                       │
│  ├── /marketplace         Browse listings                    │
│  ├── /song/[id]           Song detail + buy                  │
│  ├── /portfolio           User holdings                      │
│  ├── /sell                List tokens for sale               │
│  └── /settings            Wallet settings                    │
│                                                              │
│  Auth: Privy (same accounts as mobile)                       │
│  Data: Firebase (shared with mobile)                         │
│  Hosting: Vercel or Firebase Hosting                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Implementation Tasks

#### Week 5-6: Project Setup

**Create Next.js App**
```bash
cd /Users/ernestolee/ClaudeProjects/LetsMakeMusic
npx create-next-app@latest web-marketplace --typescript --tailwind --app --src-dir
cd web-marketplace
```

**Install Dependencies**
```bash
# Privy
yarn add @privy-io/react-auth

# Firebase
yarn add firebase

# Solana
yarn add @solana/web3.js

# UI
yarn add @radix-ui/react-dialog lucide-react
```

**Firebase Config**
```typescript
// src/lib/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Same config as mobile app
  projectId: 'letsmakemusic-4e0fe',
  // ...
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

#### Week 7-8: Core Pages

**Marketplace Page**
```typescript
// src/app/marketplace/page.tsx
import { getListings } from '@/lib/listings';
import { ListingCard } from '@/components/ListingCard';

export default async function MarketplacePage() {
  const listings = await getListings({ status: 'active' });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Song Rights Marketplace</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map(listing => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
```

**Deep Links to Mobile**
```typescript
// src/lib/deepLinks.ts
export const openInApp = (path: string) => {
  const appScheme = 'letsmakemusic://';
  const universalLink = 'https://letsmake.music';

  // Try app scheme first, fall back to universal link
  window.location.href = `${appScheme}${path}`;

  setTimeout(() => {
    // If still here, app not installed - show app store
    window.location.href = 'https://apps.apple.com/app/...';
  }, 2000);
};
```

#### Week 9: Universal Links Setup

**iOS Associated Domains**
```
// In Xcode: Signing & Capabilities → Associated Domains
applinks:letsmake.music
applinks:marketplace.letsmake.music
```

**apple-app-site-association**
```json
// hosted at /.well-known/apple-app-site-association
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.music.letsmake.app",
        "paths": ["/song/*", "/marketplace/*", "/portfolio/*"]
      }
    ]
  }
}
```

### Deliverables
- [ ] Next.js web app deployed
- [ ] Firebase integration working
- [ ] Privy auth working (shared accounts)
- [ ] Basic marketplace UI
- [ ] Universal links configured

---

## Phase 4: Song Tokenization (Weeks 7-12)

### Goal
Enable creators to mint their songs as NFTs with fractional rights tokens.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MINTING FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Creator taps "Monetize" on song                          │
│           │                                                  │
│           ▼                                                  │
│  2. KYC Check (Persona) - one time only                      │
│           │                                                  │
│           ▼                                                  │
│  3. Select rights to tokenize                                │
│           │                                                  │
│           ▼                                                  │
│  4. Pay 200 credits (via IAP balance)                        │
│           │                                                  │
│           ▼                                                  │
│  5. Cloud Function: uploadToIPFS()                           │
│     → Audio file to IPFS                                     │
│     → Cover image to IPFS                                    │
│     → Metadata JSON to IPFS                                  │
│           │                                                  │
│           ▼                                                  │
│  6. Cloud Function: mintSongNFT()                            │
│     → Create Master NFT (Metaplex)                           │
│     → Create right tokens (100 units each)                   │
│           │                                                  │
│           ▼                                                  │
│  7. Save token addresses to Firestore                        │
│           │                                                  │
│           ▼                                                  │
│  8. Success! "View on Marketplace" link                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Why Server-Side Minting?
- More reliable than client-side
- Better error handling
- Platform wallet pays gas, credits cover cost
- Simpler UX (no wallet popups)

### Implementation Tasks

#### Week 7-8: IPFS Integration

**Install nft.storage**
```javascript
// In Cloud Functions
const { NFTStorage, File } = require('nft.storage');

const client = new NFTStorage({ token: process.env.NFT_STORAGE_KEY });

exports.uploadToIPFS = functions.https.onCall(async (data, context) => {
  const { songId } = data;

  // Get song from Firestore
  const songDoc = await db.collection('songs').doc(songId).get();
  const song = songDoc.data();

  // Download audio from Firebase Storage
  const audioBuffer = await downloadFromStorage(song.audioUrl);
  const imageBuffer = await downloadFromStorage(song.imageUrl);

  // Create metadata
  const metadata = {
    name: song.title,
    description: `AI-generated song on LetsMake.Music`,
    image: new File([imageBuffer], 'cover.jpg', { type: 'image/jpeg' }),
    animation_url: new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' }),
    attributes: [
      { trait_type: 'Genre', value: song.style },
      { trait_type: 'Duration', value: song.duration },
      { trait_type: 'AI Model', value: 'Suno' },
    ],
    properties: {
      category: 'audio',
      creators: [{ address: song.creatorWallet, share: 100 }],
    },
  };

  // Upload to IPFS
  const result = await client.store(metadata);

  return {
    metadataUri: result.url,
    ipnft: result.ipnft,
  };
});
```

#### Week 9-10: Metaplex Integration

**Mint NFT Cloud Function**
```javascript
const { Metaplex } = require('@metaplex-foundation/js');
const { Connection, Keypair } = require('@solana/web3.js');

// Platform wallet (for gas)
const platformWallet = Keypair.fromSecretKey(
  Buffer.from(process.env.PLATFORM_WALLET_KEY, 'base64')
);

exports.mintSongNFT = functions.https.onCall(async (data, context) => {
  const { songId, creatorWallet, metadataUri } = data;

  const connection = new Connection(process.env.SOLANA_RPC_URL);
  const metaplex = Metaplex.make(connection);

  // Mint master NFT
  const { nft } = await metaplex.nfts().create({
    uri: metadataUri,
    name: data.title,
    symbol: 'LMMS',
    sellerFeeBasisPoints: 500, // 5% royalty
    creators: [
      { address: new PublicKey(creatorWallet), share: 95 },
      { address: platformWallet.publicKey, share: 5 },
    ],
  });

  // Create fungible tokens for each right type
  const rightTokens = await createRightTokens(
    connection,
    creatorWallet,
    songId
  );

  // Update Firestore
  await db.collection('songs').doc(songId).update({
    monetizationEnabled: true,
    mintedAt: admin.firestore.FieldValue.serverTimestamp(),
    tokenData: {
      masterNftAddress: nft.address.toString(),
      masterNftMint: nft.mint.address.toString(),
      rightTokens,
      ipfsMetadataUri: metadataUri,
    },
  });

  return { success: true, nftAddress: nft.address.toString() };
});
```

#### Week 11-12: UI & KYC

**KYC Integration (Persona)**
```javascript
// src/services/kycService.js
import { Inquiry } from 'persona';

export const startKYC = async (userId, email) => {
  const inquiry = await Inquiry.fromTemplate(PERSONA_TEMPLATE_ID)
    .referenceId(userId)
    .fields({ emailAddress: email })
    .onComplete((inquiryId, status) => {
      updateKYCStatus(userId, inquiryId, status);
    })
    .build();

  inquiry.start();
};
```

**Monetization Screen**
```
┌─────────────────────────────────────────┐
│  ← Monetize Song                        │
├─────────────────────────────────────────┤
│                                         │
│  🎵 Summer Vibes                        │
│  [Cover Image]                          │
│                                         │
│  ────────────────────────────────       │
│                                         │
│  Select rights to tokenize:             │
│                                         │
│  ☑️ Streaming Royalties (100 units)     │
│  ☑️ Sync Licensing (100 units)          │
│  ☑️ Remix Rights (100 units)            │
│  ☐ Sample Rights (100 units)            │
│  ☐ Master Recording (100 units)         │
│                                         │
│  ────────────────────────────────       │
│                                         │
│  Cost: 200 credits                      │
│  Your balance: 🪙 500                   │
│                                         │
│  [ Mint Song ]                          │
│                                         │
│  ℹ️ Minting creates blockchain tokens   │
│  representing ownership of your song.   │
│  You can sell up to 90% of each right.  │
│                                         │
└─────────────────────────────────────────┘
```

### Song Schema Update

```javascript
// songs/{songId} - Add tokenization fields
{
  // ... existing fields ...

  monetizationEnabled: boolean,
  mintedAt: Timestamp | null,

  tokenData: {
    masterNftAddress: string,
    masterNftMint: string,

    rightTokens: {
      streamingRoyalties: {
        mintAddress: string,
        totalSupply: 100,
        creatorRetained: 100, // Decreases as sold
      },
      syncRights: { ... },
      remixRights: { ... },
      sampleRights: { ... },
      masterRecording: { ... },
    },

    ipfsMetadataUri: string,
    ipfsAudioUri: string,
  },

  verificationStatus: 'none' | 'pending' | 'verified' | 'rejected',
}
```

### Deliverables
- [ ] IPFS upload working
- [ ] NFT minting on Solana devnet
- [ ] Right tokens created (5 types, 100 units each)
- [ ] KYC flow integrated
- [ ] Token data saved to Firestore
- [ ] "Monetize" flow in app

---

## Phase 5: Token Trading (Weeks 10-16)

### Goal
Enable buying and selling of song rights tokens on the web marketplace.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TRADING FLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  SELLING (Creator):                                          │
│  1. Go to web app (marketplace.letsmake.music)              │
│  2. Connect Privy wallet                                     │
│  3. Select song → Select right type                          │
│  4. Set price per unit, quantity to sell                     │
│  5. List for sale (creates Firestore listing)               │
│  6. Tokens locked in escrow                                  │
│                                                              │
│  BUYING (Fan):                                               │
│  1. Browse marketplace on web                                │
│  2. Connect Privy wallet                                     │
│  3. Select listing, enter quantity                           │
│  4. Pay with USDC                                            │
│  5. Tokens transferred atomically                            │
│  6. Platform takes 15% fee                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Firestore Collections

```javascript
// listings/{listingId}
{
  songId: string,
  sellerId: string,
  sellerWallet: string,
  rightType: string,           // 'streamingRoyalties', etc.

  unitsAvailable: number,
  pricePerUnit: number,        // In USDC

  tokenMintAddress: string,

  status: 'active' | 'sold' | 'cancelled',
  createdAt: Timestamp,

  // Denormalized for queries
  songTitle: string,
  songImageUrl: string,
  sellerUsername: string,
  genre: string,
}

// trades/{tradeId}
{
  listingId: string,
  songId: string,
  rightType: string,

  sellerId: string,
  buyerId: string,

  units: number,
  pricePerUnit: number,
  totalPrice: number,

  platformFee: number,         // 15%
  sellerProceeds: number,

  transactionSignature: string,
  status: 'completed' | 'failed',
  createdAt: Timestamp,
}
```

### Implementation Tasks

#### Week 10-12: Listing Flow

**Create Listing (Web)**
```typescript
// web-marketplace/src/app/sell/page.tsx
export default function SellPage() {
  const { wallet } = usePrivy();
  const [songs, setSongs] = useState([]);

  const createListing = async (songId, rightType, units, pricePerUnit) => {
    // Validate user owns enough tokens
    const balance = await getTokenBalance(songId, rightType, wallet.address);
    if (balance < units) {
      throw new Error('Insufficient token balance');
    }

    // Minimum retention check (10%)
    if (balance - units < 10) {
      throw new Error('Must retain at least 10 units');
    }

    // Create listing in Firestore
    await addDoc(collection(db, 'listings'), {
      songId,
      sellerId: user.uid,
      sellerWallet: wallet.address,
      rightType,
      unitsAvailable: units,
      pricePerUnit,
      tokenMintAddress: song.tokenData.rightTokens[rightType].mintAddress,
      status: 'active',
      createdAt: serverTimestamp(),
      // Denormalized
      songTitle: song.title,
      songImageUrl: song.imageUrl,
      sellerUsername: user.username,
      genre: song.style,
    });
  };

  return (
    // UI for selecting song, right type, setting price
  );
}
```

#### Week 13-15: Purchase Flow

**Purchase Handler (Cloud Function)**
```javascript
// This would be better as a Solana program for true atomicity
// Simplified version using Cloud Functions + transactions

exports.executePurchase = functions.https.onCall(async (data, context) => {
  const { listingId, units, buyerWallet } = data;

  // Start Firestore transaction
  await db.runTransaction(async (transaction) => {
    // 1. Get listing
    const listingRef = db.collection('listings').doc(listingId);
    const listing = (await transaction.get(listingRef)).data();

    if (listing.status !== 'active') {
      throw new Error('Listing no longer active');
    }
    if (listing.unitsAvailable < units) {
      throw new Error('Not enough units available');
    }

    // 2. Calculate amounts
    const totalPrice = units * listing.pricePerUnit;
    const platformFee = totalPrice * 0.15;
    const sellerProceeds = totalPrice - platformFee;

    // 3. Execute Solana transfers
    // - Transfer USDC from buyer to seller (minus fee)
    // - Transfer USDC fee to platform
    // - Transfer tokens from seller to buyer
    const txSignature = await executeTokenSwap(
      listing.sellerWallet,
      buyerWallet,
      listing.tokenMintAddress,
      units,
      totalPrice
    );

    // 4. Update listing
    const newUnitsAvailable = listing.unitsAvailable - units;
    transaction.update(listingRef, {
      unitsAvailable: newUnitsAvailable,
      status: newUnitsAvailable === 0 ? 'sold' : 'active',
    });

    // 5. Create trade record
    const tradeRef = db.collection('trades').doc();
    transaction.set(tradeRef, {
      listingId,
      songId: listing.songId,
      rightType: listing.rightType,
      sellerId: listing.sellerId,
      buyerId: context.auth.uid,
      units,
      pricePerUnit: listing.pricePerUnit,
      totalPrice,
      platformFee,
      sellerProceeds,
      transactionSignature: txSignature,
      status: 'completed',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  return { success: true };
});
```

#### Week 16: Mobile Integration

**"Buy on Web" Flow (Mobile App)**
```javascript
// In SongDetailScreen.js
const handleBuyRights = (songId) => {
  const webUrl = `https://marketplace.letsmake.music/song/${songId}`;
  Linking.openURL(webUrl);
};

// In MarketplaceScreen.js (read-only browse)
const MarketplaceScreen = () => {
  const [listings, setListings] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'listings'), where('status', '==', 'active')),
      (snapshot) => {
        setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    return unsubscribe;
  }, []);

  return (
    <FlatList
      data={listings}
      renderItem={({ item }) => (
        <ListingCard
          listing={item}
          onBuy={() => Linking.openURL(`https://marketplace.letsmake.music/listing/${item.id}`)}
        />
      )}
    />
  );
};
```

### Deliverables
- [ ] Create listing flow on web
- [ ] Purchase flow with USDC
- [ ] 15% platform fee collection
- [ ] Trade history
- [ ] Mobile shows listings (read-only)
- [ ] "Buy on Web" links work

---

## Phase 6: Portfolio & Royalties (Weeks 14-20)

### Goal
Show users their holdings and distribute royalties to token holders.

### Portfolio View (Mobile)

```
┌─────────────────────────────────────────┐
│  My Portfolio                           │
├─────────────────────────────────────────┤
│                                         │
│  Total Value: $127.50                   │
│  Pending Royalties: $3.25               │
│  [Claim on Web →]                       │
│                                         │
│  ────────────────────────────────       │
│                                         │
│  🎵 Summer Vibes                        │
│  Streaming Royalties: 15 units (15%)    │
│  Value: $15.00                          │
│  This month: +$1.25                     │
│                                         │
│  🎵 Midnight Dreams                     │
│  Sync Rights: 25 units (25%)            │
│  Value: $37.50                          │
│  This month: +$2.00                     │
│                                         │
│  🎵 Beat Drop                           │
│  Master Recording: 50 units (50%)       │
│  Value: $75.00                          │
│  This month: $0.00                      │
│                                         │
│  [View Transaction History →]           │
│                                         │
└─────────────────────────────────────────┘
```

### Royalty Distribution

```javascript
// Cloud Function: Scheduled monthly
exports.distributeRoyalties = functions.pubsub
  .schedule('0 0 1 * *') // First of each month
  .onRun(async (context) => {
    // 1. Get all monetized songs
    const songs = await db.collection('songs')
      .where('monetizationEnabled', '==', true)
      .get();

    for (const songDoc of songs.docs) {
      const song = songDoc.data();

      // 2. Calculate royalties from plays
      const monthlyPlays = await getMonthlyPlays(songDoc.id);
      const royaltyAmount = calculateRoyalty(monthlyPlays);

      if (royaltyAmount <= 0) continue;

      // 3. Get all token holders
      const holders = await getTokenHolders(song.tokenData.rightTokens.streamingRoyalties.mintAddress);

      // 4. Calculate pro-rata shares
      const distributions = holders.map(holder => ({
        holderId: holder.userId,
        walletAddress: holder.address,
        unitsHeld: holder.balance,
        percentage: holder.balance / 100,
        amount: royaltyAmount * (holder.balance / 100),
      }));

      // 5. Create distribution record
      await db.collection('royaltyDistributions').add({
        songId: songDoc.id,
        rightType: 'streamingRoyalties',
        period: getCurrentMonth(),
        totalRoyalties: royaltyAmount,
        distributions,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 6. Execute transfers (or mark as claimable)
      // For v1: Mark as claimable, users claim on web
    }
  });
```

### Deliverables
- [ ] Portfolio view in mobile app
- [ ] Holdings with values
- [ ] Pending royalties display
- [ ] Claim royalties on web
- [ ] Distribution history

---

## Phase 7: Polish & Mainnet (Weeks 18-24)

### Goal
Production-ready launch on Solana mainnet.

### Tasks

#### Week 18-19: Security

- [ ] Smart contract audit (if custom contracts)
- [ ] Cloud Functions security review
- [ ] Penetration testing
- [ ] Rate limiting on all endpoints

#### Week 20-21: Devnet → Mainnet

- [ ] Update RPC URLs
- [ ] Fund platform wallet with SOL
- [ ] Test all flows on mainnet
- [ ] Monitor transaction success rates

#### Week 22-23: App Store Submission

- [ ] Update app screenshots
- [ ] Update privacy policy
- [ ] Update App Store description
- [ ] Submit for review
- [ ] Address any rejections

#### Week 24: Launch

- [ ] Marketing push
- [ ] Creator onboarding
- [ ] Monitor metrics
- [ ] Support pipeline ready

---

## Budget Summary

### One-Time Costs

| Item | Cost | Notes |
|------|------|-------|
| Smart Contract Audit | $5,000-15,000 | If custom contracts |
| Legal Review | $5,000-15,000 | Token structure, ToS |
| Design Assets | $1,000-3,000 | Marketplace UI |
| **Total** | **$11,000-33,000** | |

### Monthly Operating Costs

| Service | Cost | Trigger |
|---------|------|---------|
| Privy | $0 → $299 → $499 | Based on wallet MAU |
| Helius RPC | $0 → $100 | Based on requests |
| Vercel | $0 → $20 | Pro plan |
| Firebase (+) | $50-200 | Additional functions |
| Persona KYC | $2-5/verification | Per creator |
| **Total** | **$50-1,000/mo** | Scales with success |

### Revenue Potential

| Source | Rate | Example |
|--------|------|---------|
| Credit Sales | 70% after Apple | 10K purchases @ $10 = $70K |
| Minting Fees | 200 credits | 1K mints = $1,400 |
| Trading Fees | 15% | $100K volume = $15K |

---

## Decisions Required Before Starting

1. **Credit Pricing:** Absorb Apple's 30% cut or reduce credits?
   - Recommendation: Absorb initially for adoption

2. **Web Domain:** marketplace.letsmake.music or letsmake.music/marketplace?
   - Need to verify domain ownership

3. **KYC Threshold:** Required for any monetization, or only >$600?
   - Recommendation: Required when SELLING (not just minting)

4. **Geographic Scope:** US-only launch or international?
   - Recommendation: US-only initially

5. **Devnet Duration:** How long before mainnet?
   - Recommendation: Minimum 4 weeks with 50+ users

---

## Immediate Next Steps

1. [ ] Create Privy developer account
2. [ ] Set up IAP products in App Store Connect
3. [ ] Verify/acquire web domain
4. [ ] Begin Phase 1: Credits implementation
5. [ ] Schedule legal consultation for token structure

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| App Store rejection | Medium | High | Follow OpenSea pattern exactly |
| Privy SDK incompatibility | Low | High | Test early in Phase 2 |
| Low trading volume | Medium | Medium | Seed with top creators |
| Regulatory action | Low | Critical | Legal review, geo-blocking |
| Smart contract bug | Low | Critical | Audit, gradual rollout |

---

*This plan is designed to be App Store compliant, technically feasible with the existing stack, and buildable incrementally while generating revenue from Phase 1.*
