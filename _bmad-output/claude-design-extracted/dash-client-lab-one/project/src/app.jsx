// App root — routing + persistence + Tweaks (Graduation trigger + mode override).

const ROUTES = {
  // Lab
  'lab-parcours':     { mode: 'lab', C: (p) => <LabAccueil {...p} /> },
  'lab-step-4':       { mode: 'lab', C: (p) => <LabStepDetail {...p} /> },
  'lab-chat-elio':    { mode: 'lab', C: () => <ChatPlaceholder who="elio" /> },
  'lab-chat-mikl':    { mode: 'lab', C: () => <ChatPlaceholder who="mikl" /> },
  'lab-documents':    { mode: 'lab', C: () => <LabDocuments /> },
  'lab-soumissions':  { mode: 'lab', C: () => <LabSoumissions /> },
  // One
  'one-accueil':      { mode: 'one', C: (p) => <OneAccueil {...p} /> },
  'one-modules':      { mode: 'one', C: (p) => <OneModules {...p} /> },
  'one-compta':       { mode: 'one', C: () => <OneCompta /> },
  'one-documents':    { mode: 'one', C: () => <OneDocuments /> },
  'one-messages':     { mode: 'one', C: () => <OneMessages /> },
  'one-visios':       { mode: 'one', C: () => <OneVisios /> },
};

const DEFAULT_ROUTE = { lab: 'lab-parcours', one: 'one-accueil' };

const LS_KEY = 'monprojetpro-state-v1';
const readState = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
};
const writeState = (s) => {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
};

// Tweakable defaults
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "showGraduation": false,
  "density": "comfortable"
}/*EDITMODE-END*/;

function App() {
  const saved = readState();
  const [mode, setMode] = React.useState(saved.mode || 'lab');
  const [route, setRoute] = React.useState(saved.route || DEFAULT_ROUTE.lab);
  const [showGrad, setShowGrad] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [tweaks, setTweaks] = React.useState(TWEAK_DEFAULTS);

  // persist
  React.useEffect(() => { writeState({ mode, route }); }, [mode, route]);

  // if route doesn't match mode, send to default
  const r = ROUTES[route];
  React.useEffect(() => {
    if (!r || r.mode !== mode) setRoute(DEFAULT_ROUTE[mode]);
  }, [mode, route]);

  // Mode switcher wrapper: Lab→One triggers graduation ONCE (unless they've seen it)
  const handleSetMode = (next) => {
    if (next === mode) return;
    if (mode === 'lab' && next === 'one' && !saved.graduated) {
      setShowGrad(true);
      return; // mode will flip on CTA click
    }
    setMode(next);
    setRoute(DEFAULT_ROUTE[next]);
  };

  const finishGraduation = () => {
    const s = readState();
    writeState({ ...s, graduated: true, mode: 'one', route: DEFAULT_ROUTE.one });
    setShowGrad(false);
    setMode('one');
    setRoute(DEFAULT_ROUTE.one);
  };

  // ───── Tweaks protocol ─────
  React.useEffect(() => {
    const onMsg = (ev) => {
      if (ev.data?.type === '__activate_edit_mode') setEditOpen(true);
      if (ev.data?.type === '__deactivate_edit_mode') setEditOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const setTweak = (key, val) => {
    const next = { ...tweaks, [key]: val };
    setTweaks(next);
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
  };

  const CurrentPage = r?.C || (() => null);

  return (
    <>
      {showGrad
        ? <Graduation onEnter={finishGraduation} />
        : <Shell mode={mode} setMode={handleSetMode} route={route} setRoute={setRoute} noScroll={route === 'lab-step-4'}>
            <CurrentPage setRoute={setRoute} />
          </Shell>}

      {/* Tweaks panel */}
      {editOpen && (
        <div style={{
          position: 'fixed', bottom: 96, right: 24, zIndex: 50,
          width: 280, background: 'var(--card)', border: '1px solid var(--border-active)',
          borderRadius: 14, padding: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Tweaks</div>

          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Mode</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {['lab', 'one'].map((m) => (
              <button key={m} onClick={() => { setMode(m); setRoute(DEFAULT_ROUTE[m]); }}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: mode === m ? (m === 'lab' ? '#7c3aed' : '#16a34a') : '#1a1a1a',
                  color: mode === m ? 'white' : 'var(--text-2)',
                  border: '1px solid ' + (mode === m ? 'transparent' : 'var(--border)'),
                }}>{m === 'lab' ? 'Lab' : 'One'}</button>
            ))}
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Navigation</div>
          <select value={route} onChange={(e) => setRoute(e.target.value)} style={{
            width: '100%', background: '#1a1a1a', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 12,
          }}>
            {Object.keys(ROUTES).filter((k) => ROUTES[k].mode === mode).map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>

          <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Écran de graduation</div>
          <button onClick={() => setShowGrad(true)} className="btn btn-outline-one" style={{ width: '100%', fontSize: 12 }}>
            Rejouer l'animation
          </button>
          <button onClick={() => { writeState({}); location.reload(); }} style={{
            width: '100%', marginTop: 8, padding: '8px 10px', borderRadius: 8,
            fontSize: 12, color: 'var(--text-3)', border: '1px solid var(--border)',
          }}>Réinitialiser le parcours</button>
        </div>
      )}
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
