# Documentation technique backend

## 1. Présentation

Le backend est une API REST développée avec Node.js et Express. Il gère l'authentification, les utilisateurs, les événements, les inscriptions, les paiements et certaines fonctions d'administration.

## 2. Stack technique

- Node.js
- Express
- MySQL
- Drizzle ORM
- Drizzle Kit
- JWT
- bcryptjs
- Multer
- Swagger

## 3. Organisation du projet

### `src/index.js`

Point d'entrée principal du serveur. Il configure Express, CORS, Swagger, les routes, les fichiers statiques et le démarrage de l'application.

### `src/routes`

Déclare les routes de l'API.

- `auth.js` : inscription et connexion
- `users.js` : informations utilisateur
- `events.js` : gestion des événements
- `inscriptions.js` : gestion des inscriptions
- `payments.js` : gestion des paiements
- `admin.js` : administration

### `src/controllers`

Contient la logique métier appelée par les routes.

### `src/models`

Contient les accès métier aux données et certaines opérations sur la base.

### `src/db`

Contient la connexion MySQL et le schéma Drizzle.

### `src/middleware`

Contient les middlewares de sécurité et de validation, notamment l'authentification JWT, les rôles, la validation des mots de passe et l'upload de fichiers.

## 4. Base de données

Le backend utilise MySQL comme système de gestion de base de données.

Les tables principales sont :

- `users`
- `events`
- `inscriptions`
- `payments`

Le schéma est défini dans le fichier SQL initial et dans le schéma Drizzle.

## 5. Authentification et sécurité

- La connexion retourne un token JWT.
- Le middleware d'authentification vérifie le token sur les routes protégées.
- Certains accès sont limités selon le rôle utilisateur.
- Les mots de passe sont chiffrés avant stockage.

## 6. Documentation API

La documentation Swagger est exposée sur la route `/api-docs`.

Elle permet de visualiser et tester les routes principales de l'API.

## 7. Définitions utiles

- API REST : interface HTTP permettant à plusieurs clients de communiquer avec le serveur.
- Route : point d'entrée accessible par une URL et une méthode HTTP.
- Contrôleur : fonction qui traite la requête et construit la réponse.
- Middleware : traitement intermédiaire exécuté avant le contrôleur.
- ORM : outil facilitant l'accès à la base de données depuis le code.
- JWT : jeton d'authentification utilisé pour maintenir la session.

## 8. Lancement du projet

1. Installer les dépendances avec `npm install`.
2. Configurer les variables d'environnement de la base MySQL.
3. Initialiser la base de données.
4. Lancer le serveur avec `npm run dev` ou `npm start`.
