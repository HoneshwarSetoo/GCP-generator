"""
georeferencer.py
Pure-function service that converts raw image bytes + GCP list into
a warped GeoTIFF (bytes) using GDAL.

Steps
-----
1. Write input image bytes to a temp file.
2. Open with gdal.Open().
3. Convert each GCP dict → gdal.GCP and attach via SetGCPs().
4. Set coordinate reference system (EPSG:4326 by default).
5. Warp to an in-memory GeoTIFF with gdal.Warp().
6. Read and return the GeoTIFF bytes.
"""

import os
import tempfile
import logging
from typing import List, Dict, Any

from osgeo import gdal

logger = logging.getLogger(__name__)

# GDAL error output goes to Python logger instead of stderr
gdal.UseExceptions()


def _build_gdal_gcps(gcp_list: List[Dict[str, Any]]) -> List[gdal.GCP]:
    """Convert a list of GCP dicts to gdal.GCP objects."""
    result = []
    for idx, point in enumerate(gcp_list):
        gcp = gdal.GCP(
            float(point["geo_lon"]),   # GCPPixel maps to longitude (X)
            float(point["geo_lat"]),   # GCPLine  maps to latitude  (Y)
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
    """
    if not gcp_list:
        raise ValueError("At least one GCP point is required.")

    wgs84_wkt = 'GEOGCS["WGS 84",DATUM["WGS_1984",' \
                'SPHEROID["WGS 84",6378137,298.257223563]],' \
                'PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'

    with tempfile.TemporaryDirectory() as tmp_dir:
        input_path = os.path.join(tmp_dir, "input_image")
        gcp_path = os.path.join(tmp_dir, "gcp_image.tif")
        output_path = os.path.join(tmp_dir, "output.tif")

        # --- Step 1: Write raw image bytes to disk ---
        with open(input_path, "wb") as fh:
            fh.write(image_bytes)

        # --- Step 2: Open the image with GDAL ---
        src_ds = gdal.Open(input_path, gdal.GA_ReadOnly)
        if src_ds is None:
            raise RuntimeError("GDAL could not open the uploaded image.")

        # --- Step 3: Copy to GeoTIFF so we can attach GCPs ---
        driver = gdal.GetDriverByName("GTiff")
        gcp_ds = driver.CreateCopy(gcp_path, src_ds, strict=0)
        src_ds = None  # close source

        # --- Step 4: Attach GCPs and CRS ---
        gdal_gcps = _build_gdal_gcps(gcp_list)
        gcp_ds.SetGCPs(gdal_gcps, wgs84_wkt)
        gcp_ds = None  # flush & close

        # --- Step 5: Warp ---
        warp_options = gdal.WarpOptions(
            format="GTiff",
            dstSRS=wgs84_wkt,
            tps=False,          # polynomial GCP warp (not thin-plate spline)
            polynomialOrder=1,  # order 1 for affine; use 2/3 for distorted maps
            resampleAlg=gdal.GRA_Bilinear,
            creationOptions=["COMPRESS=LZW", "TILED=YES"],
        )
        gdal.Warp(output_path, gcp_path, options=warp_options)

        # --- Step 6: Read output bytes ---
        with open(output_path, "rb") as fh:
            output_bytes = fh.read()

    logger.info("Georeferencing complete. Output size: %d bytes", len(output_bytes))
    return output_bytes
