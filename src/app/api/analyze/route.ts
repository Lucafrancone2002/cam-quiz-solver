import { NextResponse } from "next/server";
import { extractCamProblemFromImage } from "@/lib/ai/vision-client";

// Riceve lo screenshot del problema CAM (multipart/form-data dalla Dropzone,
// oppure JSON con immagine in Base64) e lo inoltra al Vision & AI Orchestrator
// Agent, che restituisce un ExtractedCamProblem pronto per lib/cam-engine.
export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let imageBase64: string;
    let mimeType: string;
    let extraText: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("image");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Campo 'image' mancante o non valido nel form-data." }, { status: 400 });
      }
      mimeType = file.type || "image/png";
      const arrayBuffer = await file.arrayBuffer();
      imageBase64 = Buffer.from(arrayBuffer).toString("base64");
      const text = formData.get("text");
      extraText = typeof text === "string" && text.length > 0 ? text : undefined;
    } else {
      const body = await request.json();
      if (typeof body?.imageBase64 !== "string" || body.imageBase64.length === 0) {
        return NextResponse.json({ error: "Campo 'imageBase64' mancante nel corpo JSON." }, { status: 400 });
      }
      // Accetta sia il payload base64 puro sia una data URL completa (data:image/png;base64,....).
      const commaIndex = body.imageBase64.indexOf(",");
      imageBase64 = body.imageBase64.startsWith("data:") && commaIndex !== -1
        ? body.imageBase64.slice(commaIndex + 1)
        : body.imageBase64;
      mimeType = typeof body.mimeType === "string" ? body.mimeType : "image/png";
      extraText = typeof body.text === "string" && body.text.length > 0 ? body.text : undefined;
    }

    const extracted = await extractCamProblemFromImage({ imageBase64, mimeType, extraText });
    return NextResponse.json(extracted);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore durante l'analisi dello screenshot.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
