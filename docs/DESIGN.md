# Wardy design system

## Principles
1. Calm, not scary. Security apps that shout cause panic. Use plain words and one clear next step.
2. Colour = meaning. Mint means safe or done. Red means act now. Amber means review. Slate means tidy-up. Nothing is coloured for decoration.
3. One primary action per screen.
4. Show the raw data on request ("Details"), never by default.

## Tokens (dark is the default theme; light theme via prefers-color-scheme)
Colours (dark / light):
- bg: #0B0D0C / #F6F7F5
- surface-1 (cards): #131614 / #FFFFFF
- surface-2 (sheets, inputs): #1B1F1C / #EEF0EC
- border: #2A2F2B / #DADDD7
- text-primary: #ECEFEA / #111412
- text-secondary: #A3ABA4 / #4D554F
- text-muted: #6B736C / #7B837D
- safe (accent): #3DDC97 / #15925E
- critical: #FF5A4E / #C9362B
- warning: #F5B841 / #A86F00
- cleanup: #8FA3B8 / #56687A
- Each semantic colour also has a tinted background at 14% opacity for chips and banners.
Typography: Manrope ExtraBold for the wordmark only; IBM Plex Sans (UI) and IBM Plex Mono (addresses, amounts), self-hosted via @fontsource so the APK works offline. Scale: 12 caption, 14 body-small, 16 body, 20 title, 28 heading, 64 score number. Weights 400, 500, 600 only. Line height 1.5 for body.
Spacing: 4px base. Steps 4, 8, 12, 16, 24, 32, 48.
Radius: 6 chips, 10 cards and buttons, 16 bottom sheets. Not everything rounded the same.
Elevation: none on cards (use border); one soft shadow only for bottom sheets.
Motion: 150ms fast, 250ms base, ease-out. Score count-up 600ms. Respect prefers-reduced-motion.

## Components (each with default, pressed, disabled, loading, error states)
- Button: primary (safe-coloured fill, dark text), secondary (border only), destructive (critical-coloured, only for burn), ghost. Min height 48px. Loading shows a spinner and keeps width.
- ScoreDial: 64px number in the centre of a thin circular track filled to the score, track colour by band (safe 90+, cleanup 70-89, warning 40-69, critical under 40). Word under it. Counts up on change.
- SeverityChip: small pill, tinted background, text in the semantic colour: Critical, Warning, Cleanup, Suspicious.
- FindingCard: token image (or initials), name and symbol, SeverityChip, one-line AI explanation, Fix button on the right, "Details" toggle with mono-font raw data. Left border 3px in the severity colour (no rounded corners on that side).
- SummarySheet: bottom sheet listing what a transaction will do in plain English, SOL to be reclaimed, and the Confirm button. Burn uses a second sheet with the token name typed out.
- BottomTabBar: Scan, Watch, Profile with outline icons (lucide-react), active tab in safe colour, safe-area padding.
- Toast: success (safe), error (critical), info (neutral). Auto-dismiss 4s.
- Empty state: a short headline ("You're all clear"), one sentence, one action. Never "Nothing here."
- Skeleton: shimmer-free grey blocks matching card shapes.

## Layout
Left-aligned content, not centred blocks. 16px side padding. Score at the top of Scan, then findings grouped by severity with small section headers and counts.

## Copy rules
Sentence case. Short. No jargon on the main screens (say "permission" instead of "delegate" with "Details" for the technical word). No exclamation marks except success toasts. Never say "scam" unless the token is on the scam list.

## Accessibility
Contrast at least 4.5:1 for text. Tap targets 48px. Every icon button has an aria-label. Never use colour alone: chips always carry a word.

## Wardy (mascot)
- Same silhouette as the logo: shield with a raised centre, two vertical oval eyes.
- Moods follow the safety score: happy (90+), calm (70-89, blinks), worried (40-69, brows), alarmed (under 40, amber body, wide eyes); plus sleepy (missed days) and eating (after a fix).
- Wardy speaks in first person in his speech bubble and alerts; the rest of the UI does not.
- Motion is small and purposeful and is turned off with prefers-reduced-motion.
