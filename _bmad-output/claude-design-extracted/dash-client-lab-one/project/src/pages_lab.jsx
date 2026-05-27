// Lab pages: Accueil (parcours), Étape Détail + Chat Élio, Soumissions.

// Tiny helper — uniform card wrapper
const PageHeader = ({ title, subtitle, right }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 6 }}>
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{title}</h1>
      {subtitle && <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 6 }}>{subtitle}</div>}
    </div>
    {right}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// PAGE 1 — LAB ACCUEIL (Mon Parcours)
// ═══════════════════════════════════════════════════════════════

const STEPS = [
  { n: 1, title: 'Personas clients', sub: 'Cible et profil idéal', status: 'done', date: 'Complétée le 02/04' },
  { n: 2, title: 'Étude de marché', sub: 'Taille, concurrents, tendances', status: 'done', date: 'Complétée le 08/04' },
  { n: 3, title: 'Business Model', sub: 'Canvas + hypothèses', status: 'done', date: 'Complétée le 11/04' },
  { n: 4, title: 'Stratégie commerciale', sub: '3 livrables à remettre', status: 'current' },
  { n: 5, title: 'Plan d\'action 90 jours', sub: 'Roadmap opérationnelle', status: 'locked' },
  { n: 6, title: 'Business Plan final', sub: 'Document de synthèse', status: 'locked' },
  { n: 7, title: 'Pitch & Graduation', sub: 'Soutenance devant MiKL', status: 'locked' },
];

const StepCard = ({ step, onClick }) => {
  if (step.status === 'done') {
    return (
      <div className="fade-in" style={{
        background: 'var(--ok-bg)', border: '1px solid rgba(34,197,94,0.45)',
        borderRadius: 14, padding: 18, height: 158, display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="pill" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
            <IconCheck size={10} sw={3} /> Complétée
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Étape {step.n}</span>
        </div>
        <div style={{ marginTop: 14, fontSize: 16, fontWeight: 600 }}>{step.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{step.sub}</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 500 }}>{step.date}</div>
      </div>
    );
  }
  if (step.status === 'current') {
    return (
      <button onClick={onClick} className="fade-in" style={{
        background: 'var(--lab-bg)', border: '2px solid var(--lab)',
        borderRadius: 14, padding: 17, height: 158, display: 'flex', flexDirection: 'column',
        textAlign: 'left', width: '100%',
        boxShadow: '0 0 0 4px rgba(124,58,237,0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="pill" style={{ background: 'var(--lab)', color: 'white' }}>
            En cours
          </span>
          <span style={{ fontSize: 11, color: 'var(--lab-light)' }}>Étape {step.n}</span>
        </div>
        <div style={{ marginTop: 14, fontSize: 16, fontWeight: 600 }}>{step.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>{step.sub}</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--lab-light)', fontSize: 12, fontWeight: 600 }}>
          Continuer <IconArrow size={13} />
        </div>
      </button>
    );
  }
  return (
    <div style={{
      background: '#111', border: '1px dashed #374151', opacity: 0.55,
      borderRadius: 14, padding: 18, height: 158, display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <IconLock size={14} stroke="var(--text-3)" />
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Étape {step.n}</span>
      </div>
      <div style={{ marginTop: 14, fontSize: 16, fontWeight: 500, color: 'var(--text-2)' }}>{step.title}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{step.sub}</div>
      <div style={{ flex: 1 }} />
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Disponible après l'étape précédente</div>
    </div>
  );
};

const LabAccueil = ({ setRoute }) => {
  const done = STEPS.filter(s => s.status === 'done').length;
  const pct = Math.round((done / STEPS.length) * 100);

  return (
    <div style={{ padding: 28, maxWidth: 1160, width: '100%', margin: '0 auto' }}>
      <PageHeader
        title={<>Bonjour, Sophie ! <span style={{ display: 'inline-block', transform: 'rotate(-6deg)' }}>👋</span></>}
        subtitle="Étape en cours : Stratégie commerciale"
      />

      {/* Progress bar */}
      <div style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>Progression globale</span>
            <span style={{ color: 'var(--text-3)', margin: '0 8px' }}>—</span>
            <span>{done}/7 étapes</span>
          </div>
          <div style={{ fontSize: 13, color: '#4ade80', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{pct}%</div>
        </div>
        <div style={{ height: 8, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`, height: '100%',
            background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
            borderRadius: 999, transition: 'width 0.6s ease',
          }} />
        </div>
      </div>

      {/* Step grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 26 }}>
        {STEPS.map((s) => (
          <StepCard key={s.n} step={s} onClick={() => s.status === 'current' && setRoute('lab-step-4')} />
        ))}
      </div>

      {/* Élio panel */}
      <div className="card" style={{ marginTop: 26, padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0,
        }}>E</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: 'var(--lab-light)', fontWeight: 600, letterSpacing: '0.02em' }}>
            Élio — Message du jour
          </div>
          <div style={{
            marginTop: 10, background: 'rgba(124,58,237,0.12)', border: '1px solid var(--lab-border)',
            borderRadius: 12, padding: '12px 14px', fontSize: 13.5, color: '#e5e7eb', lineHeight: 1.55,
          }}>
            Bonjour Sophie ! Vous progressez bien. Votre <strong style={{ color: 'var(--lab-light)' }}>étape&nbsp;4</strong> attend votre attention. Cliquez sur «&nbsp;Continuer&nbsp;» pour que je vous guide.
          </div>
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-outline-lab" onClick={() => setRoute('lab-step-4')}>
              Parler à Élio <IconArrow size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PAGE 2 — LAB ÉTAPE DÉTAIL + CHAT ÉLIO
// ═══════════════════════════════════════════════════════════════

const Deliverable = ({ status, title, meta, action, setRoute }) => {
  if (status === 'done') {
    return (
      <div style={{
        background: 'var(--ok-bg)', border: '1px solid rgba(34,197,94,0.35)',
        borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: 'rgba(34,197,94,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IconCheck size={14} sw={3} stroke="#22c55e" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, color: 'var(--text-2)', textDecoration: 'line-through' }}>{title}</div>
          <div style={{ fontSize: 11.5, color: '#4ade80', marginTop: 3 }}>{meta}</div>
        </div>
      </div>
    );
  }
  if (status === 'current') {
    return (
      <div style={{
        background: 'var(--lab-bg)', border: '2px solid var(--lab)',
        borderRadius: 12, padding: 13, display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', border: '2px solid var(--lab-light)',
          flexShrink: 0, marginLeft: 3,
        }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--lab-light)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            En cours — parlez à Élio
          </div>
        </div>
        <button className="btn btn-outline-lab" style={{ padding: '7px 14px', fontSize: 12 }}>
          Parler à Élio <IconArrow size={12} />
        </button>
      </div>
    );
  }
  return (
    <div style={{
      background: '#111', border: '1px dashed #374151', opacity: 0.55,
      borderRadius: 12, padding: 14, display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <IconLock size={18} stroke="var(--text-3)" />
      <div style={{ fontSize: 13.5, color: 'var(--text-3)' }}>{title}</div>
    </div>
  );
};

const ChatMessage = ({ who, text }) => {
  if (who === 'elio') {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 11, flexShrink: 0,
        }}>E</div>
        <div style={{
          background: 'var(--lab-bg)', border: '1px solid var(--lab-border)',
          borderRadius: 12, borderTopLeftRadius: 4,
          padding: '10px 13px', fontSize: 13, color: '#e5e7eb', lineHeight: 1.5,
          maxWidth: 310,
        }}>{text}</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'flex-end', marginLeft: 30 }}>
      <div style={{
        background: '#1e1e1e', border: '1px solid var(--border)',
        borderRadius: 12, borderTopRightRadius: 4,
        padding: '10px 13px', fontSize: 13, color: 'white', lineHeight: 1.5,
        maxWidth: 280,
      }}>{text}</div>
    </div>
  );
};

const LabStepDetail = ({ setRoute }) => {
  const [messages, setMessages] = React.useState([
    { who: 'elio', text: 'Super travail sur les personas ! Pour les canaux d\'acquisition, pensons aux réseaux les plus adaptés à votre cible.' },
    { who: 'user', text: 'Je pense utiliser LinkedIn et le bouche-à-oreille principalement' },
    { who: 'elio', text: 'Excellent choix ! LinkedIn pour B2B et le bouche-à-oreille sont très adaptés. Estimons ensemble le temps hebdo par canal.' },
  ]);
  const [draft, setDraft] = React.useState('');
  const scroller = React.useRef(null);

  const send = () => {
    if (!draft.trim()) return;
    const next = [...messages, { who: 'user', text: draft.trim() }];
    setMessages(next);
    setDraft('');
    setTimeout(() => {
      setMessages([...next, { who: 'elio', text: 'Noté ! Quel est le temps hebdomadaire que vous pouvez consacrer à LinkedIn (posts, messages, veille) ?' }]);
    }, 800);
  };

  React.useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages]);

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      {/* Left column */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
          <button onClick={() => setRoute('lab-parcours')} style={{ color: 'var(--text-3)' }}>Mon Parcours</button>
          <span style={{ margin: '0 6px' }}>›</span>
          <span style={{ color: 'var(--lab-light)' }}>Étape 4 — Stratégie commerciale</span>
        </div>

        {/* Step header */}
        <div style={{
          background: 'var(--lab-bg)', border: '2px solid var(--lab)',
          borderRadius: 14, padding: 22, marginTop: 12,
        }}>
          <span className="pill" style={{ background: 'white', color: 'var(--lab)' }}>En cours</span>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: '12px 0 6px', letterSpacing: '-0.015em' }}>
            Étape 4 — Stratégie commerciale
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
            Cibles, canaux d'acquisition, positionnement prix — 3 livrables attendus
          </div>
        </div>

        {/* Deliverables */}
        <div style={{ marginTop: 30 }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Livrables à remettre</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Deliverable status="done" title="Identifiez vos 3 types de clients idéaux (personas)" meta="Validé par Élio le 14/04" />
            <Deliverable status="current" title="Listez vos 3 canaux d'acquisition et leur coût" />
            <Deliverable status="locked" title="Définissez votre grille tarifaire" />
          </div>
        </div>

        {/* Submit */}
        <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-lab" disabled>Soumettre à MiKL</button>
          <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
            Élio préparera un résumé pour MiKL
          </div>
        </div>

        {/* Shared documents */}
        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Documents partagés pour cette étape
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { name: 'Guide_Strategie_Commerciale.pdf', type: 'PDF', size: '680 Ko' },
              { name: 'Grille_Tarifaire_Template.xlsx', type: 'XLSX', size: '42 Ko' },
            ].map((f) => (
              <div key={f.name} className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: f.type === 'PDF' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                  color: f.type === 'PDF' ? '#f87171' : '#4ade80',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
                }}>{f.type}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{f.size}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>

      {/* Right column — chat */}
      <div style={{
        width: 420, flexShrink: 0, display: 'flex', flexDirection: 'column',
        background: 'var(--card)', borderLeft: '1px solid var(--border)',
      }}>
        <div style={{
          height: 52, flexShrink: 0, background: 'var(--lab-deep)',
          borderBottom: '1px solid var(--border)', padding: '0 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              color: 'white', fontWeight: 700, fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>E</div>
            <div style={{ color: 'var(--lab-light)', fontWeight: 600, fontSize: 13 }}>Chat Élio — Étape 4</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-2)' }}>
            <IconDot color="#22c55e" size={7} /> En ligne
          </div>
        </div>
        <div ref={scroller} style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((m, i) => <ChatMessage key={i} who={m.who} text={m.text} />)}
        </div>
        <div style={{ height: 'auto', flexShrink: 0, borderTop: '1px solid var(--border)', padding: 14 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Répondez à Élio..."
              rows={1}
              style={{
                flex: 1, background: '#1e1e1e', border: '1px solid var(--border-active)',
                borderRadius: 10, padding: '9px 12px', color: 'var(--text)', fontSize: 13,
                resize: 'none', outline: 'none', minHeight: 38, maxHeight: 100,
              }}
            />
            <button onClick={send} style={{
              width: 36, height: 36, borderRadius: 10, background: 'var(--lab)',
              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <IconArrow size={16} sw={2.4} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PAGE 3 — LAB SOUMISSIONS
// ═══════════════════════════════════════════════════════════════

const SUBMISSIONS = [
  { status: 'pending', title: 'Stratégie commerciale — Étape 4', meta: 'Soumis le 15/04/2026 à 10h30 | Résumé préparé par Élio' },
  { status: 'validated', title: 'Business Model — Étape 3', meta: 'Soumis le 08/04 | Validé par MiKL le 10/04' },
  { status: 'validated', title: 'Étude de marché — Étape 2', meta: 'Soumis le 27/03 | Validé par MiKL le 29/03' },
  { status: 'needs-info', title: 'Personas clients — Étape 1', meta: 'MiKL demande des précisions — répondez pour relancer la validation' },
];

const SubmissionCard = ({ s }) => {
  const byStatus = {
    pending: { border: '#f59e0b', bg: 'var(--warn-bg)', chipBg: 'rgba(245,158,11,0.18)', chipFg: '#f59e0b', chipText: 'En attente', link: 'var(--lab-light)', linkText: 'Voir' },
    validated: { border: '#22c55e', bg: 'var(--ok-bg)', chipBg: 'rgba(34,197,94,0.18)', chipFg: '#4ade80', chipText: 'Validée', link: '#4ade80', linkText: 'Voir' },
    'needs-info': { border: '#ef4444', bg: 'var(--err-bg)', chipBg: 'rgba(239,68,68,0.18)', chipFg: '#f87171', chipText: 'Précisions', link: '#f87171', linkText: 'Répondre' },
  }[s.status];

  return (
    <div style={{
      borderRadius: 14, padding: 18, background: byStatus.bg,
      border: `1px solid ${byStatus.border}55`,
      display: 'flex', alignItems: 'center', gap: 18,
    }}>
      <span className="pill" style={{ background: byStatus.chipBg, color: byStatus.chipFg, minWidth: 92, justifyContent: 'center' }}>
        {byStatus.chipText}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{s.title}</div>
        <div style={{
          fontSize: 12, marginTop: 3,
          color: s.status === 'needs-info' ? '#fca5a5' : 'var(--text-2)',
        }}>{s.meta}</div>
      </div>
      {s.status === 'needs-info' ? (
        <button className="btn btn-outline-err" style={{ padding: '8px 16px', fontSize: 12 }}>
          {byStatus.linkText} <IconArrow size={13} />
        </button>
      ) : (
        <button style={{ color: byStatus.link, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
          {byStatus.linkText} <IconArrow size={13} />
        </button>
      )}
    </div>
  );
};

const LabSoumissions = () => (
  <div style={{ padding: 28, maxWidth: 1160, width: '100%', margin: '0 auto' }}>
    <PageHeader
      title="Mes soumissions à MiKL"
      subtitle="Vos briefs soumis au Validation Hub — suivi en temps réel"
      right={<button className="btn btn-outline-lab"><IconPlus size={14} /> Nouvelle soumission</button>}
    />
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 26 }}>
      {SUBMISSIONS.map((s, i) => <SubmissionCard key={i} s={s} />)}
    </div>
  </div>
);

// Simple placeholders for the remaining Lab nav items (so clicks don't 404 in the prototype).
const LabDocuments = () => (
  <div style={{ padding: 28, maxWidth: 1160, width: '100%', margin: '0 auto' }}>
    <PageHeader title="Documents Lab" subtitle="Tous les livrables et ressources partagées pendant votre parcours" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 26 }}>
      {[
        ['Guide_Strategie_Commerciale.pdf', 'Étape 4', '680 Ko'],
        ['BusinessPlan_V2_Draft.pdf', 'Étape 6', '1.2 Mo'],
        ['Personas_Clients.pdf', 'Étape 1', '420 Ko'],
        ['EtudeMarche_2026.xlsx', 'Étape 2', '85 Ko'],
        ['Canvas_BMC.pdf', 'Étape 3', '310 Ko'],
        ['Grille_Tarifaire_Template.xlsx', 'Étape 4', '42 Ko'],
      ].map(([name, step, size]) => (
        <div key={name} className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(124,58,237,0.15)', color: 'var(--lab-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800 }}>
              {name.split('.').pop().toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{step} · {size}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ChatPlaceholder = ({ who }) => {
  const isElio = who === 'elio';
  return (
    <div style={{ padding: 28, maxWidth: 1160, width: '100%', margin: '0 auto' }}>
      <PageHeader title={isElio ? 'Chat Élio' : 'Chat MiKL'} subtitle={isElio ? 'Votre coach IA disponible 24/7' : 'Votre accompagnateur humain — réponse sous 24h'} />
      <div className="card" style={{ marginTop: 26, padding: 60, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', margin: '0 auto',
          background: isElio ? 'linear-gradient(135deg, #7c3aed, #a78bfa)' : 'linear-gradient(135deg, #4a5568, #718096)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 20,
        }}>{isElio ? 'E' : 'M'}</div>
        <div style={{ marginTop: 18, fontSize: 15, fontWeight: 600 }}>{isElio ? 'Démarrer une conversation avec Élio' : 'Envoyer un message à MiKL'}</div>
        <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-2)' }}>
          {isElio ? 'Posez une question sur votre parcours, un livrable ou un concept.' : 'Votre message sera transmis à votre accompagnateur.'}
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { LabAccueil, LabStepDetail, LabSoumissions, LabDocuments, ChatPlaceholder, PageHeader });
