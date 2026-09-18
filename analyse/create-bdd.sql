-- Canonical TimescaleDB schema used by backend/init_db.py
CREATE EXTENSION IF NOT EXISTS timescaledb;

DROP TABLE IF EXISTS public.vessel_telemetry CASCADE;

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

SELECT create_hypertable('public.vessel_telemetry', 'timestamp', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_vessel_time ON public.vessel_telemetry (vessel_id, timestamp DESC);
