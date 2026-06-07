# PharosPay

A Pharos Agent Skill that gives an AI agent a payment track record that lives on-chain.

When the agent pays for something over x402 (gasless for the agent), the payment is settled by a
`PharosPayLedger` contract that keeps a reputation score, a daily streak, and a leaderboard
position. There is a referral that hands both sides some test pUSD. x402 is how the payment
happens. The reputation is the part that's new.

Most Pharos skills read balances, audit contracts, or launch tokens. This is the one that lets an
agent build a reputation by paying.

## Install

```bash
npx skills add https://github.com/Vt01nft/pharospay-skill
export PRIVATE_KEY=0x...            # agent wallet, testnet only
cd scripts && npm install          # viem, for the pay script
```

## Use it

Ask in plain English:

> "Pay for the analytics at https://.../alpha/wallet/0xabc on Pharos, spend at most 0.05 pUSD,
> then show me the result, the tx hash, and my updated PharosPay reputation and streak."

What runs under the hood:

```bash
PRIVATE_KEY=$PRIVATE_KEY node scripts/pay.mjs https://.../alpha/wallet/0xabc --max 0.05
cast call <ledger> "stats(address)(uint256,uint256,uint256,uint256,uint256,uint256)" <addr> --rpc-url $RPC
```

It pays (gasless EIP-3009), returns the resource and a settlement tx you can open on
testnet.pharosscan.xyz, and the payment raises the agent's on-chain reputation and streak.

## What's in here

- `SKILL.md`: the skill the agent reads (reputation, payments, referrals, recipes, safety notes).
- `assets/networks.json`: Pharos Atlantic config (chain id 688689, rpc, explorer, addresses, leaderboard url).
- `scripts/pay.mjs`: a small, self-contained x402 payer (EIP-3009 plus the `X-PAYMENT` header).
- `references/recipes.md`: the cast/forge commands and the errors you'll hit.

## The bigger project

This repo is just the skill. The full system it talks to (the pUSD token, the settlement and
reputation ledger, a provider middleware, an MCP server, a real paid API, a leaderboard, and the
tests) is here: https://github.com/Vt01nft/pharospay

## License

MIT
