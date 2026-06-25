/**
 * app/api/gcp-points/route.ts
 *
 * Next.js Route Handler — acts as a transparent proxy between the browser
 * and the Python FastAPI backend.
 *
 * Why a proxy?
 * - Keeps the Python URL out of the browser (no CORS issues in production).
 * - Allows the Next.js server to add auth headers, logging, etc. later.
 *
 * Flow:
 *   Browser (multipart/form-data)
 *     → POST /api/gcp-points
 *       → Python FastAPI POST /geotiff
 *         ← binary GeoTIFF bytes
 *       ← streamed back to browser as attachment
 */

import { NextRequest, NextResponse } from 'next/server';

const PYTHON_BACKEND_URL =
  process.env.PYTHON_BACKEND_URL || 'http://localhost:8000/geotiff';

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

  // Validate required fields are present before forwarding
  if (!formData.get('image') || !formData.get('points')) {
    return NextResponse.json(
      { error: "Both 'image' and 'points' fields are required." },
      { status: 422 },
    );
  }

  let pythonResponse: Response;

  try {
    pythonResponse = await fetch(PYTHON_BACKEND_URL, {
      method: 'POST',
      body: formData,
      // Do NOT set Content-Type — fetch sets the multipart boundary automatically
    });
  } catch (networkError) {
    console.error('[gcp-points proxy] Cannot reach Python backend:', networkError);
    return NextResponse.json(
      { error: 'GeoTIFF service is unavailable. Is the Python backend running?' },
      { status: 503 },
    );
  }

  if (!pythonResponse.ok) {
    const errorText = await pythonResponse.text();
    console.error('[gcp-points proxy] Backend error:', errorText);
    return NextResponse.json(
      { error: `Backend returned ${pythonResponse.status}: ${errorText}` },
      { status: pythonResponse.status },
    );
  }

  const tiffBuffer = await pythonResponse.arrayBuffer();

  return new NextResponse(tiffBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/tiff',
      'Content-Disposition': 'attachment; filename="output.tif"',
      'Content-Length': String(tiffBuffer.byteLength),
    },
  });
}
