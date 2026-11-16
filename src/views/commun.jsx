// Éléments partagés entre les écrans : icônes de motif, saisie de la correction optique, suivi d'ordonnance.
import React from 'react';
import { Activity, Baby, ClipboardList, Glasses } from 'lucide-react';
import { Num, Pill, Progress, Segmented } from '../ui.jsx';
import { correctionVide, seancesRestantes } from '../domain.js';
import { setIn } from '../lib.js';

export const ICONES_MOTIF = { bilan: ClipboardList, reeducation: Activity, bebe: Baby, 'basse-vision': Glasses, neurovisuel: ClipboardList };

export function CorrectionFields({ value, onChange, idp }) {
  const c = value || correctionVide();
  const set = (path, v) => onChange(setIn(c, path, v));
  const colonnes = [
    ['sph', 'Sphère', 0.25],
    ['cyl', 'Cylindre', 0.25],
    ['axe', 'Axe', 5],
    ['add', 'Addition', 0.25],
  ];
  return (
    <div>
      <Segmented id={`${idp}-type`} label="Correction optique portée" value={c.type || 'aucune'} allowEmpty={false} onChange={(v) => set('type', v)} options={[['aucune', 'Aucune'], ['lunettes', 'Lunettes'], ['lentilles', 'Lentilles']]} />
      {c.type && c.type !== 'aucune' && (
        <div className="mt-3 grid grid-cols-[28px_repeat(4,minmax(0,1fr))] items-center gap-x-2 gap-y-1.5">
          <span />
          {colonnes.map(([k, l]) => (
            <span key={k} className="text-[11.5px] font-medium text-ink-3">{l}</span>
          ))}
          {['od', 'og'].map((o) => (
            <React.Fragment key={o}>
              <span className="font-mono text-[12.5px] font-medium text-ink-2">{o.toUpperCase()}</span>
              {colonnes.map(([k, l, step]) => (
                <Num key={k} id={`${idp}-${o}-${k}`} aria-label={`${l} ${o.toUpperCase()}`} value={c[o] ? c[o][k] : ''} step={step} placeholder={k === 'axe' ? '0–180' : '0,00'} onChange={(v) => set(`${o}.${k}`, v)} />
              ))}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

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
