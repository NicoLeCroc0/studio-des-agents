// En bas de l'écran, comme dans un jeu de rôle : Max te parle (son texte s'écrit lettre par lettre),
// et tu lui réponds : au clavier ou à la voix. C'est le seul endroit où taper : une demande, et l'équipe s'y met.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ROLES } from '../../shared/activity.ts';
import { sfx } from '../audio/sfx.ts';
import { world } from '../engine/instance.ts';
import { robotSprite } from '../engine/robots.ts';
import { useOffice } from '../state/store.ts';
import { tidy } from './tidy.ts';
import { dictationHelp, useDictation } from './voice.ts';

export const EXAMPLES: { label: string; prompt: string }[] = [
  {
    label: '🎬 3 Shorts depuis ma vidéo',
    prompt: 'Prends la vidéo la plus longue de mes médias et tire-en 3 Shorts verticaux (9:16, moins de 60 secondes) avec les meilleurs moments : accroche dès la première seconde, sous-titres lisibles, zooms punch sur les mots forts, whoosh sur les coupes et musique discrète sous la voix. Un monteur par Short, puis le son et les effets, puis le contrôle qualité.',
  },
  {
    label: '🔥 Vidéo virale de A à Z',
    prompt: 'Trouve un sujet qui marche en ce moment dans ma niche (regarde ma charte), écris le script d’un Short de 30 à 45 secondes, puis prépare tout pour le tournage : découpage plan par plan, textes à l’écran, bruitages, musique, miniature et fiche de publication TikTok, Reels et Shorts.',
  },
  {
    label: '📈 Tendances de ma niche',
    prompt: 'Fais la veille de ma niche : ce qui marche en ce moment sur TikTok, les Reels et les Shorts (sujets, formats, accroches, sons). Lance un chasseur de tendances par réseau, puis rends-moi un top 10 d’idées de vidéos classées par potentiel, avec les liens d’exemples.',
  },
  {
    label: '🖼️ Miniatures + test A/B',
    prompt: 'Crée 3 miniatures YouTube vraiment différentes (1280×720) pour ma prochaine vidéo, chacune avec son titre, aux couleurs de ma charte, puis prépare le plan de test A/B pour savoir laquelle gagne.',
  },
  {
    label: '🎥 Prépare mon tournage',
    prompt: 'J’ai un script dans ma mémoire (le dernier validé) : prépare mon tournage au téléphone. Liste des plans avec cadrage et lumière, plans de coupe, texte annoté pour la voix, et un plan de tournage dans l’ordre le plus rapide.',
  },
  {
    label: '📊 Analyse mes stats',
    prompt: 'J’ai déposé l’export de mes statistiques dans mes médias : analyse-les, dis-moi ce qui marche et ce qui rate, et fais-moi un plan de croissance pour le mois avec 3 choses à tester.',
  },
  {
    label: '🎧 Son pro + SFX',
    prompt: 'Prends ma dernière vidéo dans mes médias : nettoie ma voix, ajoute une musique libre de droits discrète qui baisse quand je parle, des bruitages sur les coupes et les textes, et mets le tout à -14 LUFS pour les réseaux.',
  },
  {
    label: '📱 Ma semaine de publication',
    prompt: 'Prépare ma semaine sur les réseaux : un calendrier de 5 vidéos (sujet, accroche, format, réseau, jour et heure), et pour chacune la légende, les hashtags et le commentaire à épingler.',
  },
];

const stripMd = (s: string) =>
  tidy(s).replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]+/g, '').replace(/^\s*[-•]\s+/gm, '• ').replace(/\n{2,}/g, '\n').trim();

/** Le texte de Max, qui s'écrit lettre par lettre, avec un petit « bip » (comme dans les vieux jeux). */
function useTypewriter(text: string, cps = 55) {
  const [n, setN] = useState(0);
  const shown = useRef('');
  useEffect(() => {
    // si le nouveau texte prolonge celui qui s'affiche, on continue ; sinon on recommence
    if (!text.startsWith(shown.current)) setN(0);
  }, [text]);
  useEffect(() => {
    if (n >= text.length) return;
    const t = setTimeout(() => {
      const step = text.length - n > 260 ? 8 : 2;
      setN((x) => Math.min(text.length, x + step));
      if (n % 6 === 0) sfx('blip', 0.85 + Math.random() * 0.3);
    }, (1000 / cps) * 2);
    return () => clearTimeout(t);
  }, [n, text, cps]);
  const out = text.slice(0, Math.min(n, text.length));
  shown.current = out;
  return { out, done: n >= text.length };
}

/** Le visage de Max, en grand, qui cligne des yeux (et sourit quand c'est fini). */
function Portrait({ happy }: { happy: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const g = ref.current!.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    let blink = 0;
    const draw = () => {
      const chef = world.chef;
      const eyes = happy ? 'happy' : blink > 0 ? 'blink' : chef.eyes === 'blink' ? 'open' : chef.eyes === 'happy' ? 'happy' : chef.eyes;
      g.clearRect(0, 0, 64, 64);
      g.drawImage(robotSprite('chef', 'stand', 'down', 0, eyes), 2, 0, 16, 16, 0, 0, 64, 64);
      if (blink > 0) blink--;
      else if (Math.random() < 0.02) blink = 2;
    };
    draw();
    const t = setInterval(draw, 120);
    return () => clearInterval(t);
  }, [happy]);
  return <canvas ref={ref} width={64} height={64} className="portrait" />;
}

export function Dialog() {
  const connection = useOffice((s) => s.connection);
  const claude = useOffice((s) => s.claude);
  const mission = useOffice((s) => s.mission);
  const busy = useOffice((s) => s.busySince !== null);
  const replaying = useOffice((s) => s.replaying);
  const chef = useOffice((s) => s.chef);
  const final = useOffice((s) => s.final);
  const tour = useOffice((s) => s.tour);

  let text: string;
  if (tour) text = tour.text;
  else if (connection === 'offline') text = 'Je ne suis pas relié à Claude Code. Lance « npm start » dans le dossier du bureau, et on se met au travail.';
  else if (claude && !claude.found) text = 'Je ne trouve pas Claude Code sur cet ordinateur. Installe-le (claude.com/claude-code), connecte-toi, puis relance le bureau.';
  else if (!mission) text = 'Salut ! Moi, c’est Max, le cerveau du studio. Dis-moi ce que tu veux créer : j’envoie le travail sur les bonnes îles, je vérifie tout, et je te le rends.';
  else if (chef.typing) text = stripMd(chef.typing);
  else if (final && !busy) text = stripMd(final.text) || (final.ok ? 'C’est prêt !' : 'Mission arrêtée.');
  else if (chef.say) text = stripMd(chef.say);
  else text = busy ? 'Je lis ta demande…' : '';

  const { out } = useTypewriter(text);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [out]);

  return (
    <footer className="dialog">
      <div className="dialog-box">
        <div className="dialog-face"><Portrait happy={!!final?.ok && !busy} /></div>
        <div className="dialog-main">
          <div className="dialog-name">Max <span>chef de projet</span>{replaying && <em className="pill replay">Rediffusion</em>}</div>
          <div className="dialog-text" ref={box}>{out}<span className="caret" /></div>
        </div>
      </div>
      <Composer />
    </footer>
  );
}

export function AskBar() {
  const asks = useOffice(useShallow((s) => Object.values(s.asks)));
  const agents = useOffice((s) => s.agents);
  const send = useOffice((s) => s.send);
  const a = asks[0];
  if (!a) return null;
  const who = a.who === 'chef' ? 'Max' : agents[a.who]?.name ?? 'Un agent';
  const role = a.who === 'chef' ? 'chef' : agents[a.who]?.role ?? 'renfort';
  const answer = (allow: boolean) => { sfx(allow ? 'yes' : 'no'); send({ t: 'answer', requestId: a.requestId, allow }); };
  return (
    <div className="askbar">
      <div className="askbar-head">🙋 <b style={{ color: ROLES[role].color }}>{who}</b> te demande la permission{asks.length > 1 ? ` (et ${asks.length - 1} autre${asks.length > 2 ? 's' : ''})` : ''}</div>
      <div className="askbar-label">{a.label}</div>
      {!a.full && a.detail && <pre className="askbar-detail">{a.detail}</pre>}
      <div className="askbar-actions">
        <button className="btn primary" onClick={() => answer(true)}>Autoriser</button>
        <button className="btn" onClick={() => answer(false)}>Refuser</button>
      </div>
    </div>
  );
}

function Composer() {
  const mission = useOffice((s) => s.mission);
  const busy = useOffice((s) => s.busySince !== null);
  const replaying = useOffice((s) => s.replaying);
  const send = useOffice((s) => s.send);
  const draft = useOffice((s) => s.draft);
  const demo = useOffice((s) => s.connection === 'demo');
  const [text, setText] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(text);
  textRef.current = text;

  // un exemple choisi ailleurs (ou « demander une retouche ») remplit la zone de texte
  useEffect(() => {
    if (!draft) return;
    setText(draft === ' ' ? '' : draft);
    useOffice.setState({ draft: '' });
    setTimeout(() => area.current?.focus(), 30);
  }, [draft]);

  const getBase = useCallback(() => textRef.current, []);
  const dict = useDictation(getBase, setText);

  const mode: 'new' | 'steer' | 'retouch' = !mission ? 'new' : busy ? 'steer' : 'retouch';
  const placeholder = mode === 'new'
    ? 'Dis à Max ce que tu veux… (par exemple : fais 3 Shorts avec ma vidéo)'
    : mode === 'steer' ? 'Une précision pour Max ? Il la lira entre deux étapes.' : 'Demande une retouche à Max… ou lance une nouvelle mission.';

  const submit = () => {
    const t = text.trim();
    if (!t || replaying) return;
    if (dict.listening) dict.stop();
    sfx('send');
    if (mode === 'new') send({ t: 'start', prompt: t });
    else send({ t: 'say', text: t });
    setText('');
  };

  return (
    <div className="composer">
      <div className={`composer-row ${dict.listening ? 'listening' : ''}`}>
        <textarea
          ref={area}
          value={text}
          rows={2}
          placeholder={demo ? 'C’est une démo : la vraie version tourne sur ton ordinateur, avec Claude Code.' : replaying ? 'Rediffusion en cours…' : placeholder}
          disabled={replaying}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); }
          }}
        />
        <button
          className={`mic ${dict.listening ? 'on' : ''}`}
          title={dict.listening ? 'Arrêter la dictée' : 'Dicter (en français)'}
          aria-label="Dicter"
          disabled={replaying}
          onClick={() => (dict.listening ? dict.stop() : dict.start())}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" /></svg>
        </button>
        {busy && !replaying ? (
          <>
            {text.trim() && <button className="btn primary send" onClick={submit}>Envoyer</button>}
            <button className="btn stop" onClick={() => { sfx('click'); send({ t: 'stop' }); }}>■ Arrêter</button>
          </>
        ) : (
          <button className="btn primary send" disabled={!text.trim() || replaying} onClick={submit}>
            {mode === 'new' ? 'C’est parti' : 'Envoyer'} <span aria-hidden="true">➜</span>
          </button>
        )}
        {mode === 'retouch' && !replaying && (
          <button className="btn ghost" title="Range cette mission et repars de zéro" onClick={() => { sfx('click'); send({ t: 'new' }); }}>＋ Nouvelle mission</button>
        )}
      </div>
      {dict.problem && (
        <div className="hint" onClick={dict.clearProblem}>🎙️ {dictationHelp(dict.problem)}</div>
      )}
    </div>
  );
}
