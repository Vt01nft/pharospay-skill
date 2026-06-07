# PharosPay — the on-chain reputation + payment rail for AI agents

A **Pharos Agent Skill** (`SKILL.md` format) that gives an AI agent a **verifiable on-chain
reputation it earns by paying.** Every x402 stablecoin payment the agent makes (gasless,
settled on-chain) raises its **reputation score**, extends its **daily streak**, and moves it
up a public **leaderboard** — with a **referral** growth loop. x402 is the mechanism; the
product is agent **identity and trust**.

> The only Pharos Agent Centre skill that turns payments into earned, on-chain agent reputation.

## Install

```bash
npx skills add https://github.com/Vt01nft/pharospay-skill
export PRIVATE_KEY=0x...            # agent wallet (testnet only)
cd scripts && npm install          # viem, for the x402 pay script
```

## Use it (natural language)

> "Pay for the analytics at `https://…/alpha/wallet/0xabc` on Pharos (max 0.05 pUSD), then
> show me the result, the tx hash, and my updated PharosPay reputation + streak."

Under the hood:

```bash
PRIVATE_KEY=$PRIVATE_KEY node scripts/pay.mjs https://…/alpha/wallet/0xabc --max 0.05
cast call <ledger> "stats(address)(uint256,uint256,uint256,uint256,uint256,uint256)" <addr> --rpc-url $RPC
```

→ pays (gasless EIP-3009), returns the resource + a settlement tx on `testnet.pharosscan.xyz`,
and the payment **raises the agent's on-chain reputation + streak**.

## Capabilities (reputation-first)

1. **Read/build agent reputation** — score, streak, totals, leaderboard rank.
2. **Pay for x402 resources** — gasless; each payment earns reputation.
3. **Referrals** — `claimWithReferrer` grants both sides bonus pUSD.
4. Supporting on-chain ops — balances, faucet, transfers, reads, deploys via `cast`/`forge`.

## Contents

- `SKILL.md` — the agent-facing skill (reputation, payments, referrals, recipes, security).
- `assets/networks.json` — Pharos Atlantic config (chainId 688689, RPC, explorer, addresses, leaderboard URL).
- `scripts/pay.mjs` — self-contained x402 payer (EIP-3009 + `X-PAYMENT`).
- `references/recipes.md` — `cast`/`forge` recipes + error handling.

## Why it's different

Of the 40+ Pharos Agent Centre skills, PharosPay is the only one that gives agents an
**earned, on-chain reputation + streak + leaderboard rank.** Others read or transfer; this
makes "this agent reliably pays" a verifiable on-chain fact — the trust layer of the agent
economy. Full system (EIP-3009 stablecoin, settlement+reputation ledger, provider middleware,
MCP server, a real paid service, a live leaderboard) + tests: **see the main PharosPay repo.**

## License

MIT
