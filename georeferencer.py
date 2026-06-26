"""
georeferencer.py
Pure-function service that converts raw image bytes + GCP list into
a warped GeoTIFF (bytes) using rasterio (bundled GDAL — no system install needed).
"""

import os
import tempfile
import logging
import struct
from typing import List, Dict, Any, Tuple

import numpy as np
import rasterio
from rasterio.control import GroundControlPoint
from rasterio.crs import CRS
from rasterio.transform import from_gcps
from rasterio.warp import reproject, Resampling, calculate_default_transform
from PIL import Image
import io

logger = logging.getLogger(__name__)

# --- Magic-byte signatures for supported image formats ---
_FORMAT_SIGNATURES: List[Tuple[bytes, str]] = [
    (b'\xff\xd8\xff', '.jpg'),
    (b'\x89PNG\r\n\x1a\n', '.png'),
    (b'GIF87a', '.gif'),
    (b'GIF89a', '.gif'),
    (b'BM', '.bmp'),
    (b'II*\x00', '.tif'),
    (b'MM\x00*', '.tif'),
]

WGS84 = CRS.from_epsg(4326)


def _detect_extension(image_bytes: bytes) -> str:
    for signature, ext in _FORMAT_SIGNATURES:
        if image_bytes.startswith(signature):
            return ext
    return '.jpg'


def _build_rasterio_gcps(gcp_list: List[Dict[str, Any]]) -> List[GroundControlPoint]:
    """Convert GCP dicts to rasterio GroundControlPoint objects."""
    result = []
    for idx, point in enumerate(gcp_list):
        gcp = GroundControlPoint(
            row=float(point["pxcel_y"]),
            col=float(point["pxcel_x"]),
            x=float(point["geo_lon"]),
            y=float(point["geo_lat"]),
            z=float(point.get("altitude") or 0.0),
            id=str(idx + 1),
            info=point.get("label", f"GCP-{idx + 1}"),
        )
        result.append(gcp)
    return result


def georeference(image_bytes: bytes, gcp_list: List[Dict[str, Any]]) -> bytes:
    """
    Apply GCPs to the supplied image and return a warped GeoTIFF as bytes.

    Parameters
    ----------
    image_bytes : bytes
        Raw bytes of the source JPG / PNG image.
    gcp_list : list[dict]
        List of GCP dicts with keys: pxcel_x, pxcel_y, geo_lat, geo_lon.

    Returns
    -------
    bytes
        Binary content of the output GeoTIFF.
    """
    if not gcp_list:
        raise ValueError("At least one GCP point is required.")

    # Step 1: Decode image to numpy array via Pillow
    try:
        pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise RuntimeError(f"Could not decode image bytes: {exc}") from exc

    img_array = np.array(pil_img)  # shape: (H, W, 3)
    height, width = img_array.shape[:2]

    # Step 2: Build rasterio GCPs
    gcps = _build_rasterio_gcps(gcp_list)

    # Step 3: Derive affine transform from GCPs
    transform = from_gcps(gcps)

    # Step 4: Write a GeoTIFF with GCPs embedded, then warp it
    with tempfile.TemporaryDirectory() as tmp_dir:
        gcp_path = os.path.join(tmp_dir, "gcp_image.tif")
        output_path = os.path.join(tmp_dir, "output.tif")

        # Write source TIF with GCPs (no transform yet — raw pixel space)
        with rasterio.open(
            gcp_path,
            "w",
            driver="GTiff",
            height=height,
            width=width,
            count=3,
            dtype=img_array.dtype,
            crs=WGS84,
        ) as dst:
            for i in range(3):
                dst.write(img_array[:, :, i], i + 1)
            dst.update_tags(ns="rio_overview", resampling="nearest")
            # Write GCPs into the file
            dst.gcps = (gcps, WGS84)

        # Step 5: Warp using GCPs → regular georeferenced GeoTIFF
        with rasterio.open(gcp_path) as src:
            src_gcps, src_crs = src.gcps

            calc_transform, calc_width, calc_height = calculate_default_transform(
                src_crs,
                WGS84,
                src.width,
                src.height,
                gcps=src_gcps,
            )

            profile = src.profile.copy()
            profile.update(
                crs=WGS84,
                transform=calc_transform,
                width=calc_width,
                height=calc_height,
                compress="lzw",
                tiled=True,
            )

            with rasterio.open(output_path, "w", **profile) as dst:
                for i in range(1, src.count + 1):
                    reproject(
                        source=rasterio.band(src, i),
                        destination=rasterio.band(dst, i),
                        src_crs=src_crs,
                        src_transform=src.transform,
                        dst_crs=WGS84,
                        dst_transform=calc_transform,
                        resampling=Resampling.bilinear,
                        gcps=src_gcps,
                    )

        with open(output_path, "rb") as fh:
            output_bytes = fh.read()

    logger.info("Georeferencing complete. Output size: %d bytes", len(output_bytes))
    return output_bytes


def batch_georeference(
    items: List[Tuple[bytes, str, List[Dict[str, Any]]]]
) -> List[Tuple[str, bytes]]:
    """
    Georeference multiple images in sequence.

    Parameters
    ----------
    items : list of (image_bytes, filename, gcp_list)

    Returns
    -------
    list of (output_filename, tiff_bytes)
    """
    results = []
    for image_bytes, filename, gcp_list in items:
        stem = os.path.splitext(filename)[0] if filename else "image"
        output_name = f"{stem}_georef.tif"
        logger.info("Batch: georeferencing '%s' with %d GCPs.", filename, len(gcp_list))
        tiff_bytes = georeference(image_bytes, gcp_list)
        results.append((output_name, tiff_bytes))
    return results
