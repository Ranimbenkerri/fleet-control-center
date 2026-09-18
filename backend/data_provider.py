from sqlalchemy import bindparam, text
from sqlalchemy.orm import Session

TELEMETRY_SELECT = """
    to_char(timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS timestamp,
    vessel_id,
    COALESCE(latitude, 0)::float AS latitude,
    COALESCE(longitude, 0)::float AS longitude,
    COALESCE(speed, 0)::float AS speed,
    COALESCE(course, 0)::float AS course,
    COALESCE(heading, 0)::float AS heading,
    COALESCE(rpm, 0)::float AS rpm,
    COALESCE({fuel_col}, 0)::float AS fuel_consumption,
    COALESCE({cost_col}, 0)::float AS fuel_cost_usd
"""

_fuel_column_names: tuple[str, str] | None = None


def _fuel_columns(db: Session) -> tuple[str, str]:
    global _fuel_column_names
    if _fuel_column_names is not None:
        return _fuel_column_names

    existing = {
        str(row[0])
        for row in db.execute(
            text(
                """
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'vessel_telemetry'
                """
            )
        )
    }
    fuel = "fuel_consumption" if "fuel_consumption" in existing else "fuel_consumption_t_per_hour"
    cost = "fuel_cost_usd" if "fuel_cost_usd" in existing else "fuel_cost_usd_per_hour"
    _fuel_column_names = (fuel, cost)
    return _fuel_column_names


def _select(db: Session) -> str:
    fuel_col, cost_col = _fuel_columns(db)
    return TELEMETRY_SELECT.format(fuel_col=fuel_col, cost_col=cost_col)


def downsample(rows: list, max_points: int = 1500) -> list:
    if not rows or len(rows) <= max_points:
        return rows
    step = len(rows) / max_points
    picked = [rows[int(index * step)] for index in range(max_points)]
    if picked[-1] is not rows[-1]:
        picked[-1] = rows[-1]
    return picked


def get_vessels(db: Session) -> list[dict]:
    query = text(
        """
        SELECT
            vessel_id,
            to_char(MIN(timestamp) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS first_timestamp,
            to_char(MAX(timestamp) AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') AS last_timestamp,
            COUNT(*)::int AS sample_count
        FROM vessel_telemetry
        GROUP BY vessel_id
        ORDER BY vessel_id
        """
    )
    return [dict(row) for row in db.execute(query).mappings()]


def get_track(
    db: Session,
    vessel_ids: list[str] | None = None,
    start: str | None = None,
    end: str | None = None,
    max_points: int = 1500,
) -> dict[str, list[dict]]:
    """Telemetry grouped per vessel — the shape expected by the React app."""
    if vessel_ids is not None and len(vessel_ids) == 0:
        return {}

    sql = f"SELECT {_select(db)} FROM vessel_telemetry WHERE 1 = 1"
    params: dict = {}

    if vessel_ids:
        sql += " AND vessel_id IN :vessel_ids"
        params["vessel_ids"] = tuple(vessel_ids)
    if start and end:
        sql += " AND timestamp BETWEEN :start AND :end"
        params["start"] = start
        params["end"] = end
    elif start:
        sql += " AND timestamp >= :start"
        params["start"] = start
    elif end:
        sql += " AND timestamp <= :end"
        params["end"] = end

    sql += " ORDER BY vessel_id, timestamp ASC"

    statement = text(sql)
    if vessel_ids:
        statement = statement.bindparams(bindparam("vessel_ids", expanding=True))

    grouped: dict[str, list[dict]] = {}
    for row in db.execute(statement, params).mappings():
        payload = dict(row)
        grouped.setdefault(str(payload["vessel_id"]), []).append(payload)

    return {
        vessel_id: downsample(rows, max_points)
        for vessel_id, rows in sorted(grouped.items())
    }


def get_vessel_kpis(db: Session, vessel_id: str) -> dict | None:
    fuel_col, cost_col = _fuel_columns(db)
    query = text(
        f"""
        SELECT
            vessel_id,
            ROUND(AVG(speed)::numeric, 2)::float AS avg_speed,
            ROUND(SUM({fuel_col})::numeric, 2)::float AS total_fuel,
            ROUND(SUM({cost_col})::numeric, 2)::float AS total_cost
        FROM vessel_telemetry
        WHERE vessel_id = :vessel_id
        GROUP BY vessel_id
        """
    )
    row = db.execute(query, {"vessel_id": vessel_id}).mappings().first()
    return dict(row) if row else None
