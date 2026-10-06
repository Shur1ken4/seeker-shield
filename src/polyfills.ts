// @solana/spl-token and friends expect Node's Buffer in the browser.
import { Buffer } from 'buffer'

const g = globalThis as unknown as { Buffer?: typeof Buffer }
g.Buffer ??= Buffer
