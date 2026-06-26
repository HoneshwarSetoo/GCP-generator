"""
main.py — FastAPI entry point for the GeoTIFF generation service.

Endpoints
---------
POST /geotiff
  Single image georeferencing.
  - Form field  'image'  : UploadFile  — the source JPG or PNG
  - Form field  'points' : str (JSON)  — array of GCP objects
  Returns a binary GeoTIFF (image/tiff).

POST /geotiff/batch
  Multi-image georeferencing in one request.
  - Form field  'images[]' : list[UploadFile]
  - Form field  'points[]' : list[str]  — one JSON array per image (same order)
  Returns a ZIP archive containing all GeoTIFF files.

Run
---
uvicorn main:app --reload --port 8000
"""

import io
import json
import logging
import zipfile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import List

from georeferencer import batch_georeference, georeference

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="GCP GeoTIFF Generator", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://gcp-generator-1.onrender.com", "https://gcp-generator.vercel.app"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


def _parse_gcp_json(raw: str, label: str = "points") -> list:
    """Parse a JSON string into a list of GCP dicts, raising HTTP 422 on error."""
    try:
        gcp_list = json.loads(raw)
        if not isinstance(gcp_list, list) or len(gcp_list) == 0:
            raise ValueError(f"'{label}' must be a non-empty JSON array.")
        return gcp_list
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Invalid GCP payload for '%s': %s", label, exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/geotiff")
async def generate_geotiff(
    image: UploadFile = File(..., description="Source JPG or PNG image"),
    points: str = Form(..., description="JSON array of GCP objects"),
) -> Response:
    """
    Receives a single image + GCP list, runs GDAL georeferencing,
    and returns the warped GeoTIFF as a binary download.
    """
    gcp_list = _parse_gcp_json(points)

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(status_code=422, detail="Uploaded image is empty.")

    logger.info(
        "Single: received '%s' (%d bytes) with %d GCPs.",
        image.filename,
        len(image_bytes),
        len(gcp_list),
    )

    try:
        tiff_bytes = georeference(image_bytes, gcp_list)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Georeferencing failed for '%s'", image.filename)
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    stem = (image.filename or "output").rsplit(".", 1)[0]
    output_name = f"{stem}_georef.tif"

    return Response(
        content=tiff_bytes,
        media_type="image/tiff",
        headers={"Content-Disposition": f'attachment; filename="{output_name}"'},
    )


@app.post("/geotiff/batch")
async def generate_geotiff_batch(
    images: List[UploadFile] = File(..., description="One or more source images"),
    points: List[str] = Form(..., description="One JSON GCP array per image, in the same order"),
) -> Response:
    """
    Accepts multiple images and GCP arrays, georeferences each in turn,
    and returns a ZIP archive of all output GeoTIFF files.
    """
    if len(images) != len(points):
        raise HTTPException(
            status_code=422,
            detail=f"Mismatch: {len(images)} image(s) but {len(points)} points array(s).",
        )

    items = []
    for idx, (upload, raw_points) in enumerate(zip(images, points)):
        gcp_list = _parse_gcp_json(raw_points, label=f"points[{idx}]")
        image_bytes = await upload.read()
        if not image_bytes:
            raise HTTPException(
                status_code=422,
                detail=f"Image at index {idx} ('{upload.filename}') is empty.",
            )
        items.append((image_bytes, upload.filename or f"image_{idx}", gcp_list))

    logger.info("Batch: processing %d image(s).", len(items))

    try:
        results = batch_georeference(items)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Batch georeferencing failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    # Pack all GeoTIFFs into a ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as zf:
        for output_name, tiff_bytes in results:
            zf.writestr(output_name, tiff_bytes)
    zip_bytes = zip_buffer.getvalue()

    logger.info("Batch: returning ZIP (%d bytes) with %d file(s).", len(zip_bytes), len(results))

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="georeferenced_batch.zip"'},
    )


@app.get("/health")
def health_check():
    return {"status": "ok"}
