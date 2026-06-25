"""
main.py — FastAPI entry point for the GeoTIFF generation service.

Endpoint
--------
POST /geotiff
  - Form field  'image'  : UploadFile  — the source JPG or PNG
  - Form field  'points' : str (JSON)  — array of GCP objects

Response
--------
Binary GeoTIFF file as application/octet-stream with
Content-Disposition: attachment; filename="output.tif"

Run
---
uvicorn main:app --reload --port 8000
"""

import json
import logging

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from georeferencer import georeference

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GCP GeoTIFF Generator", version="1.0.0")

# Allow requests from the Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.post("/geotiff")
async def generate_geotiff(
    image: UploadFile = File(..., description="Source JPG or PNG image"),
    points: str = Form(..., description="JSON array of GCP objects"),
) -> Response:
    """
    Receives an image + GCP list, runs GDAL georeferencing,
    and returns the warped GeoTIFF as a binary download.
    """
    # --- Parse GCP JSON ---
    try:
        gcp_list = json.loads(points)
        if not isinstance(gcp_list, list) or len(gcp_list) == 0:
            raise ValueError("'points' must be a non-empty JSON array.")
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Invalid GCP payload: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # --- Read image bytes ---
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=422, detail="Uploaded image is empty.")

    logger.info(
        "Received image '%s' (%d bytes) with %d GCP points.",
        image.filename,
        len(image_bytes),
        len(gcp_list),
    )

    # --- Georeference ---
    try:
        tiff_bytes = georeference(image_bytes, gcp_list)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Georeferencing failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return Response(
        content=tiff_bytes,
        media_type="image/tiff",
        headers={"Content-Disposition": 'attachment; filename="output.tif"'},
    )
