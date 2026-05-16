import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

/** Low-volume game feedback using bundled WAV sfx. */

/** Drop WAV paths here when assets exist under assets/sounds/. */
const SOURCE_MAP = {};

let initPromise = null;

async function configureAudioOnce() {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    interruptionModeIOS: InterruptionModeIOS.DuckOthers,
    interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
  });
}

/**
 * Loads all clips once so replays stay snappy during battle.
 */
export function initGameSounds() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    await configureAudioOnce();
    const store = {};

    await Promise.all(
      Object.entries(SOURCE_MAP).map(async ([clipKey, src]) => {
        try {
          const { sound } = await Audio.Sound.createAsync(src, { shouldPlay: false, volume: 1 });
          store[clipKey] = sound;
        } catch {
          /* WAV optional — battleAudio synth fallback used */
        }
      }),
    );

    return store;
  })();
  return initPromise;
}

/**
 * Replay a labeled clip from the beginning. `volume` is 0..1.
 *
 * @param {keyof typeof SOURCE_MAP | string} key
 * @param {{ volume?: number }} [opts]
 */
export async function playSfx(key, opts = {}) {
  const volume = typeof opts.volume === 'number' ? opts.volume : 1;
  try {
    const bank = await initGameSounds();
    const clip = bank[key];
    if (!clip) return;
    await clip.setVolumeAsync(Math.max(0, Math.min(1, volume)));
    await clip.replayAsync();
  } catch (e) {
    console.warn(`[gameSounds] play "${key}"`, e);
  }
}
