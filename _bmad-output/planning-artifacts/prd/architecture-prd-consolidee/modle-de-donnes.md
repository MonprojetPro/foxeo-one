# Modèle de Données

## Table `prospects`

Gère tous les contacts depuis la prise de RDV jusqu'à leur conversion en clients.

```sql
CREATE TABLE prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Informations de base (Cal.com)
  email TEXT NOT NULL UNIQUE,
  prenom TEXT NOT NULL,
  nom TEXT NOT NULL,
  societe_nom TEXT,

  -- Informations complémentaires (Pré-visio)
  telephone TEXT,
  siret TEXT,
  adresse TEXT,
  ville TEXT,
  code_naf TEXT,
  libelle_naf TEXT,

  -- Source et tracking
  source TEXT, -- 'qr_code', 'linkedin', 'site', 'mobile'
  rdv_pris_le TIMESTAMP,

  -- Visio
  visio_room_id TEXT,
  visio_date TIMESTAMP,
  visio_recording_url TEXT,
  transcription_url TEXT,
  resume_elio TEXT,
  consentement_enregistrement BOOLEAN DEFAULT false,

  -- Statut commercial
  statut TEXT DEFAULT 'nouveau',
  -- Valeurs : 'nouveau', 'chaud', 'tiede', 'froid', 'refuse', 'converti'
  statut_updated_at TIMESTAMP,
  relance_date DATE,
  relance_count INT DEFAULT 0,

  -- Conversion
  client_id UUID REFERENCES clients(id),
  converti_le TIMESTAMP,

  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les recherches fréquentes
CREATE INDEX idx_prospects_statut ON prospects(statut);
CREATE INDEX idx_prospects_relance ON prospects(relance_date) WHERE relance_date IS NOT NULL;
CREATE INDEX idx_prospects_email ON prospects(email);
```

## Table `email_templates`

Templates d'emails pour les différents statuts post-visio.

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  code TEXT NOT NULL UNIQUE,
  -- Valeurs : 'post_visio_chaud', 'post_visio_tiede', 'post_visio_froid', 'post_visio_non'
  nom TEXT NOT NULL,
  objet TEXT NOT NULL,
  corps TEXT NOT NULL, -- Supporte les variables {prenom}, {resume}, {lien_espace}, etc.

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Templates par défaut
INSERT INTO email_templates (code, nom, objet, corps) VALUES
('post_visio_chaud', 'Post-visio - Chaud', '{prenom}, bienvenue chez MonprojetPro !', '...'),
('post_visio_tiede', 'Post-visio - Tiède', '{prenom}, suite à notre échange', '...'),
('post_visio_froid', 'Post-visio - Froid', '{prenom}, merci pour notre échange', '...'),
('post_visio_non', 'Post-visio - Non', '{prenom}, merci pour votre temps', '...');
```

## Flux de Données Prospect

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     CYCLE DE VIE PROSPECT                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CAL.COM ──────▶ Webhook ──────▶ INSERT prospects                       │
│  (Prise RDV)                     (statut: 'nouveau')                    │
│                                                                          │
│  PRÉ-VISIO ────▶ Page salle ───▶ UPDATE prospects                       │
│  (Formulaire)    d'attente       (telephone, siret, etc.)               │
│                                                                          │
│  VISIO ────────▶ OpenVidu ─────▶ UPDATE prospects                       │
│  (Fin)                           (visio_recording_url, transcription)   │
│                                                                          │
│  POST-VISIO ───▶ Hub MiKL ─────▶ UPDATE prospects                       │
│  (Choix statut)                  (statut: 'chaud'|'tiede'|'froid'|...)  │
│                                                                          │
│  SI CHAUD ─────▶ Création ─────▶ INSERT clients + UPDATE prospects      │
│                  compte          (client_id, converti_le)               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---
