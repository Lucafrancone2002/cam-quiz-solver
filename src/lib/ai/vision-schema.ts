// Schema JSON stringente usato per vincolare l'output del modello di visione
// (Vision & AI Orchestrator Agent) al tipo ExtractedCamProblem definito in
// src/types/cam.ts. Usato sia come tool input_schema (Anthropic) sia come
// response_format json_schema in modalità strict (OpenAI).
//
// Convenzione "strict-mode" (richiesta da OpenAI, innocua per Anthropic): ogni
// proprietà di ogni oggetto è elencata in "required", ma i campi non sempre
// presenti nel problema accettano `null` tramite `type: [T, "null"]`. Il
// modello deve quindi scrivere esplicitamente `null` per un dato assente,
// invece di ometterlo — più robusto per l'estrazione.

type JsonSchema = Record<string, unknown>;

const nullableNumber: JsonSchema = { type: ["number", "null"] };
const nullableString: JsonSchema = { type: ["string", "null"] };

function nullableObject(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: ["object", "null"],
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

const materialPropertiesSchema = nullableObject({
  name: nullableString,
  kc11: nullableNumber,
  kroneberg_mc: nullableNumber,
  taylorC: nullableNumber,
  taylorN: nullableNumber,
  taylorReferencePoints: {
    type: ["array", "null"],
    minItems: 2,
    maxItems: 2,
    items: {
      type: "object",
      properties: {
        cuttingSpeed: { type: "number" },
        toolLife: { type: "number" },
      },
      required: ["cuttingSpeed", "toolLife"],
      additionalProperties: false,
    },
  },
});

const toolPropertiesSchema = nullableObject({
  diameter: nullableNumber,
  numberOfTeeth: nullableNumber,
  cornerRadius: nullableNumber,
  approachAngle: nullableNumber,
  reliefAngle: nullableNumber,
  rakeAngle: nullableNumber,
  toolLifeMinutes: nullableNumber,
});

const machinePropertiesSchema = nullableObject({
  nominalPower: nullableNumber,
  efficiency: nullableNumber,
});

const millingProfileSegmentSchema: JsonSchema = {
  type: "object",
  description:
    "Tratto del profilo pezzo. Se type=linear usa 'length'; se type=arc usa 'radius' e 'angleDeg' (es. 180 per un semicerchio); lascia null i campi non pertinenti.",
  properties: {
    type: { type: "string", enum: ["linear", "arc"] },
    length: nullableNumber,
    radius: nullableNumber,
    angleDeg: nullableNumber,
  },
  required: ["type", "length", "radius", "angleDeg"],
  additionalProperties: false,
};

const turningPropertiesShape = {
  cuttingSpeed: nullableNumber,
  spindleSpeed: nullableNumber,
  feedPerRev: nullableNumber,
  depthOfCut: nullableNumber,
  initialDiameter: nullableNumber,
  finalDiameter: nullableNumber,
  initialLength: nullableNumber,
  finalLength: nullableNumber,
  externalDiameter: nullableNumber,
  internalDiameter: nullableNumber,
  workpieceLength: nullableNumber,
  overtravel: nullableNumber,
  cuttingLength: nullableNumber,
  feedRate: nullableNumber,
  numberOfPasses: nullableNumber,
  material: materialPropertiesSchema,
  tool: toolPropertiesSchema,
  machine: machinePropertiesSchema,
};

const turningParametersSchema = nullableObject(turningPropertiesShape);

// BoringParameters estende TurningParameters con boreDepth.
const boringParametersSchema = nullableObject({
  ...turningPropertiesShape,
  boreDepth: nullableNumber,
});

const millingParametersSchema = nullableObject({
  cuttingSpeed: nullableNumber,
  spindleSpeed: nullableNumber,
  feedPerTooth: nullableNumber,
  feedPerRev: nullableNumber,
  tableFeed: nullableNumber,
  numberOfTeeth: nullableNumber,
  cutterDiameter: nullableNumber,
  axialDepthOfCut: nullableNumber,
  radialDepthOfCut: nullableNumber,
  workpieceWidth: nullableNumber,
  workpieceLength: nullableNumber,
  approachAngle: nullableNumber,
  cuttingLength: nullableNumber,
  profileSegments: { type: ["array", "null"], items: millingProfileSegmentSchema },
  material: materialPropertiesSchema,
  tool: toolPropertiesSchema,
  machine: machinePropertiesSchema,
});

const drillingPropertiesShape = {
  cuttingSpeed: nullableNumber,
  spindleSpeed: nullableNumber,
  feedPerRev: nullableNumber,
  drillDiameter: nullableNumber,
  holeDepth: nullableNumber,
  pointAngle: nullableNumber,
  approachAllowance: nullableNumber,
  cuttingLength: nullableNumber,
  feedForce: nullableNumber,
  material: materialPropertiesSchema,
  tool: toolPropertiesSchema,
  machine: machinePropertiesSchema,
};

const drillingParametersSchema = nullableObject(drillingPropertiesShape);

// ReamingParameters estende DrillingParameters con preDrilledDiameter e allowance.
const reamingParametersSchema = nullableObject({
  ...drillingPropertiesShape,
  preDrilledDiameter: nullableNumber,
  allowance: nullableNumber,
});

export const camExtractionJsonSchema = {
  name: "extracted_cam_problem",
  schema: {
    type: "object",
    properties: {
      operationType: {
        type: "string",
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
      rawText: nullableString,
      turning: turningParametersSchema,
      milling: millingParametersSchema,
      drilling: drillingParametersSchema,
      reaming: reamingParametersSchema,
      boring: boringParametersSchema,
      batchSize: nullableNumber,
      shiftDurationMinutes: nullableNumber,
      questions: { type: ["array", "null"], items: { type: "string" } },
      notes: nullableString,
    },
    required: [
      "operationType",
      "rawText",
      "turning",
      "milling",
      "drilling",
      "reaming",
      "boring",
      "batchSize",
      "shiftDurationMinutes",
      "questions",
      "notes",
    ],
    additionalProperties: false,
  } as JsonSchema,
};
