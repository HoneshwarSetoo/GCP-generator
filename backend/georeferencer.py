"""
georeferencer.py
Pure-function service that converts raw image bytes + GCP list into
a warped GeoTIFF (bytes) using GDAL.

Steps
-----
1. Detect image format from magic bytes; write to temp file with correct extension.
2. Open with gdal.Open().
3. Convert each GCP dict → gdal.GCP and attach via SetGCPs().
4. Set coordinate reference system (EPSG:4326 by default).
5. Warp to an in-memory GeoTIFF with gdal.Warp().
6. Read and return the GeoTIFF bytes.
"""

import os
import tempfile
import logging
from typing import List, Dict, Any, Tuple

from osgeo import gdal

logger = logging.getLogger(__name__)

# Route GDAL errors through Python logger instead of stderr
gdal.UseExceptions()

# --- Magic-byte signatures for supported image formats ---
_FORMAT_SIGNATURES: List[Tuple[bytes, str]] = [
    (b'\xff\xd8\xff', '.jpg'),
    (b'\x89PNG\r\n\x1a\n', '.png'),
    (b'GIF87a', '.gif'),
    (b'GIF89a', '.gif'),
    (b'BM', '.bmp'),
    (b'II*\x00', '.tif'),   # TIFF little-endian
    (b'MM\x00*', '.tif'),   # TIFF big-endian
]

WGS84_WKT = (
    'GEOGCS["WGS 84",DATUM["WGS_1984",'
    'SPHEROID["WGS 84",6378137,298.257223563]],'
    'PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'
)


def _detect_extension(image_bytes: bytes) -> str:
    """Return a file extension based on magic bytes, defaulting to '.jpg'."""
    for signature, ext in _FORMAT_SIGNATURES:
        if image_bytes.startswith(signature):
            return ext
    return '.jpg'


def _build_gdal_gcps(gcp_list: List[Dict[str, Any]]) -> List[gdal.GCP]:
    """Convert a list of GCP dicts to gdal.GCP objects."""
    result = []
    for idx, point in enumerate(gcp_list):
        gcp = gdal.GCP(
            float(point["geo_lon"]),            # GCPPixel → longitude (X)
            float(point["geo_lat"]),            # GCPLine  → latitude  (Y)
            float(point.get("altitude") or 0.0),
            float(point["pxcel_x"]),
            float(point["pxcel_y"]),
            point.get("label", f"GCP-{idx + 1}"),
            str(idx + 1),
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

    Raises
    ------
    ValueError
        If gcp_list is empty or a required key is missing.
    RuntimeError
        If GDAL fails to open, copy, or warp the image.
    """
    if not gcp_list:
        raise ValueError("At least one GCP point is required.")

    ext = _detect_extension(image_bytes)

    # ignore_cleanup_errors=True prevents Windows PermissionError when GDAL
    # still holds a handle on temp files during directory cleanup.
    with tempfile.TemporaryDirectory(ignore_cleanup_errors=True) as tmp_dir:
        # Use correct extension so GDAL can detect the image driver on Windows
        input_path = os.path.join(tmp_dir, f"input_image{ext}")
        gcp_path = os.path.join(tmp_dir, "gcp_image.tif")
        output_path = os.path.join(tmp_dir, "output.tif")

        # Step 1: Write raw image bytes to disk
        with open(input_path, "wb") as fh:
            fh.write(image_bytes)

        # Step 2: Open the image with GDAL
        try:
            src_ds = gdal.Open(input_path, gdal.GA_ReadOnly)
        except Exception as exc:
            raise RuntimeError(f"GDAL could not open the uploaded image: {exc}") from exc

        if src_ds is None:
            raise RuntimeError(
                "GDAL returned None while opening the image. "
                f"Detected format: '{ext}'. Ensure the file is a valid JPG or PNG."
            )

        # Step 3: Copy to GeoTIFF so we can attach GCPs
        driver = gdal.GetDriverByName("GTiff")
        gcp_ds = driver.CreateCopy(gcp_path, src_ds, strict=0)
        del src_ds  # explicitly release file handle before cleanup

        if gcp_ds is None:
            raise RuntimeError("GDAL could not create GeoTIFF copy of the source image.")

        # Step 4: Attach GCPs and CRS
        gdal_gcps = _build_gdal_gcps(gcp_list)
        gcp_ds.SetGCPs(gdal_gcps, WGS84_WKT)
        gcp_ds.FlushCache()
        del gcp_ds  # explicitly release before Warp reads it

        # Step 5: Warp
        warp_options = gdal.WarpOptions(
            format="GTiff",
            dstSRS=WGS84_WKT,
            tps=False,           # polynomial GCP warp
            polynomialOrder=1,   # order 1 (affine); increase for distorted imagery
            resampleAlg=gdal.GRA_Bilinear,
            creationOptions=["COMPRESS=LZW", "TILED=YES"],
        )
        warp_result = gdal.Warp(output_path, gcp_path, options=warp_options)
        if warp_result is None:
            raise RuntimeError("GDAL Warp failed to produce an output file.")
        del warp_result  # flush & release output handle

        # Step 6: Read output bytes before the temp dir is deleted
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
        Each tuple contains the stem of the original filename with '_georef.tif'
        appended, plus the binary GeoTIFF content.
    """
    results = []
    for image_bytes, filename, gcp_list in items:
        stem = os.path.splitext(filename)[0] if filename else "image"
        output_name = f"{stem}_georef.tif"
        logger.info("Batch: georeferencing '%s' with %d GCPs.", filename, len(gcp_list))
        tiff_bytes = georeference(image_bytes, gcp_list)
        results.append((output_name, tiff_bytes))
    return results
