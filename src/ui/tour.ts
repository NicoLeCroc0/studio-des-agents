// La visite guidée : Max présente l'archipel, île par île, avec sa voix (ElevenLabs). La caméra suit,
// et s'il n'y a pas de mission en cours, une équipe de démonstration s'installe le temps de la visite.
import { say, stopVoice, type Line } from '../audio/voice.ts';
import { camera, world } from '../engine/instance.ts';
import { useOffice } from '../state/store.ts';

// la voix enregistrée ne sert qu'aux phrases qui n'ont pas changé ; les autres se lisent dans la bulle
const STEPS: { line?: Line; text: string; shot: [number, number, number] }[] = [
  { text: 'Bienvenue dans le studio ! Moi, c’est Max, le cerveau. Chaque île a sa spécialité, et les ponts lumineux me relient à toute l’équipe.', shot: [224, 152, 1.7] },
  { text: 'L’île de la Veille. Ils cherchent tes sujets sur internet, et ce qui marche en ce moment sur TikTok, les Reels et les Shorts.', shot: [72, 56, 1.9] },
  { text: 'L’île des Scripts. Accroches, scripts plan par plan, titres et légendes.', shot: [224, 56, 1.9] },
  { text: 'L’île du Son. La musique, ta voix bien propre, et les bruitages qui claquent.', shot: [376, 56, 1.9] },
  { text: 'L’île du Montage. Le rythme, les sous-titres, et les effets visuels qui retiennent l’attention.', shot: [72, 152, 1.9] },
  { text: 'L’île du Graphisme. Tes miniatures, tes couvertures et tes visuels.', shot: [376, 152, 1.9] },
  { text: 'L’île des Réseaux. La publication, les hashtags, et les réponses à ta communauté.', shot: [376, 248, 1.9] },
  { text: 'L’île du Code. Les automatisations, et les chiffres de tes vidéos.', shot: [72, 248, 1.9] },
  { text: 'Juste à côté de moi, le contrôle qualité. Rien ne te revient sans être vérifié.', shot: [224, 176, 2.1] },
  { line: 'visite-7', text: 'Sur ce tableau, j’écris le plan de chaque mission. Et chaque rapport finit sur mon bureau.', shot: [224, 110, 2.05] },
  { line: 'visite-8', text: 'Toi, tu me dis ce que tu veux. Je monte l’équipe. Et tu regardes.', shot: [224, 152, 1] },
];

let run = 0;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function startTour() {
  const id = ++run;
  const st = useOffice.getState();
  useOffice.setState({ modal: null, showFinal: false });
  const demo = !st.busySince;
  if (demo) world.demoTeam(true);
  for (let i = 0; i < STEPS.length; i++) {
    if (run !== id) return;
    const s = STEPS[i];
    camera.shot(s.shot[0], s.shot[1], s.shot[2], 60);
    useOffice.setState({ tour: { step: i, text: s.text } });
    if (i === 0 || i === STEPS.length - 1) world.chef.happyUntil = world.time + 2;
    const t0 = Date.now();
    if (s.line) await say(s.line, true);
    // sans la voix (ou si elle est coupée), on laisse le temps de lire
    const minMs = 900 + s.text.length * 38;
    const spent = Date.now() - t0;
    if (spent < minMs) await wait(minMs - spent);
    await wait(350);
  }
  if (run !== id) return;
  endTour(demo);
}

function endTour(demo: boolean) {
  useOffice.setState({ tour: null });
  camera.wide(2);
  if (demo) world.demoTeam(false);
}

export function stopTour() {
  if (!useOffice.getState().tour) return;
  run++;
  stopVoice();
  endTour(true);
}
