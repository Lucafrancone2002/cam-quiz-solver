// Schema strutturato usato per vincolare l'output del Vision & AI Orchestrator
// Agent (Google Gemini) al tipo ExtractedCamProblem definito in
// src/types/cam.ts. Passato come `generationConfig.responseSchema` — Gemini
// usa un sottoinsieme dello schema OpenAPI 3.0 (non JSON Schema puro): i tipi
// sono singoli (niente union `[T,"null"]`), gli enum di stringa richiedono
// `format:"enum"`, e i campi assenti da `required` possono semplicemente
// essere omessi dal modello (comportamento equivalente ai nostri campi TS
// opzionali).

import { SchemaType, type Schema } from "@google/generative-ai";

const numberProp: Schema = { type: SchemaType.NUMBER };
const stringProp: Schema = { type: SchemaType.STRING };

function objectProp(properties: Record<string, Schema>, required?: string[]): Schema {
  return {
    type: SchemaType.OBJECT,
    properties,
    ...(required && required.length > 0 ? { required } : {}),
  };
}

const materialPropertiesSchema = objectProp({
  name: stringProp,
  kc11: numberProp,
  kroneberg_mc: numberProp,
  taylorC: numberProp,
  taylorN: numberProp,
  taylorReferencePoints: {
    type: SchemaType.ARRAY,
    minItems: 2,
    maxItems: 2,
    items: objectProp(
      { cuttingSpeed: numberProp, toolLife: numberProp },
      ["cuttingSpeed", "toolLife"]
    ),
  },
});

const toolPropertiesSchema = objectProp({
  diameter: numberProp,
  numberOfTeeth: numberProp,
  cornerRadius: numberProp,
  approachAngle: numberProp,
  reliefAngle: numberProp,
  rakeAngle: numberProp,
  toolLifeMinutes: numberProp,
});

const machinePropertiesSchema = objectProp({
  nominalPower: numberProp,
  efficiency: numberProp,
});

const millingProfileSegmentSchema: Schema = objectProp(
  {
    type: {
      type: SchemaType.STRING,
      format: "enum",
      enum: ["linear", "arc"],
      description: "Se 'linear' usa 'length'; se 'arc' usa 'radius' e 'angleDeg' (es. 180 per un semicerchio).",
    },
    length: numberProp,
    radius: numberProp,
    angleDeg: numberProp,
  },
  ["type"]
);

const turningPropertiesShape: Record<string, Schema> = {
  cuttingSpeed: numberProp,
  spindleSpeed: numberProp,
  feedPerRev: numberProp,
  depthOfCut: numberProp,
  initialDiameter: numberProp,
  finalDiameter: numberProp,
  initialLength: numberProp,
  finalLength: numberProp,
  externalDiameter: numberProp,
  internalDiameter: numberProp,
  workpieceLength: numberProp,
  overtravel: numberProp,
  cuttingLength: numberProp,
  feedRate: numberProp,
  numberOfPasses: numberProp,
  material: materialPropertiesSchema,
  tool: toolPropertiesSchema,
  machine: machinePropertiesSchema,
};

const turningParametersSchema = objectProp(turningPropertiesShape);

// BoringParameters estende TurningParameters con boreDepth.
const boringParametersSchema = objectProp({
  ...turningPropertiesShape,
  boreDepth: numberProp,
});

const millingParametersSchema = objectProp({
  cuttingSpeed: numberProp,
  spindleSpeed: numberProp,
  feedPerTooth: numberProp,
  feedPerRev: numberProp,
  tableFeed: numberProp,
  numberOfTeeth: numberProp,
  cutterDiameter: numberProp,
  axialDepthOfCut: numberProp,
  radialDepthOfCut: numberProp,
  workpieceWidth: numberProp,
  workpieceLength: numberProp,
  approachAngle: numberProp,
  cuttingLength: numberProp,
  profileSegments: { type: SchemaType.ARRAY, items: millingProfileSegmentSchema },
  material: materialPropertiesSchema,
  tool: toolPropertiesSchema,
  machine: machinePropertiesSchema,
});

const drillingPropertiesShape: Record<string, Schema> = {
  cuttingSpeed: numberProp,
  spindleSpeed: numberProp,
  feedPerRev: numberProp,
  drillDiameter: numberProp,
  holeDepth: numberProp,
  pointAngle: numberProp,
  approachAllowance: numberProp,
  cuttingLength: numberProp,
  feedForce: numberProp,
  material: materialPropertiesSchema,
  tool: toolPropertiesSchema,
  machine: machinePropertiesSchema,
};

const drillingParametersSchema = objectProp(drillingPropertiesShape);

// ReamingParameters estende DrillingParameters con preDrilledDiameter e allowance.
const reamingParametersSchema = objectProp({
  ...drillingPropertiesShape,
  preDrilledDiameter: numberProp,
  allowance: numberProp,
});

export const camExtractionResponseSchema: Schema = objectProp(
  {
    operationType: {
      type: SchemaType.STRING,
      format: "enum",
      description: "Tipo di operazione CAM riconosciuta nel problema. Usa 'unknown' se non identificabile.",
      enum: [
        "turning-op1",
        "turning-op2",
        "milling-peripheral",
        "milling-face",
        "drilling",
        "reaming",
        "boring",
        "unknown",
      ],
    },
    rawText: stringProp,
    turning: turningParametersSchema,
    milling: millingParametersSchema,
    drilling: drillingParametersSchema,
    reaming: reamingParametersSchema,
    boring: boringParametersSchema,
    batchSize: numberProp,
    shiftDurationMinutes: numberProp,
    questions: { type: SchemaType.ARRAY, items: stringProp },
    notes: stringProp,
  },
  ["operationType"]
);
