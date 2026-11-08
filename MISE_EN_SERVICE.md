# Mise en service MailCraft

MailCraft est une application Node.js autonome (Express + Vite + tRPC + MySQL/Drizzle). Elle ne dépend d'aucun service externe pour son authentification ni pour sa planification d'envoi.

## 1. Variables d'environnement requises

| Variable       | Rôle                                                                     |
| -------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL` | Connexion MySQL, ex. `mysql://user:pass@localhost:3306/mailcraft`.       |
| `JWT_SECRET`   | Secret de signature des sessions (cookie `app_session_id`). Obligatoire. |
| `NODE_ENV`     | `development` ou `production`.                                           |

Variables optionnelles :

| Variable                                                        | Rôle                                                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `PORT`                                                          | Port d'écoute (par défaut `3000` ; le serveur essaie les suivants si occupé).                        |
| `OPENAI_API_KEY`                                                | Clé du fournisseur IA. Active l'assistant de rédaction (`marketing.ai`).                             |
| `OPENAI_BASE_URL`                                               | API compatible OpenAI (OpenAI, Mistral, Groq, LiteLLM…). Défaut : `https://api.openai.com/v1`.       |
| `OPENAI_MODEL`                                                  | Modèle utilisé par l'assistant. Défaut : `gpt-4o-mini`.                                              |
| `ADMIN_EMAIL`                                                   | Si défini, ce compte inscrit devient administrateur. À défaut, le premier compte créé est admin.     |
| `SCHEDULER_SECRET`                                              | Secret pour déclencher manuellement `/api/scheduled/*` via l'en-tête `x-mailcraft-scheduler-secret`. |
| `SMTP_BOUNCE_WEBHOOK_SECRET`                                    | Secret du webhook de rebonds (voir §4).                                                              |
| `SMTP_CREDENTIALS_ENCRYPTION_KEY`                               | Clé AES de chiffrement des mots de passe SMTP stockés (32 caractères hex).                           |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Transport SMTP de secours configurable côté serveur.                                                 |

Un fichier `.env` à la racine est lu automatiquement (dotenv) et ignoré par git.

## 2. Base de données

```bash
pnpm db:push   # génère puis applique les migrations drizzle (dont 0007 : colonne users.passwordHash)
```

## 3. Lancer l'application

```bash
pnpm install
pnpm dev       # développement (tsx watch + Vite, port 3000)
pnpm build     # build production (client Vite + serveur esbuild)
pnpm start     # production (node dist/index.js)
```

## 4. Comptes et connexion

L'authentification se fait par email + mot de passe, entièrement locale :

- Le **premier compte créé** (formulaire d'inscription affiché au démarrage) devient administrateur.
- La page d'accueil affiche le panneau de connexion/inscription tant qu'aucune session n'existe.
- Les sessions durent 1 an (JWT signé, cookie httpOnly `app_session_id`). Sur HTTPS le cookie est `SameSite=None; Secure`, sur HTTP local `SameSite=Lax`.

## 5. Profil d'expédition

Connectez-vous, ouvrez **Expédition**, puis créez et vérifiez un profil SMTP (outil **Vérifier le transport**). MailCraft bloque tout envoi tant que le profil actif n'est pas vérifié.

## 6. Planification interne

Les campagnes planifiées sont envoyées par une boucle cron interne au process (croner) : vérification toutes les 30 secondes, et auto-répondeurs analysés toutes les 5 minutes. Aucun service externe n'est nécessaire : la simple exécution de `pnpm start` suffit. Les identifiants `scheduleCronTaskUid` en base sont désormais internes (`local-<id>`).

Si vous préférez déclencher les envois depuis un cron système externe, définissez `SCHEDULER_SECRET` puis appelez :

```text
POST https://votre-domaine/api/scheduled/send-campaign
Header: x-mailcraft-scheduler-secret: <SCHEDULER_SECRET>
Body: {"campaignId": 42}
```

## 7. Assistant IA (optionnel)

L'assistant de rédaction (`marketing.ai.emailAssistant`) appelle toute API compatible OpenAI. Sans `OPENAI_API_KEY`, seule cette fonctionnalité est indisponible — le reste de l'application fonctionne normalement.

## 8. Rebonds

Pour recevoir les rebonds d'un prestataire, définissez `SMTP_BOUNCE_WEBHOOK_SECRET`, puis configurez le prestataire pour appeler :

```text
POST https://votre-domaine/api/webhooks/smtp-bounce
Header: x-mailcraft-webhook-secret: <SMTP_BOUNCE_WEBHOOK_SECRET>
```

Le corps doit comporter `userId`, `recipientEmail`, `type` (`hard` ou `soft`) et, si disponibles, `reason`, `providerEventId` et `occurredAt`. Un rebond `hard` marque automatiquement le contact comme non sollicitable ; un rebond `soft` est seulement journalisé.

## 9. Médias

Les images de la médiathèque sont enregistrées sur le disque local dans `uploads/` et servies à l'URL `/uploads/…`. Pensez à inclure ce dossier dans vos sauvegardes et à le monter comme volume persistant en production.
