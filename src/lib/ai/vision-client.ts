import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ExtractedCamProblem } from "@/types/cam";
import { camExtractionResponseSchema } from "./vision-schema";
import { CAM_EXTRACTION_SYSTEM_PROMPT } from "./prompts";

export interface VisionExtractionInput {
  imageBase64: string; // solo il payload base64, senza prefisso "data:...;base64,"
  mimeType: string; // es. "image/png"
  extraText?: string; // testo aggiuntivo incollato dall'utente insieme allo screenshot
}

const DEFAULT_USER_INSTRUCTION =
  "Estrai in formato JSON tutti i parametri CAM presenti in questo screenshot di un problema/quiz d'esame.";

// Google Gemini (gemini-1.5-flash) è gratuito entro i limiti della free tier,
// quindi è l'unico provider usato dal Vision & AI Orchestrator Agent.
export async function extractCamProblemFromImage(input: VisionExtractionInput): Promise<ExtractedCamProblem> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Nessuna chiave API configurata. Imposta GEMINI_API_KEY nelle variabili d'ambiente.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: process.env.GEMINI_VISION_MODEL ?? "gemini-1.5-flash",
    systemInstruction: CAM_EXTRACTION_SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: camExtractionResponseSchema,
    },
  });

  const result = await model.generateContent([
    { inlineData: { mimeType: input.mimeType, data: input.imageBase64 } },
    input.extraText || DEFAULT_USER_INSTRUCTION,
  ]);

  const text = result.response.text();
  if (!text) {
    throw new Error("Il modello Gemini non ha restituito un'estrazione strutturata.");
  }
  return JSON.parse(text) as ExtractedCamProblem;
}
