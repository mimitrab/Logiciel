// Compile SACCADES en trois versions, toutes sans aucun appel à un service tiers
// (React, jsPDF et les polices sont intégrés) :
//   dist/saccades.html      page publiée sur claude.ai (fragment, sans <html>/<head>/<body>)
//   dist/demo/index.html    site public de démonstration (GitHub Pages)
//   server/public/          application de production servie par le serveur Node
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const r = (...p) => path.join(root, ...p);

/* Polices : fichiers woff2 (sous-ensemble latin, accents et « œ » compris) intégrés en base64. */
const POLICES = [
  ['IBM Plex Sans', 'ibm-plex-sans', [[400, 'normal'], [500, 'normal'], [600, 'normal'], [400, 'italic']]],
  ['IBM Plex Mono', 'ibm-plex-mono', [[400, 'normal'], [500, 'normal']]],
  ['Red Hat Display', 'red-hat-display', [[600, 'normal'], [700, 'normal']]],
];
const policesCss = POLICES.flatMap(([famille, paquet, variantes]) =>
  variantes.map(([poids, style]) => {
    const fichier = r('node_modules/@fontsource', paquet, 'files', `${paquet}-latin-${poids}-${style}.woff2`);
    const b64 = readFileSync(fichier).toString('base64');
    return `@font-face{font-family:"${famille}";font-style:${style};font-weight:${poids};font-display:swap;src:url(data:font/woff2;base64,${b64}) format("woff2")}`;
  }),
).join('');

const css =
  policesCss +
  execFileSync(r('node_modules/.bin/tailwindcss'), ['-c', r('tailwind.config.js'), '-i', r('src/styles.css'), '--minify'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

async function bundle(mode) {
  const out = await build({
    entryPoints: [r('src/main.jsx')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2020',
    write: false,
    legalComments: 'none',
    jsx: 'automatic',
    // Modules facultatifs de jsPDF (export HTML, SVG) : inutilisés ici.
    external: ['html2canvas', 'dompurify', 'canvg'],
    define: { __MODE__: JSON.stringify(mode), 'process.env.NODE_ENV': '"production"' },
  });
  return out.outputFiles[0].text;
}
// Le script est inséré dans une balise <script> : on neutralise les séquences qui la fermeraient.
const enLigne = (js) => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

const TETE = '<title>SACCADES</title>\n<meta name="claude:viewport-fit-sides" content="cover">\n<meta name="description" content="SACCADES, logiciel de cabinet d\'orthoptie : agenda, dossiers, bilans et comptes-rendus.">';
const RACINE = '<div id="root"><p class="boot">Chargement de SACCADES…</p></div>';
const doc = (tete, corps) => `<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${tete}\n</head>\n<body>\n${corps}\n</body>\n</html>\n`;

mkdirSync(r('dist/demo'), { recursive: true });
mkdirSync(r('server/public'), { recursive: true });

writeFileSync(r('dist/saccades.html'), `${TETE}\n<style>${css}</style>\n${RACINE}\n<script>${enLigne(await bundle('artefact'))}</script>\n`);
writeFileSync(r('dist/demo/index.html'), doc(`${TETE}\n<style>${css}</style>`, `${RACINE}\n<script>${enLigne(await bundle('demo'))}</script>`));
writeFileSync(r('server/public/app.css'), css);
writeFileSync(r('server/public/app.js'), await bundle('serveur'));
writeFileSync(r('server/public/index.html'), doc(`${TETE}\n<meta name="robots" content="noindex">\n<link rel="stylesheet" href="/app.css">`, `${RACINE}\n<script src="/app.js" defer></script>`));
console.log('OK  dist/saccades.html, dist/demo/index.html, server/public/');
