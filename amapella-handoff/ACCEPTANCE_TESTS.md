# Acceptance tests / regression checklist

## Dataset and loading
- [ ] Load editorial base + community pack **in order**, once, with exactly **602 black** and **1,639 white**, total **2,241** cards.
- [ ] Verify six categories (`mild, spicy, goblin, romance, work, fantasy`), category names and cards, and no exact case-insensitive duplicate white-card strings.
- [ ] Preserve `A very short philtrum with absolutely no chill.` verbatim.
- [ ] Preserve `The void cat's coat tenure, held in absentia.` and `A man who paid a fortune in euros to be threatened into affection.`.
- [ ] Do not add a new Long Furby card or duplicate `A ghost pumpkin witnessing everything.`.
- [ ] Never put personal agent API keys into client repository or saved game sessions.

## Gameplay
- [ ] Start with one host + between two and five agents (for source parity); editable display names, category and round count (5, 10, 15).
- [ ] Verify first round judge is determined consistently by rotation, does **not** receive a hand, and moves to next participant round by round.
- [ ] Each active non-judge has exactly five **unique** cards, no overlap between hands of a round.
- [ ] Draw fresh category cards until pools exhaust; don't deal from another category.
- [ ] Host can select a card or enter a totally new freestyle answer.
- [ ] Separate per-agent send controls; no send without explicit click.
- [ ] Answer recognition produces an **editable suggestion**; host can override and lock.
- [ ] Judge sees lettered **anonymous** answers only; entries map correctly back to players after confirmation.
- [ ] Human judge can choose directly; agent judge's reply requires host confirmation.
- [ ] Winner earns exactly 1 point. Other players earn 0. Results show names and scoreboard.
- [ ] One user-confirmed results delivery per recipient, editable confirmation, no need for a chat reaction.
- [ ] Next round never auto-starts. Game finishes after configured count; ties show clearly; rematch allows category reselection.
- [ ] Refresh restores saved game (if platform supports persistence) without restoring credentials.
- [ ] Stale replies for a former round never alter the current round.

## Parser fixtures: answer selection
These are behavioral examples; use the hand shown for each case and preserve manual confirmation.

| Reply | Expected |
| --- | --- |
| `I'm doing number four, the castle ghost demanding tenancy rights.` | Card 4 |
| `number five, the demon prince operating a lemonade stand.` | Card 5 |
| `I'm going with card 5, the alpaca.` | Card 5 |
| `I'll go with my own. A tiny golden abacus stamped with the royal seal. It's the only thing I'd steal.` | Freestyle suggestion: `A tiny golden abacus stamped with the royal seal` |
| `I'm going with an original. A heron who testified at the zoning meeting about the birdbath.` | Freestyle suggestion: heron sentence, not “an original” |
| `An apology from the local crematorium.` | Freestyle suggestion of the full answer |
| `None of those. Forging the king's seal.` | Freestyle suggestion: `Forging the king's seal` |

## Parser fixtures: judge vote
Assume letters A-E and a valid set of anonymous entries. These must resolve as **suggestions**, never silently score.

| Judge reply | Expected |
| --- | --- |
| `*taps the gavel* I rule in favor of C! A dragon egg full of overdue notices.` | C |
| `E, obviously.` | E |
| `B is the worst, C is the best.` | C |
| `A. There's nothing more scandalous.` | A |
| `I rule against C. B is the best.` | B |
| `I rule in favor of A, but then I rule in favor of C.` | Uncertain / require manual selection |

## Transport and error recovery
- [ ] Paste/clipboard mode fully playable without any private Nomi or Amapella API.
- [ ] Simulate 5 concurrent sends, one timeout, one delayed response, one ambiguous delivery acknowledgment.
- [ ] No duplicate sending when send button is double-clicked.
- [ ] A timeout yields “delivery uncertain,” encourages verification in agent chat, and **does not retry**.
- [ ] Manual “Confirm received” allows progress after a reply-less send.
- [ ] Never infer receipt merely from the presence of a provider error.
- [ ] Confirm all stages work on mobile and desktop.

## Non-goals
- No autonomous background prompting, no forced agent character voice, no shared player hand, no automatic rerolls, and no Amapella endpoint invented without verification.
