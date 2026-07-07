import { NextResponse } from "next/server";
import { solveCamProblem } from "@/lib/cam-engine";
import type { ExtractedCamProblem } from "@/types/cam";

// Riceve un ExtractedCamProblem (dallo screenshot via AI, o incollato manualmente
// in modalità debug) e restituisce la CamSolution calcolata in modo deterministico
// da lib/cam-engine. Nessuna chiamata a modelli LLM avviene in questa route.
export async function POST(request: Request) {
  let body: ExtractedCamProblem;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo della richiesta non è un JSON valido." }, { status: 400 });
  }

  if (!body?.operationType) {
    return NextResponse.json({ error: "Campo 'operationType' mancante." }, { status: 400 });
  }

  try {
    const solution = solveCamProblem(body);
    return NextResponse.json(solution);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore durante il calcolo.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
