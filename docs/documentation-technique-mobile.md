# Documentation technique mobile

## 1. Présentation

L'application mobile est développée avec React Native via Expo. Elle permet de consulter les événements, gérer l'authentification et réaliser les actions principales depuis un smartphone.

## 2. Stack technique

- React Native
- Expo
- React Navigation
- Axios
- AsyncStorage

## 3. Organisation du projet

### `src/screens`

Contient les écrans principaux de l'application : connexion, inscription, liste des événements, détail d'un événement et formulaire d'événement.

### `src/components`

Contient les composants réutilisables de l'interface mobile.

### `src/navigation`

Contient la configuration de navigation entre les écrans via une pile d'écrans publique et une pile privée.

### `src/context`

Contient le contexte d'authentification qui partage le token, les données utilisateur et les actions de session.

### `src/api`

Contient la configuration Axios pour les appels au backend.

### `src/storage`

Contient la gestion du stockage local du token et des informations utilisateur.

### `src/utils`

Contient les fonctions utilitaires comme le formatage des dates et des prix.

## 4. Navigation

La navigation est gérée avec React Navigation.

- Une pile d'authentification affiche les écrans de connexion et d'inscription.
- Une pile principale affiche les écrans applicatifs après connexion.

## 5. Authentification

- Le token utilisateur est stocké localement avec AsyncStorage.
- Le contexte restaure automatiquement la session au démarrage.
- L'application ajoute le token à chaque requête API si l'utilisateur est connecté.

## 6. Communication avec le backend

Axios est configuré avec une URL de base issue des variables d'environnement Expo.

Cette configuration permet :

- d'appeler l'API REST
- d'ajouter automatiquement le token d'authentification
- de détecter les erreurs de session expirée

## 7. Définitions utiles

- Screen : écran principal de l'application mobile.
- Navigation : système de déplacement entre les écrans.
- Context : mécanisme de partage d'état global dans React.
- AsyncStorage : stockage local persistant sur l'appareil.
- Expo : environnement facilitant le développement et le test d'applications React Native.

## 8. Lancement du projet

1. Installer les dépendances avec `npm install`.
2. Configurer les variables d'environnement Expo.
3. Démarrer l'application avec `npm start`.
4. Ouvrir l'application dans Expo Go ou dans un émulateur.
