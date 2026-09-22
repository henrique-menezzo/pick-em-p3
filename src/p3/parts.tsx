// Small shared controls: the deadline, the legend, the save actions and the election-night scrubber.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ALL, T_MAX, clock, statusAt } from '../data/races';
import { LOCK_AT, isLocked, liveScore, useStore } from '../lib/store';
import { Icon } from '../components/ui';
import Tip from '../components/Tip';
import { ResetButton } from '../components/Common';

export function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);
  const ms = Math.max(0, LOCK_AT - now);
  const s = Math.floor(ms / 1000), days = Math.floor(s / 86400);
  const hms = [Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((v) => String(v).padStart(2, '0')).join(':');
  return { left: days > 0 ? `${days}d ${hms}` : hms, locked: ms === 0 };
}

export function Deadline({ align = 'right' }: { align?: 'right' | 'left' | 'center' }) {
  const live = useStore((s) => s.live);
  const { left, locked } = useCountdown();
  return (
    <div className={'p-deadline a-' + align}>
      <span className="l">{live ? 'Results' : locked ? '' : 'Picks lock in:'}</span>
      <b className="num">{live ? 'Live' : locked ? 'Picks locked' : left}</b>
    </div>
  );
}

export function Legend() {
  const live = useStore((s) => s.live);
  const t = useStore((s) => s.t);
  const picks = useStore((s) => s.picks);
  const sc = liveScore(picks, t);
  const a = live ? sc.correct : ALL.filter((r) => picks[r.id] === 'R').length;
  const b = live ? sc.missed : ALL.filter((r) => picks[r.id] === 'D').length;
  const open = ALL.length - a - b;
  return (
    <div className="p3-legend">
      {live ? (
        <>
          <span><i style={{ background: 'linear-gradient(90deg, var(--R) 50%, var(--D) 50%)' }} />Right <b className="num">{a}</b></span>
          <span><i className="faded" />Missed <b className="num">{b}</b></span>
          <span><i style={{ background: '#4a4a4a' }} />To call <b className="num">{open}</b></span>
        </>
      ) : (
        <>
          <span><i style={{ background: 'var(--R)' }} />Republican <b className="num">{a}</b></span>
          <span><i style={{ background: 'var(--D)' }} />Democrat <b className="num">{b}</b></span>
          <span><i style={{ background: '#6f6f6f' }} />Open <b className="num">{open}</b></span>
        </>
      )}
    </div>
  );
}

function AutofillButton({ compact }: { compact?: boolean }) {
  const autofill = useStore((s) => s.autofill);
  const say = useStore((s) => s.say);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest('.autofill')) setOpen(false); };
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [open]);
  const pick = (source: 'polls' | 'market') => {
    autofill(source);
    setOpen(false);
    say(source === 'polls' ? 'Filled from DDHQ polling data' : 'Filled from Polymarket');
  };
  return (
    <div className="autofill">
      <Tip text="Fill every open race at once — from DDHQ polling data or from Polymarket.">
        <button className={'btn' + (compact ? ' sm' : '')} onClick={() => setOpen(!open)} disabled={isLocked()}>
          <Icon name="wand" size={compact ? 16 : 18} stroke={1.8} />Autofill<Icon name="chevDown" size={13} stroke={2} />
        </button>
      </Tip>
      <AnimatePresence>
        {open && (
          <motion.div className="autofill-menu" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.15 }}>
            <button onClick={() => pick('polls')}><b>Polling data · DDHQ</b><small>Fills every open race with the polling favourite</small></button>
            <button onClick={() => pick('market')}><b>Polymarket</b><small>Fills every open race with the market favourite</small></button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Actions({ compact, reset = true }: { compact?: boolean; reset?: boolean }) {
  const save = useStore((s) => s.save);
  const savedAt = useStore((s) => s.savedAt);
  const user = useStore((s) => s.user);
  const openAuth = useStore((s) => s.openAuth);
  const picks = useStore((s) => s.picks);
  const say = useStore((s) => s.say);
  const done = ALL.filter((r) => picks[r.id]).length;
  return (
    <div className={'p-actions' + (compact ? ' sm' : '')}>
      {reset && <ResetButton />}
      <AutofillButton compact={compact} />
      <Tip text={savedAt ? 'Saved. Keep picking — save again any time before Nov 3.' : 'Save any time. You can keep picking until election day.'}>
        <button
          className={'btn save' + (compact ? ' sm' : '') + (savedAt ? ' saved' : ' ready')}
          disabled={isLocked()}
          onClick={() => {
            if (!user) return openAuth('save');
            save();
            say(done === ALL.length ? 'Map saved' : `Saved · ${done} of ${ALL.length} picked — keep going until Nov 3`);
          }}
        >
          {savedAt ? <><Icon name="check" size={15} stroke={2.4} /> Saved</> : 'Save Map'}
        </button>
      </Tip>
    </div>
  );
}

/** Election night only: where in the evening you are. */
export function Timeline() {
  const t = useStore((s) => s.t);
  const playing = useStore((s) => s.playing);
  const setPlaying = useStore((s) => s.setPlaying);
  const setT = useStore((s) => s.setT);
  const sc = liveScore(useStore((s) => s.picks), t);
  const counting = ALL.filter((r) => statusAt(r.id, t).status === 'counting').length;
  return (
    <div className="p-tl">
      <button className="play" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play election night'}>
        <Icon name={playing ? 'pause' : 'play'} size={17} stroke={2} fill={!playing} />
      </button>
      <div className="when">
        <b className="num"><span className="live-dot" />{clock(t)} ET</b>
        <small className="num">{sc.called} called · {counting} counting</small>
      </div>
      <input type="range" min={0} max={T_MAX} value={t} onChange={(e) => { setPlaying(false); setT(+e.target.value); }} style={{ ['--p' as string]: (t / T_MAX) * 100 + '%' }} aria-label="Election night time" />
    </div>
  );
}
