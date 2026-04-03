# events-frontend

Frontend React + Tailwind pour le projet Events.

## Accès à l'application (Production)

Lien vers l'application en production :
https://events-hangout.com

## Modalités d'accès

Le site web est accessible :
- via le lien de production https://events-hangout.com
- ou via une installation locale (mode developpement)

Important : l'application mobile n'est pas accessible via ce lien et doit obligatoirement passer par une installation locale.

Selon les fonctionnalités, un compte peut être nécessaire :
- Rôles : admin, user
- Identifiant : [à préciser si besoin]
- Mot de passe : [à préciser si besoin]

Si aucun compte n'est requis, l'accès est libre.

## Développement local

1. npm install
2. npm run dev

Configurer ces variables dans `.env` si nécessaire :

- `VITE_API_URL` (exemple : `http://localhost:4000/api`)
- `VITE_UPLOADS_BASE_URL` (optionnel, utile en prod si les fichiers `/uploads` sont servis par un domaine API different)

## Remarques

En cas de problème d'accès, veuillez vérifier la connexion internet ou contacter le développeur.


