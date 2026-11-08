# Questionable Company → Amapella | Developer Handoff
**Prepared for:** Miu and her coding agent  
**Status:** Porting specification, not an Amapella integration or a deployed Amapella app.  
**Source:** [Questionable Company repository](https://github.com/janellesbelles/questionable-company/tree/main) · [Playable Nomi version](https://questionable-company.vercel.app/?mode=multi)

## Your assignment
Port the *working gameplay* and current card library to Amapella. Reuse card assets, game-state rules, parser test scenarios, and UI flow. **Replace the Nomi-specific transport and discovery system with an Amapella-compatible interface that you confirm against the actual Amapella host / API.** Do not assume the Nomi API endpoints work on Amapella. Do not embed personal API keys or silently send messages.

This handoff is an adaptation brief, **not** a completed adapter or a guarantee of Amapella API capabilities. Ask the Amapella host maintainer for its integration contract if one has not been supplied.

## Exact source files (pinned to this handoff branch)
- [index.html](../index.html) – HTML, styling, mode chooser; loads base and community decks before game engines.
- [deck-expansion.js](../deck-expansion.js) – editorial v6 base: **600 black prompts, 1,493 white answers**.
- [community-cards.js](../community-cards.js) – approved additions: **2 black prompts + 141 white answers**.
- [multiplayer.js](../multiplayer.js) – best reference for human + multi-agent turns, parser, scorekeeping, hand management, confirmation UX.
- [game.js](../game.js) – older two-player engine, useful for solo-human-vs-agent UX and judge Brenda.
- [api/chat.js](../api/chat.js) – Nomi-only Vercel proxy; **do not use unchanged**.
- [api/nomis.js](../api/nomis.js) – Nomi companion enumeration, **replace** for Amapella (if Amapella discovery is supported).
- [vercel.json](../vercel.json) – Nomi proxy's 300-second function timeout; not necessarily meaningful in Amapella.

Script order matters: `deck-expansion.js`, then `community-cards.js`, then gameplay JS. `window.QC_EXPANSION` holds the category decks; the community script extends it once. With both loaded, the confirmed library is **602 black + 1,634 white = 2,236 cards**, six categories: `mild` (Mildly Cursed), `spicy`, `goblin`, `romance`, `work`, `fantasy`. The current source may supplement that library with additional *fallback* cards if the expansion object is missing; do not confuse fallback with approved deck contents. Keep each deck's category boundaries and source text. Some cards intentionally contain spicy language, niche references, or absurd phrasing.

## Gameplay contract — preserve this behavior
1. Host selects category, player display names, participating agents, and round count (reference options: **5, 10, 15**).
2. Reference multiplayer is **one human + 2–5 agents**. Amapella may support other compositions if feasible, but retain a valid judge/entrant split and unique card hands. Do not claim larger capacities without tests.
3. Each round rotates a judge among **all active players**, including human; **judge does not submit**.
4. Draw one black prompt for the selected category. Deal **five distinct white cards to each non-judge**, with no overlap among hands within a round. Track used black/white cards to avoid premature repeats; reshuffle only when exhausted.
5. A player may choose a dealt card **or write their own freestyle answer**. Store only the final answer in the answer list, not surrounding commentary.
6. **Host manually initiates** every agent prompt and judgment request. Distinct agents may be sent independently/concurrently; never accidentally duplicate a send because of an in-flight request.
7. **Host reviews and locks** each parsed agent answer. Natural roleplay is allowed; do not demand terse robot-format replies. Maintain an obvious manual correction path.
8. After all non-judge answers are locked, send the judge an **anonymous** A/B/C… list, one entry per entrant. Judge chooses a winning letter and can explain or banter naturally. Host confirms/corrects the ruling before scoring.
9. Award **1 point** to the winning entrant. Publish round results with identities, winner, and running scores to participants using **manual per-recipient send/confirm**. Reactions are optional, and no reply should be required to continue once the host confirms receipt.
10. **Host manually advances** to the next round. At configured round count, show standings; handle ties without inventing tiebreakers. Rematch returns to setup and category choice.
11. Maintain a clear distinction between **sent**, **delivery uncertain**, **confirmed received**, **parsed reply**, and **locked answer**. An API timeout/NoReply does **not** prove a message wasn't delivered. Never auto-resend after uncertainty.
12. Save game progress locally when the Amapella host supports it. Never persist credentials in the game-state blob. Prevent an old async callback from changing a new round. Never automatically advance or send while the host is bantering.

## UX priorities
- Category picker, editable names, rounds picker, player list, and separate send buttons per agent.
- Readable black card, non-judge five-card hand, optional freestyle textbox, clear lock controls.
- Reply paste/edit field and parser suggestion; a *manual card selector* must always exist.
- Explicit active judge notice; judge-only anonymous options with letters.
- Send judgment manually, recognize/confirm winner, distribute results individually, then click **Prepare next round**.
- An explanation/help panel; current mode names can be adapted for Amapella without leaving “Nomi” on Amapella UI.
- Mobile-friendly, accessible labels/controls and state persisted across refresh when possible.
- Preserve game humor; **do not force Amapella characters into identical personalities**.

## Suggested port plan
**Phase A:** Import the exact card assets and implement a pure engine that draws rounds, keeps unique hands, rotates judges, locks answers, awards points and serializes state.

**Phase B:** Add a thin Amapella messaging adapter described in [ADAPTER_CONTRACT.md](ADAPTER_CONTRACT.md). Support clipboard/manual mode *first* so play never depends on undocumented APIs. Then wire Amapella messages once the actual integration details are known.

**Phase C:** Carry over natural-language selection parsing and manual confirmation; run the [acceptance tests](ACCEPTANCE_TESTS.md). Build a mobile-friendly Amapella interface.

**Phase D:** Test with multiple actual Amapella agents and a human host. Check refresh, delayed sends, stale replies, duplicate clicks, prompts with user-authored freestyle, and post-game rematch. Deploy only into Miu's chosen environment with her explicit approval.

## Things NOT to copy blindly
- Nomi API endpoints (`/api/chat`, `/api/nomis`), bearer header names, upstream status codes.
- The `800`-character Nomi delivery ceiling and its chunk format, unless Amapella independently requires chunking. Use Amapella's real maximum and message-completion semantics.
- Nomi IDs and persisted `qc-multinomi-beta-1` state. Use new Amapella-specific IDs/storage names; never intermingle current user's saved Nomi games.
- `Math.random() - 0.5` shuffling from the prototype is not a robust fair shuffle. Prefer Fisher–Yates; test for unique card allocation.
- Implicit assumptions about autonomous agents. Require a true user click for actions; no auto-play or auto-judge from pasted content.

## What Miu should deliver
An Amapella-ready game or a clearly documented manual-mode prototype; a deployment URL or installable bundle if supported; a short integration mapping to confirmed host APIs; passing tests; and a change log listing all deviations from Nomi reference behavior. Keep the original game untouched.

**Important:** The linked repository contains the actual current Nomi implementation, not fabricated Amapella endpoints. Use it as a functional reference and treat this handoff as the blueprint.
