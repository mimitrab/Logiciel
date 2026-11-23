// Client de l'API du serveur SACCADES (mode serveur uniquement).
async function appel(methode, chemin, corps) {
  const r = await fetch(`/api${chemin}`, {
    method: methode,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Saccades': '1' },
    body: corps === undefined ? undefined : JSON.stringify(corps),
  });
  let donnees = null;
  try {
    donnees = await r.json();
  } catch (e) {
    donnees = null;
  }
  if (!r.ok) {
    const err = new Error((donnees && donnees.erreur) || `Le serveur a répondu ${r.status}.`);
    err.status = r.status;
    throw err;
  }
  return donnees;
}
export const api = {
  get: (chemin) => appel('GET', chemin),
  post: (chemin, corps = {}) => appel('POST', chemin, corps),
  put: (chemin, corps = {}) => appel('PUT', chemin, corps),
};

export const COLLECTIONS = ['patients', 'rdvs', 'bilans', 'factures'];
/** Ce qui a changé entre deux états : les opérations modifient les objets par copie, une simple comparaison de références suffit. */
export function differences(avant, apres) {
  const ops = [];
  for (const col of COLLECTIONS) {
    const a = new Map(avant[col].map((x) => [x.id, x]));
    const b = new Map(apres[col].map((x) => [x.id, x]));
    for (const [id, x] of b) if (a.get(id) !== x) ops.push({ op: 'put', collection: col, id, donnees: x });
    for (const id of a.keys()) if (!b.has(id)) ops.push({ op: 'del', collection: col, id });
  }
  const connus = new Set(avant.journal.map((e) => e.id));
  // Le journal est tenu du plus récent au plus ancien : on l'envoie dans l'ordre chronologique.
  const journal = apres.journal.filter((e) => !connus.has(e.id)).reverse().map(({ action, cible, detail }) => ({ action, cible, detail }));
  return { ops, journal };
}
