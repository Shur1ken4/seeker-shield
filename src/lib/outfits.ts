/** Wardy's looks: cosmetic only. Chosen once, when you adopt him; the server keeps it for good. */
import type { OutfitId } from '../../api/_lib/types'
export type { OutfitId }

export interface Outfit {
  id: OutfitId
  name: string
  /** Only for wallets holding a Seeker Genesis Token. */
  seekerOnly?: boolean
}

export const OUTFITS: Outfit[] = [
  { id: 'classic', name: 'Classic' },
  { id: 'cap', name: 'Cap' },
  { id: 'party', name: 'Party hat' },
  { id: 'headphones', name: 'Headphones' },
  { id: 'shades', name: 'Shades' },
  { id: 'wizard', name: 'Wizard' },
  { id: 'scarf', name: 'Seeker scarf', seekerOnly: true },
]
