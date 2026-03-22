# Documentation technique frontend web

## 1. Présentation

Le frontend web est une application React construite avec Vite. Il permet d'afficher les événements, gérer l'authentification et donner accès à des espaces protégés selon le rôle utilisateur.

## 2. Stack technique

- React
- Vite
- React Router DOM
- Axios
- Tailwind CSS

## 3. Organisation du projet

### `src/components`

Contient les composants réutilisables de l'interface, par exemple la barre de navigation, les cartes d'événements, le formulaire d'événement et la protection des routes.

### `src/pages`

Contient les vues principales de l'application, comme l'accueil, la connexion, l'inscription, le tableau de bord, l'espace organisateur et l'espace administrateur.

### `src/routes`

Contient la configuration du routage client. Le fichier principal associe chaque URL à une page ou à un composant.

### `src/services`

Contient la couche d'accès à l'API. Cette couche centralise les appels HTTP et la configuration Axios.

### `src/contexts`

Contient les contextes React utilisés pour la gestion globale de l'authentification, des notifications et des confirmations.

### `src/utils`

Contient les fonctions utilitaires, notamment pour la gestion du token et de l'authentification côté client.

## 4. Routage

Le routage est géré avec React Router DOM.

- `/` : page d'accueil
- `/events/:id` : détail d'un événement
- `/login` : connexion
- `/register` : inscription
- `/dashboard` : tableau de bord protégé
- `/admin` : espace administrateur protégé
- `/organizer` : espace organisateur protégé

La protection d'accès est assurée par un composant `PrivateRoute`.

## 5. Authentification

L'authentification repose sur un token JWT stocké côté client.

- Le contexte `AuthContext` gère l'utilisateur connecté.
- Le token est sauvegardé dans le navigateur.
- Les données utilisateur sont restaurées au chargement de l'application.
- En cas d'erreur 401, la session est supprimée et l'utilisateur est redirigé vers la connexion.

## 6. Communication avec le backend

Le fichier `services/api.js` configure Axios avec :

- l'URL de base de l'API
- le type de contenu JSON
- l'ajout automatique du token dans l'en-tête `Authorization`
- la gestion centralisée des erreurs d'authentification

Un service spécialisé est utilisé pour les événements dans `services/eventsService.js`.

## 7. Définitions utiles

- Composant : bloc réutilisable d'interface React.
- Page : vue complète affichée à une route donnée.
- Service : module chargé d'appeler le backend.
- Contexte : mécanisme React permettant de partager un état global.
- Route protégée : page accessible uniquement si l'utilisateur est authentifié.

## 8. Lancement du projet

1. Installer les dépendances avec `npm install`.
2. Configurer l'URL de l'API dans l'environnement si nécessaire.
3. Démarrer le projet avec `npm run dev`.
