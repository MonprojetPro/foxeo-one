// T-089 — la conversion Markdown → HTML a demenage dans `@monprojetpro/utils`.
//
// Pourquoi : les emails de relance (module facturation) en avaient besoin, et un
// module ne peut pas en importer un autre. Elle est donc devenue une brique
// partagee, comme le vocabulaire des statuts de facture (T-083a).
//
// Ce fichier reste comme simple re-export : les appelants du module `documents`
// (apercu, visionneuse, export PDF) n'ont pas bouge, et leurs tests non plus.
export { markdownToHtml } from '@monprojetpro/utils'
