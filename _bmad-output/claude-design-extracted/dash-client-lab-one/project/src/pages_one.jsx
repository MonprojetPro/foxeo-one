// One pages: Accueil, Comptabilité, Documents (+ light placeholders for the other nav entries).

// ═══════════════════════════════════════════════════════════════
// PAGE 4 — ONE ACCUEIL
// ═══════════════════════════════════════════════════════════════

const StatCard = ({ label, value, valueColor, note }) => (
  <div className="card" style={{ padding: 18 }}>
    <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>
      {label}
    </div>
    <div style={{ marginTop: 12, fontSize: 32, fontWeight: 700, color: valueColor || 'var(--text)', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </div>
    {note && <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6 }}>{note}</div>}
  </div>
);

const ModuleCard = ({ label, Icon, active, onClick }) => (
  <button onClick={onClick} style={{
    height: 140, borderRadius: 14,
    background: active ? 'var(--one-bg)' : '#111',
    border: active ? '1px solid #16a34a' : '1px dashed #374151',
    opacity: active ? 1 : 0.6,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
    transition: 'transform 0.15s',
  }}
  onMouseEnter={(e) => { if (active) e.currentTarget.style.transform = 'translateY(-2px)'; }}
  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
  >
    <Icon size={28} stroke={active ? '#4ade80' : 'var(--text-3)'} sw={1.4} />
    <div style={{ fontSize: 13.5, fontWeight: 600, color: active ? '#4ade80' : 'var(--text-3)' }}>{label}</div>
    {active
      ? <div style={{ fontSize: 11, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}>Ouvrir <IconArrow size={11} /></div>
      : <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Désactivé</div>}
  </button>
);

const OneAccueil = ({ setRoute }) => (
  <div style={{ padding: 28, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
    <PageHeader title="Bonjour, Sophie !" subtitle="Jeudi 17 avril 2026 — Tout est en ordre" />

    {/* Stats */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 22 }}>
      <StatCard label="Devis en attente" value="3" valueColor="#fb923c" note="Dont 1 expire bientôt" />
      <StatCard label="Factures ce mois" value="2 850 €" valueColor="#4ade80" note="+12% vs mars" />
      <StatCard label="Prochaine visio" value={<span style={{ fontSize: 18, fontWeight: 600 }}>Mardi 22 avril</span>} note="14h00 — Relecture BP" />
      <StatCard label="Messages non lus" value="2" note="1 de MiKL · 1 client" />
    </div>

    {/* Modules */}
    <div style={{ marginTop: 30 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Vos modules actifs</div>
        <button style={{ fontSize: 12, color: 'var(--text-2)' }}>Gérer les modules →</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <ModuleCard label="Documents" Icon={IconFolder} active onClick={() => setRoute('one-documents')} />
        <ModuleCard label="Comptabilité" Icon={IconEuro} active onClick={() => setRoute('one-compta')} />
        <ModuleCard label="Visio" Icon={IconCamera} active onClick={() => setRoute('one-visios')} />
        <ModuleCard label="CRM" Icon={IconUser} />
      </div>
    </div>

    {/* Élio suggestion + activity */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14, marginTop: 26 }}>
      <div className="card" style={{ padding: 20, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, #16a34a, #4ade80)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0,
        }}>E</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12.5, color: '#4ade80', fontWeight: 600, letterSpacing: '0.02em' }}>
            Élio — Suggestion
          </div>
          <div style={{
            marginTop: 10, background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.3)',
            borderRadius: 12, padding: '12px 14px', fontSize: 13.5, color: '#e5e7eb', lineHeight: 1.55,
          }}>
            Sophie, vous avez <strong style={{ color: '#4ade80' }}>3 devis en attente</strong> de signature. Je vous suggère de relancer <strong>Martin Dupont</strong> — son devis expire dans <strong style={{ color: '#fb923c' }}>3 jours</strong>. Voulez-vous que je prépare un email ?
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button className="btn btn-one">Oui, préparer</button>
            <button className="btn btn-outline-one">Plus tard</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 14 }}>Activité récente</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { t: 'Facture #INV-042 payée — 1 200 €', c: '#4ade80', dot: '#22c55e' },
            { t: 'Document CV_Sophie_v3.pdf envoyé', c: 'var(--text-2)' },
            { t: 'Visio planifiée pour le 22/04', c: 'var(--text-2)' },
            { t: 'Message de MiKL — non lu', c: '#4ade80', dot: '#4ade80', bold: true },
          ].map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: a.dot || '#3d3d3d', marginTop: 6, flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: a.c, fontWeight: a.bold ? 600 : 400, lineHeight: 1.5 }}>{a.t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// PAGE 5 — ONE COMPTABILITÉ
// ═══════════════════════════════════════════════════════════════

const DEVIS = [
  { num: 'DEV-2026-042', obj: 'Mission Conseil Stratégie — Avril 2026', amt: '2 400 €', status: 'pending' },
  { num: 'DEV-2026-041', obj: 'Formation Équipe RH — Mars 2026', amt: '1 800 €', status: 'signed' },
  { num: 'DEV-2026-039', obj: 'Audit Organisation — Fév. 2026', amt: '1 200 €', status: 'expired' },
];
const FACTURES = [
  { num: 'INV-2026-042', obj: 'Formation RH — Mars', amt: '1 800 €', status: 'paid' },
  { num: 'INV-2026-041', obj: 'Mission Conseil — Février', amt: '1 050 €', status: 'paid' },
  { num: 'INV-2026-040', obj: 'Coaching — Janvier', amt: '650 €', status: 'pending' },
];

const StatusChip = ({ status }) => {
  const map = {
    pending: { bg: 'rgba(245,158,11,0.15)', fg: '#f59e0b', text: 'En attente', dot: '#f59e0b' },
    signed: { bg: 'rgba(34,197,94,0.15)', fg: '#4ade80', text: 'Signé', dot: '#22c55e' },
    expired: { bg: 'rgba(107,114,128,0.18)', fg: '#9ca3af', text: 'Expiré', dot: '#6b7280' },
    paid: { bg: 'rgba(34,197,94,0.15)', fg: '#4ade80', text: 'Payée', dot: '#22c55e' },
  }[status];
  return (
    <span className="pill" style={{ background: map.bg, color: map.fg }}>
      <IconDot color={map.dot} size={6} /> {map.text}
    </span>
  );
};

const OneCompta = () => {
  const [tab, setTab] = React.useState('devis');
  return (
    <div style={{ padding: 28, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
      <PageHeader
        title="Comptabilité"
        subtitle="Suivez vos devis, factures et abonnement en un seul endroit"
        right={<button className="btn btn-one"><IconPlus size={14} /> Nouveau devis (via MiKL)</button>}
      />
      <div style={{ display: 'flex', gap: 14, marginTop: 20 }}>
        <div style={{ flex: 1 }}><StatCard label="Devis en attente" value="3" valueColor="#fb923c" note="Total : 5 400 €" /></div>
        <div style={{ flex: 1 }}><StatCard label="CA ce mois" value="4 250 €" valueColor="#4ade80" note="+18% vs mois dernier" /></div>
        <div style={{ flex: 1 }}><StatCard label="Factures en attente" value="1" note="Montant : 650 €" /></div>
      </div>

      {/* Tabs */}
      <div style={{ marginTop: 30, borderBottom: '1px solid var(--border)', display: 'flex', gap: 0 }}>
        {[
          { k: 'devis', l: 'Devis' },
          { k: 'factures', l: 'Factures' },
          { k: 'abonnement', l: 'Abonnement' },
        ].map((t) => {
          const active = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              style={{
                padding: '12px 20px', fontSize: 13, fontWeight: 600,
                color: active ? '#4ade80' : 'var(--text-2)',
                borderBottom: active ? '2px solid #4ade80' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}>
              {t.l}
            </button>
          );
        })}
      </div>

      {/* Devis */}
      {tab === 'devis' && (
        <div className="fade-in" style={{ marginTop: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '180px 1fr 140px 140px 60px',
            padding: '12px 20px', background: '#101010',
            fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600,
          }}>
            <div>Numéro</div><div>Objet</div><div style={{ textAlign: 'right' }}>Montant HT</div><div>Statut</div><div />
          </div>
          {DEVIS.map((d, i) => (
            <div key={d.num} style={{
              display: 'grid', gridTemplateColumns: '180px 1fr 140px 140px 60px',
              padding: '16px 20px', alignItems: 'center',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              fontSize: 13.5, transition: 'background 0.12s',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div className="mono" style={{ color: 'var(--text-2)', fontSize: 12 }}>{d.num}</div>
              <div>{d.obj}</div>
              <div style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{d.amt}</div>
              <div><StatusChip status={d.status} /></div>
              <div style={{ textAlign: 'right', color: 'var(--text-3)' }}><IconArrow size={14} /></div>
            </div>
          ))}
        </div>
      )}

      {/* Factures */}
      {tab === 'factures' && (
        <div className="fade-in" style={{ marginTop: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '180px 1fr 140px 140px 60px',
            padding: '12px 20px', background: '#101010',
            fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600,
          }}>
            <div>Numéro</div><div>Objet</div><div style={{ textAlign: 'right' }}>Montant HT</div><div>Statut</div><div />
          </div>
          {FACTURES.map((d, i) => (
            <div key={d.num} style={{
              display: 'grid', gridTemplateColumns: '180px 1fr 140px 140px 60px',
              padding: '16px 20px', alignItems: 'center',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              fontSize: 13.5,
            }}>
              <div className="mono" style={{ color: 'var(--text-2)', fontSize: 12 }}>{d.num}</div>
              <div>{d.obj}</div>
              <div style={{ textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{d.amt}</div>
              <div><StatusChip status={d.status} /></div>
              <div style={{ textAlign: 'right', color: 'var(--text-3)' }}><IconArrow size={14} /></div>
            </div>
          ))}
        </div>
      )}

      {/* Abonnement */}
      {tab === 'abonnement' && (
        <div className="card fade-in" style={{ marginTop: 20, padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Mon abonnement MonprojetPro One</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>
                Plan Pro — <strong style={{ color: 'var(--text)' }}>149 €/mois HT</strong> · Prochain renouvellement : <strong>01/05/2026</strong>
              </div>
            </div>
            <span className="pill" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>
              <IconDot color="#22c55e" size={6} /> Actif
            </span>
          </div>
          <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[
              ['Modules inclus', '4 / 6', 'Documents, Compta, Visio, Messages'],
              ['Stockage', '8.2 Go / 50 Go', '16% utilisé'],
              ['Utilisateurs', '1 / 3', '2 sièges disponibles'],
            ].map(([l, v, s]) => (
              <div key={l} style={{ background: '#101010', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{l}</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{v}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
            <button className="btn btn-outline-one">Gérer l'abonnement</button>
            <button className="btn" style={{ background: '#1e1e1e', color: 'var(--text-2)', border: '1px solid var(--border)' }}>Voir les factures</button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 22, fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconLink size={12} /> Synchronisé avec Pennylane — dernière sync il y a 2 min
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PAGE 6 — ONE DOCUMENTS
// ═══════════════════════════════════════════════════════════════

const OneDocuments = () => {
  const [dragOver, setDragOver] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const oneDocs = [
    { name: 'Contrat_Client_Dupont.pdf', size: '450 Ko', date: '17/04/2026', type: 'PDF' },
    { name: 'CV_Sophie_Conseil_v3.pdf', size: '220 Ko', date: '12/04/2026', type: 'PDF' },
  ];
  const labDocs = [
    { name: 'Guide_Strategie_Commerciale.pdf', step: 'Lab Étape 4', size: '680 Ko', type: 'PDF' },
    { name: 'BusinessPlan_V2_Final.pdf', step: 'Lab Étape 6', size: '1.2 Mo', type: 'PDF' },
    { name: 'Personas_Clients_Etape1.pdf', step: 'Lab Étape 1', size: '340 Ko', type: 'PDF' },
  ];

  const FileRow = ({ f, oneMode = true }) => (
    <div style={{
      background: oneMode ? 'var(--card)' : '#121114',
      border: '1px solid ' + (oneMode ? 'var(--border)' : 'rgba(124,58,237,0.2)'),
      borderRadius: 10, padding: 12,
      display: 'flex', alignItems: 'center', gap: 14,
      opacity: oneMode ? 1 : 0.88, transition: 'all 0.12s',
    }}
    onMouseEnter={(e) => { if (oneMode) e.currentTarget.style.borderColor = '#3d3d3d'; }}
    onMouseLeave={(e) => { if (oneMode) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 8,
        background: oneMode ? 'rgba(34,197,94,0.12)' : 'rgba(124,58,237,0.15)',
        color: oneMode ? '#4ade80' : 'var(--lab-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', flexShrink: 0,
      }}>{f.type}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 3 }}>
          {oneMode ? `${f.size} · ${f.date}` : `${f.step} · ${f.size} · Lecture seule`}
        </div>
      </div>
      {!oneMode && <IconLock size={14} stroke="var(--lab-light)" />}
    </div>
  );

  return (
    <div style={{ padding: 28, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
      <PageHeader
        title="Documents"
        subtitle="Tous vos fichiers clients, factures, contrats — et les livrables hérités du Lab"
        right={
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <IconSearch size={14} stroke="var(--text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un document..."
                style={{
                  background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
                  padding: '9px 12px 9px 36px', color: 'var(--text)', fontSize: 13, width: 260, outline: 'none',
                }} />
            </div>
            <button className="btn btn-one"><IconPlus size={14} /> Ajouter</button>
          </div>
        }
      />

      {/* One docs */}
      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Documents One</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {oneDocs.map((f) => <FileRow key={f.name} f={f} />)}
        </div>
      </div>

      {/* Lab legacy */}
      <div style={{ marginTop: 30 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--lab-light)' }}>Livrables hérités du Lab</div>
          <span className="pill" style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--lab-light)', border: '1px solid var(--lab-border)' }}>
            Lab · Lecture seule
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>
          Documents partagés par MiKL pendant votre parcours d'incubation
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {labDocs.map((f) => <FileRow key={f.name} f={f} oneMode={false} />)}
        </div>
      </div>

      {/* Upload */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
        style={{
          marginTop: 28, borderRadius: 14,
          border: `1px dashed ${dragOver ? '#4ade80' : 'var(--border-active)'}`,
          background: dragOver ? 'rgba(74,222,128,0.06)' : '#0f0f0f',
          padding: 42, textAlign: 'center', transition: 'all 0.15s',
        }}>
        <IconUpload size={28} stroke={dragOver ? '#4ade80' : 'var(--text-2)'} sw={1.4} />
        <div style={{ marginTop: 14, fontSize: 14, color: 'var(--text)' }}>
          <strong>Glissez vos fichiers ici</strong> ou cliquez pour uploader
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)' }}>
          PDF, Word, Excel, Images — max 50 Mo
        </div>
      </div>
    </div>
  );
};

// Placeholders for remaining One nav items
const OnePlaceholder = ({ title, subtitle, children }) => (
  <div style={{ padding: 28, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
    <PageHeader title={title} subtitle={subtitle} />
    <div className="card" style={{ marginTop: 26, padding: 40 }}>
      {children}
    </div>
  </div>
);

const OneModules = ({ setRoute }) => (
  <div style={{ padding: 28, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
    <PageHeader title="Mes Modules" subtitle="Activez ou désactivez les modules de votre espace One" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 24 }}>
      {[
        { label: 'Documents', Icon: IconFolder, active: true, route: 'one-documents', desc: 'Stockage + partage sécurisé' },
        { label: 'Comptabilité', Icon: IconEuro, active: true, route: 'one-compta', desc: 'Devis, factures, Pennylane' },
        { label: 'Visio', Icon: IconCamera, active: true, route: 'one-visios', desc: 'RDV clients en un clic' },
        { label: 'Messages', Icon: IconMessage, active: true, route: 'one-messages', desc: 'Messagerie MiKL + clients' },
        { label: 'CRM', Icon: IconUser, desc: 'Fichier clients + pipeline' },
        { label: 'Analytics', Icon: IconGrid, desc: 'Tableau de bord activité' },
      ].map((m) => (
        <div key={m.label} onClick={() => m.active && setRoute(m.route)} style={{
          background: m.active ? 'var(--card)' : '#111',
          border: m.active ? '1px solid var(--border)' : '1px dashed #374151',
          borderRadius: 14, padding: 20, cursor: m.active ? 'pointer' : 'default',
          opacity: m.active ? 1 : 0.6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: m.active ? 'rgba(74,222,128,0.1)' : '#1a1a1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <m.Icon size={20} stroke={m.active ? '#4ade80' : 'var(--text-3)'} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 600 }}>{m.label}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>{m.desc}</div>
            </div>
            {m.active
              ? <span className="pill" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ade80' }}>Actif</span>
              : <span className="pill" style={{ background: 'rgba(107,114,128,0.2)', color: 'var(--text-3)' }}>Inactif</span>}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const OneMessages = () => (
  <OnePlaceholder title="Messages" subtitle="Conversations avec MiKL, clients et fournisseurs">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[
        { from: 'MiKL', last: 'J\'ai bien reçu votre facture #INV-042. Tout est en ordre.', time: '10:24', unread: true, fg: '#4ade80' },
        { from: 'Martin Dupont', last: 'Parfait, je signe le devis dans la journée.', time: 'Hier', unread: true },
        { from: 'Claire Bellini', last: 'Merci pour la visio, à la semaine prochaine.', time: '2j' },
      ].map((m, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 4px', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: '#2d2d2d',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 600, color: m.fg || 'var(--text-2)',
          }}>{m.from.split(' ').map(s => s[0]).join('').slice(0, 2)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13.5, fontWeight: m.unread ? 600 : 500, color: m.fg || 'var(--text)' }}>{m.from}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{m.time}</div>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-2)', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.last}</div>
          </div>
          {m.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />}
        </div>
      ))}
    </div>
  </OnePlaceholder>
);

const OneVisios = () => (
  <OnePlaceholder title="Visios" subtitle="Rendez-vous planifiés et historique de réunions">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[
        { date: 'Mar. 22 avr.', time: '14:00 — 15:00', title: 'Relecture Business Plan avec MiKL', who: 'MiKL Durand', next: true },
        { date: 'Ven. 25 avr.', time: '10:30 — 11:30', title: 'Point client — Martin Dupont', who: 'Martin Dupont' },
        { date: 'Lun. 28 avr.', time: '16:00 — 17:00', title: 'Coaching trimestriel', who: 'Coach Élio' },
      ].map((v, i) => (
        <div key={i} style={{
          background: v.next ? 'var(--one-bg)' : '#121212',
          border: v.next ? '1px solid rgba(22,163,74,0.4)' : '1px solid var(--border)',
          borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{ width: 70, textAlign: 'center' }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{v.date.split(' ')[0]}</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 3 }}>{v.date.split(' ')[1]}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{v.date.split(' ').slice(2).join(' ')}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{v.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>{v.time} · avec {v.who}</div>
          </div>
          {v.next
            ? <button className="btn btn-one"><IconCamera size={14} /> Rejoindre</button>
            : <button className="btn btn-outline-one">Détails</button>}
        </div>
      ))}
    </div>
  </OnePlaceholder>
);

Object.assign(window, { OneAccueil, OneCompta, OneDocuments, OneModules, OneMessages, OneVisios });
