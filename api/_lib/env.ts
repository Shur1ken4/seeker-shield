/** Server-only configuration. Nothing here is ever sent to the browser. */
export const env = {
  get heliusKey() {
    return process.env.HELIUS_API_KEY ?? ''
  },
  get anthropicKey() {
    return process.env.ANTHROPIC_API_KEY ?? ''
  },
  get telegramToken() {
    return process.env.TELEGRAM_BOT_TOKEN ?? ''
  },
  get telegramSecret() {
    return process.env.TELEGRAM_WEBHOOK_SECRET ?? ''
  },
  get telegramBotUsername() {
    return process.env.TELEGRAM_BOT_USERNAME ?? ''
  },
  get heliusWebhookSecret() {
    return process.env.HELIUS_WEBHOOK_SECRET ?? ''
  },
  get treasury() {
    return process.env.TREASURY_ADDRESS ?? ''
  },
  get appUrl() {
    return (process.env.APP_URL ?? '').replace(/\/$/, '')
  },
  get jupiterKey() {
    return process.env.JUPITER_API_KEY ?? ''
  },
  get rpcUrl() {
    if (process.env.HELIUS_API_KEY) return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    // Public fallback so the app still runs before the Helius key is added (rate-limited; no DAS).
    return 'https://api.mainnet-beta.solana.com'
  },
}
