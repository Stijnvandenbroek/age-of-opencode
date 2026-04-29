import type { Plugin } from '@opencode-ai/plugin';

import { playSound } from './player.js';
import {
  SESSION_START_SOUND,
  PERMISSION_PROMPT_SOUND,
  SESSION_IDLE_SOUND,
  ASSISTANT_DONE_SOUNDS,
  SESSION_END_SOUNDS,
  SESSION_ERROR_SOUNDS,
  pickRandom,
} from './sounds.js';

/**
 * Age of OpenCode plugin.
 *
 * Plays Age of Empires II sound effects on key OpenCode lifecycle events:
 *  - `session.created`         -> startup villager sound
 *  - `permission.asked`        -> priest "wololo"
 *  - `session.idle`            -> "I need food"
 *  - `message.updated` (done)  -> random villager work-complete sound
 *  - `session.error`           -> random soldier death sound
 *  - `session.deleted`         -> random farewell sound
 *
 * Configuration:
 *  - Set `AGE_OF_OPENCODE_DISABLE=1` to silence the plugin entirely.
 *  - Set `AGE_OF_OPENCODE_VOLUME` (0.0 - 1.0) to override the default volume
 *    (only honored on macOS).
 *
 * Inspired by:
 *  - https://github.com/kylesnowschwartz/age-of-claude
 *  - https://github.com/pantheon-org/opencode-warcraft-notifications
 */
export const AgeOfOpencodePlugin: Plugin = async () => {
  const disabled = process.env.AGE_OF_OPENCODE_DISABLE === '1';
  const volume = parseVolume(process.env.AGE_OF_OPENCODE_VOLUME);

  // Track which assistant messages have already triggered the "done" sound
  // so we don't play it for every streaming token.
  const completedMessages = new Set<string>();

  const play = (filename: string | undefined): void => {
    if (disabled || !filename) return;
    playSound(filename, { volume });
  };

  return {
    event: async ({ event }) => {
      // The plugin SDK's typed event union does not yet expose every event
      // OpenCode emits at runtime (e.g. `permission.asked`), so we widen the
      // type for dispatching. The `event.type` strings below match the
      // documented runtime values.
      const type = (event as { type: string }).type;

      switch (type) {
        case 'session.created':
          play(SESSION_START_SOUND);
          return;

        case 'permission.asked':
          play(PERMISSION_PROMPT_SOUND);
          return;

        case 'session.idle':
          play(SESSION_IDLE_SOUND);
          return;

        case 'session.error':
          play(pickRandom(SESSION_ERROR_SOUNDS));
          return;

        case 'session.deleted':
          play(pickRandom(SESSION_END_SOUNDS));
          return;

        case 'message.updated': {
          // Fire once when an assistant message completes.
          const info = (event as MessageUpdatedEvent).properties?.info;
          if (!info || info.role !== 'assistant') return;
          if (!info.time?.completed) return;
          if (completedMessages.has(info.id)) return;
          completedMessages.add(info.id);
          play(pickRandom(ASSISTANT_DONE_SOUNDS));
          return;
        }

        default:
          return;
      }
    },
  };
};

interface MessageUpdatedEvent {
  type: 'message.updated';
  properties?: {
    info?: {
      id: string;
      role: 'user' | 'assistant';
      time?: { completed?: number };
    };
  };
}

function parseVolume(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return undefined;
  return value;
}
