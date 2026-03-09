# Migration de données médicales vers MongoDB

## Partie 1 — Migration vers MongoDB (en local)

### Contexte

Le client rencontre des problèmes de scalabilité avec sa gestion de données médicales. Ce projet migre un dataset CSV de patients vers **MongoDB**, une base NoSQL orientée documents qui offre une scalabilité horizontale native.

---

### Concepts clés MongoDB

### Document
L'unité de base de stockage. C'est un objet JSON (stocké en BSON) qui peut contenir des champs imbriqués. Équivalent d'une *ligne* en SQL.

```json
{
  "_id": "ObjectId(...)",
  "personal_info": { "name": "Alice Johnson", "age": 45 },
  "medical_info":  { "condition": "Cancer", "test_results": "Inconclusive" }
}
```

### Collection
Regroupement de documents, analogue à une *table* SQL. Dans ce projet : collection **patients**.

### Base de données
Regroupe un ensemble de collections. Dans ce projet : base **medical_db**.

---

### Schéma de la base de données

Chaque ligne du CSV devient un document imbriqué par domaine métier. Ce schéma permet de lire le dossier complet d'un patient en **une seule requête**, sans jointure.

```
Document "patient"
│
├── personal_info
│   ├── name          String    "Alice Johnson"
│   ├── age           Int32     45
│   ├── gender        String    "Female"
│   └── blood_type    String    "AB-"
│
├── medical_info
│   ├── condition     String    "Cancer"
│   ├── medication    String    "Paracetamol"
│   └── test_results  String    "Inconclusive"
│
├── hospitalization
│   ├── date_of_admission  Date    ISODate("2024-01-03")
│   ├── discharge_date     Date    ISODate("2024-02-26")
│   ├── doctor             String  "Dr. Matthew Smith"
│   ├── hospital           String  "Sons and Miller"
│   ├── room_number        Int32   328
│   └── admission_type     String  "Urgent"
│
├── billing
│   ├── insurance_provider  String  "Aetna"
│   └── amount              Double  18856.28
│
└── metadata
    ├── imported_at  Date    ISODate("2024-...")
    └── source       String  "CSV migration"
```

---

### Structure du projet

```
P5/
├── data/
│   └── medical_data.csv          # Dataset source (non commité sur GitHub)
├── migrate.py                    # Script de migration
├── requirements.txt              # Dépendances Python
├── Dockerfile                    # Dockerfile
├── docker-compose.yml            # docker-compose
├── mongo-init.js                 # Création des utilisateurs MongoDB
├── .env                          # Mots de passe (non commité sur GitHub)
├── .gitignore                    # Fichiers exclus de GitHub
└── README.md                     # Ce fichier
```

---


### Prérequis

- Python 3.11
- MongoDB installé et lancé en local

### Lancer la migration

```bash
python migrate.py
```

### Ce que fait le script

Le script est découpé en **2 fonctions** :

**`lire_csv(chemin_csv)`**
1. Lit le fichier `data/medical_data.csv`
2. Vérifie les colonnes, les doublons, les domaines (Gender, Blood Type, etc.)
3. Nettoie et type les données
4. Retourne un DataFrame propre

**`migrer_mongodb(df, ...)`**
1. Se connecte à MongoDB avec authentification (username + password + rôle)
2. Insère les données dans la collection `patients` de la base `medical_db`
3. Crée les 7 index pour accélérer les recherches
4. Effectue une démonstration CRUD (Create / Read / Update / Delete)
5. Vérifie l'intégrité des données en base
---
### Visualiser les données avec MongoDB Compass

1. Ouvre **MongoDB Compass**
2. Connecte-toi sur mongodb://localhost:27017
3. Navigue vers medical_db → patients
4. Clique sur **Refresh** si la base n'apparaît pas

---

### Dépendances

| Package | Rôle |
|---|---|
| pymongo | Driver officiel MongoDB pour Python |
| pandas | Lecture et nettoyage du CSV |


## Partie 2 — Conteneurisation avec Docker

### C'est quoi ?

Au lieu d'installer Python et MongoDB sur sa machine, on utilise Docker.
Docker va créer deux "boîtes" isolées (conteneurs) qui communiquent entre elles :
- une boîte pour **MongoDB**
- une boîte pour **le script Python**

### Architecture Docker

```
┌─────────────────────────────────────────┐
│           medical_network (bridge)       │
│                                         │
│  ┌─────────────────┐  ┌──────────────┐  │
│  │ medical_mongodb │  │medical_migra-│  │
│  │  (mongo:7.0)    │◄─│    tion      │  │
│  │  port 27017     │  │  (Python)    │  │
│  └─────────────────┘  └──────────────┘  │
│                                         │
└─────────────────────────────────────────┘
         │
    mongo_data (volume persistant)
```

### Prérequis

- Docker installé
- Docker Compose installé

### Lancer avec Docker

```bash
docker-compose up --build
```

C'est tout ! Docker va automatiquement :
1. Créer le réseau privé `medical_network`
2. Démarrer MongoDB
3. Attendre que MongoDB soit prêt (healthcheck)
4. Lancer le script de migration

### Voir les logs de la migration

```bash
docker-compose logs migration
```

### Arrêter les conteneurs

```bash
docker-compose down
```
## Partie 3 — Authentification et sécurité

### Pourquoi sécuriser ?

Sans authentification, n'importe qui ayant accès au réseau peut lire ou modifier les données médicales. MongoDB propose un système de **comptes + rôles** pour contrôler précisément qui peut faire quoi.

### Les 3 comptes et leurs rôles

| # | Compte | Rôle MongoDB | Peut faire | Utilisé par |
|---|---|---|---|---|
| 1 | `root_admin` | `root` | Tout (toutes les bases) | Administration uniquement |
| 2 | `read_write_user` | `readWrite` + `dbAdmin` | Lire, écrire, créer des index dans `medical_db` | Script de migration |
| 3 | `read_only_user` | `read` | Lire uniquement dans `medical_db` | MongoDB Compass / consultation |

> Le principe du **moindre privilège** : chaque compte n'a que les droits dont il a besoin, rien de plus.

### Schéma des accès

```
root_admin        →  accès total (toutes les bases)
                         │
                    medical_db
                    ┌────┴────┐
         read_write_user   read_only_user
         (lire + écrire)   (lire seulement)
              │
        migrate.py
```

### Fichier .env — stocker les mots de passe

Les mots de passe ne sont **jamais** écrits directement dans le code. Ils sont dans un fichier `.env` 
 Ce fichier est dans `.gitignore` : il ne sera **jamais envoyé sur GitHub**.

## Partie 4 — Gestion des branches GitHub

### Pourquoi plusieurs branches ?

Chaque fonctionnalité est développée dans sa propre branche. Cela permet de :
- Travailler sur plusieurs choses en parallèle sans casser le code principal
- Relire et valider les changements avant de les intégrer (Pull Request)
- Garder un historique clair de qui a fait quoi

### Organisation des branches

```
main               ← code stable, validé, en production
└── develop        ← intégration de toutes les features
    ├── feature/migration  ← script migrate.py + CSV
    └── feature/docker     ← Dockerfile + docker-compose + auth
```