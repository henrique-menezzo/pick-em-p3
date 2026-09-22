// Pick Em · P3 — the screen from the Figma frame "v3 (nav, title, profile)", built to its geometry.
// No card and no floating chrome: the chambers hold the left edge, the race the right edge, the map
// the middle, and the bottom band carries what you have done — legend, progress, the wall of 97.
import { AnimatePresence, motion } from 'motion/react';
import { ALL, BY_ID, RACES, RESULTS, TAB_LABEL, TABS, statusAt, type Tab } from '../data/races';
import { liveScore, useStore } from '../lib/store';
import DotMap from '../components/DotMap';
import { CandidateRow, Flag, Icon } from '../components/ui';
import { Actions, Deadline, Legend, Timeline } from './parts';

/** Left edge: the three chambers, the one you are on in a soft pill. */
function Chambers() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const picks = useStore((s) => s.picks);
  return (
    <nav className="p3-chambers">
      {TABS.map((k) => {
        const list = RACES[k];
        const done = list.filter((r) => picks[r.id]).length;
        return (
          <button key={k} className={'ch' + (tab === k ? ' on' : '')} onClick={() => setTab(k)}>
            {tab === k && <motion.span layoutId="p3-ch" className="hl" transition={{ type: 'spring', stiffness: 480, damping: 38 }} />}
            <span className="nm">{TAB_LABEL[k]}</span>
            <span className="ct num">{done}/{list.length}</span>
          </button>
        );
      })}
      <Help />
    </nav>
  );
}

function Help() {
  const setTour = useStore((s) => s.setTour);
  const live = useStore((s) => s.live);
  if (live) return null;
  return (
    <button className="p3-help" onClick={() => setTour(0)}>
      <Icon name="help" size={15} stroke={1.8} />How it works
    </button>
  );
}

/** Centre: the name of the game and how long you have. */
function Head() {
  return (
    <div className="p3-head">
      <h1>Midterms Pick Em</h1>
      <Deadline align="center" />
    </div>
  );
}

/** Right edge: the race you are on, and the two people in it. */
function Race() {
  const id = useStore((s) => s.cursor[s.tab]);
  const race = BY_ID[id];
  return (
    <aside className="p3-race">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={race.id}
          className="in"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'spring', stiffness: 430, damping: 34 }}
        >
          <div className="hd">
            <Flag st={race.state} />
            {/* long names step down a size rather than clipping */}
            <h2 style={{ fontSize: race.stateName.length > 11 ? 20 : 24 }}>{race.stateName}</h2>
          </div>
          <div className="cands">
            <CandidateRow race={race} side="R" advance />
            <CandidateRow race={race} side="D" advance />
          </div>
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}

/** Bottom right: how much of the map you have called. */
function Tally() {
  const live = useStore((s) => s.live);
  const t = useStore((s) => s.t);
  const picks = useStore((s) => s.picks);
  const done = ALL.filter((r) => picks[r.id]).length;
  const sc = liveScore(picks, t);
  const big = live ? sc.correct : done;
  const of = live ? sc.called : ALL.length;
  return (
    <div className="p3-tally">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={big} className="big num" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 32 }}>
          {big}
        </motion.span>
      </AnimatePresence>
      <span className="of num">/{of}</span>
      <span className="w">{live ? 'right' : 'picks'}</span>
    </div>
  );
}

function Progress() {
  const live = useStore((s) => s.live);
  const t = useStore((s) => s.t);
  const picks = useStore((s) => s.picks);
  const n = live ? liveScore(picks, t).called : ALL.filter((r) => picks[r.id]).length;
  return <div className="p3-progress" aria-hidden><b style={{ width: (n / ALL.length) * 100 + '%' }} /></div>;
}

/** The wall of 97: every race, grouped by chamber. Click a dot to go to that state. */
function Wall() {
  const tab = useStore((s) => s.tab);
  const picks = useStore((s) => s.picks);
  const select = useStore((s) => s.select);
  const setTab = useStore((s) => s.setTab);
  const setHover = useStore((s) => s.setHover);
  const cursor = useStore((s) => s.cursor);
  const live = useStore((s) => s.live);
  const t = useStore((s) => s.t);
  const cols: Record<Tab, number> = { senate: 12, gov: 12, house: 9 };
  return (
    <div className="p3-wall">
      {TABS.map((k) => (
        <div key={k} className={'sec' + (tab === k ? ' on' : '')} onClick={() => tab !== k && setTab(k)}>
          <div className="lbl">{TAB_LABEL[k]}<span className="c num">{RACES[k].filter((r) => picks[r.id]).length} of {RACES[k].length}</span></div>
          <div className="g" style={{ gridTemplateColumns: `repeat(${cols[k]}, 13px)` }}>
            {RACES[k].map((r) => {
              const p = picks[r.id];
              const now = live ? statusAt(r.id, t) : null;
              const called = now?.status === 'called';
              const lost = called && !!p && p !== RESULTS[r.id].winner;
              return (
                <button
                  key={r.id}
                  className="b"
                  aria-label={r.stateName}
                  onMouseEnter={() => setHover(r.id)}
                  onMouseLeave={() => setHover(null)}
                  onClick={(e) => { e.stopPropagation(); setHover(null); setTab(k); select(r.id); }}
                >
                  <span className={'d' + (p ? ' ' + p : '') + (r.id === cursor[k] && tab === k ? ' cur' : '') + (lost ? ' lost' : '')} />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Screen() {
  const live = useStore((s) => s.live);
  return (
    <main className="p3">
      <Chambers />
      <Head />
      <Race />
      <div className="p3-map"><DotMap /></div>
      <Legend />
      <Progress />
      <Tally />
      <Wall />
      <div className="p3-actions">{live ? <Timeline /> : <Actions compact />}</div>
    </main>
  );
}
