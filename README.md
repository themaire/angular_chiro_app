# 🦇 Chiro Logger - Application Web Angular

Application web **Progressive Web App (PWA)** permettant la récupération sans contact physique des données environnementales enregistrées par le [datalogger ESP32 Chiro Logger](https://github.com/themaire/chiro_logger) via **Bluetooth Low Energy (Web Bluetooth API)**.

> [!NOTE]
> **Qu'est-ce qu'une PWA ?**
> Une *Progressive Web App* est une application web qui s'installe directement depuis le navigateur (sans passer par un store), fonctionne **hors-ligne** grâce au cache du Service Worker, et se comporte comme une application native sur mobile et desktop. Elle combine la portabilité du web et les capacités des apps natives : accès au Bluetooth, notifications, écran plein écran, etc.

## 🎯 Concept

Le datalogger **LOLIN C3 Mini** (ESP32-C3) est placé dans un boîtier étanche et enregistre en continu les données de température et d'humidité (capteur SHT45) sur une carte micro SD au format CSV. Lorsque l'on souhaite récupérer les données, l'ESP32 est mis en **mode transfert** (pression sur le bouton GPIO2) et cette application Angular se connecte sans fil via BLE pour extraire les mesures, sans jamais ouvrir le boîtier.

## 🧪 Contexte scientifique

Projet de surveillance environnementale pour l'étude des **chiroptères** (chauves-souris) dans leurs habitats naturels :

- **Non-intrusive** : aucune manipulation physique du boîtier étanche
- **Précision** : données horodatées préservées intégralement
- **Autonomie** : fonctionne hors-ligne grâce à la PWA

## ⚙️ Fonctionnalités

### 📲 Connexion Bluetooth

- Scan par nom de dispositif (`ChiroLogger`)
- Connexion via Web Bluetooth API avec deux caractéristiques GATT :
  - `DATA` (`READ + NOTIFY`) : réception du CSV ligne par ligne
  - `STATUS` (`READ + WRITE`) : lecture de l'état initial (`READY`)
- Gestion automatique de la déconnexion inattendue → retour à l'accueil
- Observables RxJS pour l'état de connexion en temps réel

### 📊 Visualisation

- Barre de progression du transfert avec compteur ligne par ligne
- Spinner d'attente pendant les 2-3 secondes avant le premier paquet
- Résumé automatique à la fin : *(N mesures entre le JJ/MM/AAAA et le JJ/MM/AAAA)*
- Graphiques temporels (température, humidité, batterie)
- Tableau de données paginé et triable
- Cartes de synthèse : température, humidité, batterie (%), tension (V)

### 💾 Données

- Parsing automatique du protocole CSV envoyé par l'ESP32 via NOTIFY
- Stockage local pour consultation hors-ligne
- Export CSV

### 📱 PWA

- Installable sur Android (Chrome)
- Fonctionne hors-ligne
- Interface responsive optimisée mobile

## 🔌 Configuration BLE

Les UUIDs GATT correspondent exactement à ceux définis dans le firmware ESP32 (`ble_manager.h`) :

| Élément | UUID | Propriétés |
| --- | --- | --- |
| Nom du dispositif | `ChiroLogger` | — |
| Service | `12345678-1234-1234-1234-123456789abc` | — |
| Caractéristique DATA | `87654321-4321-4321-4321-cba987654321` | READ + NOTIFY |
| Caractéristique STATUS | `11111111-2222-3333-4444-555555555555` | READ + WRITE |

> [!IMPORTANT]
> Web Bluetooth API exige des UUIDs en **minuscules**. Le filtre `requestDevice()` utilise uniquement `namePrefix: 'ChiroLogger'` — le filtre `services` est intentionnellement absent car l'ESP32 NimBLE n'advertise pas son UUID de service (causerait *"No Services matching UUID found"*).

### Protocole de transfert

L'ESP32 envoie un paquet NOTIFY distinct pour chaque ligne, dans l'ordre suivant :

```
###META:lines=100###          ← nombre total de lignes attendues
ID,DateTime,Temperature_C,Humidity_%,Battery_%,Battery_V   ← en-tête (ignoré)
1,2024-01-15 10:30:00,18.5,75.2,85,3.8
2,2024-01-15 10:45:00,18.3,76.1,84,3.7
...                           ← une ligne par NOTIFY
###EOF###                     ← fin de transfert
```

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

1. **Préparer le datalogger** : appuyer sur le bouton GPIO2 de l'ESP32 pour activer le mode transfert BLE
2. **Ouvrir l'application** dans Chrome sur Android ou desktop (en HTTPS)
3. **Cliquer sur "Rechercher des appareils"** → sélectionner `ChiroLogger` dans la liste du navigateur
4. **Connexion établie** → naviguer vers le tableau de bord
5. **Transfert automatique** : spinner d'attente → barre de progression ligne par ligne → résumé final
6. **Consulter** les graphiques ou le tableau, exporter en CSV si besoin

> En cas de perte de connexion BLE pendant le transfert, l'application revient automatiquement à l'accueil.

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

Format envoyé par le capteur SHT45 (sans pression atmosphérique) :

```csv
ID,DateTime,Temperature_C,Humidity_%,Battery_%,Battery_V
1,2024-01-15 10:30:00,18.5,75.2,85,3.8
2,2024-01-15 10:45:00,18.3,76.1,84,3.7
```

> Le champ `DateTime` est au format `YYYY-MM-DD HH:MM:SS` (heure locale de l'ESP32 via RTC).

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
→ Erreur normale si le firmware advertise l'UUID de service. Le service Angular utilise uniquement le filtre `namePrefix` pour l'éviter.

**"Invalid Service name"**
→ Les UUIDs doivent être en **minuscules** côté JavaScript.

**Le scan ne trouve pas ChiroLogger**
→ Vérifier que l'ESP32 est en mode transfert (LED BLE active), que le Bluetooth est activé sur le téléphone, et que l'application est servie en HTTPS.

**Le dashboard reste vide après connexion**
→ Attendre le spinner (~2-3 s) : l'ESP32 démarre son moteur de transfert avant d'envoyer le premier paquet. Si aucune donnée n'arrive après 10 s, vérifier les logs série de l'ESP32.

**La barre de progression ne bouge pas**
→ Vérifier que le firmware envoie bien `###META:lines=N###` en premier paquet NOTIFY.

**Application ne démarre pas**
→ Supprimer `node_modules/` et relancer `npm install`. Vérifier Node.js ≥ 18.

## 🔗 Liens

- [Firmware ESP32 - Chiro Logger](https://github.com/themaire/chiro_logger)
- [Web Bluetooth API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
- [Angular Documentation](https://angular.io/docs)

---

*Projet développé dans le cadre d'études scientifiques sur les chiroptères - Respect de l'environnement et des espèces protégées.*
