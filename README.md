# Age of OpenCode

Age of Empires II sound effects for [OpenCode](https://opencode.ai). Wololo your way through coding sessions.

This is an [OpenCode](https://opencode.ai) port of the original
[`age-of-claude`](https://github.com/kylesnowschwartz/age-of-claude) plugin for Claude Code,
structured after [`opencode-warcraft-notifications`](https://github.com/pantheon-org/opencode-warcraft-notifications).

## What it does

Plays a different Age of Empires II sound effect on each key OpenCode lifecycle event:

| Event | Sound |
|-------|-------|
| Client connected | Game startup sound |
| Session started | Game startup / Claude startup sound |
| Permission prompt | Priest "Wololo" (you are being converted to approve) |
| Question tool invoked | "I need food" / "Gold please" (the agent needs input) |
| Assistant response complete | Random villager work / "yes" / satisfaction sound |
| Subagent complete | Villager "ready" training complete sound |
| Plan exit | "Yes!" / "Aww yeah!" / "Attack them now!" |
| Session idle | Random villager selection sound |
| User message | Silence (minimal interruption) |
| User cancelled | "Get out!" / "No!" / "I'm weak, please don't kill me" |
| Session error | Random soldier death sound / crowd wailing |

46 authentic AoE II `.wav` files are bundled in `data/sounds/`.

## Requirements

- [OpenCode](https://opencode.ai) (Bun-based runtime)
- A working audio backend on your platform:
  - **macOS:** `afplay` (built-in)
  - **Linux:** `paplay`, `aplay`, or `ffplay` (one of)
  - **Windows:** PowerShell (built-in) — partial support, your mileage may vary

## Installation

### From a local checkout

Clone the repository into your OpenCode plugin directory. OpenCode auto-loads
files placed directly in `~/.config/opencode/plugin/` (singular) globally, or
in `.opencode/plugin/` per-project.

```bash
git clone https://github.com/Stijnvandenbroek/age-of-opencode.git ~/.config/opencode/plugin/age-of-opencode
```

Then add a tiny loader file so OpenCode picks up the plugin from its
subdirectory:

`~/.config/opencode/plugin/age-of-opencode-loader.ts`

```ts
export { AgeOfOpencodePlugin } from './age-of-opencode/index.ts';
```

Restart OpenCode and you should hear the startup sound on your next session.

> **Note:** the directory is `plugin` (singular), not `plugins`. OpenCode only
> scans the singular directory for auto-loaded plugin files. If your plugin is
> silent, double-check the path and look for a
> `service=plugin path=...age-of-opencode-loader.ts loading plugin` line in
> the latest log file under `~/.local/share/opencode/log/`.

### From npm (if/when published)

Add the package name to your OpenCode config:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["age-of-opencode"]
}
```

## Configuration

The plugin reads a couple of environment variables — no config file is required.

| Variable | Effect |
|----------|--------|
| `AGE_OF_OPENCODE_DISABLE` | Set to `1` to silence the plugin without uninstalling it. |
| `AGE_OF_OPENCODE_VOLUME` | Float between `0.0` and `1.0`. Default `0.3`. Currently honored on macOS via `afplay -v`. |
| `AGE_OF_OPENCODE_DEBUG` | Set to `1` to enable debug logging to the OpenCode log file. |

Example:

```bash
AGE_OF_OPENCODE_VOLUME=0.5 opencode
```

## Supported events

This plugin handles the following OpenCode events (matching those in [`opencode-notifier`](https://github.com/mohak34/opencode-notifier)):

- `client_connected` — OpenCode client initializes
- `session_started` — New top-level session created
- `permission` — Permission prompt shown
- `question` — Question tool invoked
- `complete` — Assistant response complete
- `subagent_complete` — Subagent task finished
- `plan_exit` — Plan ready for review
- `session.idle` — Session becomes idle
- `user_message` — User sends a message
- `user_cancelled` — User cancelled the session
- `error` — Session encountered an error

## How it works

OpenCode loads the plugin at startup and the plugin subscribes to the events it
cares about via the standard `event` hook. When an event fires, the plugin picks
the matching sound (deterministic mapping for some events, random for others)
and spawns a detached, fire-and-forget child process to play it. Playback never
blocks OpenCode and never throws — a missing `afplay`/`paplay` binary just
results in silence.

## Project structure

```
.
├── index.ts                # re-exports the plugin
├── src/
│   └── plugin.ts           # main plugin: event handler + sound dispatch
└── data/
    └── sounds/             # 46 bundled AoE II .wav files
```

## Acknowledgments

- Original Claude Code plugin: [`kylesnowschwartz/age-of-claude`](https://github.com/kylesnowschwartz/age-of-claude)
- OpenCode plugin pattern reference: [`pantheon-org/opencode-warcraft-notifications`](https://github.com/pantheon-org/opencode-warcraft-notifications)
- Event reference: [`mohak34/opencode-notifier`](https://github.com/mohak34/opencode-notifier)
- Sound effects from Age of Empires II by Ensemble Studios / Microsoft.

## License

MIT — see [LICENSE](./LICENSE).

The bundled `.wav` files originate from Age of Empires II (Ensemble Studios /
Microsoft) and are included for personal, non-commercial use only.
