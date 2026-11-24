// La visite guidée : Max présente l'archipel, île par île, avec sa voix (ElevenLabs). La caméra suit,
// et s'il n'y a pas de mission en cours, une équipe de démonstration s'installe le temps de la visite.
import { say, stopVoice, type Line } from '../audio/voice.ts';
import { camera, world } from '../engine/instance.ts';
import { H, ISLANDS, T, W } from '../engine/layout.ts';
import { useOffice } from '../state/store.ts';

// la voix enregistrée ne sert qu'aux phrases qui n'ont pas changé ; les autres se lisent dans la bulle
const at = (id: string, zoom = 1.9): [number, number, number] => {
  const i = ISLANDS.find((x) => x.id === id)!;
  return [(i.x + i.w / 2) * T, (i.y + i.h / 2) * T, zoom];
};
const STEPS: { line?: Line; text: string; shot: [number, number, number] }[] = [
  { text: 'Bienvenue dans le studio ! Moi, c’est Max, le cerveau. Douze îles tout autour, et des ponts lumineux qui me relient à toute l’équipe.', shot: at('cerveau', 1.5) },
  { text: 'L’île des Stats. Elle lit les chiffres de tes vidéos et te dit quoi refaire, quoi arrêter.', shot: at('stats') },
  { text: 'L’île de la Veille. Tes sujets, et ce qui marche en ce moment sur TikTok, les Reels et les Shorts.', shot: at('veille') },
  { text: 'L’île des Scripts. Accroches, scripts plan par plan, titres et légendes.', shot: at('scripts') },
  { text: 'L’île du Tournage. La liste des plans, la lumière, et ton plan de tournage au téléphone.', shot: at('tournage') },
  { text: 'L’île de la Voix. Ton texte prêt à enregistrer, et tes vidéos traduites dans d’autres langues.', shot: at('voix') },
  { text: 'L’île du Son. La musique, ta voix bien propre, et les bruitages qui claquent.', shot: at('son') },
  { text: 'L’île du Montage. Le rythme, les sous-titres, et les effets visuels qui retiennent l’attention.', shot: at('montage') },
  { text: 'L’île du Graphisme, et celle des Miniatures : plusieurs variantes, et les tests pour savoir laquelle gagne.', shot: [((ISLANDS.find((i) => i.id === 'miniatures')!.x + 7) * T), 21 * T, 1.6] },
  { text: 'L’île des Réseaux. La publication, les hashtags, et les réponses à ta communauté. Et l’île du Code, pour tout automatiser.', shot: [5 * T, 18 * T, 1.5] },
  { text: 'Dans mon cerveau, le laboratoire du contrôle qualité. Rien ne te revient sans être vérifié.', shot: [18 * T, 14 * T, 2] },
  { line: 'visite-7', text: 'Sur ce tableau, j’écris le plan de chaque mission. Et chaque rapport finit sur mon bureau.', shot: [18 * T, 8 * T, 2.05] },
  { line: 'visite-8', text: 'Toi, tu me dis ce que tu veux. Je monte l’équipe. Et tu regardes.', shot: [W / 2, H / 2, 1] },
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
