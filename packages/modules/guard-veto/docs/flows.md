# GuardVeto — parcours

## Lire les cabinets

```
Hub (opérateur)
  └─ GuardVetoDashboard
       └─ useGuardVetoCabinets()          [TanStack, relecture 60 s]
            └─ getGuardVetoCabinets()     [Server Action]
                 ├─ assertOperator()      ← refus si non opérateur
                 └─ callGuardVetoAdmin('/cabinets')
                      └─ GET {GUARDVETO_ADMIN_API_URL}/cabinets
                           Authorization: Bearer {secret}
```

Le guichet GuardVeto vérifie le secret en temps constant et refuse 503 s'il est absent ou trop
court. Il rend `{ data: { cabinets, jour, comptesLisibles } }`.

## Renvoyer une invitation

```
Onglet Utilisateurs → bouton « Renvoyer l'invitation »
  └─ useActionCompteGuardVeto()
       └─ actionCompteGuardVeto({ action: 'inviter', genre, id })
            ├─ assertOperator()
            ├─ schéma Zod : seules 'inviter' et 'reinitialiser' passent
            └─ POST {guichet}/comptes/action
                 └─ GuardVeto : envoyerInvitation() — chemin unique, partagé
                    avec ses propres écrans d'administration
```

Au retour :

- **succès** → message « Message envoyé à {adresse} », puis les comptes **et** les cabinets sont
  invalidés (les compteurs d'équipe de l'onglet Cabinets en dépendent) ;
- **refus prévisible** (409) → le message du guichet est affiché tel quel : « déjà ouvert,
  utilise Réinitialiser », « fiche désactivée » ;
- **échec technique** (502) → message générique ; le détail reste dans les journaux de GuardVeto.

## Rappel d'abonnement

```
apps/hub/.../guard-veto/page.tsx          [Server Component]
  ├─ is_operator()                        ← sinon notFound()
  ├─ system_config.guardveto_cabinet_clients   → { cabinetId: clientId }
  ├─ clients + billing_sync (invoice, subscription)
  └─ isInvoiceAwaitingPayment()           ← formule UNIQUE (@monprojetpro/utils)
       └─ injecté au module via la prop `rappels`
```

Le module ne calcule rien de financier et n'importe pas le module facturation : un module ne peut
pas en importer un autre, et recopier la formule en ferait une seconde vérité.
