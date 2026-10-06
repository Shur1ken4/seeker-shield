/** The exact message the wallet signs. Shared by the app and the server so both build it identically. */
export function signInMessage({ domain, address, nonce, issuedAt }: { domain: string; address: string; nonce: string; issuedAt: string }) {
  return [
    `${domain} wants you to sign in with your Solana account:`,
    address,
    '',
    'Sign in to Seeker Shield to verify your Seeker. This is free, sends no transaction, and gives no permissions.',
    '',
    `URI: https://${domain}`,
    'Version: 1',
    'Chain ID: mainnet',
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join('\n')
}
