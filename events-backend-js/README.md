Backend Events (JavaScript, Node.js + Express, MySQL)

Fonctionnalités incluses :

Authentification JWT (inscription / connexion)

Middleware basé sur les rôles (admin / organisateur / participant)

Endpoints pour : Utilisateurs, Événements, Inscriptions, Paiements

Schéma SQL (create_tables.sql) pour initialiser la base de données

Démarrage rapide

Installer les dépendances :

npm install


Créer une base de données MySQL et exécuter le fichier SQL :

mysql -u root -p
CREATE DATABASE eventsdb;
USE eventsdb;
SOURCE create_tables.sql;


Copier le fichier .env.example en .env et compléter les identifiants.

Configuration images (important en production) :

- Sans Cloudinary: les images sont stockées localement dans uploads/events (peut être perdu au redéploiement)
- Avec Cloudinary: les images sont stockées sur Cloudinary et les URLs HTTPS sont sauvegardées en base

Variables Cloudinary (dans .env):

- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- CLOUDINARY_EVENTS_FOLDER (optionnel, défaut: hangout/events)

Lancer le serveur :

npm run dev


Tester les endpoints avec Postman :

POST /api/auth/register

POST /api/auth/login

GET /api/events

POST /api/events (nécessite un token organisateur ou admin)