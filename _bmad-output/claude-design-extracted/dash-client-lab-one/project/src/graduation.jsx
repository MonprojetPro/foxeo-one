// Graduation — full-screen overlay played once when MiKL flips Lab → One.

const Confetti = () => {
  const pieces = React.useMemo(() => {
    const colors = ['#7c3aed', '#a78bfa', '#4ade80', '#16a34a', '#fb923c', '#f9fafb'];
    return Array.from({ length: 48 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 1.2,
      duration: 2.2 + Math.random() * 2,
      color: colors[i % colors.length],
      size: 6 + Math.random() * 8,
      rot: Math.random() * 360,
    }));
  }, []);
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {pieces.map((p, i) => (
        <span key={i} style={{
          position: 'absolute', left: `${p.left}%`, top: -20,
          width: p.size, height: p.size * 0.4, background: p.color,
          borderRadius: 2, transform: `rotate(${p.rot}deg)`,
          animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s infinite`,
        }} />
      ))}
    </div>
  );
};

const Graduation = ({ onEnter }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 100,
    background: 'radial-gradient(ellipse at top, #140b2e 0%, #0c0c0c 55%)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    padding: 40, overflow: 'auto',
  }}>
    <Confetti />

    {/* Lab → One */}
    <div className="fade-in" style={{
      display: 'flex', alignItems: 'center', gap: 24,
      fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em',
    }}>
      <span style={{ color: '#a78bfa', textShadow: '0 0 20px rgba(167,139,250,0.5)' }}>Lab</span>
      <svg width="80" height="20" viewBox="0 0 80 20" style={{ animation: 'grad-arrow 0.8s ease both' }}>
        <defs>
          <linearGradient id="grad-arrow" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#4ade80" />
          </linearGradient>
        </defs>
        <path d="M2 10 H 70 M 62 4 L 72 10 L 62 16" stroke="url(#grad-arrow)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span style={{ color: '#4ade80', textShadow: '0 0 20px rgba(74,222,128,0.5)' }}>One</span>
    </div>

    <h1 className="fade-in" style={{
      fontSize: 36, fontWeight: 800, textAlign: 'center',
      margin: '36px 0 14px', letterSpacing: '-0.02em', maxWidth: 720,
      animation: 'fade-slide-in 0.5s ease 0.2s both',
    }}>
      Bravo Sophie, votre projet est prêt !
    </h1>

    <div style={{ textAlign: 'center', maxWidth: 560, animation: 'fade-slide-in 0.5s ease 0.35s both' }}>
      <div style={{ color: 'var(--text-2)', fontSize: 15, lineHeight: 1.6 }}>
        Vous avez complété toutes les étapes de votre parcours Lab.
      </div>
      <div style={{ color: '#4ade80', fontSize: 15, lineHeight: 1.6, marginTop: 6, fontWeight: 500 }}>
        Bienvenue dans MonprojetPro One — votre outil métier vous attend.
      </div>
    </div>

    {/* Lab legacy card */}
    <div className="card" style={{
      marginTop: 30, padding: 22, maxWidth: 520, width: '100%',
      animation: 'fade-slide-in 0.5s ease 0.5s both',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
        Votre héritage Lab est transféré
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconSparkle size={16} stroke="#a78bfa" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Profil Élio</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Communication conservée</div>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <IconFolder size={16} stroke="#4ade80" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>12 documents</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Disponibles dans One</div>
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 14 }}>
        Toutes vos conversations Élio Lab accessibles en lecture.
      </div>
    </div>

    {/* CTA */}
    <button onClick={onEnter} style={{
      marginTop: 30, padding: '14px 38px', borderRadius: 14,
      background: 'linear-gradient(135deg, #16a34a, #4ade80)',
      color: 'white', fontSize: 15, fontWeight: 700,
      boxShadow: '0 12px 30px -8px rgba(74,222,128,0.45)',
      display: 'inline-flex', alignItems: 'center', gap: 10,
      animation: 'fade-slide-in 0.5s ease 0.65s both',
    }}>
      Découvrir mon One <IconArrow size={16} sw={2.4} />
    </button>

    <div style={{ marginTop: 22, fontSize: 11.5, color: 'var(--text-3)', animation: 'fade-slide-in 0.5s ease 0.8s both' }}>
      Vous pourrez toujours consulter votre parcours Lab via le toggle en haut de la page.
    </div>

    {/* Élio message */}
    <div style={{
      marginTop: 36, maxWidth: 520, width: '100%',
      background: 'rgba(124,58,237,0.1)', border: '1px solid var(--lab-border)',
      borderRadius: 14, padding: 18, display: 'flex', gap: 14,
      animation: 'fade-slide-in 0.5s ease 0.95s both',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'linear-gradient(135deg, #16a34a, #4ade80)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0,
      }}>E</div>
      <div style={{ flex: 1, fontSize: 13, color: '#e5e7eb', lineHeight: 1.6, fontStyle: 'italic' }}>
        «&nbsp;Félicitations&nbsp;! J'ai tout appris de vous pendant ce parcours. Dans One, je serai votre assistant quotidien pour gérer votre activité. À tout de suite&nbsp;!&nbsp;»
      </div>
    </div>
  </div>
);

Object.assign(window, { Graduation });
