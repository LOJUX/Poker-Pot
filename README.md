# Poker Pot

A chipless poker table on one shared phone or tablet. Players enter their names and where they're sitting, pick their buy-ins, and the app tracks stacks, the button, blinds, betting and side pots for No-Limit Hold'em cash games.

## Run it

```sh
npm install
npm run dev      # local dev server
npm test         # engine tests
npm run build    # typecheck + production build in dist/
```

Open it on a tablet in the middle of the table and use "Add to Home Screen" to install it. The game is saved in the browser, so a refresh doesn't lose anything.

## How a hand works

1. **Deal**: the app moves the button and posts the blinds (heads-up the button is the small blind). Busted and sitting-out players are skipped.
2. **Betting**: an arrow points at the player to act. Only legal actions are shown: Fold, Check, Call, and Bet/Raise with min, ½ pot, pot and all-in presets. Minimum raises are enforced, and an all-in for less than a full raise doesn't reopen betting.
3. **Streets**: when a betting round closes the app says "Deal the flop / turn / river". Deal the real cards, then tap it.
4. **End of the hand**: the app never sees the cards, so it handles the end of a hand like this:
   - **Everyone else folds**: the last player gets the pot automatically, and any uncalled bet is returned.
   - **Everyone is all-in**: betting stops and the app asks you to run out the board.
   - **Showdown**: the app builds the main pot and side pots itself and lists only the players eligible for each one. Tap the winner of each pot (or use "Best hand" to give one player every pot they're eligible for). Tap several players to split a pot. Odd chips go to the first winner left of the button.
5. **Between hands**: use **Players** to rebuy, sit out, add or remove players, move the button or change the blinds. It also shows each player's +/− against their total buy-in. **Undo** reverses any mis-tap.

## Code layout

- `src/engine/`: a pure, framework-free rules engine. `reduce(state, action)` handles hands, betting, pots and payouts, and has unit tests.
- `src/store.ts`: React state with an undo history and localStorage persistence.
- `src/components/`: the setup screen, the table with seats and the turn arrow, the action bar, showdown and players panels.

Amounts are stored as integers in the smallest unit (pence/cents, or chips), so splits never hit floating-point errors.
