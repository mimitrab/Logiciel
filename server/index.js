// Serveur SACCADES : API, fichiers de l'application, en-têtes de sécurité.
// Démarrage : node server/index.js (variables : voir .env.exemple).
process.env.TZ = process.env.TZ || 'Europe/Paris';

const { default: express } = await import('express');
const path = await import('node:path');
const { fileURLToPath } = await import('node:url');
const { initialiser, pool } = await import('./db.js');
const { routeur, webhookStripe } = await import('./api.js');

const ici = path.dirname(fileURLToPath(import.meta.url));
const PROD = process.env.NODE_ENV === 'production';
const app = express();
app.disable('x-powered-by');
// L'hébergeur termine le HTTPS devant l'application : on lui fait confiance pour l'adresse du client.
app.set('trust proxy', 1);

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

app.use((req, res, next) => {
  if (PROD && req.headers['x-forwarded-proto'] === 'http') return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  res.set({
    'Content-Security-Policy': CSP,
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  return next();
});

// Stripe signe le corps brut de ses notifications : cette route le reçoit tel quel.
app.post('/api/stripe/webhook', express.raw({ type: '*/*', limit: '1mb' }), webhookStripe);
app.use('/api', express.json({ limit: '4mb' }), routeur);
app.get('/robots.txt', (req, res) => res.type('text/plain').send('User-agent: *\nDisallow: /api/\n'));
app.use(express.static(path.join(ici, 'public'), { index: false, maxAge: PROD ? '1h' : 0 }));
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(ici, 'public', 'index.html'));
});

await initialiser();
const port = Number(process.env.PORT) || 3000;
const serveur = app.listen(port, () => console.log(`SACCADES écoute sur le port ${port}${PROD ? '' : ' (développement)'}.`));

// Arrêt propre lors d'un redéploiement : les requêtes en cours se terminent avant la fermeture.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    serveur.close(() => pool.end().finally(() => process.exit(0)));
    setTimeout(() => process.exit(0), 10000).unref();
  });
}
