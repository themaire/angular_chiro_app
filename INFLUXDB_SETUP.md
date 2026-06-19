# Configuration InfluxDB

Cette fonctionnalité permet d'envoyer automatiquement les données de capteurs vers une base de données InfluxDB v2.

**Format 100% compatible avec [chiro_influx_loader](https://github.com/themaire/chiro_influx_loader)** : même measurement (`env`), mêmes tags, mêmes fields, gestion des doublons identique.

## Prérequis

1. **InfluxDB v2** installé et accessible
2. Un **bucket** créé dans InfluxDB pour stocker les données
3. Un **token d'API** avec les droits d'écriture sur le bucket

## Configuration

### 1. Créer un token dans InfluxDB

Dans l'interface InfluxDB :
- Allez dans **Data** > **API Tokens**
- Cliquez sur **Generate API Token** > **All Access Token** (ou créez un token personnalisé avec droit d'écriture sur votre bucket)
- Copiez le token généré

### 2. Configurer l'application

Dans l'application Chiro Logger :
1. Allez dans le **Dashboard**
2. Cliquez sur l'icône ⚙️ (Settings) en bas à droite près des boutons d'export
3. Remplissez le formulaire :
   - **URL du serveur** : L'URL de votre instance InfluxDB (ex: `http://localhost:8086` ou `https://mon-serveur.com:8086`)
   - **Token d'authentification** : Le token API copié précédemment
   - **Organisation** : Le nom de votre organisation InfluxDB
   - **Bucket** : Le nom du bucket où stocker les données
   - **Nom de la sonde** : Identifiant de votre sonde (ex: `logger1`, `logger2`, etc.) - servira de tag `device` dans InfluxDB
4. Cliquez sur **Tester la connexion** pour vérifier que tout fonctionne
5. Activez **"Activer l'envoi automatique vers InfluxDB"** si désiré
6. Cliquez sur **Sauvegarder**

### 3. Envoyer les données

Une fois configuré, vous pouvez :
- Cliquer sur le bouton **"Envoyer vers InfluxDB"** pour envoyer manuellement les données collectées
- Les données sont envoyées au format **Line Protocol** d'InfluxDB

**Gestion automatique des doublons** :
- L'application garde un checkpoint du dernier ID envoyé (stocké dans le localStorage)
- Seules les **nouvelles données** (ID > dernier ID envoyé) sont envoyées à chaque fois
- Comportement identique au script Python [chiro_influx_loader](https://github.com/themaire/chiro_influx_loader)
- Si aucune nouvelle donnée, un bouton "Réinitialiser" permet de forcer le renvoi complet

## Format des données

Les données sont stockées dans la measurement `env` avec :

**Tags :**
- `device` : Nom de la sonde (ex: `logger1`)

**Fields :**
- `temperature` : Température en °C
- `hygro` : Humidité en %
- `vbat` : Niveau de batterie en %
- `bat` : Tension de la batterie en V

**Timestamp :** Date et heure de la mesure (en secondes Unix)

**Exemple de line protocol généré :**

```text
env,device=logger1 temperature=19.05,hygro=59.63,vbat=60,bat=3.72 1713332628
env,device=logger1 temperature=18.83,hygro=59.43,vbat=60,bat=3.71 1713334426
```

Ce format est **100% compatible** avec les données envoyées par [chiro_influx_loader](https://github.com/themaire/chiro_influx_loader).

## Sécurité

⚠️ **Important** : Les informations de configuration (URL, token, etc.) sont stockées dans le **localStorage** du navigateur.

**Considérations de sécurité :**

- Les données sont stockées en clair dans le navigateur
- Ne partagez pas votre appareil avec des personnes non autorisées
- Utilisez un token avec les permissions minimales nécessaires (lecture/écriture sur le bucket uniquement)
- Si vous utilisez l'application sur un réseau public, assurez-vous d'utiliser HTTPS pour votre instance InfluxDB

## Problèmes CORS

Si vous rencontrez une erreur de type "CORS" ou "Impossible de joindre le serveur" :

1. **Solution recommandée** : Configurez InfluxDB pour autoriser les requêtes CORS depuis votre application

Dans le fichier de configuration InfluxDB (`influxd.conf` ou variables d'environnement) :

```ini
[http]
  cors-enabled = true
  cors-allowed-origin = ["*"]
```

2. **Solution alternative** : Utilisez un proxy ou configurez votre serveur web (nginx, apache) pour gérer les en-têtes CORS

## Exemple de requête Flux

Pour visualiser les données dans InfluxDB :

```flux
from(bucket: "datalogger")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "env")
  |> filter(fn: (r) => r["device"] == "logger1")
  |> filter(fn: (r) => r["_field"] == "temperature" or r["_field"] == "hygro")
```

## Checkpoint et doublons

L'application utilise un système de **checkpoint** pour éviter d'envoyer plusieurs fois les mêmes données :
 Même format de timestamp (secondes Unix)

Vous pouvez donc utiliser les deux méthodes (PWA Angular + script Python) sur la même base InfluxDB sans conflit.ors-allowed-origin = ["*"]
```

2. **Solution alternative** : Utilisez un proxy ou configurez votre serveur web (nginx, apache) pour gérer les en-têtes CORS

## Exemple de requête Flux

Pour visualiser les données dans InfluxDB :

```flux
from(bucket: "votre-bucket")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "sensor_data")
  |> filter(fn: (r) => r["_field"] == "temperature" or r["_field"] == "humidity")
```

## Support

En cas de problème :
1. Vérifiez que l'URL InfluxDB est correcte et accessible
2. Vérifiez que le token a les bonnes permissions
3. Vérifiez les logs de la console du navigateur (F12 > Console)
4. Testez la connexion avec le bouton "Tester la connexion" du formulaire de configuration

