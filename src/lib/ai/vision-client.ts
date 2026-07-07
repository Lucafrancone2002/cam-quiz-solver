import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { ExtractedCamProblem } from "@/types/cam";
import { camExtractionJsonSchema } from "./vision-schema";
import { CAM_EXTRACTION_SYSTEM_PROMPT } from "./prompts";

export interface VisionExtractionInput {
  imageBase64: string; // solo il payload base64, senza prefisso "data:...;base64,"
  mimeType: string; // es. "image/png"
  extraText?: string; // testo aggiuntivo incollato dall'utente insieme allo screenshot
}

const DEFAULT_USER_INSTRUCTION =
  "Estrai in formato JSON tutti i parametri CAM presenti in questo screenshot di un problema/quiz d'esame.";

async function extractWithAnthropic(input: VisionExtractionInput): Promise<ExtractedCamProblem> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_VISION_MODEL ?? "claude-3-5-sonnet-20241022";

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: CAM_EXTRACTION_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: input.mimeType as "image/png", data: input.imageBase64 },
          },
          { type: "text", text: input.extraText || DEFAULT_USER_INSTRUCTION },
        ],
      },
    ],
    tools: [
      {
        name: "extract_cam_problem",
        description: "Registra i parametri CAM estratti dallo screenshot, seguendo esattamente lo schema fornito.",
        input_schema: camExtractionJsonSchema.schema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "extract_cam_problem" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Il modello Anthropic non ha restituito un'estrazione strutturata.");
  }
  return toolUse.input as ExtractedCamProblem;
}

async function extractWithOpenAI(input: VisionExtractionInput): Promise<ExtractedCamProblem> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_VISION_MODEL ?? "gpt-4o";

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: CAM_EXTRACTION_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          { type: "text", text: input.extraText || DEFAULT_USER_INSTRUCTION },
          { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: camExtractionJsonSchema.name,
        schema: camExtractionJsonSchema.schema,
        strict: true,
      },
    },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Il modello OpenAI non ha restituito un'estrazione strutturata.");
  }
  return JSON.parse(content) as ExtractedCamProblem;
}

// Sceglie automaticamente il provider in base alla chiave API configurata
// nell'ambiente (Anthropic ha priorità se entrambe sono presenti).
export async function extractCamProblemFromImage(input: VisionExtractionInput): Promise<ExtractedCamProblem> {
  if (process.env.ANTHROPIC_API_KEY) {
    return extractWithAnthropic(input);
  }
  if (process.env.OPENAI_API_KEY) {
    return extractWithOpenAI(input);
  }
  throw new Error(
    "Nessuna chiave API configurata. Imposta ANTHROPIC_API_KEY o OPENAI_API_KEY nelle variabili d'ambiente."
  );
}
