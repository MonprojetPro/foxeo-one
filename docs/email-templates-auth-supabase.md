# Templates d'authentification Supabase — version MonprojetPro

> **À quoi ça sert** : Supabase envoie lui-même les mails de connexion/sécurité (inscription, mot de passe oublié, invitation…). Ils ne passent PAS par l'Edge Function `send-email`, donc ils n'héritent pas automatiquement de notre gabarit. Ce fichier contient les 6 versions françaises, alignées sur le design de `send-email` (fond `#f4f4f5`, carte blanche, CTA vert `#059669`, Poppins/Inter, même pied de page).
>
> **Où les coller** : Supabase Dashboard → Authentication → **Emails** → onglet *Templates*. Pour chaque modèle : remplacer le **Subject** et le **Message body**, puis Save.
>
> **Prérequis** : SMTP personnalisé configuré sur Resend (fait le 2026-07-26), sinon l'expéditeur reste `noreply@mail.app.supabase.io`.
>
> ⚠️ **Ne jamais modifier les `{{ .Variable }}`** — ce sont les jetons que Supabase remplace à l'envoi. Toucher à leur orthographe casse le lien.

---

## Règles de ton retenues

- **Vouvoiement** — cohérent avec `welcome-lab`, `welcome-venture` et les mails de facturation. (Élio tutoie dans l'app ; les mails de sécurité gardent un registre plus posé.)
- **Pas de nom** dans ces mails : Supabase ne connaît que l'email au moment de l'envoi, pas le prénom du client.
- Toujours une **phrase de réassurance** en bas (« si vous n'êtes pas à l'origine de cette demande… ») : c'est un mail de sécurité, l'utilisateur doit savoir quoi faire s'il ne l'a pas demandé.
- Toujours l'**expiration du lien** annoncée : évite le ticket support « le lien ne marche plus ».

---

## 1. Confirm signup — Confirmation d'inscription

**Subject**

```
Confirmez votre adresse email — MonprojetPro
```

**Message body**

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Confirmez votre adresse email</title></head>
<body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h2 style="color:#0a0a0a;font-family:'Poppins',sans-serif;margin:0 0 16px;">Bienvenue chez MonprojetPro</h2>
    <div style="color:#3f3f46;line-height:1.6;">
      <p>Bonjour,</p>
      <p>Votre compte est presque prêt. Il ne reste qu'à confirmer votre adresse email pour y accéder.</p>
      <p>Chez MonprojetPro, notre métier tient en une phrase : <strong>donner à chaque projet la chance de devenir réalité</strong>. Le vôtre commence ici.</p>
    </div>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#059669;color:#ffffff;border-radius:6px;text-decoration:none;font-family:'Poppins',sans-serif;font-weight:600;">Confirmer mon adresse</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Ce lien est valable 1 heure. Passé ce délai, demandez-en un nouveau depuis la page de connexion.</p>
    <p style="color:#6b7280;font-size:14px;">Vous n'êtes pas à l'origine de cette inscription ? Ignorez simplement cet email, aucun compte ne sera activé.</p>
    <hr style="margin-top:32px;border:none;border-top:1px solid #e4e4e7;" />
    <p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;">MonprojetPro — une question ? <a href="mailto:contact@monprojet-pro.com" style="color:#059669;">contact@monprojet-pro.com</a></p>
  </div>
</body>
</html>
```

---

## 2. Reset password — Mot de passe oublié

**Subject**

```
Réinitialisez votre mot de passe — MonprojetPro
```

**Message body**

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Réinitialisez votre mot de passe</title></head>
<body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h2 style="color:#0a0a0a;font-family:'Poppins',sans-serif;margin:0 0 16px;">Réinitialisez votre mot de passe</h2>
    <div style="color:#3f3f46;line-height:1.6;">
      <p>Bonjour,</p>
      <p>Vous avez demandé à réinitialiser le mot de passe de votre espace MonprojetPro. Cliquez sur le bouton ci-dessous pour en choisir un nouveau.</p>
    </div>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#059669;color:#ffffff;border-radius:6px;text-decoration:none;font-family:'Poppins',sans-serif;font-weight:600;">Choisir un nouveau mot de passe</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Ce lien est valable 1 heure et ne fonctionne qu'une seule fois.</p>
    <p style="color:#6b7280;font-size:14px;">Vous n'avez rien demandé ? Ignorez cet email : votre mot de passe actuel reste valable et personne n'a accès à votre compte.</p>
    <hr style="margin-top:32px;border:none;border-top:1px solid #e4e4e7;" />
    <p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;">MonprojetPro — une question ? <a href="mailto:contact@monprojet-pro.com" style="color:#059669;">contact@monprojet-pro.com</a></p>
  </div>
</body>
</html>
```

---

## 3. Magic Link — Connexion sans mot de passe

**Subject**

```
Votre lien de connexion — MonprojetPro
```

**Message body**

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Votre lien de connexion</title></head>
<body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h2 style="color:#0a0a0a;font-family:'Poppins',sans-serif;margin:0 0 16px;">Votre lien de connexion</h2>
    <div style="color:#3f3f46;line-height:1.6;">
      <p>Bonjour,</p>
      <p>Voici votre accès direct à votre espace MonprojetPro — pas de mot de passe à saisir, un simple clic suffit.</p>
    </div>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#059669;color:#ffffff;border-radius:6px;text-decoration:none;font-family:'Poppins',sans-serif;font-weight:600;">Accéder à mon espace</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Ce lien est valable 1 heure et ne fonctionne qu'une seule fois. Ne le transmettez à personne : il donne accès à votre compte.</p>
    <p style="color:#6b7280;font-size:14px;">Vous n'avez pas demandé à vous connecter ? Ignorez cet email.</p>
    <hr style="margin-top:32px;border:none;border-top:1px solid #e4e4e7;" />
    <p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;">MonprojetPro — une question ? <a href="mailto:contact@monprojet-pro.com" style="color:#059669;">contact@monprojet-pro.com</a></p>
  </div>
</body>
</html>
```

---

## 4. Invite user — Invitation à rejoindre MonprojetPro

**Subject**

```
Votre espace MonprojetPro vous attend
```

**Message body**

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Votre espace MonprojetPro vous attend</title></head>
<body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h2 style="color:#0a0a0a;font-family:'Poppins',sans-serif;margin:0 0 16px;">Votre espace MonprojetPro est ouvert</h2>
    <div style="color:#3f3f46;line-height:1.6;">
      <p>Bonjour,</p>
      <p>Nous vous avons ouvert un espace personnel sur MonprojetPro. Vous y retrouverez votre parcours, vos documents et votre accompagnement — au même endroit.</p>
      <p>Pour y accéder, définissez votre mot de passe :</p>
    </div>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#059669;color:#ffffff;border-radius:6px;text-decoration:none;font-family:'Poppins',sans-serif;font-weight:600;">Définir mon mot de passe</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Ce lien personnel est valable 1 heure. Passé ce délai, utilisez « Mot de passe oublié » sur la page de connexion : vous recevrez un nouveau lien immédiatement.</p>
    <hr style="margin-top:32px;border:none;border-top:1px solid #e4e4e7;" />
    <p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;">MonprojetPro — une question ? <a href="mailto:contact@monprojet-pro.com" style="color:#059669;">contact@monprojet-pro.com</a></p>
  </div>
</body>
</html>
```

---

## 5. Change Email Address — Changement d'adresse email

**Subject**

```
Confirmez votre nouvelle adresse email — MonprojetPro
```

**Message body**

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Confirmez votre nouvelle adresse</title></head>
<body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h2 style="color:#0a0a0a;font-family:'Poppins',sans-serif;margin:0 0 16px;">Confirmez votre nouvelle adresse</h2>
    <div style="color:#3f3f46;line-height:1.6;">
      <p>Bonjour,</p>
      <p>Vous avez demandé à remplacer l'adresse <strong>{{ .Email }}</strong> par <strong>{{ .NewEmail }}</strong> sur votre compte MonprojetPro.</p>
      <p>Confirmez ce changement pour l'activer — c'est cette adresse qui servira ensuite à vous connecter.</p>
    </div>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#059669;color:#ffffff;border-radius:6px;text-decoration:none;font-family:'Poppins',sans-serif;font-weight:600;">Confirmer le changement</a>
    <p style="color:#6b7280;font-size:14px;margin-top:24px;">Ce lien est valable 1 heure. Tant que vous n'avez pas confirmé, votre ancienne adresse reste active.</p>
    <p style="color:#6b7280;font-size:14px;">Vous n'êtes pas à l'origine de cette demande ? Ne cliquez pas et prévenez-nous à <a href="mailto:contact@monprojet-pro.com" style="color:#059669;">contact@monprojet-pro.com</a>.</p>
    <hr style="margin-top:32px;border:none;border-top:1px solid #e4e4e7;" />
    <p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;">MonprojetPro — une question ? <a href="mailto:contact@monprojet-pro.com" style="color:#059669;">contact@monprojet-pro.com</a></p>
  </div>
</body>
</html>
```

---

## 6. Reauthentication — Code de confirmation

**Subject**

```
Votre code de confirmation — MonprojetPro
```

**Message body**

```html
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Votre code de confirmation</title></head>
<body style="margin:0;padding:20px;background:#f4f4f5;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;">
    <h2 style="color:#0a0a0a;font-family:'Poppins',sans-serif;margin:0 0 16px;">Votre code de confirmation</h2>
    <div style="color:#3f3f46;line-height:1.6;">
      <p>Bonjour,</p>
      <p>Pour valider cette opération sensible sur votre compte, saisissez le code ci-dessous :</p>
    </div>
    <p style="margin:24px 0;padding:16px 24px;background:#f4f4f5;border-radius:6px;font-family:'Poppins',monospace;font-size:28px;font-weight:600;letter-spacing:6px;color:#0a0a0a;text-align:center;">{{ .Token }}</p>
    <p style="color:#6b7280;font-size:14px;">Ce code expire dans quelques minutes. Ne le communiquez à personne — aucun membre de l'équipe MonprojetPro ne vous le demandera jamais.</p>
    <p style="color:#6b7280;font-size:14px;">Vous n'avez rien demandé ? Prévenez-nous à <a href="mailto:contact@monprojet-pro.com" style="color:#059669;">contact@monprojet-pro.com</a>.</p>
    <hr style="margin-top:32px;border:none;border-top:1px solid #e4e4e7;" />
    <p style="font-size:12px;color:#a1a1aa;margin:16px 0 0;">MonprojetPro</p>
  </div>
</body>
</html>
```

---

## Après avoir collé les 6

1. **Testez le plus utilisé** : « Mot de passe oublié » depuis la page de connexion client. Vérifiez le rendu sur mobile (la carte doit rester lisible, le bouton cliquable au pouce).
2. **Vérifiez l'expéditeur** : `MonprojetPro <contact@monprojet-pro.com>`. S'il affiche encore `supabase.io`, le SMTP personnalisé n'a pas été sauvegardé.
3. **Durée de validité des liens** : les textes annoncent « 1 heure », qui est la valeur par défaut de Supabase. Si vous modifiez `Email OTP Expiration` dans les réglages Auth, pensez à mettre à jour les 6 textes en conséquence — un mail qui annonce un délai faux génère des tickets support.

## Cohérence avec le reste de la chaîne

Ces 6 mails partagent volontairement le gabarit de `supabase/functions/send-email/index.ts` (fonction `baseTemplate`). **Si le design de `baseTemplate` évolue, ce fichier doit être repris en même temps** — les templates Supabase ne sont pas générés depuis le code, ils vivent dans le dashboard.
