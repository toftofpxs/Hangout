# Hangout - Plateforme de gestion d'evenements

Hangout est une solution complete de gestion d'evenements avec un backend API, une application web et une application mobile.
Le projet permet l'authentification, la creation d'evenements, les inscriptions, les paiements (fictif) et l'administration des utilisateurs.

## Identifiants de test

- Admin : jury_test_admin@test.com / MotDePasse123!
- Utilisateur : jury_test@test.com / MotDePasse123!

## Installation et lancement

### Prerequis globaux

- [Node.js](https://nodejs.org/) (v18 ou superieur recommande)
- [Git](https://git-scm.com/)
- [MySQL](https://www.mysql.com/) disponible et configure
- [Expo Go](https://expo.dev/go) sur votre telephone (pour le mobile)

---

### Etape 1 — Cloner le depot

```bash
git clone https://github.com/Yncy0/ROOMIE-Admin-Dashboard.git
cd Hangout
```

> Remplacez l'URL par celle du depot Git du projet si elle est differente.

---

### Etape 2 — Configurer les variables d'environnement

**Backend** — dans le dossier `events-backend-js` :

```bash
cd events-backend-js
copy .env.example .env
```

Editez ensuite le fichier `.env` avec votre mot de passe MySQL et un `JWT_SECRET` de votre choix.

> **Cloudinary** : inutile en local. Les variables `CLOUDINARY_*` ne servent qu'en production pour stocker les photos en ligne. En local, les images sont enregistrees directement dans le dossier `uploads/`.

**Frontend** — dans le dossier `events-frontend` :

```bash
cd events-frontend
copy .env.example .env
```

Aucune modification necessaire, `http://localhost:4000/api` est deja configure par defaut.

**Mobile** — dans le dossier `events-mobile` :

```bash
cd events-mobile
copy .env.example .env
```

Remplacer `TON_IP_LOCALE` par l'adresse IP de votre machine sur le reseau local.
Pour la connaitre : ouvrir un terminal et taper `ipconfig`, puis copier l'adresse IPv4.
Exemple : `EXPO_PUBLIC_API_URL=http://192.168.1.42:4000/api`

> Le mobile ne peut pas utiliser `localhost` car il tourne sur un telephone/emulateur separe du PC.

---

### Etape 3 — Lancer le Backend API

```bash
cd events-backend-js
npm install
npm run dev
```

Le serveur API demarre sur le port defini dans le `.env` (par defaut `3000`).

---

### Etape 4 — Lancer le Frontend Web

Dans un nouveau terminal :

```bash
cd events-frontend
npm install
npm run dev
```

L'application web est accessible sur `http://localhost:5173` (ou le port indique par Vite).

---

### Etape 5 — Lancer l'Application Mobile

Dans un nouveau terminal :

```bash
cd events-mobile
npm install
npm start
```

Scannez le QR code avec **Expo Go** sur votre telephone, ou lancez un emulateur Android/iOS.

---

## Acces a l'application

- Site web en production : https://events-hangout.com
- Le site web est accessible soit via ce lien, soit via une installation locale.
- Note : le site peut prendre environ 50 secondes au premier chargement, car l'hebergeur met l'application en veille (sleep) lorsqu'elle est inactive.
- L'application mobile doit obligatoirement passer par une installation locale (Expo Go ou emulateur).

## Documentation complete

La documentation technique et les guides utilisateurs sont disponibles dans le dossier [docs](docs).

## Technologies utilisees

- Backend : Node.js, Express, Drizzle ORM, MySQL, JWT
- Frontend web : React, Vite, Tailwind CSS, Axios
- Mobile : React Native, Expo, React Navigation, Axios
- Qualite/outillage : Jest, ESLint

