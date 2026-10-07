# Wardy

**Wallet security for Seeker, with a guard that lives in your phone.** Wardy finds the risky permissions and scam airdrops that drainers use, explains each one in plain English, and fixes it with one fingerprint tap. Then it keeps watching your wallet and your friends' wallets, and alerts you on Telegram.

Built for CLOCK IN, the Solana Mobile hackathon.

- Demo video: _add link_
- Pitch deck: _add link_
- Android APK: [`release/seeker-shield.apk`](release/seeker-shield.apk)

## The problem

The Seed Vault keeps Seeker keys in secure hardware, and every signature needs your fingerprint. That stops key theft, but drainers don't need your keys. They need you to:

- **Approve a permission** (a token "delegate") that can move your tokens later, with no further signature
- **Click a scam airdrop**, a fake token whose name says "claim your reward at…"
- **Lose track** of dozens of old accounts that each lock a little SOL as rent

Seeker owners are some of the most active wallets on Solana, so they attract all three. The existing tools are desktop browser extensions and websites, but Seeker owners sign on their phone.

## What it does

| Screen | What you get |
| --- | --- |
| **Scan** | Connect the Seed Vault Wallet and get a Safety score from 0 to 100. Findings are grouped as Critical, Warning and Cleanup, each with a one-sentence AI explanation and a fix button. "Fix all safe items" revokes and closes everything safe in as few fingerprint approvals as possible. |
| **Watch** | Link Telegram once. Get an alert when something new and risky lands in your wallet, or in a friend's wallet you've added by address or `.skr` name. Alerts are also saved in the app. |
| **Profile** | Seeker Verified badge (from your Genesis Token), SOL reclaimed, issues fixed, score history, and Wardy Pro. |

_Screenshots: add to `/docs` and link here._

**What it detects** (deterministic rules in [`api/_lib/classify.ts`](api/_lib/classify.ts); AI only explains, it never decides):

| Finding | Severity | Fix |
| --- | --- | --- |
| Token account with an active permission (delegate) | Critical if the account holds over $1 or the delegate is on the scam list, otherwise Warning | Revoke |
| Unverified, unpriced token whose name or metadata has a link or "claim / reward / airdrop / visit / free" | Warning (labelled "Suspicious", never "Scam") | Hide, or burn after a second confirmation |
| Empty token account | Cleanup | Close and get the rent SOL back |
| Delegate, mint or creator on the scam list | Critical | Revoke, hide or burn |

## Meet Wardy

Security apps get opened once and forgotten. Wardy is a small shield character who lives in the app, so there's a reason to come back:

- **His mood is your wallet's health:** happy when you're safe, worried when something needs a look, alarmed when it's critical. Status at a glance, not decoration.
- **Daily patrol = his meal:** opening the app runs the scan; the first patrol each day feeds him, grows his XP and keeps your streak.
- **He eats the trash:** every fix (removed access, closed account, destroyed fake token) is a snack, verified on-chain and capped per day so self-sent spam earns nothing.
- **He naps, never dies:** miss a day and he's asleep when you return, no guilt. The streak restarts; XP is never taken away.
- **Streaks pay in Pro:** every 7-day streak adds 3 free days of Wardy Pro. No token payouts, so nothing to farm.
- **He grows:** Pup, Scout, Guard, Knight, Sentinel, Legend. Cosmetic only; levels never change what's checked or allowed.

## How it uses the Solana Mobile Stack

- **Mobile Wallet Adapter**, through `@solana-mobile/wallet-standard-mobile` registered as a Wallet Standard wallet, so the Seed Vault Wallet connects natively.
- **Seed Vault signing**: every fix and payment is one fingerprint approval, and multi-transaction fixes are signed as one batch.
- **Seeker Genesis Token verification**: Sign In With Solana, then the official on-chain check (skip empty accounts; check metadata pointer and group membership; record the SGT mint).
- **SKR payments**: Wardy Pro costs 250 SKR for 30 days, sent as a plain transfer and verified on-chain by the server. Seeker Verified users get their first month free, once per Genesis Token.
- **`.skr` names**: add a friend by `alice.skr`; your own name shows on Profile.
- **`webshell` packaging**: the Android app is built with `npx solana-mobile webshell`, not a Trusted Web Activity, so wallet intents work inside the app.

## Architecture

```
Seeker (WebView app / Chrome)          Vercel functions (/api)                  Outside services
┌──────────────────────────┐   HTTPS   ┌───────────────────────────────┐
│ React + Tailwind (Vite)  │ ────────▶ │ scan     ─ classify (rules)    │ ──▶ Helius RPC + DAS
│ Mobile Wallet Adapter ───┼─ intents ▶│ explain  ─ Claude Haiku 4.5    │ ──▶ Jupiter (verified, price)
│  └▶ Seed Vault Wallet    │           │ rpc      ─ allow-listed proxy  │ ──▶ Anthropic
│ builds + simulates fixes │           │ auth, watch, pro, fixes/record │ ──▶ Upstash Redis
└──────────────────────────┘           │ helius-webhook ─▶ alerts       │ ◀── Helius webhooks
                                       │ telegram/webhook, cron/digest  │ ◀─▶ Telegram Bot API
                                       └───────────────────────────────┘
```

- The app never holds an API key. All Solana RPC calls go through `/api/rpc`.
- Transactions are built and simulated in the app, signed in the Seed Vault, and sent through the proxy.
- One Helius webhook covers every watched wallet. On activity, the server rescans that wallet, compares the result with the last scan, and alerts each watcher about new Critical or Warning findings. Pro users get alerts instantly; free users get a daily digest.

## Safety design

The two EthelSec judges will look hard at how the app itself behaves, so safety is built in rather than added later. Full report: [`docs/SAFETY.md`](docs/SAFETY.md).

- The Seeker Genesis Token, SKR, SOL, and any account with a balance can **never** be closed or burned. One guard function sits in front of every instruction builder, and unit tests prove it.
- **Nothing is burned by default.** Burning needs a second sheet that names the token and says it's permanent.
- **Every transaction is simulated** before you're asked to sign. If simulation fails, there's no sign button.
- **Every transaction is summarised in plain English** before the fingerprint prompt.
- **No seed phrases, ever.** Scanning is read-only.
- **Every webhook and every SKR payment is verified**, and each payment can be redeemed once.
- **Scammers can't steer the AI:** names are sanitised and every reply is checked.
- **Spam can't track you:** images load only for verified tokens.

## Run it locally

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local   # fill in keys; the app runs without them, with reduced features
npm run dev                  # http://localhost:5173, /api runs inside the dev server
npm test                     # 33 unit tests: rules, score, guard, AI checks, payment verification
npm run build
```

Without keys, scanning uses the public Solana RPC, explanations use written templates, and storage stays in memory. Add `HELIUS_API_KEY`, `ANTHROPIC_API_KEY`, and the Upstash variables for the full experience.

One-time setup after deploying:

```bash
npx tsx --env-file=.env.local scripts/set-telegram-webhook.ts   # point the bot at /api/telegram/webhook
npx tsx --env-file=.env.local scripts/demo-setup.ts             # demo video only: burner wallet + fake airdrop
```

## Roadmap

- **Emergency mode:** "I got hacked": revoke everything, move safe assets, and build an evidence report.
- **Owed integration:** route hack victims to Owed to recover funds sooner.
- **Native push notifications**, a real-time transaction firewall, and community scam reports weighted by Genesis Token (one phone, one vote).
- **Security dashboards** for dApp teams.

## License

MIT
