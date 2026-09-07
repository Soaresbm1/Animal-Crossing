# Petite Île

**Petite Île** est un prototype web original et indépendant d’exploration 2.5D. Le projet n’est ni affilié à Nintendo, ni approuvé par Nintendo, et n’utilise aucun contenu officiel de la franchise *Animal Crossing*.

Cette version se joue au clavier sur PC. Le code de la manette iPhone reste dans le dépôt, mais son association est désactivée sur l’écran de jeu. Il ne s’agit pas d’un déploiement public.

## Première mission : mon premier chez-moi

1. Rejoindre Lila à gauche du chemin et appuyer sur **Espace** pour accepter sa demande.
2. Ramasser les **cinq pommes** réparties sur l’île, puis retourner auprès de Lila : elle remet **60 pièces** et récupère les pommes.
3. Rejoindre la boutique au nord-est, appuyer sur **Espace** et cliquer sur **Acheter le fauteuil · 40 pièces** dans la fenêtre du marché.
4. Entrer dans la maison par sa porte avec Espace, marcher au centre du tapis, ouvrir le sac avec **E**, puis cliquer sur **Installer le fauteuil ici**. Le même bouton permet ensuite de le déplacer.

Tout reste dans la fenêtre du jeu : **Espace** près de Lila ouvre son dialogue ; **Espace** près du marché ouvre la boutique ; **E** ouvre ou ferme l’inventaire. **Échap** ou la croix ferme chaque fenêtre. Le jeu se met en pause pendant leur ouverture et le clavier reste dans la fenêtre de dialogue. Il n’y a plus de panneau sous le jeu ni de colonne latérale.

## Pêche au ponton

La canne du rivage coûte **25 pièces** au petit marché. Une fois équipée, rejoindre le ponton au sud et appuyer sur **Espace**. Dans le mini-jeu, lancer la ligne, attendre le message **« Ça mord ! »**, puis appuyer rapidement sur Espace. Une réaction trop tôt ou après la fenêtre de 950 ms laisse le poisson s’échapper.

Trois espèces peuvent rejoindre le carnet de pêche : sardine argentée, perche soleil et carpe miroir. Les poissons occupent une place dans le sac et peuvent être vendus, mais une espèce découverte reste inscrite dans le carnet. Le sac plein empêche une nouvelle capture. La canne, le carnet et le nombre de prises sont sauvegardés immédiatement ; les sauvegardes de version 2 sont migrées automatiquement.

La boutique rachète les coquillages (12 pièces), fleurs (8) et pommes (5). Les pommes sont protégées de la vente jusqu’à la fin de la mission. Les récoltes vendues réapparaissent sur l’île. Les achats, ventes, récompenses et placements sont sauvegardés immédiatement. Les sauvegardes originales sont migrées vers la version 2 en conservant le sac, la position et l’horloge et en ajoutant les quatre nouvelles pommes.

Se déplacer avec **ZQSD / WASD / flèches** ; interagir avec **Espace / Entrée**. Les boutons de boutique et de décoration sont aussi accessibles avec **Tab puis Entrée**. Un bouton grisé indique qu’il faut se rapprocher, entrer dans la maison ou obtenir suffisamment de pièces.

Les sections consacrées à la manette ci-dessous décrivent le prototype historique, désormais mis de côté.

## Fonctionnalités

La direction visuelle utilise des illustrations SVG originales : rivage irrégulier, ponton, sentiers, cottage, arbres et personnages assortis. L’interface adopte un style carnet entièrement superposé au jeu : dialogues, marché et inventaire s’ouvrent sans allonger la page. L’accueil et l’intérieur reprennent la même palette. Les animations d’eau, de nuages et de pêche respectent le réglage système de réduction des mouvements ; aucun service d’images ni téléchargement de polices n’est nécessaire.

- exploration d’une île et de l’intérieur d’une maison ;
- déplacements au clavier ou avec un joystick tactile sur iPhone ;
- interactions pour ramasser trois objets et entrer dans la maison ou en sortir ;
- inventaire de huit emplacements ;
- horloge accélérée avec ambiances aube, jour, crépuscule et nuit ;
- sauvegarde automatique locale de la progression ;
- association de la manette par QR code ou code de session à six chiffres ;
- transmission des commandes en temps réel avec Socket.IO ;
- manifeste web et service worker pour la manette en build de production.

Une session relie actuellement un écran de jeu à une seule manette. Il ne s’agit pas encore d’un mode multijoueur partagé.

## Architecture

Le client est une application React 19 + TypeScript construite avec Vite. La route `/` affiche le jeu et `/controller` affiche la manette mobile. Les deux interfaces utilisent le même serveur Socket.IO.

Le serveur Node.js réunit Express et Socket.IO :

- en développement, Vite écoute normalement sur `5173`, le serveur temps réel sur `3001`, et Vite relaie `/api` et `/socket.io` vers ce serveur ;
- en production, Express sert le build Vite depuis `dist/`, expose `/api/health`, gère le fallback de l’application monopage et accepte les connexions Socket.IO sur la même origine.

Le contrat d’événements partagé dans `src/shared/protocol.ts` évite que l’écran, la manette et le serveur divergent sur les noms ou les formats des messages.

## Prérequis sur un Lenovo sous Windows

- Windows 10 ou 11 ;
- Node.js `20.19` ou plus récent, avec npm ;
- un navigateur récent sur le Lenovo ;
- Safari sur l’iPhone pour la manette ;
- pour un essai local avec l’iPhone, les deux appareils sur le même réseau Wi-Fi privé.

Dans PowerShell, vérifier l’installation :

```powershell
node --version
npm --version
```

## Lancer le projet en développement

Depuis la racine du dépôt :

```powershell
npm ci
npm run dev
```

`npm ci` installe exactement les versions du fichier `package-lock.json`. `npm run dev` lance à la fois Vite et le serveur temps réel. Ouvrir ensuite :

- `http://localhost:5173` pour jouer uniquement sur le Lenovo ;
- `http://<IP_LOCALE_DU_LENOVO>:5173` si une manette iPhone doit être associée.

Le port affiché par Vite reste la référence s’il diffère de `5173`.

### Commandes

| Action | Lenovo | iPhone |
| --- | --- | --- |
| Se déplacer | `ZQSD`, `WASD` ou flèches | joystick tactile |
| Interagir | `Espace` ou `Entrée` | bouton `A` |

Approcher un objet avant d’agir pour le ramasser, ou approcher la porte pour entrer dans la maison ou en sortir.

## Associer un iPhone sur le même Wi-Fi

1. Sur le Lenovo, exécuter `ipconfig` dans PowerShell.
2. Relever l’**Adresse IPv4** de la carte Wi-Fi, par exemple `192.168.1.42`.
3. Ouvrir le jeu sur le Lenovo avec cette adresse, par exemple `http://192.168.1.42:5173`, et non avec `localhost`. Le QR code reprend l’origine de la page ouverte ; un QR code contenant `localhost` désignerait l’iPhone lui-même.
4. Cliquer sur **Explorer l’île** afin d’afficher le QR code et le code à six chiffres.
5. Sur l’iPhone connecté au même Wi-Fi, scanner le QR code avec l’appareil photo puis ouvrir le lien dans Safari.
6. Si le scan n’est pas utilisable, ouvrir `http://192.168.1.42:5173/controller` dans Safari et saisir manuellement les six chiffres affichés sur le Lenovo.
7. Garder la page de la manette ouverte pendant la partie.

Lors de la première exécution, Windows peut demander l’autorisation réseau pour Node.js. Autoriser uniquement les **réseaux privés**. Si la page reste inaccessible, vérifier le pare-feu Windows, l’absence de VPN et que le Wi-Fi invité n’isole pas les appareils entre eux. Il n’est pas nécessaire d’ouvrir un port sur le routeur ni de configurer une redirection Internet.

### Ajouter la manette à l’écran d’accueil

Dans Safari sur l’iPhone, toucher **Partager**, puis **Ajouter à l’écran d’accueil**. L’icône ouvre `/controller` en mode autonome lorsque iOS le permet. Le code étant propre à chaque session, il peut être nécessaire de saisir le nouveau code à six chiffres après une réouverture.

Le service worker n’est enregistré que dans le build de production. De plus, les fonctions PWA et service worker exigent un contexte sécurisé dans les navigateurs modernes. Une adresse locale telle que `http://192.168.x.x` permet généralement de tester la page et la manette sur un réseau de confiance, mais ne constitue pas une installation HTTPS fiable et ne garantit pas le fonctionnement hors ligne.

## Limites de HTTP sur le réseau local

Le mode LAN ci-dessus utilise du HTTP non chiffré. Il convient uniquement à un réseau privé de confiance : les commandes et le code de session ne bénéficient pas de TLS.

Pour un accès public, un accès depuis un autre réseau, ou une utilisation fiable des fonctions PWA, il faut déployer le projet derrière une origine **HTTPS** publique. L’iPhone et le Lenovo ouvrent alors la même URL HTTPS ; aucune IP locale n’est utilisée. Un simple QR code pointant vers une adresse privée ne traverse ni Internet, ni le NAT, ni l’isolation d’un Wi-Fi invité.

## Déploiement générique sur un hébergeur Node.js

Ces étapes décrivent un déploiement possible ; elles n’indiquent pas qu’un service public existe déjà.

```bash
npm ci
npm run build
npm start
```

`npm run build` vérifie les types, produit le client dans `dist/` et compile le serveur dans `server-dist/`. `npm start` lance `server-dist/server/index.js`.

Configurer l’hébergeur ainsi :

- environnement d’exécution Node.js `20.19` ou plus récent ;
- commande de build : `npm ci && npm run build` ;
- commande de démarrage : `npm start` ;
- `NODE_ENV=production` recommandé pour signaler le contexte à l’écosystème Node.js ;
- `PORT` injecté par la plateforme ;
- terminaison TLS avec une URL HTTPS ;
- prise en charge des connexions WebSocket et de l’upgrade sur `/socket.io/` ;
- routage du HTTP et de Socket.IO vers la même instance Node.js.

Les sessions étant conservées uniquement en mémoire, exécuter **une seule instance** du serveur. Une mise à l’échelle horizontale demanderait un stockage de sessions partagé, un adaptateur Socket.IO et une stratégie d’affinité adaptée. Tout redémarrage du processus invalide les codes en cours.

Le point de contrôle de santé est `GET /api/health` et répond avec `{"status":"ok"}`.

### Variables d’environnement

| Variable | Valeur par défaut | Rôle |
| --- | --- | --- |
| `PORT` | `3000` | Port du serveur de production. La valeur doit être un entier compris entre `0` et `65535`. |
| `HOST` | `0.0.0.0` | Interface d’écoute du serveur. La valeur par défaut convient à la plupart des hébergeurs et au LAN. |
| `NODE_ENV` | non défini | Recommandé à `production` sur l’hébergeur ; `npm start` sert déjà le client compilé. |

Le serveur ne charge pas lui-même un fichier `.env`. En local, définir les variables dans le processus ou utiliser le mécanisme de l’hébergeur. Exemple PowerShell pour vérifier le build de production :

```powershell
$env:PORT = "3000"
npm start
```

## Qualité et validations

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke
```

- `lint` applique ESLint sans accepter d’avertissement ;
- `typecheck` vérifie le client, le serveur, la configuration Vite et les tests ;
- `test` exécute les tests Vitest du moteur, de la sauvegarde, des deux interfaces et du serveur ;
- `build` effectue le contrôle de types puis construit le client et le serveur ;
- `smoke` démarre brièvement le build de production et vérifie l’accueil, `/controller`, `/api/health`, le manifeste, le service worker et la négociation Socket.IO.

Exécuter `npm run build` avant `npm run smoke`, car le test de fumée utilise `dist/` et `server-dist/`.

## Données, sauvegarde et évolution

La progression est enregistrée dans le `localStorage` du navigateur de l’écran sous la clé `petite-ile:save`. La sauvegarde versionnée contient la scène, la position et l’orientation du personnage, les objets, l’inventaire et l’horloge. Elle est écrite après les changements et au départ de la page.

Au chargement, le format et les types sont validés, les doublons ou valeurs incohérentes sont rejetés et les coordonnées sont ramenées dans les limites de la scène. Une sauvegarde illisible, altérée ou d’une version inconnue déclenche une nouvelle partie au lieu de faire planter l’application.

Cette sauvegarde reste liée au navigateur, au profil et à l’origine utilisés sur le Lenovo. Elle n’est ni envoyée au serveur, ni synchronisée avec l’iPhone. Effacer les données du site, utiliser la navigation privée, changer de navigateur ou changer d’origine peut la rendre indisponible.

Pour une progression durable et partagée entre appareils, il faudra ajouter une base de données et des comptes authentifiés, avec migrations et sauvegardes côté serveur. Un véritable multijoueur exigera aussi un état de monde autoritaire côté serveur, la gestion de plusieurs joueurs, la reconnexion et la synchronisation des conflits.

## Sécurité et limites des sessions

Le serveur applique déjà plusieurs validations de base : code composé d’exactement six chiffres, vecteurs de déplacement finis et bornés entre `-1` et `1`, séparation des rôles écran/manette, une seule manette par session et rejet des commandes provenant d’une socket non associée. Une déconnexion de la manette neutralise également le mouvement.

Ces protections ne constituent pas une sécurité de production :

- le code à six chiffres est un identifiant temporaire, pas un mot de passe ;
- aucune authentification, expiration programmée, limitation de débit ou protection anti-bruteforce n’est encore présente ;
- la politique CORS Socket.IO accepte actuellement toute origine ;
- les sessions et associations reposent sur l’identifiant de socket et la mémoire du processus ;
- un code disparaît lorsque l’écran se déconnecte ou lorsque le serveur redémarre ;
- HTTP ne chiffre rien, et une IP locale ou un QR code ne doit pas être publié comme s’il s’agissait d’un secret.

Avant une exposition publique, ajouter au minimum HTTPS, une liste d’origines autorisées, une limitation de débit, des codes à durée de vie courte et une stratégie d’authentification adaptée.

## Structure du projet

```text
.
├── public/
│   ├── icons/                 # Icône originale de la manette
│   ├── manifest.webmanifest   # Métadonnées d’installation
│   └── sw.js                  # Cache du shell de la manette
├── scripts/
│   └── smoke-production.mjs   # Vérification du serveur compilé
├── server/
│   ├── app.ts                 # Express, Socket.IO et sessions en mémoire
│   ├── dev.ts                 # Entrée de développement sur le port 3001
│   └── index.ts               # Entrée de production et configuration réseau
├── src/
│   ├── controller/            # Interface de manette mobile
│   ├── display/               # Écran d’accueil, monde et association
│   ├── game/                  # État, moteur, règles et sauvegarde locale
│   ├── shared/protocol.ts     # Contrat Socket.IO partagé
│   ├── App.tsx                # Sélection jeu/manette selon la route
│   └── main.tsx               # Initialisation React et service worker
├── tests/                     # Tests Vitest client, moteur, sauvegarde et serveur
├── .env.example              # Exemple de variables de processus
├── package.json              # Scripts et dépendances
└── vite.config.ts            # Vite, Vitest et proxy de développement
```

`dist/` et `server-dist/` sont des sorties générées par `npm run build`.
