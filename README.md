# Hangout - Plateforme de gestion d'evenements

Hangout est une solution complete de gestion d'evenements avec un backend API, une application web et une application mobile.
Le projet permet l'authentification, la creation d'evenements, les inscriptions, les paiements (fictif) et l'administration des utilisateurs.

## Identifiants de test

- Admin : jury_test_admin@test.com / MotDePasse123!
- Utilisateur : jury_test@test.com / MotDePasse123!

## Installation et lancement

## Acces a l'application

- Site web en production : https://events-hangout.com
- Le site web est accessible soit via ce lien, soit via une installation locale.
- L'application mobile doit obligatoirement passer par une installation locale (Expo Go ou emulateur).

### 1) Backend API

```bash
cd events-backend-js
npm install
npm run dev
```

Prerequis :
- MySQL disponible et configure
- Variables d'environnement renseignees dans le fichier .env

### 2) Frontend Web

```bash
cd events-frontend
npm install
npm run dev
```

Acces web :
- Production : https://events-hangout.com
- Local : via le lancement Vite en developpement

### 3) Application Mobile

```bash
cd events-mobile
npm install
npm start
```

Ensuite, lancer l'application via Expo Go ou un emulateur Android/iOS.
Le mobile n'est pas accessible via un lien web public et doit etre installe/lance en local.

## Documentation complete

La documentation technique et les guides utilisateurs sont disponibles dans le dossier [docs](docs).

## Technologies utilisees

- Backend : Node.js, Express, Drizzle ORM, MySQL, JWT
- Frontend web : React, Vite, Tailwind CSS, Axios
- Mobile : React Native, Expo, React Navigation, Axios
- Qualite/outillage : Jest, ESLint

