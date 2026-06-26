/**
 * app/api/gcp-points/batch/route.ts
 *
 * Next.js Route Handler — proxies batch georeferencing requests to the Python
 * FastAPI backend.
 *
 * Flow:
 *   Browser (multipart/form-data: images[] + points[])
 *     → POST /api/gcp-points/batch
 *       → Python FastAPI POST /geotiff/batch
 *         ← ZIP archive of GeoTIFF files
 *       ← streamed back to browser as attachment
 */

import { NextRequest, NextResponse } from 'next/server';

const PYTHON_BATCH_URL =
  process.env.PYTHON_BACKEND_BATCH_URL || 'http://localhost:8000/geotiff/batch';

export async function POST(request: NextRequest): Promise<NextResponse> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: 'Failed to parse multipart form data.' },
      { status: 400 },
    );
  }

  const images = formData.getAll('images');
  const points = formData.getAll('points');

  if (images.length === 0 || points.length === 0) {
    return NextResponse.json(
      { error: "Both 'images' and 'points' fields are required." },
      { status: 422 },
    );
  }

  if (images.length !== points.length) {
    return NextResponse.json(
      { error: `Mismatch: ${images.length} image(s) vs ${points.length} points array(s).` },
      { status: 422 },
    );
  }

  let pythonResponse: Response;

  try {
    pythonResponse = await fetch(PYTHON_BATCH_URL, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — fetch sets the multipart boundary automatically
    });
  } catch (networkError) {
    console.error('[gcp-points/batch proxy] Cannot reach Python backend:', networkError);
    return NextResponse.json(
      { error: 'GeoTIFF service is unavailable. Is the Python backend running?' },
      { status: 503 },
    );
  }

  if (!pythonResponse.ok) {
    const errorText = await pythonResponse.text();
    console.error('[gcp-points/batch proxy] Backend error:', errorText);
    return NextResponse.json(
      { error: `Backend returned ${pythonResponse.status}: ${errorText}` },
      { status: pythonResponse.status },
    );
  }

  const zipBuffer = await pythonResponse.arrayBuffer();

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="georeferenced_batch.zip"',
      'Content-Length': String(zipBuffer.byteLength),
    },
  });
}
