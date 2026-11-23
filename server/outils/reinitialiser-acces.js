// Commande de secours : réinitialise l'accès d'un compte (mot de passe provisoire, double authentification
// à réactiver), sans toucher aux données. Utile si le propriétaire perd son téléphone ou son mot de passe.
// Usage : npm run reinitialiser-acces -- <identifiant>
// Chez Scalingo : scalingo --app <application> run npm run reinitialiser-acces -- proprietaire
import { pool, q } from '../db.js';
import { hacherMotDePasse, motDePasseProvisoire } from '../securite.js';

const identifiant = String(process.argv[2] || '').trim().toLowerCase();
if (!identifiant) {
  console.error('Indiquez l’identifiant du compte : npm run reinitialiser-acces -- proprietaire');
  process.exit(1);
}
let u;
try {
  u = (await q('select id, cabinet_id, prenom, nom from utilisateurs where identifiant = $1', [identifiant])).rows[0];
} catch (e) {
  console.error(e.code === '42P01' ? 'La base est vide : démarrez le site une première fois avant d’utiliser cette commande.' : `Base de données injoignable : ${e.message}`);
  process.exit(1);
}
if (!u) {
  console.error(`Aucun compte « ${identifiant} ».`);
  process.exit(1);
}
const mdp = motDePasseProvisoire();
await q('update utilisateurs set hash = $2, doit_changer = true, totp_actif = false, totp_secret = null, totp_dernier = 0, echecs = 0, bloque_jusqu = null, actif = true where id = $1', [u.id, await hacherMotDePasse(mdp)]);
await q('delete from sessions where utilisateur_id = $1', [u.id]);
await q("insert into journal (cabinet_id, utilisateur_id, action, cible, detail) values ($1, $2, 'utilisateur.motdepasse', $3, 'Accès réinitialisé par la commande de secours')", [u.cabinet_id, u.id, [u.prenom, u.nom].filter(Boolean).join(' ')]);
console.log(`Accès de « ${identifiant} » réinitialisé.\nMot de passe provisoire : ${mdp}\nÀ la connexion : activation de la double authentification, puis choix d’un nouveau mot de passe.`);
await pool.end();
process.exit(0);
