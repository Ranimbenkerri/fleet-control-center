from pathlib import Path
import pandas as pd
from sqlalchemy import create_engine, text

# 1. Configuration des chemins et connexions
PROJECT_ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = PROJECT_ROOT / "data" / "fleet_cleaned_data.csv"
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/postgres"

# Mapping des colonnes du CSV vers la BDD
COLUMN_MAP = {
    "timestamp": "timestamp",
    "vessel_id": "vessel_id",
    "latitude": "latitude",
    "longitude": "longitude",
    "speed": "speed",
    "course": "course",
    "heading": "heading",
    "rpm": "rpm",
    "fuel_consumption_t_per_hour": "fuel_consumption",
    "fuel_cost_usd_per_hour": "fuel_cost_usd",
}

def main():
    engine = create_engine(DATABASE_URL)

    # STEP 1 : Charger et nettoyer le CSV
    print(f"Chargement du CSV : {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    
    # Normalisation des colonnes
    df.columns = [str(col).strip().lower() for col in df.columns]
    df = df.rename(columns=COLUMN_MAP)[list(COLUMN_MAP.values())]
    
    # Formater le timestamp
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # STEP 2 : Initialiser le schéma SQL / TimescaleDB
    print("Initialisation du schéma TimescaleDB...")
    schema_statements = [
        "DROP TABLE IF EXISTS public.vessel_telemetry CASCADE;",
        "CREATE EXTENSION IF NOT EXISTS timescaledb;",
        """
        CREATE TABLE public.vessel_telemetry (
            timestamp          TIMESTAMPTZ NOT NULL,
            vessel_id          VARCHAR(10) NOT NULL,
            latitude           DOUBLE PRECISION,
            longitude          DOUBLE PRECISION,
            speed              REAL,
            course             REAL,
            heading            REAL,
            rpm                REAL,
            fuel_consumption   REAL,
            fuel_cost_usd      REAL
        );
        """,
        "SELECT create_hypertable('public.vessel_telemetry', 'timestamp', if_not_exists => TRUE);",
        "CREATE INDEX idx_vessel_time ON public.vessel_telemetry (vessel_id, timestamp DESC);"
    ]

    with engine.begin() as conn:
        for stmt in schema_statements:
            conn.execute(text(stmt))

    # STEP 3 : Injecter les données
    print(f"Injection de {len(df)} lignes...")
    df.to_sql(
        "vessel_telemetry",
        engine,
        if_exists="append",
        index=False,
        chunksize=1000,
        method="multi"
    )
    print("Succès ! La base TimescaleDB est prête.")

if __name__ == "__main__":
    main()