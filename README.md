# Fleet Control Center — Voyage Replay & Analysis

Dashboard full-stack pour rejouer et analyser la télémétrie historique de trois navires (IMO1, IMO2, IMO3) : trajectoires sur carte, variables spatio-temporelles, KPIs de fenêtre et replay temporel.

Test technique Full Stack Engineer — septembre 2026.

## Stack

| Couche | Techno |
|---|---|
| Frontend | React 19, TypeScript, Vite, Leaflet, Chart.js, Axios |
| Backend | FastAPI, SQLAlchemy, psycopg2 |
| Données | PostgreSQL (TimescaleDB recommandé), CSV nettoyé `data/fleet_cleaned_data.csv` |
| Analyse hors ligne | pandas, notebook `analyse/dataset_analysis.ipynb` |

## Architecture

```
CSV bruts (GPS + MOTIONS)
        │
        ▼  analyse/dataset_analysis.ipynb   (une fois)
   nettoyage, jointure as-of, RPM / fuel dérivés
        │
        ▼
data/fleet_cleaned_data.csv
        │
        ▼  backend/init_db.py
PostgreSQL / TimescaleDB  →  table vessel_telemetry
        │
        ▼  FastAPI  :8000
GET /api/vessels   GET /api/track
        │
        ▼  React  :5173
Carte + graphes + replay + KPIs
```

Le traitement lourd (nettoyage, formules métier) est fait **hors ligne**. L’API ne fait que filtrer, grouper et décimer. Le frontend calcule les KPIs de fenêtre (distance Haversine, intégrale trapézoïdale des débits).

## Hypothèses

Le sujet demande de documenter les hypothèses. Voici celles qui sont appliquées.

**Données manquantes (RPM, carburant, météo)**

Les CSV n’ont ni RPM ni consommation. L’API météo / océan mentionnée dans le sujet n’est **pas fournie** (pas d’URL, pas de clé). On n’appelle donc aucune API externe.

Formules appliquées dans le notebook, en **mer calme**, en prenant la **SOG comme proxy de la STW** :

```
RPM                  = 4 × SOG
fuel (t/jour)        = 150 × (SOG / 15)³
fuel (t/h)           = fuel_jour / 24
coût                 = fuel_t/h × 1000
```

Conséquences assumées :

- sans courant, SOG ≠ STW ; un courant de 2 kn fausse fortement la conso (loi cubique) ;
- le **Weather Factor** `WxF ∝ ∛(Hs / 2)` n’est **pas** appliqué (pas de Hs) ;
- le prix est stocké en `fuel_cost_usd` (le sujet indique 1 000 € / t).

**Autres choix**

- Timestamps **sans fuseau** traités comme heure murale.
- GPS et MOTIONS joints en `merge_asof(..., direction="nearest")` (analyse historique, pas de contrainte causale).
- Position / vitesse imputées par `ffill` ; cap et route non imputés.
- Heading / course **non colorisés** sur la carte (angles 0–360°, un gradient linéaire mentirait).
- Décimation uniforme côté serveur (`max_points`, défaut 1 200) : un pic isolé peut disparaître. Acceptable pour l’exploration visuelle, pas pour de la détection d’anomalie.
- Totaux fuel / coût **intégrés** (règle des trapèzes × Δt réel), pas sommés : les colonnes sont des **débits** (t/h, $/h).

## Prérequis

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (TimescaleDB si possible)
- Docker optionnel pour l’image officielle TimescaleDB

## Lancement

### 1. Base de données

Copier `.env.example` vers `.env` et renseigner l’URL réelle :

```
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/postgres
```

`localhost:5432` doit pointer vers **cette** instance. Si un PostgreSQL Windows et un conteneur Docker écoutent tous les deux 5432, un seul gagne — d’où les erreurs `password authentication failed`.

Créer le schéma et charger le CSV nettoyé :

```bash
cd backend
pip install -r requirements.txt
python init_db.py
```

Si le port hôte n’atteint pas le conteneur Timescale, charger via Docker :

```bash
python init_db.py --docker
```

Le schéma cible est aussi dans `analyse/create-bdd.sql` (hypertable + index `(vessel_id, timestamp DESC)`).

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

Sur Windows, éviter `--reload` : il laisse souvent des process zombies qui bloquent le port (`WinError 10013`).

Vérifier : [http://127.0.0.1:8000](http://127.0.0.1:8000) → `{"status":"...","source":"postgresql"}`.

Docs OpenAPI : [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Ouvrir [http://localhost:5173](http://localhost:5173). L’UI appelle `http://127.0.0.1:8000/api`.

## API

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/api/vessels` | Inventaire : `vessel_id`, `first_timestamp`, `last_timestamp`, `sample_count` |
| `GET` | `/api/track` | Trajectoires filtrées. Query : `vessel_ids` (ex. `IMO1,IMO2`), `start`, `end` (`YYYY-MM-DD HH:MM:SS`), `max_points` |
| `GET` | `/api/kpis/{vessel_id}` | Agrégats globaux du navire (moyenne / sommes SQL, hors fenêtre UI) |

Réponse de `/api/track` (inchangée pour le React) :

```json
{
  "IMO1": [
    {
      "timestamp": "2026-07-25 23:45:00",
      "vessel_id": "IMO1",
      "latitude": 29.04,
      "longitude": 32.84,
      "speed": 16.3,
      "course": 337.9,
      "heading": 339.2,
      "rpm": 65.1,
      "fuel_consumption": 8.0,
      "fuel_cost_usd": 7998.7
    }
  ]
}
```

## Frontend — fonctionnalités

- Sélection multi-navires
- Fenêtre temporelle (saisie + presets 24 h / 7 j / 30 j / tout)
- Variables : SOG, RPM, fuel rate, cost rate, heading, COG
- Carte Leaflet, trajectoires en gradient, 3 fonds Esri sans clé API
- Rampes de couleur Abyss / Thermal / Viridis
- Replay (play / pause / slider) synchronisé carte + graphes
- KPIs par navire sur la fenêtre sélectionnée

## Structure

```
analyse/          notebook + schéma SQL
backend/          FastAPI, SQLAlchemy, init_db.py
data/             CSV bruts + fleet_cleaned_data.csv
frontend/         application React
.env.example      modèle d’identifiants BDD
```


