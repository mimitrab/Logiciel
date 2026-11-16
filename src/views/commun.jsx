// Éléments partagés entre les écrans : icônes, saisie de la correction optique, suivi d'ordonnance.
import React, { useEffect, useState } from 'react';
import { Activity, Baby, ClipboardList, Eye, Glasses, Palette, ScanLine } from 'lucide-react';
import { Num, Pill, Progress, Segmented, cx } from '../ui.jsx';
import { MOTIFS, acteDe, correctionVide, seancesRestantes } from '../domain.js';
import { dpt, formuleCorrection, natureOeil } from '../letter.js';
import { num, setIn } from '../lib.js';
import { telechargements } from '../pdf.js';

export const ICONES_MOTIF = {
  bilan: ClipboardList, 'bilan-enfant': Baby, neurovisuel: Eye, 'basse-vision': Glasses, 'reeduc-adulte': Activity, 'reeduc-enfant': Activity, 'cv-auto': ScanLine, 'cv-goldmann': ScanLine, couleurs: Palette,
};
export const ICONES_BILAN = { bilan: ClipboardList, bebe: Baby, neurovisuel: Eye, 'basse-vision': Glasses, cv: ScanLine, couleurs: Palette };
export const TON_FAMILLE = { bilan: 'accent', reeducation: 'info', exploration: 'plum' };

/** Capacité de téléchargement de la page (undefined tant qu'elle n'a pas répondu, null si absente). */
export function useTelechargements() {
  const [dl, setDl] = useState(undefined);
  useEffect(() => {
    let vivant = true;
    telechargements().then((d) => vivant && setDl(d));
    return () => {
      vivant = false;
    };
  }, []);
  return dl;
}

/** Puissance en dioptries : boutons − et + pour le signe, saisie directe acceptée (« -1,25 »). */
export function Dioptrie({ id, label, value, onChange, signe = true }) {
  const brut = String(value ?? '');
  const negatif = brut.trim().startsWith('-');
  const grandeur = brut.replace(/^[-+\s]+/, '').replace('.', ',');
  const ecrire = (neg, g) => onChange(g || neg ? `${neg ? '-' : ''}${g.replace(',', '.')}` : '');
  const saisir = (texte) => {
    const neg = texte.includes('-') ? true : texte.includes('+') ? false : negatif;
    ecrire(signe && neg, texte.replace(/[^0-9.,]/g, ''));
  };
  const pas = (delta) => {
    const n = (num(brut) || 0) + delta;
    onChange(n === 0 ? '' : (signe ? n : Math.abs(n)).toFixed(2));
  };
  const arrondir = () => {
    const n = num(brut);
    if (n != null && n !== 0) onChange((signe ? n : Math.abs(n)).toFixed(2));
    else if (n === 0) onChange('');
  };
  return (
    <div className="flex min-w-0">
      {signe ? (
        <span className="signe" role="group" aria-label={`Signe, ${label}`}>
          <button type="button" className="moins" aria-pressed={negatif} aria-label={`${label} : valeur négative`} title="Négatif (myopie pour la sphère)" onClick={() => ecrire(true, grandeur)}>−</button>
          <button type="button" className="plus" aria-pressed={!negatif && !!grandeur} aria-label={`${label} : valeur positive`} title="Positif" onClick={() => ecrire(false, grandeur)}>+</button>
        </span>
      ) : (
        <span className="signe"><span className="inline-flex w-6 items-center justify-center bg-surface-2 font-mono text-[15px] text-ink-3" aria-hidden="true">+</span></span>
      )}
      <input
        id={id}
        className={cx('inp num', negatif && '!text-info font-medium')}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        aria-label={label}
        value={grandeur}
        onChange={(e) => saisir(e.target.value)}
        onBlur={arrondir}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') { e.preventDefault(); pas(0.25); }
          if (e.key === 'ArrowDown') { e.preventDefault(); pas(-0.25); }
          if (signe && e.key === '-') { e.preventDefault(); ecrire(true, grandeur); }
          if (signe && e.key === '+') { e.preventDefault(); ecrire(false, grandeur); }
        }}
      />
    </div>
  );
}

function Cellule({ label, className, children }) {
  return (
    <div className={cx('min-w-0', className)}>
      <span className="mb-1 block text-[11.5px] font-medium text-ink-3">{label}</span>
      {children}
    </div>
  );
}

export function CorrectionFields({ value, onChange, idp }) {
  const c = value || correctionVide();
  const set = (path, v) => onChange(setIn(c, path, v));
  const portee = c.type && c.type !== 'aucune';
  return (
    <div>
      <Segmented id={`${idp}-type`} label="Correction optique portée" value={c.type || 'aucune'} allowEmpty={false} onChange={(v) => set('type', v)} options={[['aucune', 'Aucune'], ['lunettes', 'Lunettes'], ['lentilles', 'Lentilles']]} />
      {portee && (
        <div className="mt-3 flex flex-col gap-3">
          {['od', 'og'].map((o) => {
            const nom = o.toUpperCase();
            const v = c[o] || {};
            const nature = natureOeil(v);
            return (
              <div key={o}>
                <div className="flex flex-wrap items-end gap-x-2 gap-y-2">
                  <span className="w-[26px] pb-2 font-mono text-[12.5px] font-medium text-ink-2">{nom}</span>
                  <Cellule label="Sphère" className="w-[132px]"><Dioptrie id={`${idp}-${o}-sph`} label={`Sphère ${nom}`} value={v.sph} onChange={(x) => set(`${o}.sph`, x)} /></Cellule>
                  <Cellule label="Cylindre" className="w-[132px]"><Dioptrie id={`${idp}-${o}-cyl`} label={`Cylindre ${nom}`} value={v.cyl} onChange={(x) => set(`${o}.cyl`, x)} /></Cellule>
                  <Cellule label="Axe" className="w-[78px]"><Num id={`${idp}-${o}-axe`} aria-label={`Axe ${nom}`} value={v.axe} step={5} min={0} max={180} unit="°" placeholder="0–180" onChange={(x) => set(`${o}.axe`, x)} /></Cellule>
                  <Cellule label="Addition" className="w-[104px]"><Dioptrie id={`${idp}-${o}-add`} label={`Addition ${nom}`} value={v.add} signe={false} onChange={(x) => set(`${o}.add`, x)} /></Cellule>
                </div>
                {nature && <p className="ml-[34px] mt-1 text-[11.5px] text-ink-3">{nom} : {nature}</p>}
              </div>
            );
          })}
          <p className="rounded-md bg-surface-2 px-3 py-2 text-[12px] leading-snug text-ink-2">
            <span className="font-medium text-ink">Formule : </span>
            <span className="tnum font-mono">{formuleCorrection(c) || 'à saisir'}</span>
            <span className="mt-1 block text-ink-3">Le bouton − passe la valeur en négatif (myopie pour la sphère). La saisie directe « -1,25 » fonctionne aussi.</span>
          </p>
        </div>
      )}
    </div>
  );
}
export { dpt };

/** Jauge « séances effectuées / prescrites ». */
export function SuiviOrdonnance({ patient, compact }) {
  const o = patient.ordonnance;
  if (!o || !o.prescrites) return null;
  const reste = seancesRestantes(patient);
  const tone = reste === 0 ? 'danger' : reste <= 2 ? 'warn' : undefined;
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="tnum font-mono text-[13px] font-medium text-ink">
          {o.effectuees || 0}/{o.prescrites} <span className="font-sans text-[12px] font-normal text-ink-3">séances</span>
        </span>
        {compact ? (
          <span className="text-[12px] text-ink-3">{reste === 0 ? 'à renouveler' : `${reste} restante${reste > 1 ? 's' : ''}`}</span>
        ) : (
          <Pill tone={tone || 'neutral'}>{reste === 0 ? 'Ordonnance à renouveler' : `${reste} séance${reste > 1 ? 's' : ''} restante${reste > 1 ? 's' : ''}`}</Pill>
        )}
      </div>
      <Progress value={o.effectuees || 0} max={o.prescrites} tone={tone} />
    </div>
  );
}

/** Durée type d'une séance pour ce patient, d'après son âge. */
export function dureeSeance(patient, motifSelonAge) {
  const m = MOTIFS[motifSelonAge('reeduc-adulte', patient)];
  return m.plage;
}
export const libelleActe = (bareme, code) => acteDe(bareme, code).libelle;
