# PharosPay — cast/forge recipes

All commands target Atlantic testnet. Export once:

```bash
export RPC=https://atlantic.dplabs-internal.com
export PRIVATE_KEY=0x...        # agent wallet
```

## x402 payment (headline)

```bash
PRIVATE_KEY=$PRIVATE_KEY node scripts/pay.mjs https://<service>/alpha/wallet/0xabc --max 0.05
```

## Balances

```bash
cast balance <addr> --rpc-url $RPC --ether                                   # PHRS
cast call <pUSD> "balanceOf(address)(uint256)" <addr> --rpc-url $RPC          # pUSD (1e6 = 1)
```

## Faucet + seed

```bash
cast send <pUSD> "claim()" --private-key $PRIVATE_KEY --rpc-url $RPC
cast send <pUSD> "transfer(address,uint256)" <to> 50000000 --private-key $PRIVATE_KEY --rpc-url $RPC
```

## Reputation

```bash
cast call <PharosPayLedger> \
  "stats(address)(uint256,uint256,uint256,uint256,uint256,uint256)" <addr> --rpc-url $RPC
# txCount, totalPaid, totalEarned, lastActiveDay, streak, repScore
```

## Transaction status

```bash
cast tx <txhash> --rpc-url $RPC
cast receipt <txhash> --rpc-url $RPC
```

## Read / estimate / send / deploy

```bash
cast call <addr> "totalSupply()(uint256)" --rpc-url $RPC
cast estimate <addr> "transfer(address,uint256)" <to> 1000000 --rpc-url $RPC
cast send <to> --value 100000000000000 --private-key $PRIVATE_KEY --rpc-url $RPC   # 0.0001 PHRS
forge create src/MyContract.sol:MyContract --private-key $PRIVATE_KEY --rpc-url $RPC --broadcast
```

## Notes

- pUSD has **6 decimals** (1 pUSD = `1000000`).
- The pay script signs EIP-3009 with chainId **688689** and the token as the EIP-712
  `verifyingContract`, matching the on-chain domain — do not change the chainId.
- Settlement is relayed through `PharosPayLedger`, which records reputation/streak.
