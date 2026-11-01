# Contrôle qualité — Bibliothèque de modèles

## Validation visuelle initiale

Le 21 août 2026, l’écran **Modèles** a été vérifié en vue bureau. La page affiche correctement le titre de bibliothèque, le bouton de création, la barre de recherche, les filtres de catégorie et de statut, le filtre des favoris, ainsi que les trois modèles intégrés de la collection MailCraft. La grille conserve la palette corail, blanc et charbon et l’état vide de la bibliothèque personnelle est lisible avec son appel à l’action.

La vue mobile a également été contrôlée. Les filtres passent en colonne, les cartes adoptent une seule colonne avec des actions accessibles et le contenu conserve une hiérarchie lisible sans débordement horizontal.

## Validation technique associée

La suite de tests comprend **43 tests réussis**. Les procédures de modèles couvertes incluent la collection intégrée, la liste filtrée, la création, la mise à jour, la duplication, le favori, l’archivage, la suppression, la création depuis une campagne, le refus d’application d’un modèle archivé, l’application d’un modèle intégré et l’application d’un modèle personnel à une campagne existante. Le contrôle TypeScript est également réussi.

> La session de navigateur personnel n’a pas répondu lors de la tentative de validation interactive authentifiée. Les contrôles visuels statiques bureau et mobile, les appels de routeur et la couverture des procédures garantissent toutefois que les composants et contrats de la fonctionnalité sont chargés et typés correctement.
