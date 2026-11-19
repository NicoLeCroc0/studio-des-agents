// Avant de lancer le studio : la bonne version de Node, Claude Code installé, et les outils de montage.
import { execFileSync } from 'node:child_process';
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 18)) {
  console.error(`\n  Le Studio des agents demande Node.js 22.18 ou plus récent (tu as ${process.versions.node}).`);
  console.error('  Installe la dernière version sur https://nodejs.org, puis relance « npm start ».\n');
  process.exit(1);
}

const works = (cmd, args) => {
  try { execFileSync(cmd, args, { stdio: 'ignore', timeout: 15000 }); return true; } catch { return false; }
};

if (!works(process.env.CLAUDE_BIN || 'claude', ['--version'])) {
  console.warn('\n  ⚠  Claude Code n’est pas trouvé : le studio s’ouvrira en démo.');
  console.warn('  Installe-le (https://claude.com/claude-code), connecte-toi avec « claude », puis relance « npm start ».');
  console.warn('  (Si Claude Code est installé ailleurs, donne son chemin dans la variable CLAUDE_BIN.)\n');
}

const win = process.platform === 'win32';
if (!works('ffmpeg', ['-version'])) {
  console.warn('\n  ⚠  ffmpeg n’est pas installé : les monteurs ne pourront pas travailler.');
  console.warn(`  Installe-le : ${win ? 'winget install Gyan.FFmpeg' : process.platform === 'darwin' ? 'brew install ffmpeg' : 'sudo apt install ffmpeg'}, puis relance « npm start ».\n`);
}
const py = win ? 'python' : 'python3';
if (!works(py, ['-c', 'import PIL'])) {
  console.warn('\n  ⚠  Python ou Pillow manque : les retoucheurs ne pourront pas travailler.');
  console.warn(`  Installe Python (https://www.python.org), puis : ${py} -m pip install --user pillow\n`);
}
