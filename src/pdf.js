// Export PDF du compte-rendu (jsPDF, chargé depuis le CDN) et remise du fichier au lecteur.
import { blocs } from './letter.js';

/* global __STANDALONE__ */
export const AUTONOME = typeof __STANDALONE__ !== 'undefined' && __STANDALONE__;

export const pdfPret = () => !!(window.jspdf && window.jspdf.jsPDF);

// Les polices standard du PDF ne couvrent que le jeu Windows-1252 : on remplace le reste.
const REMPLACEMENTS = { ' ': ' ', ' ': ' ', '−': '-', 'Δ': 'dioptries', '≥': '>=', '≤': '<=', '→': '->', '″': '"', '′': "'", '‑': '-' };
const CP1252 = /[^\u0000-ÿŒœŠšŸŽž–—‘’‚“”„†‡•…‰‹›€™]/g;
const net = (s) => String(s || '').replace(/[  −Δ≥≤→″′‑]/g, (c) => REMPLACEMENTS[c]).replace(CP1252, '?');

const ACCENT = [19, 116, 108];
const ENCRE = [26, 42, 50];
const ENCRE2 = [85, 101, 110];

export function construirePdf({ entete, destinataire, lieuDate, corps, pied }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const ML = 22;
  const MR = 22;
  const HAUT = 18;
  const BAS = 18;
  const LARGEUR = W - ML - MR;
  const LH = 4.9;
  let y = HAUT;
  const place = (h) => {
    if (y + h > H - BAS) {
      doc.addPage();
      y = HAUT;
    }
  };

  // En-tête du cabinet
  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...ACCENT);
  doc.text(net(entete[0]), ML, y + 3);
  y += 9.5;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(...ENCRE2);
  entete.slice(1).forEach((l) => {
    doc.text(net(l), ML, y);
    y += 4.2;
  });
  y += 1.5;
  doc.setDrawColor(...ACCENT).setLineWidth(0.4).line(ML, y, W - MR, y);
  y += 10;

  // Destinataire, lieu et date
  const DX = 120;
  doc.setFontSize(10).setTextColor(...ENCRE);
  destinataire.forEach((l, i) => {
    doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
    doc.text(net(l), DX, y);
    y += 5;
  });
  y += 4;
  doc.setFont('helvetica', 'normal').text(net(lieuDate), DX, y);
  y += 11;

  // Corps du courrier
  const liste = blocs(net(corps));
  const hauteur = (b) => {
    if (b.type === 'vide') return LH * 0.55;
    if (b.type === 'titre') return LH + 2.1;
    doc.setFont('helvetica', b.type === 'objet' ? 'bold' : 'normal').setFontSize(10);
    return doc.splitTextToSize(b.texte, LARGEUR - (b.type === 'puce' ? 5 : 0)).length * LH;
  };
  // La formule de politesse et la signature ne sont jamais séparées par un saut de page.
  const pleins = liste.map((b, i) => (b.type === 'vide' ? -1 : i)).filter((i) => i >= 0);
  const debutFin = pleins.length >= 3 ? pleins[pleins.length - 3] : -1;
  liste.forEach((b, i) => {
    if (i === debutFin) place(liste.slice(i).reduce((h, x) => h + hauteur(x), 0));
    if (b.type === 'vide') {
      y += LH * 0.55;
      return;
    }
    if (b.type === 'titre') {
      place(LH * 3);
      y += 1.5;
      doc.setFont('helvetica', 'bold').setFontSize(9.2).setTextColor(...ACCENT);
      doc.text(b.texte, ML, y, { charSpace: 0.25 });
      y += LH + 0.6;
      return;
    }
    doc.setFont('helvetica', b.type === 'objet' ? 'bold' : 'normal').setFontSize(10).setTextColor(...ENCRE);
    const retrait = b.type === 'puce' ? 5 : 0;
    doc.splitTextToSize(b.texte, LARGEUR - retrait).forEach((ligne, n) => {
      place(LH);
      if (retrait && n === 0) doc.text('–', ML, y);
      doc.text(ligne, ML + retrait, y);
      y += LH;
    });
  });

  // Pied de page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...ENCRE2);
    doc.text(net(pied), ML, H - 10);
    doc.text(`Page ${i}/${pages}`, W - MR, H - 10, { align: 'right' });
  }
  return doc;
}

/* Remise du fichier : dans Claude, la page passe par la capacité « downloads » ; en version autonome, par le navigateur. */
let promesse;
export function telechargements() {
  if (!promesse) {
    const c = window.claude;
    promesse = c && typeof c.use === 'function' ? Promise.resolve(c.use('downloads')).catch(() => null) : Promise.resolve(null);
  }
  return promesse;
}

/** @returns {Promise<'ok'|'refuse'|'indisponible'>} */
export async function exporterPdf(lettre, nomFichier, dl) {
  if (!pdfPret()) return 'indisponible';
  const doc = construirePdf(lettre);
  if (AUTONOME) {
    doc.save(nomFichier);
    return 'ok';
  }
  if (!dl) return 'indisponible';
  try {
    await dl.save({ filename: nomFichier, data: doc.output('blob') });
    return 'ok';
  } catch (e) {
    return e && e.code === 'declined' ? 'refuse' : 'indisponible';
  }
}

/* ---------- Remise d'un fichier quelconque (sauvegarde chiffrée, etc.) ---------- */
/** @returns {Promise<'ok'|'refuse'|'indisponible'>} */
export async function remettreFichier(nom, contenu, type, dl) {
  if (AUTONOME) {
    const url = URL.createObjectURL(new Blob([contenu], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'ok';
  }
  if (!dl) return 'indisponible';
  try {
    await dl.save({ filename: nom, data: contenu });
    return 'ok';
  } catch (e) {
    return e && e.code === 'declined' ? 'refuse' : 'indisponible';
  }
}
