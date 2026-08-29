# `~/.agents` — Directory Structure

Where a new thing goes. Use this to place work; the operating details of each
concern live in its topic doc ([personalisation](personalisation.md),
[memory-strategy](memory-strategy.md), [project-memory](project-memory.md)).

## Tree

```
~/.agents/
├── config/          # declarative settings: what exists, and who gets it
├── personalisation/ # CANONICAL personalisation sources
├── skills/          # CANONICAL shared skills
├── mcp/             # CANONICAL MCP server definitions
├── dist/            # rendered output — committed so changes are reviewable
├── src/
│   ├── lib/         # generic capability, no feature knowledge
│   ├── clients/     # external services and processes
│   ├── settings/    # project environment: paths, config
│   ├── domains/     # feature knowledge
│   ├── adapters/    # per-harness content shaping
│   └── entries/     # thin command entrypoints
├── docs/            # these documents
└── hindsight/       # memory service runtime files, machine-local
```

## Root

Everything above `src/` is data this repo is authoritative for, or a link to
whatever is. Logic never lives here, and a foreign tool's config file is never
copied in — it is converged in place instead.

- **`config/`** declares; it never behaves. A yaml here says what exists and
  which harness wants it, and stops there. When a value needs interpreting,
  the interpreting belongs in `src/`.
- **The CANONICAL dirs** each hold sources of one kind, named by their own
  identity rather than by any consumer. A genuinely new kind of shared asset
  earns a new root dir rather than being folded into an existing one.
- **`dist/`** is generated and committed, so a render change is reviewable in a
  diff. Never hand-edit it; change the source and re-render.

## `src/` layers

Dependencies flow one way — `entries` → `adapters`/`domains` → `clients` →
`settings` → `lib` — so a lower layer can never reach up for context.

- **`lib/`** is reusable anywhere and knows nothing about what this repo does.
  If a helper names a feature, it belongs in `domains/`.
- **`clients/`** talks to the world outside the process. Keeping I/O here is
  what lets domains be reasoned about on their own.
- **`settings/`** resolves the environment: where things live, what config says,
  which env var wins. It answers questions; it does not act on the answers.
- **`domains/`** knows what a feature means. It works in its own vocabulary and
  stays ignorant of any particular harness or file format.
- **`adapters/`** knows one harness's quirks and nothing else. Generic in,
  harness-shaped out — a domain's vocabulary appearing here is a design smell.
- **`entries/`** parses arguments and prints results, one per command. Logic
  that grows here has a home one layer down.
