# Contrôle qualité — MailCraft

## Validation automatisée

La suite de tests a été exécutée avec succès : **4 fichiers de tests et 16 scénarios** couvrent l’authentification, l’import CSV, le rendu et le suivi d’emails, les jetons de désabonnement, la disponibilité SMTP, les auto-répondeurs, les rebonds, les droits d’administration, le consentement, la duplication et la planification des campagnes.

La vérification TypeScript (`pnpm check`) est également terminée sans erreur.

## Vérification visuelle

Les écrans principaux ont été contrôlés en version bureau : tableau de bord, campagnes, abonnés, auto-répondeurs et administration. Ils utilisent la même hiérarchie éditoriale, la palette corail/blanc/charbon, des états vides explicites et des actions primaires cohérentes.

Les écrans d’**auto-répondeurs** et d’**administration** ont aussi été contrôlés à 375 px de large. Le menu mobile, les en-têtes, les CTA et les panneaux de conformité s’adaptent en une colonne sans chevauchement ni troncature observée.

| Zone vérifiée | Décision de qualité |
| --- | --- |
| Navigation | La sidebar desktop et le menu mobile donnent accès aux flux métier sans impasse. |
| Automatisations | Les règles vides, actives et en pause disposent d’actions distinctes et lisibles. |
| Administration | Les secrets ne sont jamais affichés ; le statut SMTP et le test de transport restent côté serveur. |
| Conformité | Les indicateurs, le registre d’événements et les rebonds distinguent clairement les contacts actifs, désabonnés et supprimés des envois. |
