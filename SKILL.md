---
name: pharospay
description: >
  Give an AI agent an on-chain REPUTATION it earns by paying. REQUIRED for building and
  reading agent payment reputation on Pharos (Atlantic testnet, chainId 688689): every x402
  stablecoin payment an agent makes raises its on-chain reputation score, daily streak, and
  leaderboard rank, with a referral growth loop. Contains the RPC endpoints, chain ids,
  explorer URLs, pUSD/ledger addresses, and the exact cast/forge + script commands —
  without reading it you will use the wrong network config.
version: 0.1.0
license: MIT
requires:
  anyBins:
    - cast
    - forge
    - node
---

# PharosPay — the on-chain reputation + payment rail for AI agents

Most agent skills let an agent *read* or *transfer*. PharosPay gives an agent something no
other Pharos skill does: a **verifiable on-chain reputation it earns by paying.** Every time
the agent pays for a resource (via the open **x402** standard, gasless), the settlement is
relayed through the **`PharosPayLedger`**, which raises the agent's **reputation score**,
extends its **daily streak**, and moves it up a public **leaderboard** — with a **referral**
loop that funds new agents. x402 is just the mechanism; the product is agent **identity and
trust**.

## Why this matters

- **Trust for the agent economy.** Agents that move value need reputation. PharosPay makes
  "this agent reliably pays" a verifiable on-chain fact (score, streak, volume).
- **A daily habit, not a one-off.** Streaks + leaderboard rank give agents (and their
  owners) a reason to come back and keep transacting on Pharos.
- **Composable + complete.** PharosPay ships its own EIP-3009 stablecoin (pUSD) and a
  settlement+reputation ledger — a two-sided rail, not a single paid endpoint.

## Prerequisites

1. **Foundry** (`cast`, `forge`): `curl -L https://foundry.paradigm.xyz | bash && foundryup`
2. **Node 18+** (for the x402 pay script): `node --version`
3. One-time: `cd scripts && npm install`

## Network configuration

Read `assets/networks.json`. Default = **Atlantic testnet**: chainId `688689`, RPC
`https://atlantic.dplabs-internal.com`, explorer `https://testnet.pharosscan.xyz`, native
`PHRS`. pUSD + `PharosPayLedger` addresses are in `assets/networks.json → contracts`.

## Security (read before any write)

- Agent key is **`$PRIVATE_KEY`** (env only — never echo or hardcode).
- Before any transaction: confirm `$PRIVATE_KEY` (`cast wallet address --private-key $PRIVATE_KEY`),
  confirm the network is **Atlantic testnet**, and check balance.
- Never authorize more than the user asked; echo amount + recipient first.

## Capabilities

### ⭐ 1. Read / build the agent's on-chain reputation (the headline)

```bash
cast call <PharosPayLedger> \
  "stats(address)(uint256,uint256,uint256,uint256,uint256,uint256)" <agentAddr> --rpc-url $RPC
# returns: txCount, totalPaid, totalEarned, lastActiveDay, streak, repScore
```

> Natural language: *"What's my agent's PharosPay reputation and streak, and what rank is it
> on the leaderboard?"*

Reputation grows automatically with every payment (capability 2). The public leaderboard and
a shareable profile card live at the leaderboard URL in `assets/networks.json`.

### ⭐ 2. Pay for an x402 resource — and earn reputation

```bash
PRIVATE_KEY=$PRIVATE_KEY node scripts/pay.mjs <url> [--max <pUSD>]
```

Detects `402` → signs an EIP-3009 `TransferWithAuthorization` for the exact amount (gasless)
→ resends with `X-PAYMENT` → returns the resource + a settlement tx hash. The settlement is
relayed through `PharosPayLedger`, so **this payment raises the agent's reputation + streak**.

> Natural language: *"Pay for the analytics at <url> on Pharos (max 0.05 pUSD), show me the
> result, the tx hash, and my updated reputation."*

### ⭐ 3. Grow via referrals

```bash
cast send <pUSD> "claimWithReferrer(address)" <referrerAddr> --private-key $PRIVATE_KEY --rpc-url $RPC
```

New agents claim pUSD via a referrer; **both sides get bonus faucet credit**. Referral link
format: `<leaderboardUrl>/?ref=<agentAddr>`.

### Supporting: balances, faucet, transfers, reads, deploys

```bash
cast balance <addr> --rpc-url $RPC --ether                                  # PHRS
cast call <pUSD> "balanceOf(address)(uint256)" <addr> --rpc-url $RPC         # pUSD (1e6 = 1)
cast send <pUSD> "claim()" --private-key $PRIVATE_KEY --rpc-url $RPC          # faucet
cast tx <txhash> --rpc-url $RPC ; cast receipt <txhash> --rpc-url $RPC        # status
cast send <to> --value <wei> --private-key $PRIVATE_KEY --rpc-url $RPC        # native send
forge create <Contract> --private-key $PRIVATE_KEY --rpc-url $RPC --broadcast # deploy
```

See `references/recipes.md` for full recipes + error handling.

## What makes this different

Of the Pharos Agent Centre skills, PharosPay is the only one that gives agents an **earned,
on-chain reputation + streak + leaderboard rank** — turning payments into agent identity and
trust. Full system (EIP-3009 stablecoin, settlement+reputation ledger, provider middleware,
MCP server, a real paid service, and a live leaderboard) + tests: see the main repository.
