import type { Plugin } from '@opencode-ai/plugin';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SOUNDS_DIR = resolve(__dirname, '..', 'data', 'sounds');

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
  'music_game_startup.wav': 'Game started',
  'claude_startup.wav': 'OpenCode connected',
  'priest_convert_wololo5.WAV': 'Wololo!',
  'priest_convert_ayeohoho5.WAV': 'Aye oh oh oh!',
  'dialogue_i_need_food.wav': 'I need food!',
  'dialogue_gold_please.wav': 'Gold please!',
  'dialogue_give_me_some_stone.wav': 'Give me some stone',
  'dialogue_get_out.wav': 'Get out!',
  'dialogue_im_weak_please_dont_kill_me.wav': "I'm weak, please don't kill me",
  'dialogue_no.wav': 'No!',
  'dialogue_attack_them_now.wav': 'Attack them now!',
  'dialogue_we_will_not_tolerate_this_behavior.wav': 'We will not tolerate this behavior',
  'dialogue_your_attempts_are_futile.wav': 'Your attempts are futile',
  'dialogue_start_the_game_already.wav': 'Start the game already!',
  'working_sound.wav': 'Working',
  'villager_stoneminer1.WAV': 'Mining',
  'soldier_die_27.WAV': 'Soldier death',
  'soldier_die_28.WAV': 'Soldier death',
  'soldier_die_29.WAV': 'Soldier death',
  'soldier_die_31.WAV': 'Soldier death',
  'soldier_die_34.WAV': 'Soldier death',
  'sound_thunder.wav': 'Thunder',
  'crowd_wailing.wav': 'Crowd wailing',
  'crowd_laughing.wav': 'Crowd laughing',
  'dialogue_evil_laugh.wav': 'Evil laugh',
  'dialogue_dad_gum.wav': 'Dad gum!',
  'dialogue_join_me.wav': 'Join me!',
  'dialogue_somebody_pass_the_wood.wav': 'Somebody pass the wood',
  'dialogue_hey_im_in_your_town.wav': "Hey, I'm in your town",
  'dialogue_hey_nice_town.wav': 'Hey, nice town',
  'dialogue_i_dont_think_so.wav': "I don't think so",
  'soldier_select_papadakis5.wav': 'Soldier selected',
  'soldier_select_rudkin1.wav': 'Soldier selected',
  'silence.wav': 'Silence',
};

const SESSION_STARTED_SOUNDS = [
  'music_game_startup.wav',
  'claude_startup.wav',
];

const PERMISSION_SOUNDS = [
  'priest_convert_wololo5.WAV',
  'priest_convert_ayeohoho5.WAV',
];

const QUESTION_SOUNDS = [
  'dialogue_i_need_food.wav',
  'dialogue_gold_please.wav',
  'dialogue_somebody_pass_the_wood.wav',
  'dialogue_get_out.wav',
];

const COMPLETE_SOUNDS = [
  'dialogue_aww_yeah.wav',
  'dialogue_i_just_got_some_satisfaction.wav',
  'dialogue_yes.wav',
  'working_sound.wav',
  'dialogue_eh-heh.wav',
  'dialogue_whos_the_man.wav',
  'villager_train1.wav',
  'villager_train4.wav',
];

const SUBAGENT_COMPLETE_SOUNDS = [
  'villager_train1.wav',
  'villager_train4.wav',
  'dialogue_yes.wav',
  'working_sound.wav',
];

const ERROR_SOUNDS = [
  'soldier_die_27.WAV',
  'soldier_die_28.WAV',
  'soldier_die_29.WAV',
  'soldier_die_31.WAV',
  'soldier_die_34.WAV',
  'crowd_wailing.wav',
  'sound_thunder.wav',
];

const USER_CANCELLED_SOUNDS = [
  'dialogue_get_out.wav',
  'dialogue_im_weak_please_dont_kill_me.wav',
  'dialogue_no.wav',
  'dialogue_i_dont_think_so.wav',
];

const PLAN_EXIT_SOUNDS = [
  'dialogue_yes.wav',
  'dialogue_aww_yeah.wav',
  'dialogue_attack_them_now.wav',
];

const USER_MESSAGE_SOUNDS = [
  'silence.wav',
];

const CLIENT_CONNECTED_SOUNDS = [
  'claude_startup.wav',
  'music_game_startup.wav',
];

const IDLE_SOUNDS = [
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

// Legacy: IDLE_SOUNDS is kept for backward compatibility but session.idle
// now maps to complete/subagent_complete to match opencode-notifier behavior.

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function getNestedRecord(root: unknown, ...path: string[]): UnknownRecord | null {
  let current: unknown = root;
  for (const key of path) {
    const record = asRecord(current);
    if (!record || !(key in record)) {
      return null;
    }
    current = record[key];
  }
  return asRecord(current);
}

function getStringField(record: UnknownRecord | null, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

const IDLE_COMPLETE_DELAY_MS = 350;
const pendingIdleTimers = new Map<string, ReturnType<typeof setTimeout>>();
const sessionIdleSequence = new Map<string, number>();
const subagentSessionIds = new Set<string>();

function getSessionIDFromEvent(event: unknown): string | null {
  const properties = getNestedRecord(event, 'properties');
  return getStringField(properties, 'sessionID');
}

interface SessionLifecycleInfo {
  id: string | null;
  title: string | null;
  parentID: string | null;
}

function getSessionLifecycleInfo(event: unknown): SessionLifecycleInfo {
  const info = getNestedRecord(event, 'properties', 'info');
  return {
    id: getStringField(info, 'id'),
    title: getStringField(info, 'title'),
    parentID: getStringField(info, 'parentID'),
  };
}

function clearPendingIdleTimer(sessionID: string): void {
  const timer = pendingIdleTimers.get(sessionID);
  if (!timer) return;
  clearTimeout(timer);
  pendingIdleTimers.delete(sessionID);
}

function bumpSessionIdleSequence(sessionID: string): number {
  const nextSequence = (sessionIdleSequence.get(sessionID) ?? 0) + 1;
  sessionIdleSequence.set(sessionID, nextSequence);
  return nextSequence;
}

function hasCurrentSessionIdleSequence(sessionID: string, sequence: number): boolean {
  return sessionIdleSequence.get(sessionID) === sequence;
}

export const AgeOfOpencodePlugin: Plugin = async (ctx) => {
  const { client, $ } = ctx;

  const debug = process.env.AGE_OF_OPENCODE_DEBUG === '1';
  const disabled = process.env.AGE_OF_OPENCODE_DISABLE === '1';
  const volume = parseFloat(process.env.AGE_OF_OPENCODE_VOLUME ?? '0.3');

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

  void log('info', 'plugin loaded', { debug, disabled, volume, hasShell: Boolean($) });

  if (disabled) {
    void log('info', 'plugin disabled via AGE_OF_OPENCODE_DISABLE');
    return { event: async () => {} };
  }

  const playSound = async (soundPath: string): Promise<void> => {
    if (!existsSync(soundPath)) {
      void log('warn', 'sound file missing', { soundPath });
      return;
    }
    try {
      if (process.platform === 'darwin') {
        await $`afplay -v ${volume} ${soundPath}`;
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

  const handleEvent = async (eventType: string, soundFiles: readonly string[]): Promise<void> => {
    const filename = pickRandom(soundFiles);
    const soundPath = resolve(SOUNDS_DIR, filename);
    void log('info', `event.${eventType}`, { filename });

    await playSound(soundPath);

    const toastTitle = SOUND_DESCRIPTIONS[filename] ?? 'Age of OpenCode';
    if (client?.tui?.showToast) {
      try {
        await client.tui.showToast({
          body: {
            title: toastTitle,
            message: `Event: ${eventType}`,
            variant: 'info',
            duration: 4000,
          },
        });
      } catch (error) {
        void log('debug', 'toast failed', { error: String(error) });
      }
    }
  };

  // Fire client_connected shortly after plugin startup
  setTimeout(() => {
    void handleEvent('client_connected', CLIENT_CONNECTED_SOUNDS);
  }, 100);

  const processSessionIdle = async (sessionID: string, sequence: number): Promise<void> => {
    if (!hasCurrentSessionIdleSequence(sessionID, sequence)) return;

    // Fast path: if we already know this is a subagent, play subagent_complete
    if (subagentSessionIds.has(sessionID)) {
      await handleEvent('subagent_complete', SUBAGENT_COMPLETE_SOUNDS);
      return;
    }

    // Otherwise play complete
    await handleEvent('complete', COMPLETE_SOUNDS);
  };

  const scheduleSessionIdle = (sessionID: string): void => {
    clearPendingIdleTimer(sessionID);
    const sequence = bumpSessionIdleSequence(sessionID);

    const timer = setTimeout(() => {
      pendingIdleTimers.delete(sessionID);
      void processSessionIdle(sessionID, sequence).catch(() => undefined);
    }, IDLE_COMPLETE_DELAY_MS);

    pendingIdleTimers.set(sessionID, timer);
  };

  return {
    event: async ({ event }) => {
      const type = (event as { type: string }).type;
      if (debug) void log('debug', 'sdk event', { type });

      // session.created → session_started
      if (type === 'session.created') {
        const info = getSessionLifecycleInfo(event);
        if (info.parentID && info.id) {
          subagentSessionIds.add(info.id);
        } else {
          await handleEvent('session_started', SESSION_STARTED_SOUNDS);
        }
        return;
      }

      // session.updated → track subagents
      if (type === 'session.updated') {
        const info = getSessionLifecycleInfo(event);
        if (info.parentID && info.id) {
          subagentSessionIds.add(info.id);
        }
        return;
      }

      // session.deleted → cleanup
      if (type === 'session.deleted') {
        const info = getSessionLifecycleInfo(event);
        if (info.id) {
          subagentSessionIds.delete(info.id);
          clearPendingIdleTimer(info.id);
        }
        return;
      }

      // permission.asked → permission
      if (type === 'permission.asked') {
        await handleEvent('permission', PERMISSION_SOUNDS);
        return;
      }

      // session.idle → complete / subagent_complete (with debounce)
      if (type === 'session.idle') {
        const sessionID = getSessionIDFromEvent(event);
        if (sessionID) {
          scheduleSessionIdle(sessionID);
        } else {
          await handleEvent('complete', COMPLETE_SOUNDS);
        }
        return;
      }

      // session.error → error / user_cancelled
      if (type === 'session.error') {
        const sessionID = getSessionIDFromEvent(event);
        const errorRecord = getNestedRecord(event, 'properties', 'error');
        const errorName = getStringField(errorRecord, 'name');
        const isUserCancelled = errorName === 'MessageAbortedError';
        
        if (sessionID) {
          clearPendingIdleTimer(sessionID);
          bumpSessionIdleSequence(sessionID);
        }
        
        if (isUserCancelled) {
          await handleEvent('user_cancelled', USER_CANCELLED_SOUNDS);
        } else {
          await handleEvent('error', ERROR_SOUNDS);
        }
        return;
      }

      // message.updated → user_message
      if (type === 'message.updated') {
        const info = getNestedRecord(event, 'properties', 'info');
        const role = getStringField(info, 'role');
        const sessionID = getStringField(info, 'sessionID');
        
        if (role === 'user') {
          // Only fire for non-subagent sessions
          if (!sessionID || !subagentSessionIds.has(sessionID)) {
            await handleEvent('user_message', USER_MESSAGE_SOUNDS);
          }
        }
        return;
      }

      if (debug) void log('debug', 'unhandled event', { type });
    },

    // permission.ask hook → permission
    'permission.ask': async () => {
      await handleEvent('permission', PERMISSION_SOUNDS);
    },

    // tool.execute.before hook → question / plan_exit
    'tool.execute.before': async (input) => {
      if (input.tool === 'question') {
        await handleEvent('question', QUESTION_SOUNDS);
      }
      if (input.tool === 'plan_exit') {
        await handleEvent('plan_exit', PLAN_EXIT_SOUNDS);
      }
    },
  };
};
