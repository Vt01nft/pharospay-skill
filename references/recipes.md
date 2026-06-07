# PharosPay recipes (cast and forge)

Everything targets Atlantic testnet. Set these once:

```bash
export RPC=https://atlantic.dplabs-internal.com
export PRIVATE_KEY=0x...        # agent wallet
```

## Reputation

```bash
cast call <PharosPayLedger> \
  "stats(address)(uint256,uint256,uint256,uint256,uint256,uint256)" <addr> --rpc-url $RPC
# txCount, totalPaid, totalEarned, lastActiveDay, streak, repScore
```

## Pay for an x402 resource

```bash
PRIVATE_KEY=$PRIVATE_KEY node scripts/pay.mjs https://<service>/alpha/wallet/0xabc --max 0.05
```

## Referral

```bash
cast send <pUSD> "claimWithReferrer(address)" <referrerAddr> --private-key $PRIVATE_KEY --rpc-url $RPC
```

## Balances

```bash
cast balance <addr> --rpc-url $RPC --ether                                   # PHRS
cast call <pUSD> "balanceOf(address)(uint256)" <addr> --rpc-url $RPC          # pUSD (1e6 = 1)
```

## Faucet and seeding

```bash
cast send <pUSD> "claim()" --private-key $PRIVATE_KEY --rpc-url $RPC
cast send <pUSD> "transfer(address,uint256)" <to> 50000000 --private-key $PRIVATE_KEY --rpc-url $RPC
```

## Transaction status

```bash
cast tx <txhash> --rpc-url $RPC
cast receipt <txhash> --rpc-url $RPC
```

## Read, estimate, send, deploy

```bash
cast call <addr> "totalSupply()(uint256)" --rpc-url $RPC
cast estimate <addr> "transfer(address,uint256)" <to> 1000000 --rpc-url $RPC
cast send <to> --value 100000000000000 --private-key $PRIVATE_KEY --rpc-url $RPC   # 0.0001 PHRS
forge create src/MyContract.sol:MyContract --private-key $PRIVATE_KEY --rpc-url $RPC --broadcast
```

## Things to watch

- pUSD has 6 decimals, so 1 pUSD is `1000000`.
- The pay script signs with chain id 688689 and uses the token as the EIP-712
  `verifyingContract`, which is what the token expects. Don't change the chain id or signatures
  will fail to verify.
- Settlement goes through `PharosPayLedger`, which is what records reputation and the streak.

## Common errors

| What you see | Why | Fix |
|--------------|-----|-----|
| `insufficient funds` | the wallet has no PHRS for gas | claim from the Pharos faucet |
| `auth used` | the EIP-3009 nonce was already spent | the pay script uses a fresh nonce each call |
| `invalid signature` | wrong chain id or domain | this skill pins chain id 688689 to match the token |
| 402 keeps coming back | the provider rejected the payment | read the `X-PAYMENT-RESPONSE` header for the reason |
