import type { Page } from '@playwright/test';

/**
 * Web Audio instrumentation for the sound cases (TC-010, TC-012, TC-013, TC-014).
 *
 * Runs before the app bundle:
 *  - fetch() records the last `sounds/<name>.ogg` URL requested,
 *  - decodeAudioData() tags the returned buffer with that name (preload decodes sequentially),
 *  - createBufferSource() wraps connect()/start(), so every play records
 *    { name, pan, gain, t } at the moment the app starts the source.
 *
 * Nothing here proves audibility or loudness; it proves which file the app played,
 * with which panning, and how many times. Same method as the manual runs of these cases.
 */

export type Sfx = { name: string | null; pan: number | null; gain: number | null; t: number };

export async function installAudioHook(page: Page, volume = 0.7) {
  await page.addInitScript((vol: number) => {
    try {
      localStorage.setItem('local-tetris:volume', String(vol));
    } catch {
      /* storage may be unavailable before navigation commits; the app default is 0.7 */
    }

    const w = window as any;
    const rec: Sfx[] = [];
    w.__sfx = rec;
    w.__sfxClear = () => {
      rec.length = 0;
    };
    w.__sfxEvents = () => rec.slice();

    let lastName: string | null = null;
    const fetched: string[] = [];
    w.__fetched = fetched;
    const origFetch = window.fetch;
    window.fetch = function (input: any, init?: any) {
      const url = typeof input === 'string' ? input : input && input.url;
      const m = /sounds\/([\w.-]+)\.ogg/.exec(String(url));
      if (m) {
        lastName = m[1];
        fetched.push(m[1]);
      }
      return origFetch.call(this, input, init);
    };

    const AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return;

    const origDecode = AC.prototype.decodeAudioData;
    AC.prototype.decodeAudioData = function (this: any, ...args: any[]) {
      const name = lastName;
      const ret = origDecode.apply(this, args);
      if (ret && typeof ret.then === 'function') {
        return ret.then((buf: any) => {
          try {
            buf.__name = name;
          } catch {
            /* ignore */
          }
          return buf;
        });
      }
      return ret;
    };

    const origSource = AC.prototype.createBufferSource;
    AC.prototype.createBufferSource = function (this: any) {
      const src = origSource.call(this);
      let pan: number | null = null;
      let gain: number | null = null;
      const connect = src.connect.bind(src);
      src.connect = function (dest: any, ...rest: any[]) {
        if (dest && dest.pan && typeof dest.pan.value === 'number') pan = dest.pan.value;
        if (dest && dest.gain && typeof dest.gain.value === 'number') gain = dest.gain.value;
        return connect(dest, ...rest);
      };
      const start = src.start.bind(src);
      src.start = function (this: any, ...args: any[]) {
        rec.push({
          name: (src.buffer && src.buffer.__name) || null,
          pan,
          gain,
          t: performance.now(),
        });
        return start(...args);
      };
      return src;
    };
  }, volume);
}

/** Sound files the page has requested so far (preload fetches all of them). */
export async function fetchedSounds(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __fetched: string[] }).__fetched.slice());
}

/** Sounds recorded since the last clear. */
export async function sfx(page: Page): Promise<Sfx[]> {
  return page.evaluate(() => (window as unknown as { __sfxEvents: () => Sfx[] }).__sfxEvents());
}

export async function clearSfx(page: Page) {
  await page.evaluate(() => (window as unknown as { __sfxClear: () => void }).__sfxClear());
}

/**
 * Clear the log, run one action, wait a beat, and return exactly what it played.
 * The app calls start() inside the same event/frame as the action, so 250 ms is ample.
 */
export async function step(page: Page, action: () => Promise<void>, waitMs = 250): Promise<Sfx[]> {
  await clearSfx(page);
  await action();
  await page.waitForTimeout(waitMs);
  return sfx(page);
}

/** Names only, for compact assertions. */
export function names(events: Sfx[]): string[] {
  return events.map((e) => e.name ?? 'unknown');
}

/** Rounded pan values, nulls preserved. */
export function pans(events: Sfx[]): (number | null)[] {
  return events.map((e) => (e.pan === null ? null : Math.round(e.pan * 100) / 100));
}
