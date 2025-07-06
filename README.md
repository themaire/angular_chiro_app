# 🦇 Chiro Logger - Application Web Angular

## 📱 Application de consultation pour datalogger environnemental

Cette application web Angular (PWA) permet de consulter et récupérer les données environnementales collectées par le [datalogger ESP32 pour chiroptères](https://github.com/themaire/chiro_logger) via une connexion Bluetooth Low Energy (BLE) **sans contact physique**.

## 🎯 Objectif

Fournir une interface utilisateur moderne et intuitive pour :

- Se connecter au datalogger ESP32 LOLIN D32 PRO via Web Bluetooth
- Récupérer les données de température, humidité et pression atmosphérique
- Visualiser les données sous forme de graphiques et tableaux
- Exporter les données au format CSV pour analyse

## 🧪 Contexte scientifique

Cette application accompagne un système de surveillance environnementale conçu pour l'étude des chiroptères (chauves-souris) dans leurs habitats naturels. Elle respecte les contraintes scientifiques suivantes :

- **Non-intrusive** : récupération des données sans manipulation physique du boîtier
- **Précision** : préservation de l'intégrité des mesures horodatées
- **Autonomie** : fonctionnement en mode hors-ligne grâce à la technologie PWA

## ⚙️ Fonctionnalités

### 📲 Connexion Bluetooth

- **Scan automatique** des dispositifs ESP32 à proximité
- **Connexion sécurisée** via Web Bluetooth API
- **Statut de connexion** en temps réel
- **Gestion des erreurs** de connexion

### 📊 Visualisation des données

- **Graphiques temporels** des mesures (température, humidité, pression)
- **Tableau de données** avec pagination et tri
- **Indicateurs de batterie** du datalogger
- **Informations du dispositif** (nom, MAC, dernière synchronisation)

### 💾 Gestion des données

- **Récupération automatique** des fichiers CSV depuis la carte SD
- **Stockage local** des données pour consultation hors-ligne
- **Export CSV** pour traitement dans des logiciels externes
- **Historique des sessions** de collecte

### 📱 Progressive Web App (PWA)

- **Installation** sur smartphone/tablette
- **Fonctionnement hors-ligne**
- **Interface responsive** optimisée mobile
- **Notifications** de statut de connexion

## 🛠️ Technologies utilisées

- **Angular 16** - Framework principal
- **Angular Material** - Composants UI
- **RxJS** - Programmation réactive
- **Web Bluetooth API** - Communication BLE
- **Chart.js** - Graphiques de données
- **Service Worker** - Fonctionnalités PWA

## 🚀 Installation et lancement

### Prérequis

- Node.js (version 18 ou supérieure)
- Angular CLI (`npm install -g @angular/cli`)
- Navigateur compatible Web Bluetooth (Chrome, Edge, Opera)

### Installation

```bash
# Cloner le repository
git clone <url-du-repository>
cd angular_chiro_app

# Installer les dépendances
npm install

# Lancer l'application en mode développement
ng serve
```

### Lancement pour mobile

```bash
# Servir l'application sur le réseau local
npm run serve-mobile
# ou
ng serve --host 0.0.0.0 --port 4200
```

### Build de production

```bash
# Build optimisé pour la production
ng build --prod

# Les fichiers sont générés dans le dossier dist/
```

## 📱 Utilisation

### 1. Préparation du datalogger

- Approcher un doigt ou badge du capteur capacitif du datalogger
- Le mode "consultation" s'active automatiquement
- Le module BLE devient détectable

### 2. Connexion depuis l'application

- Ouvrir l'application dans un navigateur compatible
- Cliquer sur "Se connecter au datalogger"
- Sélectionner le dispositif ESP32 dans la liste
- La connexion s'établit automatiquement

### 3. Consultation des données

- Les données s'affichent automatiquement après connexion
- Navigation entre vue graphique et tableau
- Filtrage par période temporelle
- Export CSV disponible via le menu

## 🏗️ Architecture du projet

```text
src/
├── app/
│   ├── components/          # Composants UI réutilisables
│   │   ├── chart-view/      # Graphiques de données
│   │   ├── connection/      # Interface de connexion BLE
│   │   └── data-table/      # Tableau de données
│   ├── pages/               # Pages principales
│   │   ├── dashboard/       # Page principale avec données
│   │   └── home/            # Page d'accueil
│   ├── services/            # Services métier
│   │   ├── bluetooth.service.ts    # Gestion Web Bluetooth
│   │   └── data-logger.service.ts  # Traitement des données
│   ├── models/              # Interfaces TypeScript
│   │   └── sensor-data.interface.ts
│   └── types/               # Définitions de types
│       └── bluetooth.d.ts
├── assets/                  # Ressources statiques
└── manifest.webmanifest     # Configuration PWA
```

## 🔧 Services principaux

### BluetoothService

Gère la communication avec le datalogger ESP32 :

- Scan et connexion aux dispositifs BLE
- Lecture des caractéristiques Bluetooth
- Gestion des erreurs de connexion
- Observables pour l'état de la connexion

### DataLoggerService

Traite les données reçues :

- Parsing des fichiers CSV
- Stockage local des données
- Gestion de l'historique des sessions
- Export des données

## 📊 Format des données

Le datalogger transmet les données au format CSV avec les colonnes suivantes :

```csv
timestamp,temperature,humidity,pressure,batteryVoltage
2024-01-15T10:30:00.000Z,18.5,75.2,1013.25,3.8
2024-01-15T10:45:00.000Z,18.3,76.1,1013.18,3.8
```

## 🔐 Sécurité et compatibilité

### Navigateurs supportés

- Chrome 56+ (Android/Desktop)
- Edge 79+ (Windows/Android)
- Opera 43+ (Android/Desktop)
- Safari : **non supporté** (pas de Web Bluetooth)

### Permissions requises

- **Bluetooth** : pour la connexion aux dispositifs
- **Stockage local** : pour la sauvegarde des données
- **Géolocalisation** : optionnelle, pour la localisation des mesures

## 🐛 Dépannage

### Problèmes de connexion Bluetooth

- Vérifier que le datalogger est en mode "consultation"
- S'assurer que le navigateur supporte Web Bluetooth
- Vérifier les permissions Bluetooth du site web
- Redémarrer le Bluetooth si nécessaire

### Application ne se lance pas

- Vérifier la version de Node.js (≥18)
- Supprimer `node_modules` et relancer `npm install`
- Vérifier les certificats HTTPS en développement

## 📈 Développement futur

### Fonctionnalités prévues

- **Cartographie** des points de mesure
- **Alertes** en cas de valeurs anormales
- **Synchronisation cloud** optionnelle
- **Mode multi-datalogger** pour gestion de plusieurs dispositifs
- **Analyse statistique** avancée des données

### Améliorations techniques

- **Tests unitaires** complets
- **Déploiement automatisé** (CI/CD)
- **Optimisation** des performances
- **Accessibilité** WCAG 2.1

## 📝 Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! Merci de :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📞 Contact

Pour toute question ou suggestion concernant l'application :

- **Issues** : [GitHub Issues](../../issues)
- **Discussions** : [GitHub Discussions](../../discussions)

## 🔗 Liens utiles

- [Repository du datalogger ESP32](https://github.com/themaire/chiro_logger)
- [Documentation Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [Angular Documentation](https://angular.io/docs)
- [Angular Material](https://material.angular.io/)

---

*Projet développé dans le cadre d'études scientifiques sur les chiroptères - Respect de l'environnement et des espèces protégées.*
