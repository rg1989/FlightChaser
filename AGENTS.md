# For AI agents

Flight Chaser shows live air traffic on a 3-D globe. It is TypeScript that Node 24.2 or newer runs directly, with Vite
for the client and `node --test` for the tests. There is no framework.

| Task | Read this first, and follow it step by step |
|---|---|
| Add a scenario (a flight with a story) | [docs/scenario-sdk.md](docs/scenario-sdk.md) |
| The scenario file format | [docs/scenarios.md](docs/scenarios.md) |
| Connect an API key | [docs/api-keys.md](docs/api-keys.md) |
| Add an aircraft model or an airline livery | [docs/liveries.md](docs/liveries.md) |

Rules for every task:

- `make` starts the app. It needs no key and no account.
- `npm run check` runs the type check and all tests. It must pass before you say that the work is done.
- The user makes each account and pastes each key. Do not print a key. Do not read `.env.local` aloud.
- Do not commit `.env.local`, `.work/`, `data/flights/`, `data/recordings/` or `public/scenarios/*/local/`. Git ignores
  them on purpose.
- Write documents and on-screen text short and plain.
