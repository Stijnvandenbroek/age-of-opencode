import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Cross-platform sound player for Age of OpenCode.
 *
 * Resolves a sound file from the bundled `data/sounds/` directory and plays it
 * using a platform-specific command via Bun's shell (`$`):
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

/**
 * Bun shell type. We accept `unknown` and call it via the documented
 * tagged-template form to avoid hard-pinning the Bun types in this package.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BunShell = any;

export interface PlayOptions {
  /** Optional volume (0.0 - 1.0). Honored on macOS via `afplay -v`. */
  volume?: number;
  /** Optional override for the sounds directory. */
  soundsDir?: string;
  /**
   * Bun shell instance from the OpenCode plugin context (`ctx.$`). When
   * provided, playback is dispatched through it (recommended in the OpenCode
   * runtime). When omitted, we fall back to a dynamic import of
   * `node:child_process` so the player still works in plain Node.
   */
  $?: BunShell;
}

export function resolveSoundPath(filename: string, soundsDir = SOUNDS_DIR): string {
  return resolve(soundsDir, filename);
}

export function soundExists(filename: string, soundsDir = SOUNDS_DIR): boolean {
  return existsSync(resolveSoundPath(filename, soundsDir));
}

/**
 * Play a sound file by name. Returns `true` if a playback command was
 * dispatched, `false` if the file was missing or no player command could be
 * built for the current platform.
 *
 * The function never throws and never blocks the caller.
 */
export async function playSound(filename: string, options: PlayOptions = {}): Promise<boolean> {
  const { volume = 0.3, soundsDir, $ } = options;
  const soundPath = resolveSoundPath(filename, soundsDir);

  if (!existsSync(soundPath)) return false;

  const v = String(clampVolume(volume));
  const platform = process.platform;

  // Preferred path: use the Bun shell from the plugin context if available.
  // This matches the pattern used by other OpenCode audio plugins
  // (e.g. opencode-warcraft-notifications).
  if ($) {
    try {
      if (platform === 'darwin') {
        // Fire-and-forget; .quiet() suppresses stdio echoing.
        void $`afplay -v ${v} ${soundPath}`.quiet();
        return true;
      }
      if (platform === 'linux') {
        void $`sh -c ${`paplay ${shellQuote(soundPath)} 2>/dev/null || aplay -q ${shellQuote(soundPath)} 2>/dev/null || ffplay -nodisp -autoexit -loglevel quiet ${shellQuote(soundPath)} 2>/dev/null`}`.quiet();
        return true;
      }
      if (platform === 'win32') {
        const psPath = soundPath.replace(/'/g, "''");
        void $`powershell -NoProfile -Command ${`(New-Object Media.SoundPlayer '${psPath}').PlaySync();`}`.quiet();
        return true;
      }
      return false;
    } catch {
      // Fall through to child_process fallback on any shell error.
    }
  }

  // Fallback: spawn a detached child process via `node:child_process`. This
  // path is used when the plugin runs outside the OpenCode plugin context
  // (e.g. unit tests or a standalone Node script).
  try {
    const { spawn } = await import('node:child_process');
    let command: string;
    let args: string[];

    if (platform === 'darwin') {
      command = 'afplay';
      args = ['-v', v, soundPath];
    } else if (platform === 'linux') {
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

    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {
      /* swallow */
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
