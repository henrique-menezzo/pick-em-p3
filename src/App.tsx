// Pick Em · P3 — one screen, built to the Figma frame.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ALL, T_MAX } from './data/races';
import { useStore } from './lib/store';
import AuthModal from './components/AuthModal';
import Nav from './components/Nav';
import Onboarding from './components/Onboarding';
import { Toast } from './components/Common';
import Mobile from './mobile/Mobile';
import Screen from './p3/screen';

const Q = new URLSearchParams(location.search);
const THUMB = Q.has('thumb');

if (Q.has('reset')) {
  localStorage.removeItem('pick-em-p3');
  history.replaceState(null, '', location.pathname);
  location.reload();
} else {
  const s = useStore.getState();
  if (Q.has('fill')) useStore.setState({ picks: Object.fromEntries(ALL.map((r, i) => [r.id, i % 5 === 2 ? (r.poll === 'R' ? 'D' : 'R') : r.poll])) });
  if (Q.has('empty')) useStore.setState({ picks: {}, savedAt: null });
  if (Q.has('night')) s.setLive(Q.get('night') !== '0');
  if (Q.has('tour')) setTimeout(() => useStore.getState().setTour(Number(Q.get('tour')) || 0), 100); // ?tour=0..5 — open a step for review
  if (Q.has('t')) s.setT(+Q.get('t')!);
}

export default function App() {
  useKeyboard();
  usePlayback();
  const { ref, scale, height, left } = useScale();
  const isPhone = usePhone();
  if (isPhone) return (<><Mobile /><AuthModal /><Toast /></>);
  return (
    <div className="scaler" style={{ height }}>
      {/* the nav's hairline is drawn outside the scaled frame, so it reaches both screen edges */}
      <div className="page-rule" style={{ top: 64 * scale }} />
      <div className="app" ref={ref} style={{ transform: `scale(${scale})`, left }}>
        <Nav />
        <Screen />
        <AuthModal />
        {!THUMB && <ViewSwitch />}
        <Onboarding />
        <Toast />
      </div>
    </div>
  );
}

/** Prototype-only: the two states of the product. */
function ViewSwitch() {
  const live = useStore((s) => s.live);
  const setLive = useStore((s) => s.setLive);
  const goLive = useStore((s) => s.goLive);
  return createPortal(
    <div className="viewswitch">
      <span className="vs-label">Preview</span>
      <div className="vs-seg">
        <button className={!live ? 'on' : ''} onClick={() => setLive(false)}>
          {!live && <motion.span layoutId="vs-hl" className="hl" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          My picks
        </button>
        <button className={live ? 'on' : ''} onClick={() => goLive(true)}>
          {live && <motion.span layoutId="vs-hl" className="hl" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
          <span className="live-dot" /> Election night
        </button>
      </div>
    </div>,
    document.body,
  );
}

// ---- the 1440 frame, uniformly scaled ------------------------------------------------------------
function usePhone() {
  const q = '(max-width: 760px)';
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

function useScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [s, setS] = useState({ scale: 1, height: 0, left: 0 });
  useLayoutEffect(() => {
    const fit = () => {
      const scale = Math.min(1, window.innerWidth / 1440);
      const left = Math.max(0, (document.documentElement.clientWidth - 1440 * scale) / 2);
      setS({ scale, height: (ref.current?.offsetHeight ?? 0) * scale + (THUMB ? 0 : 96 * scale), left });
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, []);
  return { ref, ...s };
}

function usePlayback() {
  const playing = useStore((s) => s.playing);
  useEffect(() => {
    if (!playing) return;
    const h = setInterval(() => {
      const s = useStore.getState();
      if (s.t >= T_MAX) { s.setPlaying(false); return; }
      s.setT(s.t + 1);
    }, 70);
    return () => clearInterval(h);
  }, [playing]);
}

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return;
      const s = useStore.getState();
      const id = s.cursor[s.tab];
      if (e.key === 'ArrowRight') s.step(1);
      else if (e.key === 'ArrowLeft') s.step(-1);
      else if (e.key === 'r' || e.key === '1') s.toggle(id, 'R', { advance: true });
      else if (e.key === 'd' || e.key === '2') s.toggle(id, 'D', { advance: true });
      else if (e.key === ' ' && s.live) { e.preventDefault(); s.setPlaying(!s.playing); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
