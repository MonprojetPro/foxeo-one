# FAQ — Module Templates

**Q: Puis-je supprimer un template parcours ?**
R: Non, les templates sont archivés (désactivés) et non supprimés pour préserver l'historique des parcours existants.

**Q: Modifier un template affecte-t-il les clients en cours ?**
R: Non. La copie du template est faite au moment de l'assignation au client. Les modifications ultérieures du template n'impactent pas les parcours actifs.

**Q: Combien d'étapes minimum doit avoir un template ?**
R: Minimum 2 étapes (validation Zod côté serveur et côté client).

**Q: Les emails personnalisés sont-ils utilisés immédiatement ?**
R: Oui. Dès qu'un template email est sauvegardé en base, le prochain email de ce type utilisera la version personnalisée.

**Q: Que se passe-t-il si je réinitialise un template email ?**
R: Le sujet et le corps sont restaurés aux valeurs par défaut (celles du seed initial de la base de données). La modification est immédiate.

**Q: Puis-je utiliser du HTML dans les templates email ?**
R: Non, l'éditeur est en texte simple. Le contenu est échappé avant envoi pour prévenir les injections XSS.
