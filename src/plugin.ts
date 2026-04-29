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
 *  - `session.updated` (first) -> startup villager sound (fallback)
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
 *  - Set `AGE_OF_OPENCODE_DEBUG=1` to log every event the plugin sees and
 *    every sound it tries to play. Logs are written via `client.app.log`
 *    under service `age-of-opencode`.
 *
 * Inspired by:
 *  - https://github.com/kylesnowschwartz/age-of-claude
 *  - https://github.com/pantheon-org/opencode-warcraft-notifications
 */
export const AgeOfOpencodePlugin: Plugin = async (ctx) => {
  const disabled = process.env.AGE_OF_OPENCODE_DISABLE === '1';
  const debug = process.env.AGE_OF_OPENCODE_DEBUG === '1';
  const volume = parseVolume(process.env.AGE_OF_OPENCODE_VOLUME);

  // The plugin context exposes `$` (Bun shell) and `client` (SDK client). We
  // accept both being absent for safety, e.g. when the type definitions in
  // older `@opencode-ai/plugin` versions don't expose them.
  const $ = (ctx as { $?: unknown }).$;
  const client = (ctx as { client?: { app?: { log?: (input: unknown) => Promise<unknown> } } })
    .client;

  const log = async (
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    extra?: Record<string, unknown>,
  ): Promise<void> => {
    if (!debug && level === 'debug') return;
    if (!client?.app?.log) return;
    try {
      await client.app.log({
        body: { service: 'age-of-opencode', level, message, extra: extra ?? {} },
      });
    } catch {
      // Logging must never break the plugin.
    }
  };

  // Track which assistant messages have already triggered the "done" sound
  // so we don't play it for every streaming token.
  const completedMessages = new Set<string>();

  // Track which sessions have already played a "start" sound so we can use
  // `session.updated` as a fallback signal without firing repeatedly.
  const sessionStartPlayed = new Set<string>();

  const play = async (filename: string | undefined, reason: string): Promise<void> => {
    if (disabled) {
      void log('debug', 'play skipped (disabled)', { filename, reason });
      return;
    }
    if (!filename) {
      void log('debug', 'play skipped (no filename)', { reason });
      return;
    }
    void log('debug', 'play', { filename, reason });
    const ok = await playSound(filename, { volume, $: $ as never });
    if (!ok) void log('warn', 'playSound returned false', { filename, reason });
  };

  void log('info', 'plugin loaded', {
    disabled,
    volume: volume ?? 'default',
    hasShell: Boolean($),
  });

  return {
    event: async ({ event }) => {
      // The plugin SDK's typed event union does not yet expose every event
      // OpenCode emits at runtime (e.g. `permission.asked`), so we widen the
      // type for dispatching. The `event.type` strings below match the
      // documented runtime values.
      const type = (event as { type: string }).type;
      const properties = (event as { properties?: Record<string, unknown> }).properties ?? {};

      void log('debug', 'event', { type });

      switch (type) {
        case 'session.created': {
          const sessionID = extractSessionID(properties);
          if (sessionID) sessionStartPlayed.add(sessionID);
          await play(SESSION_START_SOUND, 'session.created');
          return;
        }

        case 'session.updated': {
          // Fallback for the start sound: if `session.created` wasn't
          // delivered to plugins, fire on the first `session.updated` of a
          // session instead.
          const sessionID = extractSessionID(properties);
          if (!sessionID) return;
          if (sessionStartPlayed.has(sessionID)) return;
          sessionStartPlayed.add(sessionID);
          await play(SESSION_START_SOUND, 'session.updated (first)');
          return;
        }

        case 'permission.asked':
          await play(PERMISSION_PROMPT_SOUND, 'permission.asked');
          return;

        case 'session.idle':
          await play(SESSION_IDLE_SOUND, 'session.idle');
          return;

        case 'session.error':
          await play(pickRandom(SESSION_ERROR_SOUNDS), 'session.error');
          return;

        case 'session.deleted':
          await play(pickRandom(SESSION_END_SOUNDS), 'session.deleted');
          return;

        case 'message.updated': {
          // Fire once when an assistant message completes.
          const info = (properties as { info?: MessageInfo }).info;
          if (!info || info.role !== 'assistant') return;
          if (!info.time?.completed) return;
          if (completedMessages.has(info.id)) return;
          completedMessages.add(info.id);
          await play(pickRandom(ASSISTANT_DONE_SOUNDS), 'message.updated (assistant done)');
          return;
        }

        default:
          return;
      }
    },
  };
};

interface MessageInfo {
  id: string;
  role: 'user' | 'assistant';
  time?: { completed?: number };
}

function extractSessionID(properties: Record<string, unknown>): string | undefined {
  // Different events expose the session id under different shapes. Try the
  // common ones in order.
  const direct = (properties as { sessionID?: unknown }).sessionID;
  if (typeof direct === 'string') return direct;

  const info = (properties as { info?: { id?: unknown; sessionID?: unknown } }).info;
  if (info) {
    if (typeof info.sessionID === 'string') return info.sessionID;
    if (typeof info.id === 'string') return info.id;
  }

  return undefined;
}

function parseVolume(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return undefined;
  return value;
}
