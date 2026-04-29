import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Cross-platform sound player for Age of OpenCode.
 *
 * Resolves a sound file from the bundled `data/sounds/` directory and plays it
 * using a platform-specific command:
 * - macOS:   `afplay`
 * - Linux:   `paplay` -> `aplay` -> `ffplay` (whichever is available)
 * - Windows: PowerShell `System.Media.SoundPlayer`
 *
 * Playback is fired-and-forgotten so OpenCode is never blocked.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// `src/player.ts` is one level below the project root, so go up one directory
// to reach the bundled `data/sounds/` directory.
const SOUNDS_DIR = resolve(__dirname, '..', 'data', 'sounds');

export interface PlayOptions {
  /** Optional volume (0.0 - 1.0). Honored on macOS via `afplay -v`. */
  volume?: number;
  /** Optional override for the sounds directory. */
  soundsDir?: string;
}

export function resolveSoundPath(filename: string, soundsDir = SOUNDS_DIR): string {
  return resolve(soundsDir, filename);
}

export function soundExists(filename: string, soundsDir = SOUNDS_DIR): boolean {
  return existsSync(resolveSoundPath(filename, soundsDir));
}

/**
 * Play a sound file by name. Returns `true` if a playback command was
 * spawned, `false` if the file was missing or no player command could be
 * built for the current platform.
 *
 * The function never throws and never blocks: the underlying child process
 * runs detached so callers don't need to await it.
 */
export function playSound(filename: string, options: PlayOptions = {}): boolean {
  const { volume = 0.3, soundsDir } = options;
  const soundPath = resolveSoundPath(filename, soundsDir);

  if (!existsSync(soundPath)) return false;

  const platform = process.platform;
  let command: string;
  let args: string[];

  if (platform === 'darwin') {
    command = 'afplay';
    args = ['-v', String(clampVolume(volume)), soundPath];
  } else if (platform === 'linux') {
    // Try `paplay` first; if missing fall back to `aplay`, then `ffplay`.
    // We do this via a small shell pipeline so we don't have to probe each
    // binary ourselves.
    command = 'sh';
    const escaped = shellQuote(soundPath);
    args = [
      '-c',
      `paplay ${escaped} 2>/dev/null || aplay -q ${escaped} 2>/dev/null || ffplay -nodisp -autoexit -loglevel quiet ${escaped} 2>/dev/null`,
    ];
  } else if (platform === 'win32') {
    command = 'powershell';
    args = [
      '-NoProfile',
      '-Command',
      `(New-Object Media.SoundPlayer '${soundPath.replace(/'/g, "''")}').PlaySync();`,
    ];
  } else {
    return false;
  }

  try {
    const child = spawn(command, args, {
      stdio: 'ignore',
      detached: true,
    });
    child.on('error', () => {
      // Swallow spawn errors silently - a missing audio binary should not
      // crash the plugin.
    });
    child.unref();
    return true;
  } catch {
    return false;
  }
}

function clampVolume(value: number): number {
  if (Number.isNaN(value)) return 0.3;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
