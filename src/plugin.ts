import type { Plugin } from '@opencode-ai/plugin';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// `src/plugin.ts` is one level below the project root, so go up one directory
// to reach the bundled `data/sounds/` directory.
const SOUNDS_DIR = resolve(__dirname, '..', 'data', 'sounds');

const IDLE_SOUNDS: readonly string[] = [
  'dialogue_aww_yeah.wav',
  'dialogue_i_just_got_some_satisfaction.wav',
  'dialogue_yes.wav',
  'villager_train1.wav',
  'villager_train4.wav',
  'villager_select1.WAV',
  'villager_select4.WAV',
  'villager_select18.WAV',
  'villager_select19.WAV',
  'dialogue_eh-heh.wav',
  'dialogue_whos_the_man.wav',
  'dialogue_ha_ha_ha.wav',
];

const SOUND_DESCRIPTIONS: Record<string, string> = {
  'dialogue_aww_yeah.wav': 'Aww yeah!',
  'dialogue_i_just_got_some_satisfaction.wav': 'I just got some satisfaction',
  'dialogue_yes.wav': 'Yes!',
  'villager_train1.wav': 'Villager ready',
  'villager_train4.wav': 'Villager ready',
  'villager_select1.WAV': 'Yes?',
  'villager_select4.WAV': 'Reporting!',
  'villager_select18.WAV': 'What is it?',
  'villager_select19.WAV': 'Hmm?',
  'dialogue_eh-heh.wav': 'Eh-heh',
  'dialogue_whos_the_man.wav': "Who's the man?",
  'dialogue_ha_ha_ha.wav': 'Ha ha ha!',
};

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

/**
 * Age of OpenCode plugin.
 *
 * Plays a random Age of Empires II sound effect when the OpenCode session
 * becomes idle, and shows a toast notification with the voice line.
 *
 * Modeled closely after the `opencode-warcraft-notifications` plugin to ensure
 * playback works reliably inside the OpenCode runtime.
 */
export const AgeOfOpencodePlugin: Plugin = async (ctx) => {
  const { client, $ } = ctx;

  const debug = process.env.AGE_OF_OPENCODE_DEBUG === '1';

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

  void log('info', 'plugin loaded', { debug, hasShell: Boolean($) });

  const playIdleSound = async (soundPath: string): Promise<void> => {
    if (!existsSync(soundPath)) {
      void log('warn', 'sound file missing', { soundPath });
      return;
    }
    try {
      if (process.platform === 'darwin') {
        await $`afplay ${soundPath}`;
      } else if (process.platform === 'linux') {
        try {
          await $`paplay ${soundPath}`;
        } catch {
          await $`aplay ${soundPath}`;
        }
      } else if (process.platform === 'win32') {
        void log('warn', 'Windows playback not yet supported', { soundPath });
      }
    } catch (error) {
      void log('error', 'failed to play sound', { error: String(error), soundPath });
    }
  };

  const handleSessionIdle = async (): Promise<void> => {
    const filename = pickRandom(IDLE_SOUNDS);
    const soundPath = resolve(SOUNDS_DIR, filename);
    void log('info', 'session.idle', { filename });

    await playIdleSound(soundPath);

    const toastTitle = SOUND_DESCRIPTIONS[filename] ?? 'Age of OpenCode';
    if (client?.tui?.showToast) {
      try {
        await client.tui.showToast({
          body: {
            title: toastTitle,
            message: 'Session idle',
            variant: 'info',
            duration: 4000,
          },
        });
      } catch (error) {
        void log('debug', 'toast failed', { error: String(error) });
      }
    }
  };

  return {
    event: async ({ event }) => {
      const type = (event as { type: string }).type;
      if (debug) void log('debug', 'event', { type });

      if (type === 'session.idle') {
        await handleSessionIdle();
      }
    },
  };
};
