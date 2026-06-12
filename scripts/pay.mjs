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
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

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

// SSRF guard (CWE-918): refuse non-http(s) schemes and private/internal targets so the agent
// cannot be steered into cloud metadata or internal services. WHATWG URL normalization handles
// hex/octal/decimal IPv4; DNS resolution catches hostnames that point at internal IPs; redirects
// are re-checked on every hop. Set PHAROSPAY_ALLOW_LOCAL=1 to allow localhost during local dev.
function ipv4Blocked(ip) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  if (a === 0 || a === 127 || a === 10) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata (169.254.169.254)
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}
function ipv6Blocked(ip) {
  const h = ip.toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fe80") || h.startsWith("fc") || h.startsWith("fd")) return true;
  const map = /^::ffff:(.+)$/.exec(h); // IPv4-mapped IPv6
  if (map) {
    if (map[1].includes(".")) return ipv4Blocked(map[1]);
    const parts = map[1].split(":");
    if (parts.length === 2) {
      const hi = parseInt(parts[0], 16) || 0;
      const lo = parseInt(parts[1], 16) || 0;
      return ipv4Blocked(`${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`);
    }
  }
  return false;
}
function hostBlocked(host) {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  const fam = isIP(h);
  if (fam === 4) return ipv4Blocked(h);
  if (fam === 6) return ipv6Blocked(h);
  return false;
}
async function assertSafeUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error(`invalid url: ${raw}`); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error(`refusing url scheme ${u.protocol} (http/https only)`);
  if (process.env.PHAROSPAY_ALLOW_LOCAL === "1") return;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (hostBlocked(host)) throw new Error(`refusing private/internal address: ${u.hostname}`);
  if (isIP(host)) return; // literal already checked
  let addrs;
  try { addrs = await lookup(host, { all: true }); } catch { throw new Error(`could not resolve host: ${host}`); }
  for (const a of addrs) if (hostBlocked(a.address)) throw new Error(`${host} resolves to a private/internal address (${a.address})`);
}
const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);
async function safeFetch(target, init = {}, depth = 0) {
  await assertSafeUrl(target);
  const res = await fetch(target, { ...init, redirect: "manual" });
  if (REDIRECT_STATUS.has(res.status) && depth < 5) {
    const loc = res.headers.get("location");
    if (loc) return safeFetch(new URL(loc, target).href, init, depth + 1);
  }
  return res;
}

async function main() {
  const first = await safeFetch(url);
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

  const second = await safeFetch(url, { headers: { "X-PAYMENT": header } });
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
