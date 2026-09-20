# Camping Technique Pro

Refonte complète de l'interface en logiciel de gestion technique.

## Modules
- Tableau de bord très visuel : urgences, réparations, travaux, stocks, hivernage
- 193 mobil-homes
- Réparations avec cycle À faire → En cours → À valider → Terminée
- Validation nominative automatique via le compte connecté
- Date et heure de validation
- Pièces liées aux réparations
- Stocks et mouvements
- Travaux hors réparation
- Hivernage avec checklist par mobil-home
- Planning des éléments non terminés
- Historique / traçabilité
- Interface responsive type application mobile

## Mise en place
1. Dans Supabase SQL Editor, exécuter `schema.sql`.
2. Créer les 2 utilisateurs dans Authentication > Users.
3. Ajouter leur profil dans `profiles` avec leur UUID et leur nom.
4. Mettre les fichiers sur GitHub.
5. Activer GitHub Pages.

## Important
`config.js` contient une Publishable key, prévue pour une application web. Ne jamais mettre une Secret key/service_role dans le navigateur.

## Prochaine évolution recommandée
- Upload photos via Supabase Storage
- gestion des pièces par réparation avec sortie de stock transactionnelle
- notifications
- droits administrateur / technicien
- exports PDF/Excel
- statistiques mensuelles


## Connexion
Les comptes de connexion doivent être créés dans Supabase > Authentication > Users.
Si la confirmation email est activée, confirmer l'adresse avant la première connexion.
Le site affiche maintenant l'erreur Supabase directement sur l'écran de connexion au lieu de laisser le formulaire disparaître.
