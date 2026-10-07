import confetti from 'canvas-confetti'

/** A short burst in the brand colours for real wins (unlock, level up, perfect score). Skipped for reduced motion. */
export function celebrate(power: 'small' | 'big' = 'small') {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#3DDC97', '#ECEFEA', '#8FA3B8']
  confetti({ particleCount: power === 'big' ? 120 : 50, spread: power === 'big' ? 90 : 60, startVelocity: 35, origin: { y: 0.55 }, colors, disableForReducedMotion: true })
}
