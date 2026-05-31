# 🦇 Chiro Logger - Application Web Angular

Application web **Progressive Web App (PWA)** permettant la récupération sans contact physique des données environnementales enregistrées par le [datalogger ESP32 Chiro Logger](https://github.com/themaire/chiro_logger) via **Bluetooth Low Energy (Web Bluetooth API)**.

> [!NOTE]
> **Qu'est-ce qu'une PWA ?**
> Une *Progressive Web App* est une application web qui s'installe directement depuis le navigateur (sans passer par un store), fonctionne **hors-ligne** grâce au cache du Service Worker, et se comporte comme une application native sur mobile et desktop. Elle combine la portabilité du web et les capacités des apps natives : accès au Bluetooth, notifications, écran plein écran, etc.

## 🎯 Concept

Le datalogger **LOLIN D32 PRO** (ESP32) est placé dans un boîtier étanche et enregistre en continu les données de température et d'humidité sur une carte micro SD au format CSV. Lorsque l'on souhaite récupérer les données, l'ESP32 est mis en **mode envoi** et cette application Angular se connecte sans fil via BLE pour extraire les fichiers, sans jamais ouvrir le boîtier.

## 🧪 Contexte scientifique

Projet de surveillance environnementale pour l'étude des **chiroptères** (chauves-souris) dans leurs habitats naturels :

- **Non-intrusive** : aucune manipulation physique du boîtier étanche
- **Précision** : données horodatées préservées intégralement
- **Autonomie** : fonctionne hors-ligne grâce à la PWA

## ⚙️ Fonctionnalités

### 📲 Connexion Bluetooth

- Scan par nom de dispositif (`ChiroLogger`)
- Connexion via Web Bluetooth API avec deux caractéristiques GATT :
  - `DATA` : réception des lignes CSV en notifications
  - `STATUS` : envoi de commandes et réception des messages d'état
- Observables RxJS pour l'état de connexion en temps réel

### 📊 Visualisation

- Graphiques temporels (température, humidité, pression)
- Tableau de données paginé et triable
- Indicateur de niveau de batterie du datalogger

### 💾 Données

- Parsing automatique des lignes CSV reçues via BLE
- Stockage local pour consultation hors-ligne
- Export CSV

### 📱 PWA

- Installable sur Android (Chrome)
- Fonctionne hors-ligne
- Interface responsive optimisée mobile

## 🔌 Configuration BLE

Les UUIDs GATT correspondent exactement à ceux définis dans le firmware ESP32 :

| Élément | UUID |
|---|---|
| Nom du dispositif | `ChiroLogger` |
| Service | `12345678-1234-1234-1234-123456789abc` |
| Caractéristique DATA | `87654321-4321-4321-4321-cba987654321` |
| Caractéristique STATUS | `11111111-2222-3333-4444-555555555555` |

> **Note** : Web Bluetooth API exige les UUIDs en **minuscules**. L'ESP32 doit advertiser son service UUID via `pAdvertising->addServiceUUID(BLE_SERVICE_UUID)`.

## 🛠️ Technologies

| Technologie | Version | Rôle |
|---|---|---|
| Angular | 16 | Framework principal |
| Angular Material | 16 | Composants UI |
| RxJS | 7.8 | Programmation réactive |
| Web Bluetooth API | — | Communication BLE |
| Angular Service Worker | 16 | Fonctionnalités PWA |

## 🚀 Installation et lancement

### Prérequis

- Node.js ≥ 18
- Angular CLI : `npm install -g @angular/cli`
- Chrome ou Edge (Web Bluetooth requis)

### Développement desktop

```bash
git clone https://github.com/themaire/angular_chiro_app.git
cd angular_chiro_app
npm install
ng serve
# Ouvrir http://localhost:4200
```

### Lancement mobile (HTTPS local requis par Web Bluetooth)

```bash
# Rendre le script exécutable (première fois)
chmod +x serve-mobile.sh

# Lancer le serveur HTTPS local
./serve-mobile.sh
# Ouvrir https://192.168.0.120:4200 sur le mobile
# Accepter le certificat auto-signé sur le téléphone
```

### Build de production

```bash
ng build
# Fichiers générés dans dist/
```

## 📱 Utilisation

1. **Préparer le datalogger** : mettre l'ESP32 en mode "envoi des données" (BLE actif)
2. **Ouvrir l'application** dans Chrome sur Android ou desktop
3. **Cliquer sur "Rechercher des appareils"** → sélectionner `ChiroLogger`
4. **Associer** → les données sont récupérées automatiquement
5. **Consulter** les graphiques ou le tableau, exporter en CSV si besoin

## 🏗️ Architecture

```text
src/app/
├── components/
│   ├── chart-view/          # Graphiques temporels
│   ├── connection/          # Interface de connexion BLE
│   └── data-table/          # Tableau de données
├── pages/
│   ├── home/                # Page d'accueil + connexion
│   └── dashboard/           # Visualisation des données
├── services/
│   ├── bluetooth.service.ts # Web Bluetooth API (scan, connexion, GATT)
│   └── data-logger.service.ts # Parsing CSV, stockage, export
├── models/
│   └── sensor-data.interface.ts
└── types/
    └── bluetooth.d.ts
```

## 📊 Format des données CSV

```csv
timestamp,temperature,humidity,pressure,batteryVoltage
2026-01-15T10:30:00.000Z,18.5,75.2,1013.25,3.8
2026-01-15T10:45:00.000Z,18.3,76.1,1013.18,3.8
```

## 🔐 Compatibilité

| Navigateur | Support Web Bluetooth |
|---|---|
| Chrome Android 56+ | ✅ |
| Chrome Desktop 56+ | ✅ |
| Edge 79+ | ✅ |
| Safari (iOS/macOS) | ❌ Non supporté |
| Firefox | ❌ Non supporté |

## 🐛 Dépannage

**"No Services matching UUID found"**
→ L'ESP32 n'advertise pas son service UUID. Vérifier que le firmware appelle `pAdvertising->addServiceUUID(BLE_SERVICE_UUID)`.

**"Invalid Service name"**
→ Les UUIDs doivent être en minuscules côté JavaScript.

**Le scan ne trouve pas ChiroLogger**
→ Vérifier que l'ESP32 est bien en mode "envoi", que le Bluetooth du téléphone est activé, et que l'application est servie en HTTPS.

**Application ne démarre pas**
→ Supprimer `node_modules/` et relancer `npm install`. Vérifier Node.js ≥ 18.

## 🔗 Liens

- [Firmware ESP32 - Chiro Logger](https://github.com/themaire/chiro_logger)
- [Web Bluetooth API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [Angular Documentation](https://angular.io/docs)

---

*Projet développé pour l'étude scientifique des chiroptères.*
- [Angular Material](https://material.angular.io/)

---

*Projet développé dans le cadre d'études scientifiques sur les chiroptères - Respect de l'environnement et des espèces protégées.*
