from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from data_provider import get_track, get_vessel_kpis, get_vessels
from database import get_db

app = FastAPI(title="Marine Telemetry API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"status": "API Marine Telemetry en ligne", "source": "postgresql"}


@app.get("/api/vessels")
def list_vessels(db: Session = Depends(get_db)):
    return get_vessels(db)


@app.get("/api/track")
def vessel_track(
    db: Session = Depends(get_db),
    vessel_ids: str | None = Query(default=None),
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    max_points: int = Query(default=1500, ge=50, le=20000),
):
    requested = (
        [item.strip() for item in vessel_ids.split(",") if item.strip()]
        if vessel_ids
        else None
    )
    return get_track(db, requested, start, end, max_points)


@app.get("/api/kpis/{vessel_id}")
def vessel_kpis(vessel_id: str, db: Session = Depends(get_db)):
    kpis = get_vessel_kpis(db, vessel_id)
    if not kpis:
        raise HTTPException(status_code=404, detail="Navire non trouvé")
    return kpis
