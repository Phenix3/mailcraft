# Mise en service MailCraft

## 1. Préparer le profil d’expédition

Connectez-vous avec un compte administrateur, ouvrez **Administration**, puis renseignez le nom expéditeur et l’adresse de réponse. Ces informations ne contiennent aucun secret et peuvent être mises à jour dans l’application.

Les identifiants de transport doivent être ajoutés dans les **paramètres sécurisés du projet**, jamais dans un champ de formulaire ni dans le code. Préparez les cinq variables suivantes :

| Variable | Valeur attendue |
| --- | --- |
| `SMTP_HOST` | Hôte SMTP fourni par le prestataire d’envoi. |
| `SMTP_PORT` | Port SMTP, généralement `587` (STARTTLS) ou `465` (TLS). |
| `SMTP_USER` | Identifiant SMTP. |
| `SMTP_PASS` | Mot de passe SMTP ou clé SMTP. |
| `SMTP_FROM` | Adresse expéditrice autorisée, par exemple `MailCraft <bonjour@domaine.fr>`. |

Une fois les variables enregistrées, retournez dans **Administration** et utilisez **Vérifier le transport**. Cette action est exécutée côté serveur ; aucun secret n’est renvoyé au navigateur.

## 2. Activer les flux d’envoi

Créez une campagne ou un auto-répondeur, puis choisissez l’envoi immédiat, la planification ou l’activation. MailCraft bloque ces actions tant que le transport SMTP est incomplet. Pour les auto-répondeurs, les nouvelles inscriptions sont examinées périodiquement et seuls les abonnés actifs, consentants, non supprimés après rebond et non déjà traités sont éligibles.

## 3. Configurer les rebonds

Pour recevoir les rebonds d’un prestataire, définissez également `SMTP_BOUNCE_WEBHOOK_SECRET`, puis configurez le prestataire pour appeler :

```text
POST https://votre-domaine/api/webhooks/smtp-bounce
Header: x-mailcraft-webhook-secret: <SMTP_BOUNCE_WEBHOOK_SECRET>
```

Le corps doit comporter `userId`, `recipientEmail`, `type` (`hard` ou `soft`) et, si disponibles, `reason`, `providerEventId` et `occurredAt`. Un rebond `hard` marque automatiquement le contact comme non sollicitable ; un rebond `soft` est seulement journalisé.

## 4. Publier et activer la planification

Créez d’abord une nouvelle sauvegarde du projet, puis utilisez le bouton **Publish** de l’interface de gestion pour publier MailCraft. La publication est nécessaire avant l’activation des campagnes planifiées et des auto-répondeurs, car leurs appels automatisés doivent joindre l’URL publique de l’application.

> L’outillage de consentement, désabonnement et rebond facilite vos procédures de conformité. Faites valider vos mentions, base légale, délais de conservation et paramétrage prestataire par votre conseil juridique avant une mise en production.
