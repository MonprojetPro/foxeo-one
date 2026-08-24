// Remplace le paquet « server-only » pendant les tests.
//
// Ce paquet leve volontairement une erreur des qu'il est importe hors d'un
// Server Component : c'est un garde-fou de production, qui empeche de charger
// en test tout composant dont la chaine d'imports le traverse. Le garde-fou
// reste entier dans l'application — seul l'environnement de test le neutralise,
// via l'alias declare dans vitest.config.ts.
export {}
