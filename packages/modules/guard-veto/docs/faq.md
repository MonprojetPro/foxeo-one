# GuardVeto — questions fréquentes

### Pourquoi le cockpit affiche « Guichet injoignable » ?

Trois causes, dans l'ordre de fréquence :

1. `GUARDVETO_ADMIN_API_SECRET` ou `GUARDVETO_ADMIN_API_URL` n'est pas posée sur Vercel (le
   module répond alors 503 avec le nom de la variable manquante) ;
2. le secret du Hub et celui de GuardVeto ne sont pas le même ;
3. GuardVeto est en cours de déploiement.

Le message d'erreur affiché est celui du guichet : il nomme la cause.

### Pourquoi « Comptes illisibles » ou « — » à la place d'un chiffre ?

Parce que l'API d'authentification de GuardVeto n'a pas répondu. Le guichet renvoie alors
« je ne sais pas » plutôt que des zéros, et l'écran le répète. Un chiffre faux est pire qu'une
case vide : on le croit.

### Un changement fait dans GuardVeto met du temps à apparaître. Normal ?

Oui, jusqu'à une minute. La donnée vit dans une autre base : le Realtime de Supabase ne traverse
pas les projets, donc le cockpit relit à intervalle régulier. Recharger la page va plus vite.

### Pourquoi je ne peux pas supprimer ou désactiver un compte depuis le Hub ?

Parce que ces actions n'ont pas été demandées. Le Hub ne peut faire que deux choses : renvoyer
l'invitation et réinitialiser l'accès. La liste est fermée des deux côtés — dans le module et
dans le guichet — pour que rien ne devienne joignable par accident.

### « Ce compte est déjà ouvert, utilise Réinitialiser » — pourquoi ?

L'invitation ne sert qu'à un compte qui n'a jamais été ouvert. Si la personne a déjà ouvert son
lien, c'est un mot de passe qu'il faut lui renvoyer, pas une invitation.

### Le cabinet n'affiche aucun abonnement. Il n'est pas facturé ?

Non : cela veut dire que le cabinet n'est rattaché à aucun client du Hub dans la configuration.
Le rattachement se fait dans `system_config`, clé `guardveto_cabinet_clients`.
