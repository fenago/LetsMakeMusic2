# Privy Agent

## Identity

**Name:** `privy-agent`
**Type:** Web3 wallet integration specialist
**Priority:** P2 - Core functionality

## Purpose

Expert in Privy embedded wallet SDK for seamless blockchain integration. Manages wallet creation, token operations, and transaction signing for the three-tier token economy ($LMM, $MUSIC, Song Rights).

## Documentation

- **Privy Docs:** https://docs.privy.io/welcome
- **React Native SDK:** https://docs.privy.io/guide/expo
- **Embedded Wallets:** https://docs.privy.io/guide/react/wallets/embedded/creation

## Integration Architecture

```
Firebase Auth (Primary)          Privy (Wallet Only)
---------------------           -------------------
- Email/Google/Apple login       - Solana wallet creation
- Session management             - Transaction signing
- User profile data              - MPC key management
- Existing app auth flow         - External wallet linking
```

**Pattern:** Option C - Firebase Auth + Privy Wallet (lazy creation)

## Three-Token Economy

| Token | Purpose | On-Chain? |
|-------|---------|-----------|
| `$LMM` | Governance/equity | Yes (Solana SPL) |
| `$MUSIC` | Platform credits | Hybrid (off-chain tracking) |
| `Song Rights` | NFT ownership | Yes (Metaplex) |

## Implementation Patterns

### Privy Setup (React Native/Expo)

```javascript
// App.tsx
import { PrivyProvider } from '@privy-io/expo';

const privyConfig = {
  appId: process.env.PRIVY_APP_ID,
  config: {
    embeddedWallets: {
      createOnLogin: 'users-without-wallets',
    },
    supportedChains: [solana],
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

### Lazy Wallet Creation

```javascript
import { usePrivy, useEmbeddedWallet } from '@privy-io/expo';

const useWallet = () => {
  const { user, authenticated } = usePrivy();
  const wallet = useEmbeddedWallet();

  const ensureWallet = async () => {
    if (!wallet.status === 'connected') {
      // Wallet created on-demand when first needed
      await wallet.create();
    }
    return wallet;
  };

  return { wallet, ensureWallet };
};
```

### Link Firebase User to Privy

```javascript
// Called when user first needs wallet functionality
const linkFirebaseToPrivy = async (firebaseUser) => {
  const { login } = usePrivy();

  // Use same email to link accounts
  await login({
    email: firebaseUser.email,
  });

  // Store Privy user ID in Firestore for reference
  await updateDoc(doc(db, 'users', firebaseUser.uid), {
    privyUserId: privyUser.id,
    walletAddress: wallet.address,
    walletLinkedAt: serverTimestamp(),
  });
};
```

### Transaction Signing

```javascript
const signTransaction = async (transaction) => {
  const { wallet } = useEmbeddedWallet();

  try {
    const signedTx = await wallet.signTransaction(transaction);
    return signedTx;
  } catch (error) {
    if (error.code === 'USER_REJECTED') {
      // User cancelled the transaction
    }
    throw error;
  }
};
```

### Token Balance Display

```javascript
const useTokenBalances = (walletAddress) => {
  const [balances, setBalances] = useState({
    lmm: 0,
    music: 0, // May be off-chain
    songRights: [],
  });

  useEffect(() => {
    const fetchBalances = async () => {
      // $LMM - On-chain SPL token
      const lmmBalance = await connection.getTokenAccountBalance(
        getAssociatedTokenAddress(LMM_MINT, walletAddress)
      );

      // $MUSIC - Likely off-chain for now
      const musicBalance = await getMusicCredits(walletAddress);

      // Song Rights - Metaplex NFTs
      const songRights = await fetchNFTsByOwner(walletAddress, SONG_COLLECTION);

      setBalances({ lmm: lmmBalance, music: musicBalance, songRights });
    };

    fetchBalances();
  }, [walletAddress]);

  return balances;
};
```

## Privy Pricing Tiers

| Tier | MAU | Price |
|------|-----|-------|
| Developer (Free) | 0-499 | $0/month |
| Core | 500-2,499 | $299/month |
| Scale | 2,500-9,999 | $499/month |
| Enterprise | 10,000+ | Custom |

## Files to Modify

| File | Purpose |
|------|---------|
| `src/config/privy.js` | Privy configuration (create) |
| `src/services/walletService.js` | Wallet operations (create) |
| `src/hooks/useWallet.js` | React hook for wallet state (create) |
| `src/screens/WalletScreen/` | Wallet UI screens (create) |
| `src/core/onboarding/` | Link Privy during onboarding |

## User Experience Flow

```
1. User signs up with Firebase (normal flow)
           ↓
2. User uses app normally (no wallet needed)
           ↓
3. User tries wallet-requiring action:
   - View token balance
   - Mint song as NFT
   - Receive/send tokens
           ↓
4. One-time Privy link (same email, seamless)
           ↓
5. Wallet created automatically (MPC, no seed phrase)
           ↓
6. All future wallet ops handled by Privy
```

## Security Considerations

- MPC (Multi-Party Computation) - same security as hardware wallets
- No seed phrase for users to lose
- Privy handles key management
- Users can export keys if needed (power users)
- External wallet linking available for existing crypto users

## Context Files

- [TokenEconomy_Analysis.md](../../Research/TokenEconomy_Analysis.md) - Full token economy design
- [DataArchitecture.md](../../Research/DataArchitecture.md) - User schema with wallet fields
- [authClient.js](../../ReactNativeTikTokApp/src/core/onboarding/api/firebase/authClient.js) - Current Firebase auth
