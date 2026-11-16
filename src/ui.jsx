// Composants d'interface partagés.
import React, { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { initiales } from './lib.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

/** Contexte applicatif : état, opérations, navigation, notifications. */
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

/** Le tracé d'une saccade : un regard qui saute d'un point de fixation au suivant. */
export const Logo = ({ size = 30 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <path d="M3 23h7v-7h8V9h8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="27" cy="9" r="2.6" fill="currentColor" />
    <circle cx="3" cy="23" r="1.6" fill="currentColor" opacity="0.55" />
  </svg>
);

const TAILLES = { sm: 'h-8 px-2.5 text-[12.5px]', md: 'h-9 px-3.5 text-[13.5px]', lg: 'h-11 px-5 text-[14.5px]' };
const VARIANTES = {
  primary: 'bg-accent text-on-accent hover:bg-accent-strong',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-surface-2',
  soft: 'bg-accent-soft text-accent-strong hover:bg-surface-2',
  ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  danger: 'border border-line-strong bg-surface text-danger hover:bg-danger-soft',
};
export function Btn({ variant = 'secondary', size = 'md', icon: Icon, children, className, ...p }) {
  return (
    <button type="button" className={cx('inline-flex flex-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50', TAILLES[size], VARIANTES[variant], className)} {...p}>
      {Icon && <Icon size={size === 'lg' ? 18 : 15} strokeWidth={2} aria-hidden="true" />}
      {children}
    </button>
  );
}
export function IconBtn({ icon: Icon, label, className, ...p }) {
  return (
    <button type="button" aria-label={label} title={label} className={cx('inline-flex h-8 w-8 flex-none items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink', className)} {...p}>
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

const TONS = {
  neutral: 'bg-surface-2 text-ink-2',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  accent: 'bg-accent-soft text-accent-strong',
  plum: 'bg-plum-soft text-plum',
};
export function Pill({ tone = 'neutral', icon: Icon, children, className }) {
  return (
    <span className={cx('inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium leading-5', TONS[tone], className)}>
      {Icon && <Icon size={12} className="flex-none" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  );
}
/** Étiquette de catégorie (motif du rendez-vous, type de bilan) : contour neutre, sans couleur d'état. */
export function Tag({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-0.5 text-[12px] font-medium leading-5 text-ink-2">
      {Icon && <Icon size={13} className="flex-none text-accent" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Field({ label, htmlFor, hint, className, children }) {
  return (
    <div className={cx('min-w-0', className)}>
      <label className="lbl" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11.5px] leading-snug text-ink-3">{hint}</p>}
    </div>
  );
}
export function Text({ id, value, onChange, className, ...p }) {
  return <input id={id} className={cx('inp', className)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p} />;
}
export function Area({ id, value, onChange, rows = 2, className, ...p }) {
  return <textarea id={id} rows={rows} className={cx('inp', className)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p} />;
}
export function Num({ id, value, onChange, unit, step = 1, className, inputClassName, ...p }) {
  return (
    <div className={cx('relative min-w-0', className)}>
      <input id={id} type="number" inputMode="decimal" step={step} className={cx('inp num', unit && 'pr-8', inputClassName)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p} />
      {unit && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11.5px] text-ink-3">{unit}</span>}
    </div>
  );
}
export function Select({ id, value, onChange, options, placeholder = '—', className, ...p }) {
  return (
    <select id={id} className={cx('inp', className)} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...p}>
      {placeholder !== null && <option value="">{placeholder}</option>}
      {options.map((o) => (Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>))}
    </select>
  );
}
export function Chip({ id, checked, onChange, suggested, disabled, children }) {
  return (
    <button type="button" id={id} role="checkbox" aria-checked={!!checked} disabled={disabled} onClick={() => !disabled && onChange(!checked)} className={cx('chip', checked && 'chip-on', disabled && 'cursor-not-allowed opacity-55')}>
      <span className="chip-box" aria-hidden="true">
        {checked && <Check size={11} strokeWidth={3.5} />}
      </span>
      {children}
      {suggested && !checked && <span className="chip-dot" title="Suggéré d'après les mesures saisies" />}
    </button>
  );
}
export function Segmented({ id, label, value, onChange, options, allowEmpty = true }) {
  return (
    <div id={id} role="radiogroup" aria-label={label} className="inline-flex max-w-full flex-wrap rounded-md border border-line-strong bg-surface p-0.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(value === v && allowEmpty ? '' : v)} className={cx('h-7 rounded px-2.5 text-[12.5px] font-medium transition-colors', value === v ? 'bg-accent text-on-accent' : 'text-ink-2 hover:bg-surface-2 hover:text-ink')}>
          {l}
        </button>
      ))}
    </div>
  );
}

export function Card({ className, children, ...p }) {
  return (
    <section className={cx('card', className)} {...p}>
      {children}
    </section>
  );
}
export function CardHead({ title, hint, right, icon: Icon }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        {Icon && <Icon size={16} className="flex-none text-accent" aria-hidden="true" />}
        <h2 className="text-[14.5px] font-semibold leading-tight text-ink">{title}</h2>
        {hint && <span className="text-[12px] text-ink-3">{hint}</span>}
      </div>
      {right}
    </header>
  );
}
export function Avatar({ patient, size = 36 }) {
  return (
    <span className="inline-flex flex-none items-center justify-center rounded-full bg-accent-soft font-display font-semibold text-accent-strong" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      {initiales(patient)}
    </span>
  );
}
export function Progress({ value, max, tone }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cx('h-full rounded-full', tone === 'danger' ? 'bg-danger' : tone === 'warn' ? 'bg-warn' : 'bg-accent')} style={{ width: `${pct}%` }} />
    </div>
  );
}
export function Empty({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      {Icon && <Icon size={26} className="text-ink-3" aria-hidden="true" />}
      <p className="font-medium text-ink">{title}</p>
      {children && <div className="max-w-sm text-[13px] text-ink-3">{children}</div>}
    </div>
  );
}

/** Encadré d'information ou d'alerte. */
export function Notice({ tone = 'info', icon: Icon, title, children, className }) {
  const tons = { info: 'border-info bg-info-soft text-info', warn: 'border-warn bg-warn-soft text-warn', danger: 'border-danger bg-danger-soft text-danger', ok: 'border-ok bg-ok-soft text-ok', neutral: 'border-line bg-surface-2 text-ink-2' };
  return (
    <div className={cx('flex gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] leading-relaxed', tons[tone], className)}>
      {Icon && <Icon size={16} className="mt-0.5 flex-none" aria-hidden="true" />}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={tone === 'neutral' ? '' : 'text-ink'}>{children}</div>
      </div>
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    if (ref.current) ref.current.focus();
    return () => window.removeEventListener('keydown', h);
  }, []);
  const largeur = { sm: 'sm:max-w-md', md: 'sm:max-w-2xl', lg: 'sm:max-w-4xl' }[size];
  return (
    <div className="modal-scrim fixed inset-0 z-50 flex items-end justify-center sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={cx('flex max-h-full w-full flex-col bg-surface shadow-lg outline-none sm:rounded-xl', largeur)}>
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold leading-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
          </div>
          <IconBtn icon={X} label="Fermer" onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

/** Bouton à double validation : remplace les boîtes de confirmation du navigateur. */
export function ConfirmBtn({ label, confirmLabel = 'Confirmer', onConfirm, icon, size = 'sm' }) {
  const [arme, setArme] = useState(false);
  useEffect(() => {
    if (!arme) return undefined;
    const t = setTimeout(() => setArme(false), 4000);
    return () => clearTimeout(t);
  }, [arme]);
  return arme ? (
    <Btn variant="danger" size={size} icon={icon} onClick={() => { setArme(false); onConfirm(); }}>
      {confirmLabel}
    </Btn>
  ) : (
    <Btn variant="ghost" size={size} icon={icon} onClick={() => setArme(true)}>
      {label}
    </Btn>
  );
}

/** Zone de texte qui s'agrandit avec son contenu. */
export function AutoArea({ value, onChange, className, ...p }) {
  const ref = useRef(null);
  const ajuster = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);
  useLayoutEffect(ajuster, [value]);
  useEffect(() => {
    window.addEventListener('resize', ajuster);
    return () => window.removeEventListener('resize', ajuster);
  }, []);
  return <textarea ref={ref} className={className} value={value} onChange={(e) => onChange(e.target.value)} spellCheck="true" lang="fr" {...p} />;
}

export function Toasts({ items }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-20 md:pb-6" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={cx('pointer-events-auto flex max-w-md items-start gap-2 rounded-lg px-3.5 py-2.5 text-[13px] shadow-lg', t.tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-nav text-nav-ink')}>
          <Check size={15} className="mt-0.5 flex-none" aria-hidden="true" />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
