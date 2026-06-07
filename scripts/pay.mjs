// Self-contained x402 payer for Pharos. Signs an EIP-3009 authorization (gasless) and
// pays an x402-protected URL, returning the resource + settlement tx hash.
//
//   PRIVATE_KEY=0x... node scripts/pay.mjs <url> [--max <pUSD>]
import { parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const nets = JSON.parse(readFileSync(join(here, "..", "assets", "networks.json"), "utf8"));
const net = nets.networks[nets.default];
const chainId = Number(process.env.PHAROS_CHAIN_ID ?? net.chainId);

const argv = process.argv.slice(2);
const url = argv[0];
const maxIdx = argv.indexOf("--max");
const maxAmount = maxIdx >= 0 ? argv[maxIdx + 1] : undefined;

if (!url) {
  console.error("usage: PRIVATE_KEY=0x... node scripts/pay.mjs <url> [--max <pUSD>]");
  process.exit(1);
}
const pk = process.env.PRIVATE_KEY;
if (!pk) {
  console.error("PRIVATE_KEY env var required");
  process.exit(1);
}
const account = privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);

const transferTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

const safe = async (r) => {
  try {
    return await r.json();
  } catch {
    return await r.text();
  }
};

async function main() {
  const first = await fetch(url);
  if (first.status !== 402) {
    console.log(JSON.stringify({ status: first.status, data: await safe(first) }, null, 2));
    return;
  }
  const req = (await first.json()).accepts[0];
  const amount = BigInt(req.maxAmountRequired);
  if (maxAmount !== undefined && amount > parseUnits(maxAmount, 6)) {
    console.error(`required ${req.maxAmountRequired} base units exceeds --max ${maxAmount} pUSD`);
    process.exit(2);
  }

  const now = Math.floor(Date.now() / 1000);
  const auth = {
    from: account.address,
    to: req.payTo,
    value: req.maxAmountRequired,
    validAfter: "0",
    validBefore: String(now + 3600),
    nonce: `0x${randomBytes(32).toString("hex")}`,
  };
  const signature = await account.signTypedData({
    domain: { name: "PharosPay USD", version: "1", chainId, verifyingContract: req.asset },
    types: transferTypes,
    primaryType: "TransferWithAuthorization",
    message: {
      from: auth.from,
      to: auth.to,
      value: BigInt(auth.value),
      validAfter: 0n,
      validBefore: BigInt(auth.validBefore),
      nonce: auth.nonce,
    },
  });

  const payload = { x402Version: 1, scheme: "exact", network: req.network, asset: req.asset, authorization: auth, signature };
  const header = Buffer.from(JSON.stringify(payload)).toString("base64");

  const second = await fetch(url, { headers: { "X-PAYMENT": header } });
  const respHeader = second.headers.get("X-PAYMENT-RESPONSE");
  const resp = respHeader ? JSON.parse(Buffer.from(respHeader, "base64").toString("utf8")) : {};

  console.log(
    JSON.stringify(
      {
        status: second.status,
        data: await safe(second),
        payment: {
          txHash: resp.txHash,
          amount: req.maxAmountRequired,
          asset: req.asset,
          to: req.payTo,
          explorer: resp.txHash ? `${net.explorer}/tx/${resp.txHash}` : undefined,
        },
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
