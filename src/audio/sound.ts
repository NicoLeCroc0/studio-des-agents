// Le bouton du son coupe tout : les bruitages, la musique du jukebox et la voix de Max.
import { useOffice } from '../state/store.ts';
import { jukebox } from './music.ts';
import { setMuted, setSfxVolume } from './sfx.ts';
import { setVoice, setVoiceVolume } from './voice.ts';

export function applySound(on: boolean) {
  setMuted(!on);
  jukebox.setMuted(!on);
  setVoice(on && useOffice.getState().voiceOn);
}

/** Les volumes choisis dans les réglages (voix de Max, bruitages), gardés d'une visite à l'autre. */
export function applyVolumes() {
  const s = useOffice.getState();
  setVoiceVolume(s.voiceVolume);
  setSfxVolume(s.sfxVolume);
}
applyVolumes();
