# Module Email — FAQ

**Q : Le bouton "Connecter Gmail" ne fonctionne pas ?**
R : Vérifier que GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET sont définis dans .env.local et que l'URI de callback est bien configurée dans Google Cloud Console.

**Q : Les emails d'un client ne s'affichent pas ?**
R : Gmail filtre par adresse email du client. Vérifier que l'email dans la fiche CRM correspond exactement à celui utilisé dans Gmail.

**Q : Le token expire ?**
R : Les access tokens durent 1 heure. Le module rafraîchit automatiquement via le refresh token.
