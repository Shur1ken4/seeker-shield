# Wardy safety report

A security app has to be safer than the wallets it protects. This is the review we ran on our own code, acting as a strict auditor, and what we changed as a result.

## What the app can and can't do

| Can | Can't |
| --- | --- |
| Read public on-chain data for any address | See, request, store or display a seed phrase or private key |
| Ask your wallet to sign a **revoke**, **close empty account**, or (after two confirmations) **burn** of a zero-value token | Move, transfer or swap your tokens (the only transfer is the Pro payment you start yourself) |
| Ask you to sign a free text message to prove wallet ownership | Close or burn the Seeker Genesis Token, SKR, SOL, or any account that holds a balance |

## Findings and fixes

| # | Check | Result |
| --- | --- | --- |
| 1 | **Secrets never reach the browser.** All keys (Helius, Anthropic, Telegram, Upstash) are read only in `/api`. The app talks to Solana through `/api/rpc`, a proxy that allows 18 read/simulate/send methods. | Pass. A production build contains no secret names and no server environment access. The only `VITE_*` variables are the demo flags. |
| 2 | **Every webhook is verified.** Telegram (`X-Telegram-Bot-Api-Secret-Token`), Helius (`Authorization`), and the cron job (`Bearer CRON_SECRET`) use constant-time comparison. | Pass. **Fixed:** the cron check accepted an empty bearer token if `CRON_SECRET` was unset; it now refuses when the secret is missing. |
| 3 | **Inputs are validated.** Every address is parsed as a public key, and wallet addresses must be on the ed25519 curve. Signatures, `.skr` names, nicknames, and finding payloads to `/api/explain` are length-capped and type-checked. | Pass |
| 4 | **Rate limits on every `/api` route.** These are fixed-window limits per IP, stored in Redis. | **Fixed:** `stats`, `session`, `pro/info`, and `watch` GET/DELETE had no limit. All routes are limited now. |
| 5 | **One guard in front of every instruction.** `blockReason()` (`api/_lib/guard.ts`) runs when the fix list is built and again inside the instruction builder, so no code path can skip it. Unit tests prove the SGT, SKR, and wrapped SOL can never be closed or burned, even if the account is empty and the burn is "confirmed". | Pass (`guard.test.ts`) |
| 6 | **Simulation before every signature.** Fixes, Pro payments, and the demo permission are simulated first. A failed batch is retried item by item, so one bad item doesn't block the rest. If nothing passes, the sign button isn't rendered at all. | Pass |
| 7 | **Plain-English summary before the fingerprint prompt.** The review sheet lists every change, the SOL returned, and the network fee. Burning needs a second sheet that names the token and says it's permanent. | Pass |
| 8 | **Max 10 instructions per transaction.** That's 8 fix instructions plus 2 compute-budget instructions; larger fixes are split into several transactions. | Pass |
| 9 | **SKR payments verified on-chain.** The server checks that the payment is confirmed and error-free, signed by the verified wallet, and moved at least the price in the SKR mint from that wallet to the treasury. Each signature can be redeemed only once, with an atomic set-if-absent. | Pass (`pro.test.ts`) |
| 10 | **Seeker Verified done the official way.** Sign-in is a one-time server-stored message that expires in 5 minutes and is deleted on first use. The SGT check skips zero-balance accounts and checks the metadata pointer and group membership. The free month is limited to once per SGT mint, not per wallet. | Pass |
| 11 | **AI can't be steered by scammers.** Token names are attacker-controlled. They are stripped of links and shortened before reaching the model, which is told to treat them as labels only. Every reply is checked: one sentence, at most 30 words, no links, and no "scam" unless the token is on the scam list. Anything that fails falls back to a written template. AI never decides severity; the rules in `classify.ts` do. | Pass (`explain.test.ts`) |
| 12 | **Spam can't track you.** A spam token's image URL can be a tracking pixel that tells the scammer your IP and that you opened the app. | **Fixed:** remote images now load only for Jupiter-verified tokens; everything else shows initials. Images also never send a referrer. Spam names are shown as plain text, never as links. |
| 13 | **Content Security Policy.** Scripts load only from our own origin; `connect-src` is our own origin plus `ws://localhost:*` for Mobile Wallet Adapter; there are no frames, objects or inline scripts. | **Fixed:** added `X-Frame-Options: DENY`, `frame-ancestors 'none'`, HSTS, `nosniff`, and `Referrer-Policy: no-referrer` headers. |
| 14 | **Read-only by default.** Scanning, watching friends, and alerts never ask for a signature. Watched wallets are read-only. | Pass |
| 15 | **Honest numbers.** "SOL reclaimed" and "issues fixed" are counted by the server from the confirmed transaction on-chain, not reported by the app. | Pass |

| 16 | **Test mode can't leak into real payments.** `/api/pro/test-unlock` works only while `PAYMENTS_TEST_MODE=true` on the server, needs a signed-in wallet, and the app labels it "Test mode: no SKR is charged". | Pass |
| 17 | **Pet rewards can't be farmed.** Patrols need a signed-in, adopted wallet and count once per day (atomic). Snack XP comes only from fixes the server verified on-chain, capped at 6 a day. Streak rewards are free Pro days, never tokens. | Pass (`wardy.test.ts`) |

## Known, accepted

- `npm audit` reports advisories in `bigint-buffer` (through `@solana/spl-token`) and in `jayson`/`uuid` (through `@solana/web3.js` v1). Fixing them would require web3.js v3 or a 2021 spl-token. `rpc-websockets` is pinned to `uuid@11` (CommonJS) so the serverless runtime can load it. We use none of these libraries on attacker-supplied binary buffers, and we'll migrate after the hackathon.
- Sessions are bearer tokens in `localStorage`, valid for 24 hours. The strict CSP (no inline or third-party scripts) is the defence against them being stolen.
