---
name: pharospay
description: >
  Use this when an AI agent needs to pay for things on Pharos and build a track record while
  it does. Every x402 stablecoin payment the agent makes is recorded by a ledger contract that
  keeps a reputation score, a daily streak, and a leaderboard position. This file has the RPC
  url, chain id, explorer, pUSD and ledger addresses, and the exact cast/forge and node
  commands. Read it before running anything on Pharos or you will point at the wrong network
  (Atlantic testnet, chain id 688689).
version: 0.1.0
license: MIT
requires:
  anyBins:
    - cast
    - forge
    - node
---

# PharosPay

Most Pharos skills read data or move tokens. This one does something they don't: it gives an
agent a payment track record that lives on-chain.

When the agent pays for a resource over x402 (gasless for the agent), the payment is settled by
a contract called `PharosPayLedger`. That contract bumps the agent's reputation score, keeps its
daily streak going, and ranks it on a public leaderboard. There is also a referral that hands
both sides some test pUSD. x402 is just how the payment happens. The point is the reputation.

## Why this is useful

If agents are going to spend money on their own, you want to know which ones actually pay, and
keep paying. PharosPay turns that into something anyone can check on-chain: how many payments an
agent has made, how much it has paid, and whether it has kept a streak. The streak and the
leaderboard give an owner a reason to keep the agent active instead of paying once and walking
away.

## Setup

1. Foundry (`cast`, `forge`):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash && foundryup
   ```
2. Node 18 or newer (for the pay script): `node --version`
3. Once: `cd scripts && npm install`

## Network

Everything runs on Pharos Atlantic testnet. Values are in `assets/networks.json`:

- chain id: `688689`
- rpc: `https://atlantic.dplabs-internal.com`
- explorer: `https://testnet.pharosscan.xyz`
- native token: `PHRS`
- pUSD and `PharosPayLedger` addresses: see `assets/networks.json` under `contracts`

Always pass `--rpc-url https://atlantic.dplabs-internal.com` to `cast` and `forge`.

## Before sending any transaction

- The agent's key is in `$PRIVATE_KEY`. Keep it in the environment. Don't print it or paste it
  into a file.
- Check the key resolves: `cast wallet address --private-key $PRIVATE_KEY`.
- Confirm you are on Atlantic testnet. This skill is testnet only.
- Don't authorize more than the user asked for. Say the amount and the recipient back to them,
  then send.

## What it can do

### 1. Check or build the agent's reputation

```bash
cast call <PharosPayLedger> \
  "stats(address)(uint256,uint256,uint256,uint256,uint256,uint256)" <agentAddr> --rpc-url $RPC
# txCount, totalPaid, totalEarned, lastActiveDay, streak, repScore
```

Reputation goes up on its own every time the agent pays (see below). The public leaderboard and
a shareable profile card are at the leaderboard url in `assets/networks.json`.

Plain English: "What's my agent's PharosPay reputation and streak?"

### 2. Pay for an x402 resource, and earn reputation

```bash
PRIVATE_KEY=$PRIVATE_KEY node scripts/pay.mjs <url> [--max <pUSD>]
```

The script fetches the url. If it comes back `402`, it reads the payment terms, signs an
EIP-3009 `TransferWithAuthorization` for the exact amount (no gas needed from the agent), resends
with an `X-PAYMENT` header, and returns the resource plus a settlement transaction hash. The
settlement runs through `PharosPayLedger`, so the payment also raises the agent's reputation and
streak.

Plain English: "Pay for the analytics at <url>, spend at most 0.05 pUSD, then show me the result,
the tx hash, and my updated reputation."

### 3. Bring in another agent (referral)

```bash
cast send <pUSD> "claimWithReferrer(address)" <referrerAddr> --private-key $PRIVATE_KEY --rpc-url $RPC
```

A new agent claims pUSD through a referrer, and both sides get a bonus. Referral link format:
`<leaderboardUrl>/?ref=<agentAddr>`.

### The usual on-chain things

```bash
cast balance <addr> --rpc-url $RPC --ether                                  # PHRS
cast call <pUSD> "balanceOf(address)(uint256)" <addr> --rpc-url $RPC         # pUSD, 6 decimals
cast send <pUSD> "claim()" --private-key $PRIVATE_KEY --rpc-url $RPC          # faucet
cast tx <txhash> --rpc-url $RPC ; cast receipt <txhash> --rpc-url $RPC        # status
cast send <to> --value <wei> --private-key $PRIVATE_KEY --rpc-url $RPC        # send native
forge create <Contract> --private-key $PRIVATE_KEY --rpc-url $RPC --broadcast # deploy
```

`references/recipes.md` has the full list and the common errors.

## How it's different from the other Pharos skills

There are plenty of skills that read balances, audit contracts, or launch tokens. As far as we
can tell, none of them give an agent a reputation it earns by paying. That is the whole idea
here. The full project (the pUSD token, the ledger, a provider middleware, an MCP server, a real
paid API, a leaderboard, and tests) is in the main repository linked from the README.
