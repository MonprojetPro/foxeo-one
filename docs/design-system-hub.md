# Design system du Hub — « Minimal Futuriste »

> Spécification autonome, extraite du code réel du Hub MonprojetPro (2026-08-04).
> Destinée à être transmise telle quelle à qui refait le site `www.monprojet-pro.com`.
> Toutes les valeurs ci-dessous sont celles réellement en production, pas des intentions.

---

## 1. Le principe en une phrase

**Du verre posé sur du noir profond, éclairé par une seule couleur d'accent.**

Trois gestes reviennent partout et suffisent à reproduire la signature :

1. Un fond **noir presque pur**, jamais gris.
2. Des surfaces en **verre** : blanc à 2–4 % d'opacité, bordure blanche à 10 %, angles très arrondis.
3. Un **halo coloré flouté** derrière les éléments importants — la lumière ne vient jamais d'une bordure vive, toujours d'un flou.

Ce qu'on ne fait **jamais** : des aplats de couleur saturée, des ombres portées grises, des bordures pleines opaques, des dégradés arc-en-ciel.

---

## 2. Fondations

### 2.1 Couleurs

| Rôle | Valeur | Usage |
|---|---|---|
| **Fond de page** | `#020402` | Le noir de référence. Légèrement teinté vert-cyan, jamais `#000000` |
| **Surface (verre)** | `rgba(255,255,255,0.02)` à `0.04` | Cartes, panneaux |
| **Surface au survol** | `rgba(255,255,255,0.04)` | Cartes interactives |
| **Bordure** | `rgba(255,255,255,0.10)` | Toutes les bordures par défaut |
| **Accent Hub** | **Cyan** — `#67e8f9` (texte) / `#22d3ee` (fond) | Un seul accent par écran |
| **Texte principal** | `#ffffff` | Titres, chiffres |
| **Texte secondaire** | `#9ca3af` | Descriptions, sous-titres |
| **Texte tertiaire** | `#6b7280` | Intitulés de champs, mentions |

**Palette d'accents secondaires** (à n'utiliser que pour porter un sens, jamais pour décorer) :

| Ton | Texte | Sens dans le produit |
|---|---|---|
| Cyan | `#67e8f9` | Hub, neutre positif |
| Violet | `#c4b5fd` | Espace Lab |
| Émeraude | `#6ee7b7` | Espace One, succès, « en ligne » |
| Ambre | `#fcd34d` | Attention, en cours |
| Rouge | `#fca5a5` | Erreur, urgent |

Règle de composition d'un accent, quel qu'il soit :

```
texte    : couleur-300
bordure  : couleur-400 à 25 % d'opacité
fond     : couleur-400 à 10 % d'opacité
halo     : couleur-400 à 10 % d'opacité + flou important
fond doux: couleur-400 à 6 % d'opacité
```

### 2.2 Typographie

| Usage | Police | Graisses |
|---|---|---|
| Titres et interface | **Poppins** | 400, 500, 600, 700 |
| Corps de texte | **Inter** | 400, 500 |
| Chiffres | Poppins + `font-variant-numeric: tabular-nums` | 600 |

Échelle réellement utilisée :

| Élément | Taille | Graisse | Autres |
|---|---|---|---|
| Titre de page | `1.25rem` (20 px) | 600 | `letter-spacing: -0.02em` |
| Grand chiffre (KPI) | `1.875rem` (30 px) | 600 | tabular-nums |
| Chiffre secondaire | `1.5rem` (24 px) | 600 | tabular-nums |
| Titre de panneau | `0.8rem` (12.8 px) | 600 | **MAJUSCULES**, `letter-spacing: 0.05em`, gris clair |
| Intitulé de champ | `0.7rem` (11.2 px) | 500-600 | **MAJUSCULES**, `letter-spacing: 0.05em`, gris |
| Corps | `0.875rem` (14 px) | 400 | gris clair |
| Mention | `0.75rem` (12 px) | 400 | gris moyen |

> Les **petites majuscules espacées** sont la signature typographique du Hub. C'est ce détail, plus que la couleur, qui fait « reconnaître » le style.

### 2.3 Formes et espacements

| Propriété | Valeur |
|---|---|
| Rayon des grandes cartes | `1rem` (16 px) |
| Rayon des petites cartes | `0.75rem` (12 px) |
| Rayon des pastilles d'icône | `0.75rem` |
| Rayon des capsules | `9999px` |
| Padding d'une carte KPI | `1.25rem` |
| Padding d'un panneau | `1rem` horizontal, `0.75rem` vertical pour l'en-tête |
| Espacement entre blocs | `1.5rem` |
| Espacement dans une grille | `1rem` |

**Ombres** : jamais d'ombre grise classique. Une seule ombre existe, très diffuse et très sombre :
`0 24px 80px -32px rgba(0,0,0,0.9)`

---

## 3. Les six recettes

### 3.1 Le halo — le geste fondateur

Présent derrière presque chaque élément important. Un cercle coloré, flouté à l'extrême, débordant hors du cadre :

```html
<div class="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5">
  <div aria-hidden
       class="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl"></div>
  <!-- contenu -->
</div>
```

Le halo est **toujours** : hors du cadre (valeurs négatives), flouté à `blur-2xl` ou `blur-3xl`, à faible opacité (10 %), et `pointer-events: none`.

### 3.2 En-tête de section

```html
<div class="relative overflow-hidden rounded-2xl border border-white/10 bg-cyan-400/[0.06] bg-gradient-to-b to-transparent px-6 py-5">
  <div aria-hidden class="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl"></div>
  <div class="relative flex items-start gap-3">
    <div class="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_-8px]">
      <!-- icône 24px -->
    </div>
    <div>
      <h1 class="text-xl font-semibold tracking-tight text-white">Titre</h1>
      <p class="text-sm text-gray-400">Sous-titre descriptif</p>
    </div>
  </div>
</div>
```

### 3.3 Carte KPI

```html
<div class="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] p-5 transition-all duration-200 hover:bg-white/[0.04] hover:border-cyan-400/30">
  <div aria-hidden class="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-cyan-400/10 opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100"></div>
  <div class="relative flex items-start justify-between">
    <div class="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300"><!-- icône 20px --></div>
    <span class="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-2 py-0.5 text-[0.7rem] font-medium text-emerald-300">+12</span>
  </div>
  <p class="relative mt-4 text-3xl font-semibold tabular-nums tracking-tight text-white">128</p>
  <p class="relative mt-1 text-sm text-gray-400">Libellé</p>
</div>
```

Grille associée : `grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`

### 3.4 Panneau titré

```html
<div class="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
  <div class="flex items-center justify-between border-b border-white/10 px-4 py-3">
    <h3 class="text-[0.8rem] font-semibold uppercase tracking-wider text-gray-300">Titre du panneau</h3>
    <a class="text-xs text-cyan-300/80 hover:text-cyan-200">Voir tout →</a>
  </div>
  <div class="p-1.5"><!-- contenu --></div>
</div>
```

### 3.5 Pastille de statut

```html
<div class="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
  <span class="relative flex h-2 w-2">
    <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40"></span>
    <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
  </span>
  <span class="text-xs font-medium text-emerald-300/90">En ligne</span>
</div>
```

Le point qui pulse n'est utilisé que pour un état **réellement vivant**. Un état figé (erreur, inactif) ne pulse pas.

### 3.6 Mini-carte chiffrée

```html
<div class="rounded-xl border border-white/10 bg-white/[0.02] p-4">
  <p class="text-[0.7rem] font-medium uppercase tracking-wider text-gray-500">Libellé</p>
  <p class="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-white">42</p>
</div>
```

---

## 4. Règles d'or

1. **Un seul accent coloré par écran.** Le cyan porte l'attention ; les autres tons ne servent qu'à signaler un état (succès, alerte, erreur).
2. **La lumière vient du flou, jamais du trait.** Pour faire ressortir un élément : un halo derrière. Jamais une bordure vive.
3. **Les bordures sont presque invisibles** — blanc à 10 %. Elles délimitent, elles ne dessinent pas.
4. **Chiffres en tabular-nums**, toujours. Sinon les colonnes de chiffres dansent.
5. **Les intitulés sont en petites majuscules espacées.** C'est la signature.
6. **Les transitions durent 200 ms**, sur `background`, `border` et `opacity` uniquement.
7. **Skeletons, jamais de tourniquet.** Un chargement se représente par des blocs gris pulsants aux dimensions du contenu à venir.

---

## 5. Adapter au site vitrine — ce qui doit changer

Un cockpit et un site public n'ont pas le même métier. Recopier le Hub tel quel donnerait un site **froid, dense et fatigant**. Ce qu'il faut transposer, et ce qu'il faut relâcher :

| Aspect | Hub (cockpit) | Site vitrine |
|---|---|---|
| **Densité** | Compacte — on affiche le maximum | **Aérée** — doubler les espacements verticaux, respirer entre les sections |
| **Taille des titres** | 20 px (on scanne) | **40 à 64 px** en section d'accroche (on séduit) |
| **Corps de texte** | 14 px | **16 à 18 px** — un visiteur lit, il ne scanne pas un tableau |
| **Contraste du texte** | Gris 400 accepté | **Remonter** : gris 300 minimum pour les paragraphes lus |
| **Halos** | Discrets, 10 % | **Plus généreux** en section d'accroche — c'est le moment spectaculaire |
| **Animation** | Quasi nulle | Apparitions au défilement acceptables, **lentes et sobres** |
| **Largeur de contenu** | Pleine largeur | **Limiter à ~1200 px**, texte à ~65 caractères par ligne |

**À conserver absolument** (c'est ce qui fera « c'est la même marque ») : le fond `#020402`, le verre à 2–4 %, les bordures à 10 %, les angles `1rem`, les halos flous, les petites majuscules espacées, Poppins + Inter.

**Le faisceau de lumière de la page de connexion** (violet `#935fee` → vert `#09e159`, incliné, en fusion `screen` sur fond noir) est disponible et ferait un excellent fond de section d'accroche pour le site — il crée une continuité visuelle directe entre le site et l'entrée de connexion.

### Une question à trancher avant de commencer

Le **cyan est la couleur du cockpit de MiKL**, un espace privé. Le site public s'adresse à des prospects. Trois options :

1. **Cyan** — cohérence maximale avec le Hub (ce que MiKL a demandé).
2. **Violet → vert** — reprend la page de connexion et les deux espaces clients (Lab et One), donc ce que le visiteur va réellement utiliser.
3. **Neutre + accents** — fond noir et verre sans couleur dominante, la couleur n'apparaissant que sur les appels à l'action.

À arbitrer par MiKL. Le reste de la spécification s'applique identiquement dans les trois cas.

---

## 6. Erreurs qui cassent le style

- ❌ `#000000` pur en fond — il manque la teinte, l'écran paraît mort
- ❌ Ombres portées grises classiques (`box-shadow: 0 2px 8px rgba(0,0,0,.2)`)
- ❌ Bordures opaques ou colorées à pleine intensité
- ❌ Plus d'un accent coloré par section
- ❌ Aplats de couleur saturée sur de grandes surfaces
- ❌ Angles droits ou faiblement arrondis (< 12 px)
- ❌ Texte gris 500 ou plus foncé sur fond noir pour du contenu à lire
- ❌ Tourniquets de chargement
