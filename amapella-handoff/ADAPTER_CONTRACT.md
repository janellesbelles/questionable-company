# Amapella transport adapter contract

**Do not invent Amapella endpoints.** Miu's integration must substitute *verified* host functions for the Nomi-only network calls. This interface is framework-neutral pseudocode—not a claim that Amapella exposes these methods.

```ts
type Participant = {
  id: string;                 // stable within this game session
  displayName: string;
  kind: "human" | "agent";
};

type SendReceipt =
  | { status: "received"; replyText?: string; providerMessageId?: string }
  | { status: "sent"; providerMessageId?: string }
  | { status: "uncertain"; reason: string }
  | { status: "failed"; reason: string };

interface AgentTransport {
  listAgents?(): Promise<Participant[]>; // omit if no agent enumeration API
  sendMessage(agentId: string, text: string, requestId: string): Promise<SendReceipt>;
  // optional, only when Amapella host can distinguish delivery from reply
  checkMessageStatus?(providerMessageId: string): Promise<SendReceipt>;
}
```

## Manual / clipboard adapter (the required fallback)
Render the exact outbound message and a **Copy** button. Human host pastes it to the agent via Amapella, marks “Confirmed received” manually, and pastes the agent's response into the game. Recognition must never silently finalize an answer or a judge vote. This works without an API.

## Mapping from Nomi source
| Nomi-specific logic | Amapella port |
| --- | --- |
| `api('/api/nomis','GET')` | Verified Amapella agent list, or manual named participant entry |
| `api('/api/chat','POST',{nomiId,message})` | `AgentTransport.sendMessage(agentId,message,requestId)` or Copy/Paste |
| `send(id, message, action)` | UI-confirmed send with per-agent pending lock and receipt states |
| `partsOf(message)` | Remove Nomi-specific 800-character slicing; reimplement only to verified limit |
| `compose(id)` | Keep semantic prompt, five-card hand, optional freestyle and natural response guidance |
| `judgeText()` | Preserve anonymous A-E (or actual entrant count) choices |
| `handAnswer(id,text)` | Adapt to pure `parseAnswer(reply,hand)`; suggested, editable, never unreviewed |
| `parseJudgment(text, entrants)` | Adapt to pure `parseJudge(reply,anonymousEntries)`; manual confirm |
| `resultText()` | Keep score and winner, use Amapella transport |

## Sender state machine
`not_sent -> pending -> sent/received/uncertain/failed`, with an independent manual `confirmed_received` state. Treat a timeout as **uncertain**, not `failed`, unless the provider affirmatively establishes non-delivery. Allow a manual confirmation without another network send. A request ID prevents duplicate button clicks, and callback validation compares the request's round ID with the active round.

Every outbound message requires an explicit host click. **No automatic retries**, even if the provider claims no reply; the agent may have seen the message. Any automated pacing or concurrency limits must be explicit and configurable.

## Safe state/data boundaries
```ts
interface Session {
  version: number;
  stage: "setup"|"collect"|"judge"|"results"|"finished";
  category: string;
  players: Participant[];
  roundNumber: number;
  roundLimit: number;
  judgeId: string;
  handByPlayerId: Record<string,string[]>;
  prompt: string;
  answers: Record<string,{text:string;source:"card"|"freestyle";locked:boolean}>;
  scores: Record<string,number>;
  delivery: Record<string,unknown>; // implementation-specific receipt state
  usedWhite: string[];
  usedBlack: string[];
  history: unknown[];
}
```
Store the session separately from any transport credentials. Never put raw agent secrets in logs, localStorage, links, game exports, or repo commits.

## Host discovery checklist
1. How does Amapella authenticate? Is there a host-provided SDK, webview bridge, webhook, or no public API?
2. How are existing agents enumerated and addressed? Is cross-agent messaging allowed?
3. What are the message length, delivery acknowledgment, timeout, rate-limit and retry rules?
4. Are sender identity, consent and manual initiation required by platform policy?
5. Can the app persist a game session across browser refresh and mobile sessions?
6. Is a hosted web app acceptable, or must it run inside Amapella?

Implement only what is confirmed. Otherwise deliver a clipboard-first game that is functional and honest about automation limitations.
