# Integration Components: Token Economy Tech Stack

## Overview

This document outlines the technical components, libraries, and infrastructure needed to integrate the token economy with the existing LetsMake.Music React Native + Firebase stack.

---

## Current Tech Stack (Existing)

| Layer | Technology | Version |
|-------|------------|---------|
| Mobile Framework | React Native | 0.81.1 |
| React | React | 19.1.0 |
| State Management | React Context | Built-in |
| Backend | Firebase (Firestore, Functions, Storage) | - |
| Functions Runtime | Node.js | 20 |
| Package Manager | Yarn | 4 |
| Platform | iOS (primary) | - |

---

## New Components Required

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        LetsMake.Music App                            │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                     React Native (0.81.1)                        │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │ │
│  │  │  Existing   │  │   NEW:      │  │       NEW:              │  │ │
│  │  │   Screens   │  │  Wallet     │  │   Token Screens         │  │ │
│  │  │             │  │  Adapter    │  │   - Credits             │  │ │
│  │  │  - Feed     │  │             │  │   - Marketplace         │  │ │
│  │  │  - Profile  │  │  @solana/   │  │   - Portfolio           │  │ │
│  │  │  - Create   │  │  wallet-    │  │   - Minting             │  │ │
│  │  │  - Library  │  │  adapter    │  │   - Governance          │  │ │
│  │  └─────────────┘  └──────┬──────┘  └─────────────────────────┘  │ │
│  └──────────────────────────┼──────────────────────────────────────┘ │
│                             │                                        │
│  ┌──────────────────────────┼──────────────────────────────────────┐ │
│  │                     Services Layer                               │ │
│  │  ┌─────────────┐  ┌──────┴──────┐  ┌─────────────────────────┐  │ │
│  │  │  Existing   │  │   NEW:      │  │       NEW:              │  │ │
│  │  │  Services   │  │  Solana     │  │   IPFS Service          │  │ │
│  │  │             │  │  Service    │  │                         │  │ │
│  │  │  - songs    │  │             │  │   - nft.storage SDK     │  │ │
│  │  │  - users    │  │  @solana/   │  │   - Pinata backup       │  │ │
│  │  │  - suno     │  │  web3.js    │  │                         │  │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────────┐
         │                          │                              │
         ▼                          ▼                              ▼
┌─────────────────┐      ┌─────────────────┐           ┌─────────────────┐
│    Firebase     │      │     Solana      │           │      IPFS       │
│                 │      │    Blockchain   │           │                 │
│  - Firestore    │      │                 │           │  - nft.storage  │
│  - Functions    │      │  - Mainnet/     │           │  - Pinata       │
│  - Storage      │      │    Devnet       │           │  - Filecoin     │
│  - Auth         │      │  - Metaplex     │           │    (backup)     │
│                 │      │  - Token Program│           │                 │
└─────────────────┘      └─────────────────┘           └─────────────────┘
         │                          │
         │                          │
         ▼                          ▼
┌─────────────────┐      ┌─────────────────┐
│     Stripe      │      │    External     │
│                 │      │    Wallets      │
│  Credit card    │      │                 │
│  processing     │      │  - Phantom      │
│                 │      │  - Backpack     │
└─────────────────┘      └─────────────────┘
```

---

## Component 1: Wallet Integration (Embedded Wallets - RECOMMENDED)

### The Problem with External Wallets

Requiring users to install Phantom or Backpack creates massive friction:
- 90%+ drop-off at "install wallet" step
- Confusing seed phrase management
- Poor UX for non-crypto-native users

### The Solution: Embedded Wallets

**Embedded wallets** are created automatically when users sign up - using their existing email, phone, or social login. No seed phrase, no app switching, no friction.

```
Traditional Flow (High Friction):
Sign Up → Install Phantom → Create Wallet → Write Down Seed Phrase → Connect to App
         ↓
      90% drop-off

Embedded Wallet Flow (Zero Friction):
Sign Up with Email/Google → Wallet Created Automatically → Ready to Use
         ↓
      Same as any Web2 app
```

### Recommended Provider: Privy

[Privy](https://docs.privy.io/basics/react/quickstart) is the leading embedded wallet SDK for Solana, used by **Jupiter** (the largest Solana DEX).

**Why Privy:**
- Native Solana support with embedded wallets
- Email, SMS, Google, Apple, Twitter login
- MPC (Multi-Party Computation) security - no single point of failure
- Users can optionally connect external wallets later
- React Native SDK available
- Used by Jupiter, Magic Eden, and other major Solana apps

### Embedded Wallet Comparison

| Provider | Solana Support | React Native | MPC Security | Pricing |
|----------|---------------|--------------|--------------|---------|
| **Privy** | Native | Yes | Yes | Free tier, then usage-based |
| Web3Auth | Native | Yes | Yes (TSS) | Free tier, then $299+/mo |
| Magic | Yes | Yes | Yes | $50+/mo |
| Dynamic | Yes | Limited | Yes | Usage-based |
| Para (Capsule) | Yes | Yes | Yes | Free tier available |

### Libraries Required (Privy Approach)

```json
// package.json additions
{
  "dependencies": {
    // Privy SDK (handles everything)
    "@privy-io/react-auth": "^1.80.0",
    "@privy-io/expo": "^0.26.0",

    // Core Solana (still needed for transactions)
    "@solana/web3.js": "^1.95.0",

    // Buffer polyfill (required for React Native)
    "buffer": "^6.0.3",
    "react-native-get-random-values": "^1.11.0"
  }
}
```

### Installation

```bash
cd ReactNativeTikTokApp
yarn add @privy-io/react-auth @privy-io/expo @solana/web3.js buffer react-native-get-random-values

cd ios && pod install && cd ..
```

### Privy Setup

```javascript
// App.js or AppContent.js
import { PrivyProvider } from '@privy-io/react-auth';

const privyConfig = {
  appId: 'YOUR_PRIVY_APP_ID',
  config: {
    // Login methods
    loginMethods: ['email', 'google', 'apple', 'sms'],

    // Appearance
    appearance: {
      theme: 'dark',
      accentColor: '#FF6B35', // Your brand color
      logo: 'https://letsmake.music/logo.png',
    },

    // Embedded wallet config
    embeddedWallets: {
      createOnLogin: 'users-without-wallets', // Auto-create for new users
      noPromptOnSignature: false, // Show confirmation for transactions
    },

    // Solana config
    solanaClusters: [
      { name: 'mainnet-beta', rpcUrl: 'https://api.mainnet-beta.solana.com' },
      { name: 'devnet', rpcUrl: 'https://api.devnet.solana.com' },
    ],
  },
};

export default function App() {
  return (
    <PrivyProvider {...privyConfig}>
      <YourApp />
    </PrivyProvider>
  );
}
```

### Wallet Context with Privy

```javascript
// src/contexts/WalletContext.js
import React, { createContext, useContext, useMemo } from 'react';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';

const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { wallets, createWallet } = useSolanaWallets();

  // Get the embedded wallet (created automatically on login)
  const embeddedWallet = useMemo(() => {
    return wallets.find(w => w.walletClientType === 'privy');
  }, [wallets]);

  // Get any connected external wallet (Phantom, etc.)
  const externalWallet = useMemo(() => {
    return wallets.find(w => w.walletClientType !== 'privy');
  }, [wallets]);

  // Use embedded wallet by default, external if connected
  const activeWallet = externalWallet || embeddedWallet;

  const value = {
    // Auth state
    ready,
    authenticated,
    user,

    // Wallet state
    wallet: activeWallet,
    embeddedWallet,
    externalWallet,
    publicKey: activeWallet?.address,

    // Has wallet? (should always be true after login)
    hasWallet: !!activeWallet,

    // Actions
    login,
    logout,
    createWallet, // For edge cases where wallet wasn't auto-created
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
```

### Signing Transactions with Embedded Wallet

```javascript
// src/services/solanaService.js
import { Connection, Transaction, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.mainnet-beta.solana.com');

/**
 * Sign and send a transaction using Privy embedded wallet
 */
export const signAndSendTransaction = async (wallet, transaction) => {
  // Get the Solana provider from Privy wallet
  const provider = await wallet.getProvider();

  // Sign the transaction
  const signedTx = await provider.signTransaction(transaction);

  // Send to network
  const signature = await connection.sendRawTransaction(signedTx.serialize());

  // Confirm
  await connection.confirmTransaction(signature, 'confirmed');

  return signature;
};

/**
 * Sign a message (for verification, etc.)
 */
export const signMessage = async (wallet, message) => {
  const provider = await wallet.getProvider();
  const encodedMessage = new TextEncoder().encode(message);
  const signature = await provider.signMessage(encodedMessage);
  return signature;
};
```

### User Flow: Zero-Friction Onboarding

```
1. User opens app for first time
            ↓
2. User creates account (email, Google, Apple)
            ↓
3. Privy automatically creates Solana wallet in background
            ↓
4. User immediately has wallet address stored in their profile
            ↓
5. User can receive tokens, NFTs, etc. without any extra steps
            ↓
6. (Optional) Power users can connect external wallet later
```

### Firestore User Schema Update

```javascript
users/{userId} = {
  // ... existing fields ...

  // Wallet info (populated automatically on signup)
  wallet: {
    // Embedded wallet (Privy-managed, always exists)
    embedded: {
      address: string,           // Solana public key
      provider: 'privy',
      createdAt: timestamp,
    },

    // External wallet (optional, if user connected one)
    external: {
      address: string | null,
      provider: 'phantom' | 'backpack' | null,
      connectedAt: timestamp | null,
    },

    // Which wallet to use for transactions
    primaryWallet: 'embedded' | 'external',
  },

  // KYC (still required for monetization)
  kyc: {
    status: 'none' | 'pending' | 'verified' | 'rejected',
    inquiryId: string | null,
    verifiedAt: timestamp | null,
  },
}
```

### MPC Security Explained

Privy uses **Multi-Party Computation (MPC)** which means:

```
Traditional Wallet:
Private Key = Single Point of Failure
If leaked → All funds stolen

MPC Wallet:
Private Key = Split into 3 encrypted shares
├── Share 1: On user's device
├── Share 2: On Privy's secure servers
└── Share 3: In secure cloud backup

To sign a transaction:
- 2 of 3 shares combine temporarily
- Full key never exists in one place
- Even if Privy is hacked, attacker only gets 1 share
- User can recover wallet with email + device
```

**Result:** Same security as hardware wallet, same UX as regular app.

---

## Component 1A: Option C - Firebase Auth + Privy Wallet (RECOMMENDED)

### The Hybrid Approach

**Decision:** Keep Firebase Auth as primary authentication, integrate Privy only for wallet functionality. This minimizes migration risk while adding blockchain capabilities.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OPTION C: HYBRID ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────┐    ┌─────────────────────────────┐    │
│  │      Firebase Auth          │    │         Privy               │    │
│  │      (PRIMARY)              │    │      (WALLET ONLY)          │    │
│  ├─────────────────────────────┤    ├─────────────────────────────┤    │
│  │ • Email/Google/Apple login  │    │ • Solana wallet creation    │    │
│  │ • Session management        │    │ • Transaction signing       │    │
│  │ • User profile (Firestore)  │    │ • MPC key management        │    │
│  │ • Existing auth flow        │    │ • External wallet linking   │    │
│  │ • All app authentication    │    │ • Only activated when needed│    │
│  └─────────────────────────────┘    └─────────────────────────────┘    │
│              │                                    │                     │
│              │         Linked via email           │                     │
│              └────────────────────────────────────┘                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Why Option C?

| Approach | Pros | Cons |
|----------|------|------|
| **A: Privy as Primary Auth** | Single auth system | Requires full migration |
| **B: Firebase + Privy Separate** | No migration | Two separate accounts |
| **C: Firebase + Privy Linked** | Minimal migration, linked accounts | Slightly more complex |

**Option C Benefits:**
- Keep ALL existing Firebase Auth code
- No changes to login/signup screens
- Wallet created lazily (only when needed)
- Same email links both systems automatically
- Lower risk, faster implementation

### Implementation Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. SIGNUP (Firebase - unchanged)                                       │
│     User signs up with email/Google/Apple                               │
│     → Firebase creates user                                             │
│     → User lands on home screen                                         │
│     → NO wallet yet (not needed)                                        │
│                                                                         │
│  2. NORMAL APP USAGE (Firebase only)                                    │
│     Create songs, browse feed, follow users                             │
│     → All existing functionality works                                  │
│     → No blockchain involved                                            │
│                                                                         │
│  3. FIRST WALLET ACTION (Privy activated)                               │
│     User taps "Monetize Song" or "Buy Rights"                           │
│     → App calls ensureWallet()                                          │
│     → Privy prompts: "Continue with ernesto@email.com?"                 │
│     → User confirms (one tap)                                           │
│     → Wallet created with MPC                                           │
│     → Wallet address saved to Firestore                                 │
│                                                                         │
│  4. FUTURE WALLET ACTIONS (seamless)                                    │
│     Already linked - no prompts needed                                  │
│     → Transactions just work                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Code Implementation

#### Step 1: Add Privy Provider (wraps app, but doesn't replace Firebase)

```javascript
// App.js or AppContent.js
import { PrivyProvider } from '@privy-io/react-auth';
import { AuthProvider } from './src/core/onboarding/auth'; // Existing Firebase auth

const privyConfig = {
  appId: process.env.PRIVY_APP_ID,
  config: {
    loginMethods: ['email', 'google', 'apple'],
    appearance: {
      theme: 'dark',
      accentColor: '#FF6B35',
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
    },
    solanaClusters: [
      { name: 'mainnet-beta', rpcUrl: 'https://api.mainnet-beta.solana.com' },
    ],
  },
};

export default function App() {
  return (
    <PrivyProvider {...privyConfig}>
      <AuthProvider>  {/* Existing Firebase Auth - unchanged */}
        <NavigationContainer>
          <MainStackNavigator />
        </NavigationContainer>
      </AuthProvider>
    </PrivyProvider>
  );
}
```

#### Step 2: Create Wallet Hook (lazy activation)

```javascript
// src/hooks/useWalletOnDemand.js
import { useCallback, useMemo } from 'react';
import { usePrivy, useSolanaWallets } from '@privy-io/react-auth';
import { useAuth } from '../core/onboarding/hooks/useAuth'; // Existing Firebase hook
import { firebase } from '../core/firebase/config';

export const useWalletOnDemand = () => {
  // Firebase auth (existing)
  const { user: firebaseUser } = useAuth();

  // Privy (wallet only)
  const { login, authenticated, user: privyUser, ready } = usePrivy();
  const { wallets } = useSolanaWallets();

  // Get embedded wallet if it exists
  const embeddedWallet = useMemo(() => {
    return wallets.find(w => w.walletClientType === 'privy');
  }, [wallets]);

  /**
   * Ensures user has a Privy wallet.
   * Call this before any blockchain operation.
   *
   * - If wallet exists → returns immediately
   * - If no wallet → prompts Privy auth (creates wallet)
   */
  const ensureWallet = useCallback(async () => {
    // Already have wallet
    if (embeddedWallet) {
      return embeddedWallet;
    }

    // Need to create wallet via Privy auth
    if (!authenticated && firebaseUser?.email) {
      // Pre-fill with Firebase email for seamless linking
      await login({
        prefill: {
          type: 'email',
          value: firebaseUser.email
        }
      });
    }

    // After auth, wallet should exist - get it
    const newWallet = wallets.find(w => w.walletClientType === 'privy');

    // Save wallet address to Firestore user document
    if (newWallet && firebaseUser?.uid) {
      await firebase.firestore()
        .collection('users')
        .doc(firebaseUser.uid)
        .update({
          'wallet.embedded': {
            address: newWallet.address,
            provider: 'privy',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          },
          'wallet.primaryWallet': 'embedded',
        });
    }

    return newWallet;
  }, [embeddedWallet, authenticated, firebaseUser, login, wallets]);

  return {
    // State
    wallet: embeddedWallet,
    walletAddress: embeddedWallet?.address,
    hasWallet: !!embeddedWallet,
    isReady: ready,

    // Actions
    ensureWallet,
  };
};
```

#### Step 3: Usage in Feature Screens

```javascript
// src/screens/MonetizeSongScreen.js
import { useWalletOnDemand } from '../hooks/useWalletOnDemand';

const MonetizeSongScreen = ({ route }) => {
  const { songId } = route.params;
  const { wallet, hasWallet, ensureWallet } = useWalletOnDemand();
  const [loading, setLoading] = useState(false);

  const handleMonetize = async () => {
    setLoading(true);
    try {
      // This will prompt Privy auth if first time (one-time only)
      const userWallet = await ensureWallet();

      if (!userWallet) {
        Alert.alert('Wallet Required', 'Please complete wallet setup to continue.');
        return;
      }

      // Now proceed with minting
      await mintSongAsNFT(userWallet, songId);

      Alert.alert('Success', 'Your song has been minted!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <Text>Monetize: {songId}</Text>
      <Button
        title={hasWallet ? "Mint Song" : "Setup Wallet & Mint"}
        onPress={handleMonetize}
        loading={loading}
      />
    </View>
  );
};
```

### Firestore Schema Update

```javascript
// Updated users/{userId} document
{
  // ... existing Firebase user fields ...

  email: "user@example.com",
  displayName: "User Name",

  // NEW: Wallet information (added after first wallet action)
  wallet: {
    // Embedded wallet (Privy-managed)
    embedded: {
      address: "7xKX...9fHm",     // Solana public key
      provider: "privy",
      createdAt: Timestamp,
    },

    // External wallet (optional - if user links Phantom later)
    external: {
      address: null,
      provider: null,
      connectedAt: null,
    },

    // Which wallet is primary for transactions
    primaryWallet: "embedded",
  },

  // Existing credits (off-chain, unchanged)
  credits: 500,
}
```

### Privy Pricing Reference

| Tier | Monthly Active Users | Price | Notes |
|------|---------------------|-------|-------|
| **Developer** | 0-499 | **FREE** | 100K free transactions |
| **Core** | 500-2,499 | $299/mo | Good for early growth |
| **Scale** | 2,500-9,999 | $499/mo | Mid-stage |
| **Enterprise** | 10,000+ | Custom | ~$0.001/txn |

**Budget Planning:**
- Launch (0-500 users): $0/month
- Growth (2K users): ~$299/month
- Scale (10K users): ~$500-1000/month

---

## Component 1B: External Wallet Support (Optional)

For power users who want to use their existing Phantom/Backpack wallet.

### Libraries Required (in addition to Privy)

```json
// package.json additions
{
  "dependencies": {
    // Wallet Adapter (React Native) - for external wallets
    "@solana-mobile/mobile-wallet-adapter-protocol": "^2.1.0",
    "@solana-mobile/mobile-wallet-adapter-protocol-web3js": "^2.1.0",

    // For iOS deep linking to wallets
    "@solana/wallet-adapter-react": "^0.15.35",
    "@solana/wallet-adapter-wallets": "^0.19.32",

    // Wallet-specific (optional, for direct integration)
    "@phantom/wallet-adapter-phantom": "^0.9.3",

    // Buffer polyfill (required for React Native)
    "buffer": "^6.0.3",
    "react-native-get-random-values": "^1.11.0"
  }
}
```

### Installation Commands

```bash
cd ReactNativeTikTokApp
yarn add @solana/web3.js @solana-mobile/mobile-wallet-adapter-protocol @solana-mobile/mobile-wallet-adapter-protocol-web3js buffer react-native-get-random-values

# iOS specific
cd ios && pod install && cd ..
```

### Polyfill Setup

```javascript
// index.js (add at very top, before App import)
import 'react-native-get-random-values';
import { Buffer } from 'buffer';
global.Buffer = Buffer;
```

### Service File Structure

```
src/services/
├── solanaService.js          # Core Solana connection & utilities
├── walletService.js          # Wallet connection management
├── tokenService.js           # Token minting & transfers
└── marketplaceService.js     # Listing & buying logic
```

### Sample Wallet Service

```javascript
// src/services/walletService.js
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';

const CLUSTER = __DEV__ ? 'devnet' : 'mainnet-beta';
const connection = new Connection(clusterApiUrl(CLUSTER));

export const connectWallet = async () => {
  try {
    const authResult = await transact(async (wallet) => {
      const authorizationResult = await wallet.authorize({
        cluster: CLUSTER,
        identity: {
          name: 'LetsMake.Music',
          uri: 'https://letsmake.music',
          icon: 'favicon.ico',
        },
      });
      return authorizationResult;
    });

    return {
      publicKey: new PublicKey(authResult.accounts[0].address),
      authToken: authResult.auth_token,
    };
  } catch (error) {
    console.error('Wallet connection failed:', error);
    throw error;
  }
};

export const getBalance = async (publicKey) => {
  const balance = await connection.getBalance(publicKey);
  return balance / 1e9; // Convert lamports to SOL
};

export const disconnectWallet = async (authToken) => {
  await transact(async (wallet) => {
    await wallet.deauthorize({ auth_token: authToken });
  });
};
```

### Context Provider

```javascript
// src/contexts/WalletContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import { connectWallet, disconnectWallet, getBalance } from '../services/walletService';

const WalletContext = createContext(null);

export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);

  const connect = useCallback(async () => {
    setLoading(true);
    try {
      const result = await connectWallet();
      setWallet(result);
      const bal = await getBalance(result.publicKey);
      setBalance(bal);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (wallet?.authToken) {
      await disconnectWallet(wallet.authToken);
    }
    setWallet(null);
    setBalance(0);
  }, [wallet]);

  return (
    <WalletContext.Provider value={{
      wallet,
      balance,
      loading,
      connected: !!wallet,
      connect,
      disconnect,
      publicKey: wallet?.publicKey?.toString(),
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
```

---

## Component 2: IPFS Storage

### Purpose
Store song metadata and audio files in decentralized storage for permanence and NFT compatibility.

### Libraries Required

```json
{
  "dependencies": {
    // NFT.storage SDK (free, backed by Filecoin)
    "nft.storage": "^7.1.1",

    // Alternative: Pinata
    "@pinata/sdk": "^2.1.0",

    // File handling
    "react-native-fs": "^2.20.0",
    "react-native-blob-util": "^0.19.0"
  }
}
```

### Installation

```bash
yarn add nft.storage react-native-fs react-native-blob-util

cd ios && pod install && cd ..
```

### IPFS Service

```javascript
// src/services/ipfsService.js
import { NFTStorage, File } from 'nft.storage';
import RNFS from 'react-native-fs';

// Store API key in environment/config
const NFT_STORAGE_KEY = process.env.NFT_STORAGE_KEY;
const client = new NFTStorage({ token: NFT_STORAGE_KEY });

/**
 * Upload song metadata and audio to IPFS
 * @param {Object} song - Song object from Firestore
 * @returns {Object} IPFS URIs for metadata and audio
 */
export const uploadSongToIPFS = async (song) => {
  // Download audio file to local filesystem first
  const localAudioPath = `${RNFS.CachesDirectoryPath}/${song.id}.mp3`;
  await RNFS.downloadFile({
    fromUrl: song.firebaseAudioUrl || song.audioUrl,
    toFile: localAudioPath,
  }).promise;

  // Read file as base64 then convert to blob
  const audioBase64 = await RNFS.readFile(localAudioPath, 'base64');
  const audioBlob = base64ToBlob(audioBase64, 'audio/mpeg');

  // Download cover image
  const localImagePath = `${RNFS.CachesDirectoryPath}/${song.id}.jpg`;
  await RNFS.downloadFile({
    fromUrl: song.imageUrl,
    toFile: localImagePath,
  }).promise;

  const imageBase64 = await RNFS.readFile(localImagePath, 'base64');
  const imageBlob = base64ToBlob(imageBase64, 'image/jpeg');

  // Create metadata object following NFT standards
  const metadata = {
    name: song.title,
    description: `AI-generated song by ${song.author?.stageName || 'Unknown Artist'}`,
    image: new File([imageBlob], 'cover.jpg', { type: 'image/jpeg' }),
    animation_url: new File([audioBlob], 'audio.mp3', { type: 'audio/mpeg' }),
    external_url: `https://letsmake.music/song/${song.id}`,
    attributes: [
      { trait_type: 'Genre', value: song.style || 'Unknown' },
      { trait_type: 'Duration', value: formatDuration(song.duration) },
      { trait_type: 'AI Model', value: song.model || 'Suno' },
      { trait_type: 'Created', value: song.createdAt?.toDate?.()?.toISOString() },
    ],
    properties: {
      category: 'audio',
      files: [
        { uri: 'audio.mp3', type: 'audio/mpeg' },
        { uri: 'cover.jpg', type: 'image/jpeg' },
      ],
      creators: [
        {
          address: song.walletAddress, // Creator's Solana wallet
          share: 100,
        },
      ],
    },
  };

  // Upload to IPFS via NFT.storage
  const result = await client.store(metadata);

  // Clean up local files
  await RNFS.unlink(localAudioPath);
  await RNFS.unlink(localImagePath);

  return {
    metadataUri: result.url,           // ipfs://...
    metadataGatewayUrl: result.embed().url, // https://nftstorage.link/...
    ipnft: result.ipnft,               // CID
  };
};

// Helper to convert base64 to blob
const base64ToBlob = (base64, mimeType) => {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
```

---

## Component 3: Token Minting (Solana + Metaplex)

### Purpose
Create NFTs and fungible tokens representing song ownership and rights.

### Libraries Required

```json
{
  "dependencies": {
    // Metaplex SDK for NFT creation
    "@metaplex-foundation/js": "^0.20.1",
    "@metaplex-foundation/mpl-token-metadata": "^3.2.1",

    // SPL Token for fungible tokens
    "@solana/spl-token": "^0.4.0"
  }
}
```

### Installation

```bash
yarn add @metaplex-foundation/js @metaplex-foundation/mpl-token-metadata @solana/spl-token
```

### Token Service

```javascript
// src/services/tokenService.js
import { Metaplex, walletAdapterIdentity } from '@metaplex-foundation/js';
import { Connection, clusterApiUrl, PublicKey, Keypair } from '@solana/web3.js';
import { createMint, mintTo, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';

const CLUSTER = __DEV__ ? 'devnet' : 'mainnet-beta';
const connection = new Connection(clusterApiUrl(CLUSTER));

/**
 * Mint a song as an NFT with associated right tokens
 * @param {Object} song - Song with IPFS metadata
 * @param {Object} wallet - Connected wallet
 * @returns {Object} Minting results with addresses
 */
export const mintSongNFT = async (song, wallet) => {
  return await transact(async (mobileWallet) => {
    // Get wallet adapter for signing
    const walletAdapter = {
      publicKey: wallet.publicKey,
      signTransaction: async (tx) => {
        const signed = await mobileWallet.signTransactions({
          transactions: [tx],
        });
        return signed[0];
      },
      signAllTransactions: async (txs) => {
        return await mobileWallet.signTransactions({ transactions: txs });
      },
    };

    // Initialize Metaplex with wallet
    const metaplex = Metaplex.make(connection)
      .use(walletAdapterIdentity(walletAdapter));

    // Create the master NFT
    const { nft: masterNft } = await metaplex.nfts().create({
      uri: song.ipfsMetadataUri,
      name: song.title,
      symbol: 'LMM',
      sellerFeeBasisPoints: 500, // 5% royalty on secondary sales
      creators: [
        {
          address: wallet.publicKey,
          share: 95,
        },
        {
          address: new PublicKey(PLATFORM_TREASURY_ADDRESS),
          share: 5,
        },
      ],
      isMutable: true,
    });

    // Create fungible tokens for each right type
    const rightTokens = await createRightTokens(
      connection,
      mobileWallet,
      wallet.publicKey,
      song,
      masterNft.address
    );

    return {
      masterNftAddress: masterNft.address.toString(),
      masterNftMint: masterNft.mint.address.toString(),
      rightTokens,
      transactionSignature: masterNft.response.signature,
    };
  });
};

/**
 * Create fungible tokens for song rights
 */
const createRightTokens = async (connection, mobileWallet, owner, song, masterNftAddress) => {
  const rightTypes = [
    'streamingRoyalties',
    'masterRecording',
    'syncRights',
    'remixRights',
    'sampleRights',
  ];

  const tokens = {};

  for (const rightType of rightTypes) {
    // Create a new token mint for this right type
    const mint = await createMint(
      connection,
      {
        publicKey: owner,
        signTransaction: async (tx) => {
          const signed = await mobileWallet.signTransactions({
            transactions: [tx],
          });
          return signed[0];
        },
      },
      owner,           // Mint authority
      owner,           // Freeze authority
      0                // 0 decimals = non-divisible units
    );

    // Get/create associated token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      {
        publicKey: owner,
        signTransaction: async (tx) => {
          const signed = await mobileWallet.signTransactions({
            transactions: [tx],
          });
          return signed[0];
        },
      },
      mint,
      owner
    );

    // Mint 100 tokens (representing 100% ownership)
    await mintTo(
      connection,
      {
        publicKey: owner,
        signTransaction: async (tx) => {
          const signed = await mobileWallet.signTransactions({
            transactions: [tx],
          });
          return signed[0];
        },
      },
      mint,
      tokenAccount.address,
      owner,
      100
    );

    tokens[rightType] = {
      mintAddress: mint.toString(),
      tokenAccount: tokenAccount.address.toString(),
      totalSupply: 100,
      creatorBalance: 100,
    };
  }

  return tokens;
};

const PLATFORM_TREASURY_ADDRESS = 'YOUR_PLATFORM_TREASURY_SOLANA_ADDRESS';
```

---

## Component 4: Credits System (Off-Chain)

### Purpose
Manage platform credits for song generation and services (simpler than on-chain tokens).

### Firestore Schema

```javascript
// users/{userId} - add fields
{
  // ... existing user fields ...

  credits: {
    balance: number,        // Current credit balance
    lifetime: {
      purchased: number,    // Total ever purchased
      earned: number,       // Total ever earned (free)
      spent: number,        // Total ever spent
    },
    lastUpdated: timestamp,
  }
}

// creditTransactions/{transactionId}
{
  userId: string,
  type: 'purchase' | 'spend' | 'earn' | 'refund',
  amount: number,           // Positive = credits in, negative = credits out
  balanceAfter: number,

  metadata: {
    // For purchases
    stripePaymentIntentId?: string,
    packageId?: string,
    priceUsd?: number,
    bonusCredits?: number,

    // For spending
    action?: string,        // 'song_generation', 'video_generation', etc.
    referenceId?: string,   // songId, etc.

    // For earning
    source?: string,        // 'daily_login', 'referral', etc.
  },

  createdAt: timestamp,
}
```

### Credits Service

```javascript
// src/services/creditsService.js
import firestore from '@react-native-firebase/firestore';

const usersRef = firestore().collection('users');
const transactionsRef = firestore().collection('creditTransactions');

/**
 * Get user's current credit balance
 */
export const getCredits = async (userId) => {
  const userDoc = await usersRef.doc(userId).get();
  return userDoc.data()?.credits?.balance || 0;
};

/**
 * Spend credits (atomic operation)
 * @param {string} userId
 * @param {number} amount - Positive number to spend
 * @param {string} action - What the credits are for
 * @param {string} referenceId - Related document ID
 * @returns {boolean} Success
 */
export const spendCredits = async (userId, amount, action, referenceId) => {
  const userRef = usersRef.doc(userId);

  try {
    await firestore().runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const currentBalance = userDoc.data()?.credits?.balance || 0;

      if (currentBalance < amount) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      const newBalance = currentBalance - amount;

      // Update user balance
      transaction.update(userRef, {
        'credits.balance': newBalance,
        'credits.lifetime.spent': firestore.FieldValue.increment(amount),
        'credits.lastUpdated': firestore.FieldValue.serverTimestamp(),
      });

      // Create transaction record
      const txRef = transactionsRef.doc();
      transaction.set(txRef, {
        userId,
        type: 'spend',
        amount: -amount,
        balanceAfter: newBalance,
        metadata: {
          action,
          referenceId,
        },
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    });

    return true;
  } catch (error) {
    if (error.message === 'INSUFFICIENT_CREDITS') {
      return false;
    }
    throw error;
  }
};

/**
 * Add purchased credits
 */
export const addPurchasedCredits = async (userId, amount, purchaseMetadata) => {
  const userRef = usersRef.doc(userId);

  await firestore().runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const currentBalance = userDoc.data()?.credits?.balance || 0;
    const newBalance = currentBalance + amount;

    transaction.update(userRef, {
      'credits.balance': newBalance,
      'credits.lifetime.purchased': firestore.FieldValue.increment(amount),
      'credits.lastUpdated': firestore.FieldValue.serverTimestamp(),
    });

    const txRef = transactionsRef.doc();
    transaction.set(txRef, {
      userId,
      type: 'purchase',
      amount: amount,
      balanceAfter: newBalance,
      metadata: purchaseMetadata,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  });
};

/**
 * Credit pricing table
 */
export const CREDIT_ACTIONS = {
  SONG_GENERATION_BASIC: { cost: 50, label: 'Generate Song (Standard)' },
  SONG_GENERATION_HD: { cost: 100, label: 'Generate Song (HD)' },
  VIDEO_GENERATION: { cost: 150, label: 'Generate Music Video' },
  SONG_EXTEND: { cost: 75, label: 'Extend Song' },
  STEM_EXTRACTION: { cost: 100, label: 'Extract Stems' },
  VOICE_CLONE: { cost: 500, label: 'Voice Clone Training' },
  MINT_NFT: { cost: 200, label: 'Mint Song as NFT' },
};
```

---

## Component 5: Payment Processing (Stripe)

### Purpose
Process credit purchases via credit card/Apple Pay/Google Pay.

### Libraries Required

```json
{
  "dependencies": {
    "@stripe/stripe-react-native": "^0.38.0"
  }
}
```

### Installation

```bash
yarn add @stripe/stripe-react-native

cd ios && pod install && cd ..
```

### iOS Setup

Add to `ios/Instamobile/AppDelegate.mm`:
```objc
#import <StripeCore/StripeCore-Swift.h>

// In didFinishLaunchingWithOptions:
[StripeAPI defaultPublishableKey] = @"pk_live_YOUR_KEY";
```

### Cloud Function for Payment Intent

```javascript
// firebase/functions/payments/createPaymentIntent.js
const functions = require('firebase-functions');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const CREDIT_PACKAGES = {
  starter: { credits: 500, priceUsd: 499, bonus: 0 },
  creator: { credits: 1000, priceUsd: 999, bonus: 100 },
  pro: { credits: 2500, priceUsd: 2499, bonus: 500 },
  studio: { credits: 10000, priceUsd: 9999, bonus: 3000 },
};

exports.createPaymentIntent = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { packageId } = data;
  const package = CREDIT_PACKAGES[packageId];

  if (!package) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid package');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: package.priceUsd,
    currency: 'usd',
    metadata: {
      userId: context.auth.uid,
      packageId,
      credits: package.credits + package.bonus,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    credits: package.credits + package.bonus,
    price: package.priceUsd / 100,
  };
});
```

---

## Component 6: KYC Integration

### Purpose
Verify user identity before allowing monetization (regulatory compliance).

### Recommended Provider
**Persona** or **Veriff** - both have React Native SDKs.

### Libraries

```json
{
  "dependencies": {
    "persona": "^2.9.0"
    // OR
    "@veriff/react-native-sdk": "^3.7.0"
  }
}
```

### Integration Flow

```javascript
// src/services/kycService.js
import { Inquiry } from 'persona';

const PERSONA_TEMPLATE_ID = 'tmpl_YOUR_TEMPLATE_ID';

export const startKYCVerification = async (userId, userEmail) => {
  const inquiry = await Inquiry.fromTemplate(PERSONA_TEMPLATE_ID)
    .referenceId(userId)
    .fields({
      emailAddress: userEmail,
    })
    .onComplete((inquiryId, status, fields) => {
      // Update Firestore with verification status
      updateKYCStatus(userId, inquiryId, status);
    })
    .onCancel(() => {
      console.log('KYC cancelled');
    })
    .onError((error) => {
      console.error('KYC error:', error);
    })
    .build();

  inquiry.start();
};

const updateKYCStatus = async (userId, inquiryId, status) => {
  await firestore().collection('users').doc(userId).update({
    kyc: {
      inquiryId,
      status,
      verifiedAt: status === 'completed' ? firestore.FieldValue.serverTimestamp() : null,
    },
  });
};
```

---

## Component 7: Marketplace Backend

### Firestore Collections

```javascript
// listings/{listingId}
{
  songId: string,
  sellerId: string,
  rightType: string,

  unitsAvailable: number,
  pricePerUnit: number,     // USDC

  tokenMintAddress: string,
  sellerTokenAccount: string,

  status: 'active' | 'sold' | 'cancelled' | 'expired',
  createdAt: timestamp,
  expiresAt: timestamp,     // Optional listing expiration

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

  platformFee: number,      // 15% of totalPrice
  sellerProceeds: number,   // totalPrice - platformFee

  transactionSignature: string,  // Solana tx
  status: 'completed' | 'failed',
  createdAt: timestamp,
}

// royaltyDistributions/{distributionId}
{
  songId: string,
  rightType: string,
  period: string,           // '2024-12' (month)

  totalRoyalties: number,   // USDC
  distributions: [
    {
      holderId: string,
      walletAddress: string,
      unitsHeld: number,
      percentage: number,
      amount: number,
    }
  ],

  transactionSignature: string,
  status: 'pending' | 'distributed' | 'claimed',
  createdAt: timestamp,
}
```

### Marketplace Service

```javascript
// src/services/marketplaceService.js
import firestore from '@react-native-firebase/firestore';

const listingsRef = firestore().collection('listings');
const tradesRef = firestore().collection('trades');

/**
 * Create a new listing
 */
export const createListing = async (sellerId, song, rightType, units, pricePerUnit) => {
  // Validate seller owns enough tokens
  const tokenBalance = await getTokenBalance(
    song.tokenData.rightTokens[rightType].mintAddress,
    sellerId
  );

  if (tokenBalance < units) {
    throw new Error('Insufficient token balance');
  }

  // Validate minimum retention (10%)
  const totalSupply = song.tokenData.rightTokens[rightType].totalSupply;
  const remainingAfterSale = tokenBalance - units;
  const minimumRetention = Math.ceil(totalSupply * 0.1);

  if (remainingAfterSale < minimumRetention) {
    throw new Error(`Must retain at least ${minimumRetention} units (10%)`);
  }

  const listing = {
    songId: song.id,
    sellerId,
    rightType,
    unitsAvailable: units,
    pricePerUnit,
    tokenMintAddress: song.tokenData.rightTokens[rightType].mintAddress,
    status: 'active',
    createdAt: firestore.FieldValue.serverTimestamp(),
    // Denormalized
    songTitle: song.title,
    songImageUrl: song.imageUrl,
    sellerUsername: song.author?.stageName,
    genre: song.style,
  };

  const docRef = await listingsRef.add(listing);
  return docRef.id;
};

/**
 * Get active listings with filters
 */
export const getListings = async (filters = {}) => {
  let query = listingsRef.where('status', '==', 'active');

  if (filters.rightType) {
    query = query.where('rightType', '==', filters.rightType);
  }
  if (filters.genre) {
    query = query.where('genre', '==', filters.genre);
  }
  if (filters.maxPrice) {
    query = query.where('pricePerUnit', '<=', filters.maxPrice);
  }

  query = query.orderBy('createdAt', 'desc').limit(50);

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * Execute a purchase (calls cloud function)
 */
export const purchaseListing = async (listingId, units, buyerWallet) => {
  const purchaseFunction = firebase.functions().httpsCallable('executePurchase');

  const result = await purchaseFunction({
    listingId,
    units,
    buyerWalletAddress: buyerWallet.publicKey.toString(),
  });

  return result.data;
};
```

---

## Infrastructure Requirements

### Cloud Functions (New)

| Function | Purpose | Trigger |
|----------|---------|---------|
| `createPaymentIntent` | Create Stripe payment intent | HTTP callable |
| `handlePaymentSuccess` | Add credits after payment | Stripe webhook |
| `executePurchase` | Atomic marketplace purchase | HTTP callable |
| `distributeRoyalties` | Monthly royalty distribution | Scheduled (cron) |
| `verifyKYC` | Handle KYC webhook | Persona/Veriff webhook |
| `updateTokenPrices` | Update token valuations | Scheduled (daily) |

### Environment Variables (New)

```bash
# .env additions for Firebase Functions

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Solana
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
PLATFORM_TREASURY_KEYPAIR=...  # Base64 encoded

# IPFS
NFT_STORAGE_API_KEY=...

# KYC
PERSONA_API_KEY=...
PERSONA_TEMPLATE_ID=tmpl_...
```

### Solana Infrastructure

| Resource | Purpose | Provider Options |
|----------|---------|------------------|
| RPC Node | Blockchain queries/submissions | Helius, Alchemy, QuickNode |
| Indexer | Track token balances, transactions | Helius, Shyft |
| Program (Smart Contract) | Marketplace escrow logic | Custom Anchor program |

### Estimated Costs

| Service | Monthly Cost (Estimate) |
|---------|------------------------|
| Solana RPC (Helius) | $0-100 (based on requests) |
| IPFS (nft.storage) | Free (sponsored) |
| KYC (Persona) | $2-5 per verification |
| Stripe | 2.9% + $0.30 per transaction |
| Additional Firebase Functions | $50-200 |

---

## Implementation Phases

### Phase 1: Credits System (4-6 weeks)
1. Add credits fields to user schema
2. Implement credit purchase flow with Stripe
3. Add credit spending to song generation
4. Build credit balance UI components
5. Deploy payment cloud functions

### Phase 2: Wallet Integration (4-6 weeks)
1. Integrate Solana Mobile SDK
2. Build wallet connection flow
3. Implement wallet context provider
4. Add wallet UI to profile
5. Test with Phantom/Backpack on devnet

### Phase 3: Song Tokenization (6-8 weeks)
1. Implement IPFS upload service
2. Build Metaplex minting integration
3. Create monetization toggle UI
4. Implement KYC flow
5. Test full minting pipeline on devnet
6. Launch on mainnet

### Phase 4: Marketplace (6-8 weeks)
1. Design and deploy marketplace Firestore schema
2. Build listing creation flow
3. Implement purchase flow with escrow
4. Build marketplace browse UI
5. Implement portfolio view
6. Launch marketplace

### Phase 5: Royalties & Governance (8-12 weeks)
1. Design royalty calculation system
2. Build distribution cloud function
3. Implement governance token ($LMM) if proceeding
4. Build staking UI
5. Launch governance features

---

## Security Considerations

1. **Never store private keys** - All signing happens in user wallets
2. **Validate on backend** - Don't trust client for balance checks
3. **Use transactions** - Firestore transactions for atomic operations
4. **Audit smart contracts** - Before mainnet deployment
5. **Rate limit** - All blockchain-related endpoints
6. **Monitor** - Set up alerts for unusual activity

---

## Testing Strategy

| Component | Testing Approach |
|-----------|------------------|
| Credits | Jest unit tests, Firebase emulator |
| Wallet | Solana devnet, test wallets |
| Minting | Devnet with test NFTs |
| Marketplace | Full integration tests on devnet |
| Payments | Stripe test mode |

---

## References

- [Solana Mobile React Native Docs](https://docs.solanamobile.com/react-native/overview)
- [Mobile Wallet Adapter Tutorial](https://docs.solanamobile.com/react-native/hello_world_tutorial)
- [Metaplex JS SDK](https://github.com/metaplex-foundation/js)
- [NFT.storage Documentation](https://nft.storage/docs/)
- [Stripe React Native](https://stripe.com/docs/payments/accept-a-payment?platform=react-native)
- [IPFS Best Practices for NFTs](https://docs.ipfs.tech/how-to/best-practices-for-nft-data/)

---

*Document Version: 1.0*
*Last Updated: December 2024*
