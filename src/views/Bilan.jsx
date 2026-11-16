// Saisie clinique et générateur automatique du compte-rendu.
import React, { useState } from 'react';
import { ArrowLeft, Check, ChevronRight, ClipboardList, Copy, FileDown, FilePlus2, FileText, Lightbulb, Link2, PenLine, Plus, Receipt, RefreshCw, Scale, Send, Sparkles, Trash2, TriangleAlert, Undo2 } from 'lucide-react';
import { Area, AutoArea, Avatar, Btn, Card, Chip, ConfirmBtn, Empty, Field, Modal, Num, Pill, Segmented, Select, Tag, Text, cx, useApp } from '../ui.jsx';
import {
  ANCIENNETES, AV_VL, AV_VP, CIRCONSTANCES, CONCLUSIONS_COULEURS, CONTROLES, CV_DEFICITS, CV_FIABILITE, CV_TECHNIQUES, DEVIATIONS, DIAGNOSTICS, FREQUENCES, PLAINTES, POURSUITES, PRECISIONS, RESULTATS_CLASSEMENT, SACCADES,
  STATUTS_BILAN, STEREO, TEMPS_ECRAN, TESTS_CLASSEMENT, TYPES_BILAN, WORTH,
  avLabel, completude, cotation, evalFusion, evalPPC, indicationReeducation, lectureLang, normesTexte, resumeBilan, stereoOptions, suggererDiagnostics,
} from '../domain.js';
import { blocs, courrier, texteComplet } from '../letter.js';
import { contexteCourrier } from '../store.js';
import { AUTONOME, exporterPdf, pdfPret } from '../pdf.js';
import { ageTexte, dateCourte, nomComplet, num, setIn, slug } from '../lib.js';
import { CorrectionFields, ICONES_BILAN, useTelechargements } from './commun.jsx';

/* ---------- Briques de mise en page ---------- */
function Section({ n, id, title, right, children }) {
  return (
    <Card id={id} className="scroll-mt-3">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="tnum inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent-soft font-mono text-[12px] font-medium text-accent-strong">{n}</span>
          <h2 className="text-[15px] font-semibold leading-tight text-ink">{title}</h2>
        </div>
        {right}
      </header>
      <div className="flex flex-col gap-4 px-4 py-4">{children}</div>
    </Card>
  );
}
function Groupe({ label, hint, right, children }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-[12.5px] font-semibold text-ink">
          {label}
          {hint && <span className="ml-2 font-normal text-ink-3">{hint}</span>}
        </p>
        {right}
      </div>
      {children}
    </div>
  );
}
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------- Motif et anamnèse ---------- */
function SectionMotif({ n, d, set, patient, exploration }) {
  const m = d.motif;
  const recap = (
    <div className="rounded-md border border-line bg-surface-2 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
      <span className="font-medium text-ink">Repris du dossier.</span> Antécédents ophtalmologiques : {patient.antecedentsOph || 'aucun'}. Antécédents généraux : {patient.antecedentsGen || 'aucun'}.
    </div>
  );
  if (exploration)
    return (
      <Section n={n} id="sec-motif" title="Contexte de la demande">
        <Field label="Indication et contexte" htmlFor="b-notes">
          <Area id="b-notes" rows={3} value={m.notes} onChange={(v) => set('motif.notes', v)} placeholder="Pathologie suivie, question posée par le prescripteur, gêne décrite par le patient…" />
        </Field>
        {recap}
      </Section>
    );
  return (
    <Section n={n} id="sec-motif" title="Motif et anamnèse">
      <Groupe label="Plaintes et contexte">
        <div className="flex flex-wrap gap-2">
          {PLAINTES.map((p) => (
            <Chip key={p.k} id={`b-plainte-${p.k}`} checked={m.plaintes[p.k]} onChange={(v) => set(`motif.plaintes.${p.k}`, v)}>{p.label}</Chip>
          ))}
        </div>
        {m.plaintes.diplopie && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-md bg-surface-2 px-3 py-2">
            <span className="text-[12.5px] font-medium text-ink-2">Diplopie</span>
            <Segmented id="b-diplopie-freq" label="Fréquence de la diplopie" value={m.diplopieFrequence} onChange={(v) => set('motif.diplopieFrequence', v)} options={[['intermittente', 'Intermittente'], ['constante', 'Constante']]} />
            <Segmented id="b-diplopie-sens" label="Sens de la diplopie" value={m.diplopieSens} onChange={(v) => set('motif.diplopieSens', v)} options={[['horizontale', 'Horizontale'], ['verticale', 'Verticale'], ['oblique', 'Oblique']]} />
          </div>
        )}
      </Groupe>
      <Groupe label="Circonstances de survenue">
        <div className="flex flex-wrap gap-2">
          {CIRCONSTANCES.map((c) => (
            <Chip key={c.k} id={`b-circ-${c.k}`} checked={m.circonstances[c.k]} onChange={(v) => set(`motif.circonstances.${c.k}`, v)}>{c.label}</Chip>
          ))}
        </div>
      </Groupe>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ancienneté des signes" htmlFor="b-anciennete">
          <Select id="b-anciennete" value={m.anciennete} onChange={(v) => set('motif.anciennete', v)} options={ANCIENNETES.map((a) => [a, `Depuis ${a}`])} />
        </Field>
        <Field label="Temps d'écran quotidien" htmlFor="b-ecran">
          <Select id="b-ecran" value={m.tempsEcran} onChange={(v) => set('motif.tempsEcran', v)} options={TEMPS_ECRAN.map((t) => [t[0], t[1]])} />
        </Field>
      </div>
      <Field label="Précisions d'anamnèse" htmlFor="b-notes">
        <Area id="b-notes" value={m.notes} onChange={(v) => set('motif.notes', v)} placeholder="Contexte scolaire ou professionnel, traitements, examens déjà réalisés…" />
      </Field>
      {recap}
    </Section>
  );
}

/* ---------- Acuité visuelle et réfraction ---------- */
function GrilleAV({ d, set, dist, titre, echelle, options, normal }) {
  const lignes = [['sc', 'SC', 'sans correction'], ['ac', 'AC', 'avec correction']];
  const cible = d.av.correction.type && d.av.correction.type !== 'aucune' ? 'ac' : 'sc';
  return (
    <div className="min-w-0 rounded-lg border border-line p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-medium text-ink">
          {titre} <span className="font-normal text-ink-3">· {echelle}</span>
        </p>
        <button type="button" className="rounded text-[12px] font-medium text-accent hover:underline" onClick={() => set(`av.${cible}.${dist}`, { od: normal, og: normal, odg: normal })}>
          Tout à {normal}
        </button>
      </div>
      <div className="grid grid-cols-[24px_repeat(3,minmax(0,1fr))] items-center gap-x-2 gap-y-1.5">
        <span />
        {['OD', 'OG', 'ODG'].map((o) => (
          <span key={o} className="font-mono text-[11.5px] font-medium text-ink-3">{o}</span>
        ))}
        {lignes.map(([k, court, long]) => (
          <React.Fragment key={k}>
            <abbr title={long} className="font-mono text-[12px] font-medium text-ink-2 no-underline">{court}</abbr>
            {['od', 'og', 'odg'].map((o) => (
              <Select key={o} id={`b-av-${k}-${dist}-${o}`} aria-label={`Acuité ${long}, ${titre.toLowerCase()}, ${o.toUpperCase()}`} className="num" value={d.av[k][dist][o]} onChange={(v) => set(`av.${k}.${dist}.${o}`, v)} options={options.map((v) => [v, avLabel(v)])} />
            ))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function SectionAV({ n, d, set }) {
  return (
    <Section n={n} id="sec-av" title="Acuité visuelle et réfraction">
      <Groupe label="Correction portée" hint="reprise du dossier, modifiable pour ce bilan">
        <CorrectionFields idp="b-corr" value={d.av.correction} onChange={(c) => set('av.correction', c)} />
      </Groupe>
      <Groupe label="Acuité visuelle" hint="SC : sans correction · AC : avec correction">
        <div className="grid gap-3 lg:grid-cols-2">
          <GrilleAV d={d} set={set} dist="vl" titre="Vision de loin" echelle="Monoyer" options={AV_VL} normal="10/10" />
          <GrilleAV d={d} set={set} dist="vp" titre="Vision de près" echelle="Parinaud" options={AV_VP} normal="P2" />
        </div>
      </Groupe>
      <Groupe label="Œil directeur">
        <Segmented id="b-directeur" label="Œil directeur" value={d.av.directeur} onChange={(v) => set('av.directeur', v)} options={[['OD', 'Œil droit'], ['OG', 'Œil gauche']]} />
      </Groupe>
    </Section>
  );
}

/* ---------- Examen oculomoteur et binoculaire ---------- */
function LigneCover({ d, set, cond, dist }) {
  const c = d.om.cover[cond][dist];
  const chemin = `om.cover.${cond}.${dist}`;
  const id = `b-cover-${cond}-${dist}`;
  const nom = `${dist.toUpperCase()} ${cond.toUpperCase()}`;
  const dev = DEVIATIONS[c.type];
  const precisions = dev && PRECISIONS[dev.kind];
  return (
    <div className="grid grid-cols-[28px_minmax(0,1fr)_84px] items-center gap-2 sm:grid-cols-[28px_minmax(0,1.3fr)_84px_minmax(0,1fr)]">
      <span className="font-mono text-[12.5px] font-medium text-ink-2">{dist.toUpperCase()}</span>
      <Select id={`${id}-type`} aria-label={`Déviation ${nom}`} value={c.type} placeholder="Déviation" options={Object.entries(DEVIATIONS).map(([v, x]) => [v, x.label])} onChange={(v) => set(chemin, { type: v, valeur: DEVIATIONS[v] && DEVIATIONS[v].kind !== 'ortho' ? c.valeur : '', precision: '' })} />
      <Num id={`${id}-valeur`} aria-label={`Valeur de la déviation ${nom}`} unit="Δ" min={0} value={c.valeur} disabled={!dev || dev.kind === 'ortho'} onChange={(v) => set(`${chemin}.valeur`, v)} />
      <Select id={`${id}-precision`} aria-label={`Précision ${nom}`} className="col-span-2 col-start-2 sm:col-span-1 sm:col-start-auto" value={c.precision} placeholder={precisions ? 'Précision' : '—'} disabled={!precisions} options={(precisions || []).map((p) => [p[0], p[1]])} onChange={(v) => set(`${chemin}.precision`, v)} />
    </div>
  );
}

function Stereoscopie({ d, set }) {
  const st = d.om.stereo;
  const t = STEREO[st.test];
  const lecture = lectureLang(st);
  const aucune = t && t.kind === 'figures' && st.saisi && !Object.values(st.figures || {}).some(Boolean);
  return (
    <Groupe label="Vision stéréoscopique" right={lecture && <Pill tone={lecture.vues.length === lecture.total ? 'ok' : lecture.vuesStereo.length ? 'warn' : 'danger'}>{lecture.vues.length} figure{lecture.vues.length > 1 ? 's' : ''} sur {lecture.total}</Pill>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Test" htmlFor="b-stereo-test">
          <Select id="b-stereo-test" value={st.test} onChange={(v) => set('om.stereo', { test: v, figures: {}, saisi: false, resultat: '' })} options={Object.entries(STEREO).map(([k, x]) => [k, x.kind === 'figures' ? `${x.label} (${x.figures.length} figures)` : x.label])} />
        </Field>
        {t && t.kind === 'arc' && (
          <Field label="Résultat" htmlFor="b-stereo-resultat">
            <Select id="b-stereo-resultat" value={st.resultat} onChange={(v) => set('om.stereo.resultat', v)} options={stereoOptions(st.test)} />
          </Field>
        )}
      </div>
      {t && t.kind === 'figures' && (
        <div className="mt-3">
          <p className="mb-2 text-[12px] text-ink-3">Cochez les figures reconnues ({t.label} : résultat sur {t.figures.length}).</p>
          <div className="flex flex-wrap gap-2">
            {t.figures.map(([k, label, , disparite, mono]) => (
              <Chip key={k} id={`b-stereo-${k}`} checked={!!(st.figures && st.figures[k])} onChange={(v) => set('om.stereo', { ...st, figures: { ...st.figures, [k]: v }, saisi: true })}>
                {label}
                <span className="text-[11.5px] font-normal text-ink-3">{disparite}″{mono ? ', visible en monoculaire' : ''}</span>
              </Chip>
            ))}
            <Chip id="b-stereo-aucune" checked={aucune} onChange={(v) => set('om.stereo', { ...st, figures: {}, saisi: v })}>Aucune figure reconnue</Chip>
          </div>
        </div>
      )}
    </Groupe>
  );
}

function SectionOM({ n, d, set, normes }) {
  const om = d.om;
  const [montrerAC, setMontrerAC] = useState(false);
  const portee = d.av.correction.type && d.av.correction.type !== 'aucune';
  const acRempli = !!(om.cover.ac.vl.type || om.cover.ac.vp.type);
  const conditions = portee || acRempli || montrerAC ? ['sc', 'ac'] : ['sc'];
  const ppc = evalPPC(om.ppc.bris, normes);
  const fus = evalFusion(om.fusion, normes);
  const ou = (a) => (a.length === 2 ? 'de loin et de près' : `de ${a[0]}`);
  const basse = { 'vl-c': fus.cBas.includes('loin'), 'vp-c': fus.cBas.includes('près'), 'vl-d': fus.dBas.includes('loin'), 'vp-d': fus.dBas.includes('près') };
  return (
    <Section n={n} id="sec-om" title="Examen oculomoteur et binoculaire">
      <Groupe label="Examen sous écran (cover-test)" hint="déviation en dioptries prismatiques">
        <div className="flex flex-col gap-3">
          {conditions.map((cond) => (
            <div key={cond} className="rounded-lg border border-line p-3">
              <p className="mb-2 text-[12.5px] font-medium text-ink">{cond === 'sc' ? 'Sans correction (SC)' : 'Avec correction (AC)'}</p>
              <div className="flex flex-col gap-2">
                <LigneCover d={d} set={set} cond={cond} dist="vl" />
                <LigneCover d={d} set={set} cond={cond} dist="vp" />
              </div>
            </div>
          ))}
          {conditions.length === 1 && (
            <button type="button" onClick={() => setMontrerAC(true)} className="inline-flex items-center gap-1.5 self-start rounded text-[12.5px] font-medium text-accent hover:underline">
              <Plus size={13} aria-hidden="true" /> Ajouter la mesure avec correction (AC)
            </button>
          )}
        </div>
      </Groupe>

      <Groupe label="Motilité oculaire">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented id="b-motilite" label="Motilité oculaire" value={om.motilite} onChange={(v) => set('om.motilite', v)} options={[['normale', 'Normale'], ['limitation', 'Limitation'], ['hyperaction', 'Hyperaction']]} />
          {(om.motilite === 'limitation' || om.motilite === 'hyperaction') && (
            <Text id="b-motilite-detail" aria-label="Précision sur la motilité" className="min-w-[200px] flex-1" value={om.motiliteDetail} onChange={(v) => set('om.motiliteDetail', v)} placeholder="Ex. : déficit de l'abduction de l'œil droit" />
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Poursuites" htmlFor="b-poursuites"><Select id="b-poursuites" value={om.poursuites} onChange={(v) => set('om.poursuites', v)} options={POURSUITES.map((p) => [p, majuscule(p)])} /></Field>
          <Field label="Saccades" htmlFor="b-saccades"><Select id="b-saccades" value={om.saccades} onChange={(v) => set('om.saccades', v)} options={SACCADES.map((p) => [p, majuscule(p)])} /></Field>
        </div>
      </Groupe>

      <Groupe label="Punctum proximum de convergence (PPC)" hint={`norme : jusqu'à ${normes.ppc} cm`} right={ppc && <Pill tone={ppc.tone}>{ppc.label}</Pill>}>
        <div className="grid max-w-sm grid-cols-2 gap-3">
          <Field label="Bris" htmlFor="b-ppc-bris"><Num id="b-ppc-bris" unit="cm" min={0} value={om.ppc.bris} onChange={(v) => set('om.ppc.bris', v)} /></Field>
          <Field label="Récupération" htmlFor="b-ppc-recup"><Num id="b-ppc-recup" unit="cm" min={0} value={om.ppc.recup} onChange={(v) => set('om.ppc.recup', v)} /></Field>
        </div>
      </Groupe>

      <Groupe
        label="Amplitudes de fusion"
        hint="bris / récupération, en dioptries"
        right={
          fus.mesure && (
            <span className="flex flex-wrap gap-1.5">
              {fus.cBas.length > 0 && <Pill tone="warn">Convergence réduite {ou(fus.cBas)}</Pill>}
              {fus.dBas.length > 0 && <Pill tone="warn">Divergence réduite {ou(fus.dBas)}</Pill>}
              {!fus.cBas.length && !fus.dBas.length && <Pill tone="ok">Conformes aux normes</Pill>}
            </span>
          )
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {[['vl', 'Vision de loin', ''], ['vp', 'Vision de près', "'"]].map(([dist, titre, prime]) => (
            <div key={dist} className="min-w-0 rounded-lg border border-line p-3">
              <p className="mb-2 flex items-baseline justify-between gap-2 text-[13px] font-medium text-ink">
                {titre} <span className="text-[11px] font-normal text-ink-3">norme</span>
              </p>
              {[['d', 'Divergence', 'D'], ['c', 'Convergence', 'C']].map(([sens, nom, lettre]) => (
                <div key={sens} className="mb-1.5 grid grid-cols-[minmax(0,1fr)_54px_8px_54px_48px] items-center gap-1.5 last:mb-0">
                  <span className="truncate text-[12.5px] text-ink-2">
                    <span className="font-mono font-medium text-ink">{lettre}{prime}</span> {nom}
                  </span>
                  <Num id={`b-fusion-${dist}-${sens}-bris`} aria-label={`${nom}, ${titre.toLowerCase()}, bris`} placeholder="bris" min={0} value={om.fusion[dist][sens].bris} onChange={(v) => set(`om.fusion.${dist}.${sens}.bris`, v)} />
                  <span className="text-center text-ink-3">/</span>
                  <Num id={`b-fusion-${dist}-${sens}-recup`} aria-label={`${nom}, ${titre.toLowerCase()}, récupération`} placeholder="réc." min={0} value={om.fusion[dist][sens].recup} onChange={(v) => set(`om.fusion.${dist}.${sens}.recup`, v)} />
                  <span className={cx('tnum text-right font-mono text-[11.5px]', basse[`${dist}-${sens}`] ? 'font-medium text-warn' : 'text-ink-3')}>{normes.fusion[dist][sens].join('–')}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11.5px] leading-snug text-ink-3">
          Repères : normes d'Hugonnier ({normesTexte(normes)}). Une amplitude est signalée lorsqu'elle est inférieure à la borne basse. Ces valeurs se règlent dans les réglages du cabinet.
        </p>
      </Groupe>

      <Groupe label="Test de Worth" hint="verre rouge devant l'œil droit">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Vision de loin" htmlFor="b-worth-vl"><Select id="b-worth-vl" value={om.worth.vl} onChange={(v) => set('om.worth.vl', v)} options={WORTH.map((w) => [w[0], w[1]])} /></Field>
          <Field label="Vision de près" htmlFor="b-worth-vp"><Select id="b-worth-vp" value={om.worth.vp} onChange={(v) => set('om.worth.vp', v)} options={WORTH.map((w) => [w[0], w[1]])} /></Field>
        </div>
      </Groupe>

      <Stereoscopie d={d} set={set} />
    </Section>
  );
}

/* ---------- Champ visuel et vision des couleurs ---------- */
function ChampsCV({ d, set }) {
  const cv = d.cv;
  const goldmann = cv.technique === 'goldmann';
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Technique">
          <Segmented id="b-cv-technique" label="Technique de champ visuel" value={cv.technique} onChange={(v) => set('cv.technique', v)} options={[['auto', 'Automatisé'], ['goldmann', 'Goldmann']]} />
        </Field>
        <Field label={goldmann ? 'Isoptères explorés' : 'Programme et stratégie'} htmlFor="b-cv-programme">
          <Text id="b-cv-programme" value={cv.programme} onChange={(v) => set('cv.programme', v)} placeholder={goldmann ? 'Isoptères V4e, I4e et I2e' : 'Programme 24-2, stratégie SITA Standard'} />
        </Field>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {[['od', 'Œil droit'], ['og', 'Œil gauche']].map(([o, nom]) => {
          const x = cv[o];
          return (
            <div key={o} className="min-w-0 rounded-lg border border-line p-3">
              <p className="mb-2.5 text-[13px] font-medium text-ink">{nom}</p>
              <div className="flex flex-wrap items-end gap-3">
                <Field label={goldmann ? 'Coopération' : 'Fiabilité'}>
                  <Segmented id={`b-cv-${o}-fiabilite`} label={`${goldmann ? 'Coopération' : 'Fiabilité'}, ${nom}`} value={x.fiabilite} onChange={(v) => set(`cv.${o}.fiabilite`, v)} options={CV_FIABILITE.map((f) => [f, majuscule(f)])} />
                </Field>
                {!goldmann && (
                  <Field label="Déviation moyenne (MD)" htmlFor={`b-cv-${o}-md`} className="w-[130px]">
                    <div className="relative">
                      <Text id={`b-cv-${o}-md`} className="num pr-8" inputMode="text" value={x.md} onChange={(v) => set(`cv.${o}.md`, v.replace(/[^0-9.,+\-]/g, ''))} placeholder="-2,5" />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11.5px] text-ink-3">dB</span>
                    </div>
                  </Field>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Chip id={`b-cv-${o}-normal`} checked={x.normal} onChange={(v) => set(`cv.${o}`, { ...x, normal: v, deficits: v ? {} : x.deficits })}>Dans les limites de la normale</Chip>
                {CV_DEFICITS.map(([k, label]) => (
                  <Chip key={k} id={`b-cv-${o}-${k}`} checked={!!(x.deficits && x.deficits[k])} onChange={(v) => set(`cv.${o}`, { ...x, normal: v ? false : x.normal, deficits: { ...x.deficits, [k]: v } })}>{label}</Chip>
                ))}
              </div>
              <Field label="Précision" htmlFor={`b-cv-${o}-notes`} className="mt-3">
                <Text id={`b-cv-${o}-notes`} value={x.notes} onChange={(v) => set(`cv.${o}.notes`, v)} placeholder="Localisation, étendue, évolution par rapport au relevé précédent…" />
              </Field>
            </div>
          );
        })}
      </div>
      <Field label="Commentaire sur l'examen" htmlFor="b-cv-commentaire">
        <Area id="b-cv-commentaire" value={cv.commentaire} onChange={(v) => set('cv.commentaire', v)} placeholder="Conditions d'examen, correction utilisée, congruence entre les deux yeux…" />
      </Field>
    </div>
  );
}

function ChampsCouleurs({ d, set }) {
  const k = d.couleurs;
  return (
    <div className="flex flex-col gap-4">
      <Groupe label="Test d'Ishihara" hint="planches lues, en monoculaire">
        <div className="grid gap-3 sm:grid-cols-2">
          {[['od', 'Œil droit'], ['og', 'Œil gauche']].map(([o, nom]) => (
            <div key={o} className="flex items-end gap-2">
              <Field label={nom} htmlFor={`b-ishihara-${o}-lues`} className="w-[92px]"><Num id={`b-ishihara-${o}-lues`} min={0} value={k.ishihara[o].lues} onChange={(v) => set(`couleurs.ishihara.${o}.lues`, v)} /></Field>
              <span className="pb-2 text-[12.5px] text-ink-3">sur</span>
              <Num id={`b-ishihara-${o}-total`} aria-label={`Nombre de planches présentées, ${nom}`} className="w-[76px]" min={1} placeholder="17" value={k.ishihara[o].total} onChange={(v) => set(`couleurs.ishihara.${o}.total`, v)} />
            </div>
          ))}
        </div>
      </Groupe>
      <Groupe label="Test de classement">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Test" htmlFor="b-classement-test"><Select id="b-classement-test" value={k.classement.test} onChange={(v) => set('couleurs.classement.test', v)} options={Object.entries(TESTS_CLASSEMENT).map(([id, t]) => [id, t.label])} /></Field>
          <Field label="Œil droit" htmlFor="b-classement-od"><Select id="b-classement-od" value={k.classement.od} disabled={!k.classement.test} onChange={(v) => set('couleurs.classement.od', v)} options={RESULTATS_CLASSEMENT.map((r) => [r[0], r[1]])} /></Field>
          <Field label="Œil gauche" htmlFor="b-classement-og"><Select id="b-classement-og" value={k.classement.og} disabled={!k.classement.test} onChange={(v) => set('couleurs.classement.og', v)} options={RESULTATS_CLASSEMENT.map((r) => [r[0], r[1]])} /></Field>
        </div>
      </Groupe>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Conclusion de l'examen" htmlFor="b-couleurs-conclusion"><Select id="b-couleurs-conclusion" value={k.conclusion} onChange={(v) => set('couleurs.conclusion', v)} options={CONCLUSIONS_COULEURS.map((c) => [c[0], c[1]])} /></Field>
        <Field label="Commentaire" htmlFor="b-couleurs-commentaire"><Text id="b-couleurs-commentaire" value={k.commentaire} onChange={(v) => set('couleurs.commentaire', v)} placeholder="Conditions d'éclairage, coopération…" /></Field>
      </div>
    </div>
  );
}

function SectionComplements({ n, d, set }) {
  return (
    <Section n={n} id="sec-complements" title="Examens complémentaires">
      <div className="flex flex-wrap gap-2">
        <Chip id="b-cv-fait" checked={d.cv.fait} onChange={(v) => set('cv.fait', v)}>Champ visuel réalisé</Chip>
        <Chip id="b-couleurs-fait" checked={d.couleurs.fait} onChange={(v) => set('couleurs.fait', v)}>Vision des couleurs étudiée</Chip>
      </div>
      {d.cv.fait && (
        <div className="border-t border-line pt-4">
          <p className="mb-3 text-[13px] font-semibold text-ink">Champ visuel</p>
          <ChampsCV d={d} set={set} />
        </div>
      )}
      {d.couleurs.fait && (
        <div className="border-t border-line pt-4">
          <p className="mb-3 text-[13px] font-semibold text-ink">Vision des couleurs</p>
          <ChampsCouleurs d={d} set={set} />
        </div>
      )}
    </Section>
  );
}

/* ---------- Conclusion et projet thérapeutique ---------- */
function SectionConclusion({ n, d, set, normes, type }) {
  const k = d.conclusion;
  const sugg = suggererDiagnostics(d, normes, type);
  const ind = indicationReeducation(d, normes, type);
  const aAppliquer = DIAGNOSTICS.filter((x) => sugg[x.k] && !k.diag[x.k]);
  const appliquer = () => {
    let c = { ...k, diag: { ...k.diag } };
    aAppliquer.forEach((x) => { c.diag[x.k] = true; });
    if (sugg.amblyopie && !c.amblyopieOeil) c = { ...c, amblyopieOeil: sugg.amblyopieOeil };
    set('conclusion', c);
  };
  return (
    <Section n={n} id="sec-conclusion" title="Conclusion et projet thérapeutique">
      <Groupe
        label="Conclusion diagnostique"
        right={
          aAppliquer.length > 0 && (
            <button type="button" onClick={appliquer} className="inline-flex items-center gap-1.5 rounded text-[12px] font-medium text-accent hover:underline">
              <Lightbulb size={13} aria-hidden="true" /> Appliquer {aAppliquer.length > 1 ? `les ${aAppliquer.length} suggestions` : 'la suggestion'}
            </button>
          )
        }
      >
        <div className="flex flex-wrap gap-2">
          {DIAGNOSTICS.map((x) => (
            <Chip key={x.k} id={`b-diag-${x.k}`} checked={k.diag[x.k]} suggested={sugg[x.k]} onChange={(v) => set(`conclusion.diag.${x.k}`, v)}>{x.label}</Chip>
          ))}
        </div>
        {aAppliquer.length > 0 && <p className="mt-2 text-[11.5px] text-ink-3">Le point orange signale une conclusion cohérente avec les mesures saisies. La décision reste la vôtre.</p>}
        {(k.diag.paralysie || k.diag.amblyopie) && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {k.diag.paralysie && (
              <Field label="Paralysie : précision" htmlFor="b-paralysie"><Text id="b-paralysie" value={k.paralysieDetail} onChange={(v) => set('conclusion.paralysieDetail', v)} placeholder="Ex. : atteinte du VI droit" /></Field>
            )}
            {k.diag.amblyopie && (
              <Field label="Œil amblyope">
                <Segmented id="b-amblyopie-oeil" label="Œil amblyope" value={k.amblyopieOeil} onChange={(v) => set('conclusion.amblyopieOeil', v)} options={[['OD', 'Œil droit'], ['OG', 'Œil gauche']]} />
              </Field>
            )}
          </div>
        )}
      </Groupe>

      <Groupe label="Projet thérapeutique">
        <div className={cx('mb-3 flex gap-2.5 rounded-lg border px-3.5 py-3 text-[12.5px] leading-relaxed', ind.ok ? 'border-ok bg-ok-soft' : 'border-line bg-surface-2')} id="b-regle">
          <Scale size={16} className={cx('mt-0.5 flex-none', ind.ok ? 'text-ok' : 'text-ink-3')} aria-hidden="true" />
          <div className="min-w-0 text-ink">
            <p className="font-semibold">
              {ind.ok ? 'Rééducation envisageable : signes fonctionnels et cliniques concordants.' : "Pas d'indication de rééducation : il faut à la fois des signes fonctionnels et des signes cliniques."}
            </p>
            <p className="text-ink-2">Signes fonctionnels : {ind.fonctionnels.length ? ind.fonctionnels.join(', ') : 'aucun'}.</p>
            <p className="text-ink-2">Signes cliniques : {ind.cliniques.length ? ind.cliniques.join(', ') : 'aucun'}.</p>
            {!ind.ok && <p className="mt-1 text-ink-3">Le compte-rendu conclura à l'absence d'indication de rééducation orthoptique.</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip id="b-reeducation" checked={k.reeducation && ind.ok} disabled={!ind.ok} onChange={(v) => set('conclusion.reeducation', v)}>Rééducation orthoptique</Chip>
          <Chip id="b-exercices" checked={k.exercices} onChange={(v) => set('conclusion.exercices', v)}>Exercices à domicile</Chip>
          <Chip id="b-conseils" checked={k.conseils} onChange={(v) => set('conclusion.conseils', v)}>Conseils d'hygiène visuelle</Chip>
          <Chip id="b-avis" checked={k.avisOphtalmo} onChange={(v) => set('conclusion.avisOphtalmo', v)}>Contrôle ophtalmologique</Chip>
          <Chip id="b-prismation" checked={k.prismation} onChange={(v) => set('conclusion.prismation', v)}>Prismation à discuter</Chip>
          <Chip id="b-occlusion" checked={k.occlusion} onChange={(v) => set('conclusion.occlusion', v)}>Occlusion ou pénalisation</Chip>
        </div>
        {k.reeducation && ind.ok && (
          <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md bg-surface-2 px-3 py-3">
            <Field label="Séances recommandées" htmlFor="b-nb-seances" className="w-[150px]">
              <Num id="b-nb-seances" min={1} max={60} unit="séances" inputClassName="!pr-16" value={k.nbSeances} onChange={(v) => set('conclusion.nbSeances', v)} />
            </Field>
            <div className="flex flex-wrap gap-1.5 pb-0.5">
              {[6, 10, 12, 15, 20].map((nb) => (
                <button key={nb} type="button" onClick={() => set('conclusion.nbSeances', nb)} className={cx('tnum h-8 min-w-[36px] rounded-md border px-2 font-mono text-[12.5px] font-medium transition-colors', Number(k.nbSeances) === nb ? 'border-accent bg-accent text-on-accent' : 'border-line-strong bg-surface text-ink-2 hover:border-ink-3')}>
                  {nb}
                </button>
              ))}
            </div>
            <Field label="Rythme" htmlFor="b-frequence" className="min-w-[190px] flex-1">
              <Select id="b-frequence" value={k.frequence} placeholder={null} onChange={(v) => set('conclusion.frequence', v)} options={FREQUENCES.map((f) => [f[0], f[1]])} />
            </Field>
          </div>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Bilan de contrôle" htmlFor="b-controle">
            <Select id="b-controle" value={k.controle} placeholder="Non prévu" onChange={(v) => set('conclusion.controle', v)} options={CONTROLES.map((c) => [c, `Dans ${c}`])} />
          </Field>
        </div>
      </Groupe>
      <Field label="Commentaire libre ajouté à la conclusion" htmlFor="b-commentaire">
        <Area id="b-commentaire" value={k.commentaire} onChange={(v) => set('conclusion.commentaire', v)} placeholder="Élément clinique particulier, coopération de l'enfant, souhait du patient…" />
      </Field>
    </Section>
  );
}

function SectionConclusionExploration({ n, d, set, type }) {
  const k = d.conclusion;
  return (
    <Section n={n} id="sec-conclusion" title="Conclusion">
      <p className="rounded-md bg-surface-2 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
        {type === 'cv' ? "Le compte-rendu décrit le relevé et laisse son interprétation au médecin prescripteur. Les relevés sont annoncés en pièces jointes." : "Le compte-rendu reprend la conclusion choisie dans la rubrique précédente et annonce les feuilles de résultats en pièces jointes."}
      </p>
      <Field label="Commentaire libre" htmlFor="b-commentaire">
        <Area id="b-commentaire" value={k.commentaire} onChange={(v) => set('conclusion.commentaire', v)} placeholder="Élément à porter à l'attention du prescripteur…" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Examen de contrôle" htmlFor="b-controle">
          <Select id="b-controle" value={k.controle} placeholder="Non prévu" onChange={(v) => set('conclusion.controle', v)} options={CONTROLES.map((c) => [c, `Dans ${c}`])} />
        </Field>
      </div>
    </Section>
  );
}

/* ---------- Courrier : en-tête, aperçu A4, export ---------- */
function Entete({ lettre }) {
  return (
    <>
      <p className="text-[1.22em] font-bold leading-tight text-paper-accent">{lettre.entete[0]}</p>
      <div className="mt-1 text-[0.86em] leading-snug text-paper-ink-2">
        {lettre.entete.slice(1).map((l) => (
          <p key={l}>{l}</p>
        ))}
      </div>
      <div className="paper-rule mt-2.5" />
      <div className="mt-5 flex justify-end">
        <div className="w-[48%] min-w-[150px] leading-snug">
          <p className="font-bold">{lettre.destinataire[0]}</p>
          {lettre.destinataire.slice(1).map((l) => (
            <p key={l}>{l}</p>
          ))}
          <p className="mt-3">{lettre.lieuDate}</p>
        </div>
      </div>
    </>
  );
}

function ApercuPDF({ lettre, nomFichier, patient, onClose, onCopy }) {
  const { toast, actions } = useApp();
  const dl = useTelechargements();
  const [occupe, setOccupe] = useState(false);
  const possible = pdfPret() && (AUTONOME || !!dl);
  const enAttente = !AUTONOME && dl === undefined;
  const exporter = async () => {
    setOccupe(true);
    const r = await exporterPdf(lettre, nomFichier, dl);
    setOccupe(false);
    if (r === 'ok') {
      actions.tracer('cr.export', nomComplet(patient));
      toast(`Fichier remis : ${nomFichier}`);
    } else if (r === 'refuse') toast('Export annulé.');
    else toast("L'export PDF n'est pas disponible dans cet affichage. Copiez le texte à la place.", 'danger');
  };
  return (
    <Modal
      size="lg"
      title="Aperçu avant export"
      subtitle={nomFichier}
      onClose={onClose}
      footer={
        <>
          {!possible && !enAttente && <span className="mr-auto max-w-sm text-[12px] leading-snug text-ink-3">Le téléchargement n'est pas proposé dans cet affichage : l'aperçu reste fidèle au document, et le texte peut être copié.</span>}
          <Btn icon={Copy} onClick={onCopy}>Copier le texte</Btn>
          {(possible || enAttente) && (
            <Btn variant="primary" icon={FileDown} disabled={!possible || occupe} onClick={exporter}>
              {occupe ? 'Préparation…' : 'Télécharger le PDF'}
            </Btn>
          )}
        </>
      }
    >
      <div className="-mx-5 -my-4 bg-surface-2 px-3 py-5 sm:px-8">
        <div className="paper mx-auto flex w-full max-w-[720px] flex-col px-[8.5%] py-[7%] text-[12px] leading-[1.55] sm:text-[13.5px]" style={{ minHeight: 'min(1018px, 134vw)' }}>
          <Entete lettre={lettre} />
          <div className="mt-6 flex-1">
            {blocs(lettre.corps).map((b, i) => {
              if (b.type === 'vide') return <div key={i} className="h-[0.75em]" />;
              if (b.type === 'titre') return <p key={i} className="paper-title mt-[0.3em]">{b.texte}</p>;
              if (b.type === 'objet') return <p key={i} className="font-bold">{b.texte}</p>;
              if (b.type === 'puce')
                return (
                  <p key={i} className="flex gap-[0.6em]">
                    <span>–</span>
                    <span>{b.texte}</span>
                  </p>
                );
              return <p key={i}>{b.texte}</p>;
            })}
          </div>
          <div className="mt-8 border-t border-paper-line pt-2 text-[0.78em] text-paper-ink-2">{lettre.pied}</div>
        </div>
      </div>
    </Modal>
  );
}

function PanneauCR({ bilan, patient }) {
  const { state, actions, toast, go } = useApp();
  const [apercu, setApercu] = useState(false);
  const c = completude(bilan.data);
  const lettre = courrier(patient, bilan, contexteCourrier(state, bilan.praticienId));
  const facture = state.factures.find((f) => f.bilanId === bilan.id);
  const type = TYPES_BILAN[bilan.type];
  const nomFichier = `${slug(type.objet).replace(/^./, (x) => x.toUpperCase())}_${slug(patient.nom).toUpperCase()}-${slug(patient.prenom)}_${bilan.date}.pdf`;
  const parties = type.exploration
    ? [['Contexte', c.motif], [bilan.type === 'cv' ? 'Champ visuel' : 'Vision des couleurs', bilan.type === 'cv' ? c.cv : c.couleurs]]
    : [['Anamnèse', c.motif], ['Acuité', c.av], ['Oculomoteur', c.om], ['Conclusion', c.conclusion]];
  const opposition = patient.rgpd && patient.rgpd.transmission === 'opposition';

  const copier = async () => {
    const texte = texteComplet(lettre);
    let ok = false;
    try {
      await navigator.clipboard.writeText(texte);
      ok = true;
    } catch (e) {
      const zone = document.createElement('textarea');
      zone.value = texte;
      zone.setAttribute('readonly', '');
      zone.style.position = 'fixed';
      zone.style.opacity = '0';
      document.body.appendChild(zone);
      zone.select();
      try {
        ok = document.execCommand('copy');
      } catch (err) {
        ok = false;
      }
      document.body.removeChild(zone);
    }
    if (ok) actions.tracer('cr.copie', nomComplet(patient));
    toast(ok ? 'Compte-rendu copié dans le presse-papiers' : 'Copie refusée par le navigateur : sélectionnez le texte du courrier pour le copier.', ok ? undefined : 'danger');
  };

  if (!bilan.cr) {
    return (
      <Card className="overflow-hidden">
        <div className="flex flex-col items-start gap-4 px-5 py-6">
          <div className="flex items-center gap-2 text-accent">
            <FileText size={18} aria-hidden="true" />
            <h2 className="text-[16px] font-semibold text-ink">Compte-rendu au médecin prescripteur</h2>
          </div>
          <p className="max-w-prose text-[13px] leading-relaxed text-ink-2">
            Le courrier est rédigé à partir de la saisie : en-tête du cabinet, contexte, synthèse de l'examen, conclusion et conduite à tenir. Les rubriques laissées vides sont simplement omises.
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {parties.map(([label, ok]) => (
              <li key={label}>
                <Pill tone={ok ? 'ok' : 'neutral'} icon={ok ? Check : undefined}>{label}{ok ? '' : ' : à saisir'}</Pill>
              </li>
            ))}
          </ul>
          <Btn variant="primary" size="lg" icon={Sparkles} className="w-full sm:w-auto" onClick={() => actions.genererCR(bilan.id)}>
            Générer le compte-rendu médical
          </Btn>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-accent" aria-hidden="true" />
          <h2 className="text-[14.5px] font-semibold text-ink">Compte-rendu</h2>
          <Pill tone={STATUTS_BILAN[bilan.statut].tone}>{STATUTS_BILAN[bilan.statut].label}</Pill>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn size="sm" icon={Copy} onClick={copier}>Copier</Btn>
          <Btn size="sm" icon={FileDown} onClick={() => setApercu(true)}>Export PDF</Btn>
        </div>
      </header>

      <div className={cx('flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-[12.5px]', bilan.cr.modifie ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent-strong')}>
        <span className="flex min-w-0 items-center gap-1.5">
          {bilan.cr.modifie ? <PenLine size={13} className="flex-none" aria-hidden="true" /> : <Link2 size={13} className="flex-none" aria-hidden="true" />}
          {bilan.cr.modifie ? 'Texte retouché à la main : il ne suit plus la saisie.' : 'Synchronisé avec la saisie : chaque mesure modifiée met le courrier à jour.'}
        </span>
        {bilan.cr.modifie && <ConfirmBtn label="Régénérer" confirmLabel="Écraser mes retouches" icon={RefreshCw} onConfirm={() => actions.genererCR(bilan.id)} />}
      </div>
      {opposition && (
        <p className="flex items-start gap-2 bg-danger-soft px-4 py-2 text-[12.5px] text-danger">
          <TriangleAlert size={14} className="mt-0.5 flex-none" aria-hidden="true" />
          <span className="text-ink">Le patient s'est opposé à la transmission de ses comptes-rendus au médecin prescripteur : l'envoi est bloqué tant que le dossier l'indique.</span>
        </p>
      )}

      <div className="bg-surface-2 px-3 py-4 sm:px-5">
        <div className="paper px-5 py-6 text-[13px] leading-[1.55] sm:px-8 sm:py-8">
          <Entete lettre={lettre} />
          <AutoArea id={`cr-texte-${bilan.id}`} aria-label="Texte du compte-rendu, modifiable" className="paper-body mt-6" value={bilan.cr.texte} onChange={(t) => actions.editerCR(bilan.id, t)} />
        </div>
        <p className="mt-2 text-center text-[11.5px] text-ink-3">Cliquez dans le courrier pour le modifier. L'en-tête reprend le cabinet et votre compte.</p>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
        {facture ? (
          <Btn size="sm" variant="ghost" icon={Receipt} onClick={() => go('facturation')}>Facturé en {cotation(facture.coef)}</Btn>
        ) : (
          <Btn size="sm" icon={Receipt} onClick={() => actions.facturerBilan(bilan.id)}>Facturer cet acte</Btn>
        )}
        {bilan.statut === 'envoye' ? (
          <Btn size="sm" variant="ghost" icon={Undo2} onClick={() => actions.statutBilan(bilan.id, 'a-envoyer')}>Repasser en « à envoyer »</Btn>
        ) : (
          <Btn size="sm" variant="primary" icon={Send} disabled={opposition} onClick={() => actions.statutBilan(bilan.id, 'envoye')}>Marquer comme envoyé</Btn>
        )}
      </footer>
      {apercu && <ApercuPDF lettre={lettre} nomFichier={nomFichier} patient={patient} onClose={() => setApercu(false)} onCopy={copier} />}
    </Card>
  );
}

/* ---------- Éditeur d'un bilan ---------- */
function Editeur({ bilan, patient }) {
  const { state, actions, go } = useApp();
  const d = bilan.data;
  const normes = state.normes;
  const set = (path, v) => actions.modifierBilan(bilan.id, (b) => ({ ...b, data: setIn(b.data, path, v) }));
  const meta = (k) => (v) => actions.modifierBilan(bilan.id, (b) => ({ ...b, [k]: v }));
  const c = completude(d);
  const exploration = !!TYPES_BILAN[bilan.type].exploration;
  const etapes = exploration
    ? [['sec-motif', 'Contexte', c.motif], ['sec-av', 'Acuité et réfraction', c.av], bilan.type === 'cv' ? ['sec-cv', 'Champ visuel', c.cv] : ['sec-couleurs', 'Vision des couleurs', c.couleurs], ['sec-conclusion', 'Conclusion', c.conclusion]]
    : [['sec-motif', 'Motif et anamnèse', c.motif], ['sec-av', 'Acuité et réfraction', c.av], ['sec-om', 'Oculomoteur et binoculaire', c.om], ['sec-complements', 'Examens complémentaires', d.cv.fait || d.couleurs.fait], ['sec-conclusion', 'Conclusion et projet', c.conclusion]];
  const presc = patient.prescripteur || {};
  const aller = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: 'start' });
  };

  return (
    <div className="flex flex-col gap-4">
      <button type="button" onClick={() => go('bilans')} className="inline-flex items-center gap-1.5 self-start rounded text-[13px] font-medium text-ink-2 hover:text-ink">
        <ArrowLeft size={15} aria-hidden="true" /> Tous les bilans
      </button>

      <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5">
        <button type="button" onClick={() => go('patients', { patientId: patient.id })} className="flex min-w-[200px] flex-1 items-center gap-3 rounded-md text-left" title="Ouvrir le dossier">
          <Avatar patient={patient} size={44} />
          <span className="min-w-0">
            <span className="block truncate font-display text-[18px] font-bold leading-tight text-ink">{nomComplet(patient)}</span>
            <span className="block truncate text-[12.5px] text-ink-2">
              {ageTexte(patient.ddn, bilan.date)}
              {presc.nom ? ` · adressé${patient.sexe === 'F' ? 'e' : ''} par le Dr ${presc.nom}` : ' · sans médecin prescripteur renseigné'}
            </span>
          </span>
        </button>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Date de l'examen" htmlFor="b-date" className="w-[150px]"><Text id="b-date" type="date" value={bilan.date} onChange={(v) => v && meta('date')(v)} /></Field>
          <Field label="Type d'examen" htmlFor="b-type" className="w-[190px]"><Select id="b-type" value={bilan.type} placeholder={null} onChange={meta('type')} options={Object.entries(TYPES_BILAN).map(([k, t]) => [k, t.label])} /></Field>
          {bilan.statut !== 'envoye' && <ConfirmBtn label="Supprimer" confirmLabel="Supprimer ce bilan" icon={Trash2} size="md" onConfirm={() => { actions.supprimerBilan(bilan.id); go('bilans'); }} />}
        </div>
      </Card>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <nav className="flex flex-wrap gap-1.5" aria-label="Rubriques du bilan">
            {etapes.map(([id, label, ok], i) => (
              <button key={id} type="button" onClick={() => aller(id)} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink">
                <span className={cx('h-1.5 w-1.5 rounded-full', ok ? 'bg-ok' : 'bg-line-strong')} aria-hidden="true" />
                {i + 1}. {label}
              </button>
            ))}
          </nav>
          <SectionMotif n={1} d={d} set={set} patient={patient} exploration={exploration} />
          <SectionAV n={2} d={d} set={set} />
          {exploration ? (
            <>
              {bilan.type === 'cv' ? (
                <Section n={3} id="sec-cv" title="Champ visuel"><ChampsCV d={d} set={set} /></Section>
              ) : (
                <Section n={3} id="sec-couleurs" title="Vision des couleurs"><ChampsCouleurs d={d} set={set} /></Section>
              )}
              <SectionConclusionExploration n={4} d={d} set={set} type={bilan.type} />
            </>
          ) : (
            <>
              <SectionOM n={3} d={d} set={set} normes={normes} />
              <SectionComplements n={4} d={d} set={set} />
              <SectionConclusion n={5} d={d} set={set} normes={normes} type={bilan.type} />
            </>
          )}
        </div>
        <div className="min-w-0 xl:sticky xl:top-0 xl:max-h-[calc(100dvh-1.75rem)] xl:overflow-y-auto xl:rounded-[10px]">
          <PanneauCR bilan={bilan} patient={patient} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Liste de travail ---------- */
function NouveauBilan({ onClose }) {
  const { state, actions } = useApp();
  const tries = [...state.patients].sort((a, b) => a.nom.localeCompare(b.nom));
  const [patientId, setPatientId] = useState(tries[0] ? tries[0].id : '');
  const [type, setType] = useState('bilan');
  const [technique, setTechnique] = useState('auto');
  return (
    <Modal
      size="sm"
      title="Nouveau bilan"
      onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Annuler</Btn>
          <Btn variant="primary" icon={FilePlus2} disabled={!patientId} onClick={() => { onClose(); actions.nouveauBilan(patientId, type, type === 'cv' ? technique : undefined); }}>Commencer la saisie</Btn>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label="Patient" htmlFor="nb-patient"><Select id="nb-patient" value={patientId} onChange={setPatientId} placeholder={null} options={tries.map((p) => [p.id, `${p.nom.toUpperCase()} ${p.prenom}`])} /></Field>
        <Field label="Type d'examen" htmlFor="nb-type"><Select id="nb-type" value={type} onChange={setType} placeholder={null} options={Object.entries(TYPES_BILAN).map(([k, t]) => [k, t.label])} /></Field>
        {type === 'cv' && (
          <Field label="Technique">
            <Segmented id="nb-technique" label="Technique de champ visuel" allowEmpty={false} value={technique} onChange={setTechnique} options={Object.entries(CV_TECHNIQUES).map(([k, t]) => [k, t.label])} />
          </Field>
        )}
      </div>
    </Modal>
  );
}

function Liste() {
  const { state, go } = useApp();
  const [filtre, setFiltre] = useState('tous');
  const [creation, setCreation] = useState(false);
  const compte = (s) => state.bilans.filter((b) => b.statut === s).length;
  const lignes = state.bilans.filter((b) => filtre === 'tous' || b.statut === filtre).sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Saisie clinique</p>
          <h1 className="mt-1 text-[25px] font-bold leading-tight text-ink">Bilans cliniques</h1>
          <p className="mt-1 text-[13.5px] text-ink-2">Bilans orthoptiques, champs visuels et vision des couleurs : le compte-rendu se rédige à partir de vos mesures.</p>
        </div>
        <Btn variant="primary" icon={FilePlus2} onClick={() => setCreation(true)}>Nouveau bilan</Btn>
      </div>
      <Segmented id="bilans-filtre" label="Filtrer les bilans" allowEmpty={false} value={filtre} onChange={setFiltre} options={[['tous', `Tous (${state.bilans.length})`], ['brouillon', `À rédiger (${compte('brouillon')})`], ['a-envoyer', `À envoyer (${compte('a-envoyer')})`], ['envoye', `Envoyés (${compte('envoye')})`]]} />
      <Card className="overflow-hidden">
        {lignes.length ? (
          <ul className="divide-y divide-line">
            {lignes.map((b) => {
              const p = state.patients.find((x) => x.id === b.patientId);
              if (!p) return null;
              return (
                <li key={b.id}>
                  <button type="button" onClick={() => go('bilans', { bilanId: b.id })} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 text-left transition-colors hover:bg-surface-2">
                    <span className="tnum w-[78px] flex-none font-mono text-[12.5px] text-ink-2">{dateCourte(b.date)}</span>
                    <span className="flex min-w-[190px] flex-1 items-center gap-3">
                      <Avatar patient={p} size={34} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium text-ink">{nomComplet(p)}</span>
                        <span className="block truncate text-[12px] text-ink-3">{resumeBilan(b)}</span>
                      </span>
                    </span>
                    <span className="flex-none sm:w-[190px]"><Tag icon={ICONES_BILAN[b.type]}>{TYPES_BILAN[b.type].label}</Tag></span>
                    <span className="flex w-[104px] flex-none justify-end"><Pill tone={STATUTS_BILAN[b.statut].tone}>{STATUTS_BILAN[b.statut].label}</Pill></span>
                    <ChevronRight size={15} className="hidden flex-none text-ink-3 sm:block" aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty icon={ClipboardList} title="Aucun bilan dans cette liste">Changez de filtre ou commencez un nouveau bilan.</Empty>
        )}
      </Card>
      {creation && <NouveauBilan onClose={() => setCreation(false)} />}
    </div>
  );
}

export default function Bilans({ bilanId }) {
  const { state } = useApp();
  const bilan = bilanId && state.bilans.find((b) => b.id === bilanId);
  const patient = bilan && state.patients.find((p) => p.id === bilan.patientId);
  return bilan && patient ? <Editeur key={bilan.id} bilan={bilan} patient={patient} /> : <Liste />;
}
