// Shell: header (logo + Lab/One toggle + avatar/bell), sidebar, Élio FAB.
// Accent colors swap based on `mode` ("lab" | "one").

const ModeContext = React.createContext({ mode: 'lab', setMode: () => {}, route: '', setRoute: () => {} });

const accent = (mode) => mode === 'lab'
  ? { primary: '#7c3aed', light: '#a78bfa', bg: '#1e1557', border: '#3d2d6d', deep: '#1a1033', dark: '#7c3aed' }
  : { primary: '#4ade80', light: '#86efac', bg: '#052e16', border: '#14532d', deep: '#07170d', dark: '#16a34a' };

// ————————————————————————————————————————————————————————
// Header
// ————————————————————————————————————————————————————————
const Header = ({ mode, setMode }) => {
  const a = accent(mode);
  return (
    <header style={{
      height: 60, background: 'var(--card)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      paddingLeft: 20, paddingRight: 20, flexShrink: 0, position: 'relative', zIndex: 5,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 240 - 20 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: `linear-gradient(135deg, ${a.primary}, ${a.light})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 800, fontSize: 14, letterSpacing: '-0.04em',
        }}>
          M
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: a.light, letterSpacing: '-0.01em' }}>
          Monprojet<span style={{ color: 'var(--text)' }}>Pro</span>
        </div>
      </div>

      {/* Toggle */}
      <div style={{
        height: 32, width: 288, background: '#0f0f0f',
        border: '1px solid var(--border-active)', borderRadius: 999,
        display: 'flex', padding: 3, position: 'relative',
      }}>
        {['lab', 'one'].map((m) => {
          const active = mode === m;
          const bg = m === 'lab' ? '#7c3aed' : '#16a34a';
          return (
            <button key={m} onClick={() => setMode(m)}
              style={{
                flex: 1, borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: active ? bg : 'transparent',
                color: active ? 'white' : 'var(--text-3)',
                letterSpacing: '0.04em', textTransform: 'uppercase',
                transition: 'all 0.2s ease',
              }}>
              {m === 'lab' ? 'Mode Lab' : 'Mode One'}
            </button>
          );
        })}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, width: 240 - 20, justifyContent: 'flex-end' }}>
        <button title="Notifications" style={{
          width: 34, height: 34, borderRadius: 10, color: 'var(--text-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--border)', position: 'relative',
        }}>
          <IconBell size={16} />
          <span style={{
            position: 'absolute', top: 6, right: 6, width: 7, height: 7,
            background: a.primary, borderRadius: '50%', border: '1.5px solid var(--card)',
          }} />
        </button>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: `linear-gradient(135deg, ${a.primary}, ${a.light})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 12, letterSpacing: 0.5,
        }}>
          CL
        </div>
      </div>
    </header>
  );
};

// ————————————————————————————————————————————————————————
// Sidebar
// ————————————————————————————————————————————————————————
const LAB_NAV = [
  { key: 'lab-parcours', label: 'Mon Parcours', icon: IconGrad },
  { key: 'lab-chat-elio', label: 'Chat Élio', icon: IconSparkle },
  { key: 'lab-chat-mikl', label: 'Chat MiKL', icon: IconUser },
  { key: 'lab-documents', label: 'Documents', icon: IconFolder },
  { key: 'lab-soumissions', label: 'Soumissions', icon: IconSend },
];
const ONE_NAV = [
  { key: 'one-accueil', label: 'Accueil', icon: IconHome },
  { key: 'one-modules', label: 'Mes Modules', icon: IconGrid },
  { key: 'one-compta', label: 'Comptabilité', icon: IconEuro },
  { key: 'one-documents', label: 'Documents', icon: IconFolder },
  { key: 'one-messages', label: 'Messages', icon: IconMessage },
  { key: 'one-visios', label: 'Visios', icon: IconVideo },
];

const Sidebar = ({ mode, route, setRoute }) => {
  const a = accent(mode);
  const nav = mode === 'lab' ? LAB_NAV : ONE_NAV;

  return (
    <aside style={{
      width: 240, background: 'var(--card)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%',
    }}>
      <div style={{ padding: '18px 14px 10px 14px' }}>
        <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12, paddingLeft: 10 }}>
          {mode === 'lab' ? 'Parcours d\'incubation' : 'Espace pro'}
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map((item) => {
            const active = route === item.key;
            const Ico = item.icon;
            return (
              <button key={item.key} onClick={() => setRoute(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '9px 12px', paddingLeft: active ? 10 : 12,
                  borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 500,
                  color: active ? a.light : 'var(--text-2)',
                  background: active ? a.bg : 'transparent',
                  borderLeft: active ? `2px solid ${a.primary}` : '2px solid transparent',
                  transition: 'all 0.12s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#1a1a1a'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Ico size={16} stroke={active ? a.light : 'var(--text-2)'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ borderTop: '1px solid var(--border)', padding: '14px', margin: '0 0 8px 0' }}>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-2)',
          textAlign: 'left',
        }}>
          <IconSettings size={16} />
          Paramètres
        </button>
      </div>
    </aside>
  );
};

// ————————————————————————————————————————————————————————
// FAB Élio
// ————————————————————————————————————————————————————————
const FabElio = ({ mode, onClick }) => {
  const isOne = mode === 'one';
  const a = accent(mode);
  const size = isOne ? 58 : 52;
  return (
    <button onClick={onClick} style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 20,
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${a.primary}, ${a.dark})`,
      color: 'white', fontWeight: 700, fontSize: 13,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 10px 28px -8px ${a.primary}88, 0 0 0 1px ${a.border}`,
      animation: isOne ? 'pulse-ring 2.4s infinite' : undefined,
      letterSpacing: 0.5,
    }}>
      <IconSparkle size={16} />
      <span style={{ fontSize: 10, marginTop: 1 }}>Élio</span>
    </button>
  );
};

// ————————————————————————————————————————————————————————
// Layout container
// ————————————————————————————————————————————————————————
const Shell = ({ mode, setMode, route, setRoute, children, noScroll }) => (
  <div data-screen-label={route} style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
    <Header mode={mode} setMode={setMode} />
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <Sidebar mode={mode} route={route} setRoute={setRoute} />
      <main style={{
        flex: 1, minWidth: 0, overflow: noScroll ? 'hidden' : 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {children}
      </main>
    </div>
    <FabElio mode={mode} onClick={() => {
      // Opens the contextual chat. In Lab → step detail with chat.
      setRoute(mode === 'lab' ? 'lab-step-4' : 'one-accueil');
    }} />
  </div>
);

Object.assign(window, { Shell, ModeContext, accent, Header, Sidebar, FabElio, LAB_NAV, ONE_NAV });
