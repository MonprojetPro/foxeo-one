# Guidelines Excalidraw - Wireframes MonprojetPro

## Propriétés OBLIGATOIRES pour chaque élément

Sans ces propriétés, le fichier .excalidraw ne s'affichera pas correctement.

### Pour TOUS les éléments (rectangle, ellipse, line, arrow, etc.)

```json
{
  "id": "unique-id",
  "type": "rectangle",
  "x": 0,
  "y": 0,
  "width": 100,
  "height": 50,
  "angle": 0,
  "strokeColor": "#9e9e9e",
  "backgroundColor": "#ffffff",
  "fillStyle": "solid",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 0,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": null,
  "seed": 1001,
  "version": 1,
  "versionNonce": 1001,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1707000000000,
  "link": null,
  "locked": false
}
```

### Pour les éléments TEXT (propriétés supplémentaires)

```json
{
  "text": "Mon texte",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "left",
  "verticalAlign": "top",
  "containerId": null,
  "originalText": "Mon texte",
  "autoResize": true,
  "lineHeight": 1.25
}
```

## Propriétés critiques souvent oubliées

| Propriété | Type | Valeur par défaut | Description |
|-----------|------|-------------------|-------------|
| `angle` | number | 0 | Rotation de l'élément |
| `strokeStyle` | string | "solid" | Style du trait (solid, dashed, dotted) |
| `frameId` | null | null | ID du frame parent |
| `versionNonce` | number | unique | Doit être unique par élément |
| `updated` | number | timestamp | Timestamp de mise à jour |
| `link` | null | null | Lien externe |
| `locked` | boolean | false | Verrouillage de l'élément |
| `originalText` | string | = text | Texte original (pour les éléments text) |
| `autoResize` | boolean | true | Redimensionnement auto (text) |
| `lineHeight` | number | 1.25 | Hauteur de ligne (text) |

## Structure du fichier .excalidraw

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [...],
  "appState": {
    "gridSize": null,
    "viewBackgroundColor": "#ffffff"
  },
  "files": {}
}
```

## Seed et versionNonce

- Chaque élément doit avoir un `seed` et `versionNonce` unique
- Utiliser des nombres incrémentaux : 7001, 7002, 7003...
- Ne jamais dupliquer ces valeurs dans un même fichier

---
*Créé le 2026-02-04 - Référence pour tous les wireframes MonprojetPro*
