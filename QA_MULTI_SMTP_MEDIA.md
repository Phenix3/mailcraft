# Contrôle qualité — SMTP multi-organisation et médias

Les routes **/sending** et **/media** sont bien enregistrées dans l’application et la compilation TypeScript les valide. La capture de prévisualisation sans session affiche logiquement l’écran de connexion ; elle confirme que les routes sont protégées par l’authentification globale. La validation interactive des formulaires nécessite une session utilisateur connectée.

La couverture automatisée confirme le chiffrement et le déchiffrement de la clé SMTP, l’absence de divulgation de mot de passe ou de nom d’utilisateur complet dans les vues de profils, ainsi que la compatibilité de la suite des campagnes et emails de test avec le modèle de profil SMTP.

La migration historique a créé un profil **SMTP historique MailCraft** actif et vérifié pour l’organisation existante, avec l’identité `contact@chr-maroua.cm`. La suite finale compte **47 tests réussis** et le contrôle TypeScript est réussi.

Une navigation vers **/sending** sans cookie de session redirige vers l’écran de connexion attendu. Le parcours de création ou de vérification d’un profil exige donc une session utilisateur active ; aucune configuration SMTP n’est exposée sur la route publique.

La vérification authentifiée confirme l’affichage du profil SMTP migré comme **actif**, la bibliothèque Médias avec les contraintes d’upload visibles, la bibliothèque de modèles et l’éditeur de campagne. Les champs URL d’image des éditeurs disposent désormais d’un sélecteur contextuel qui liste les visuels de l’organisation et conduit vers Médias lorsque la bibliothèque est vide.

Dans la session de navigateur personnelle, la page Administration a redirigé correctement vers Expédition et le formulaire « Ajouter un profil SMTP » s’est ouvert sans soumettre de nouvelle configuration. La session a ensuite expiré lors de l’ouverture directe de Médias ; la page reste néanmoins couverte visuellement par la prévisualisation de projet authentifiée, avec son bouton d’upload, ses limites de format et son état vide.
