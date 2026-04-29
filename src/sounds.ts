/**
 * Sound mappings for Age of OpenCode.
 *
 * Maps OpenCode lifecycle events to Age of Empires II sound effects.
 * Sound files live in the bundled `data/sounds/` directory at the repo root.
 *
 * The mappings mirror the spirit of the original `age-of-claude` plugin:
 * - SessionStart -> a "let's get to work" villager sound
 * - Permission prompt -> the priest "wololo" (you are being converted to approve)
 * - Idle session -> "I need food" (the agent is starving for input)
 * - Assistant response done -> a villager training/work sound
 * - SessionEnd -> a farewell sound
 */

export const SESSION_START_SOUND = 'working_sound.wav';

export const PERMISSION_PROMPT_SOUND = 'priest_convert_wololo5.WAV';

export const SESSION_IDLE_SOUND = 'dialogue_i_need_food.wav';

export const ASSISTANT_DONE_SOUNDS: readonly string[] = [
  'villager_train1.wav',
  'villager_train4.wav',
  'dialogue_yes.wav',
  'dialogue_aww_yeah.wav',
  'dialogue_i_just_got_some_satisfaction.wav',
];

export const SESSION_END_SOUNDS: readonly string[] = [
  'dialogue_get_out.wav',
  'dialogue_im_weak_please_dont_kill_me.wav',
  'soldier_select_papadakis5.wav',
  'crowd_wailing.wav',
];

export const SESSION_ERROR_SOUNDS: readonly string[] = [
  'soldier_die_27.WAV',
  'soldier_die_28.WAV',
  'soldier_die_29.WAV',
  'soldier_die_31.WAV',
  'soldier_die_34.WAV',
];

/**
 * Pick a random element from a readonly array.
 */
export function pickRandom<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}
