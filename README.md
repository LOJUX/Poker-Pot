# Poker Pot

A chipless poker table on one shared phone or tablet. Players enter their names and where they're sitting, pick their buy-ins, and the app tracks stacks, the button, blinds, betting and side pots for No-Limit Hold'em cash games.

## Run it

```sh
npm install
npm run dev      # local dev server
npm test         # engine tests
npm run build    # typecheck + production build in dist/
```

Lay the phone or tablet flat in the middle of the table and leave it there. The whole screen is the table:

- Each player taps the **+** on the edge of the screen nearest to where they're actually sitting.
- Seats show the player's chip stack and its exact value, turned to face them.
- An arrow in the middle points at whoever's turn it is, and it always turns clockwise.
- The Fold / Check / Call / Raise controls pop up on that player's edge of the screen, facing them. "Deal the flop" and the showdown screen face the dealer.
- The screen is kept awake while the game is open. **☰ → Full screen** also locks the orientation where the browser supports it.

Use "Add to Home Screen" to install it. The game is saved in the browser, so a refresh doesn't lose anything.

## How a hand works

1. **Deal**: the app moves the button and posts the blinds (heads-up the button is the small blind). Busted and sitting-out players are skipped.
2. **Betting**: the arrow points at the player to act. Only legal actions are shown: Fold, Check, Call, and Bet/Raise with min, ½ pot, pot and all-in presets. Minimum raises are enforced, and an all-in for less than a full raise doesn't reopen betting.
3. **Streets**: when a betting round closes the app says "Deal the flop / turn / river". Deal the real cards, then tap it.
4. **End of the hand**: the app never sees the cards, so it handles the end of a hand like this:
   - **Everyone else folds**: the last player gets the pot automatically, and any uncalled bet is returned.
   - **Everyone is all-in**: betting stops and the app asks you to run out the board.
   - **Showdown**: the app builds the main pot and side pots itself and lists only the players eligible for each one. Tap the winner of each pot (or use "Best hand" to give one player every pot they're eligible for). Tap several players to split a pot. Odd chips go to the first winner left of the button.
5. **Joining mid-game**: tap the faint **+** on an empty seat to sit a new player down at any time. They're dealt in from the next hand.
6. **Between hands**: use **Menu → Players & rebuys** to rebuy, sit out, add or remove players, move the button or change the blinds. It also shows each player's +/− against their total buy-in. **Undo** reverses any mis-tap.
7. **New game**: **Menu → New game** shows final standings, then starts over with the same players and settings, or with an empty table.

## Code layout

- `src/engine/`: a pure, framework-free rules engine. `reduce(state, action)` handles hands, betting, pots and payouts, and has unit tests.
- `src/store.ts`: React state with an undo history and localStorage persistence.
- `src/layout/geometry.ts`: places seats around the screen edge by angle and works out how to turn panels to face each player.
- `src/components/`: the setup and game screens, seats, chip stacks, the turn arrow, the action bar, showdown and players panels.

Amounts are stored as integers in the smallest unit (pence/cents, or chips), so splits never hit floating-point errors.
