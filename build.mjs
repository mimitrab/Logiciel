// Assemble l'application en un seul fichier HTML.
//   dist/saccades.html : fragment publié comme artefact (sans <html>/<head>/<body>)
//   index.html         : même application, document autonome ouvrable dans un navigateur
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const r = (...p) => path.join(root, ...p);

async function bundle(standalone) {
  const out = await build({
    entryPoints: [r('src/main.jsx')],
    bundle: true,
    minify: true,
    format: 'iife',
    target: 'es2020',
    write: false,
    legalComments: 'none',
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    alias: { react: r('src/react-shim.cjs') },
    define: { __STANDALONE__: String(standalone), 'process.env.NODE_ENV': '"production"' },
  });
  // Le script est inséré dans une balise <script> : on neutralise les séquences qui la fermeraient.
  return out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
}

const css = execFileSync(r('node_modules/.bin/tailwindcss'), ['-c', r('tailwind.config.js'), '-i', r('src/styles.css'), '--minify'], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore'],
});

const template = readFileSync(r('src/template.html'), 'utf8');
const [head, body] = template.split('<!--BODY-->');
const fill = (s, js) => s.replace('/*__CSS__*/', () => css).replace('/*__JS__*/', () => js);

mkdirSync(r('dist'), { recursive: true });
writeFileSync(r('dist/saccades.html'), fill(head + body, await bundle(false)));
writeFileSync(
  r('index.html'),
  `<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${fill(head, '')}</head>\n<body>\n${fill(body, await bundle(true))}</body>\n</html>\n`,
);
console.log('OK  dist/saccades.html + index.html');
