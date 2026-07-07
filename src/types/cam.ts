// Convenzioni unità: lunghezze in mm, vc in m/min, n in giri/min (rpm),
// avanzamenti in mm/giro o mm/dente, tempi in minuti, angoli in gradi.

export type OperationType =
  | "turning-op1"
  | "turning-op2"
  | "milling-peripheral"
  | "milling-face"
  | "drilling"
  | "reaming"
  | "boring"
  | "unknown";

// Coppia (vc, T) nota dell'equazione di Taylor, usata per ricavare n e C
// quando il problema fornisce due punti sperimentali invece delle costanti dirette.
export interface TaylorDataPoint {
  cuttingSpeed: number; // vc, m/min
  toolLife: number; // T, min
}

export interface MaterialProperties {
  name?: string;
  kc11?: number; // kc1.1 (kcs): forza di taglio specifica a truciolo unitario (N/mm^2)
  kroneberg_mc?: number; // mc (x): esponente di Kronenberg (costante di materiale)
  taylorC?: number; // C: costante equazione di Taylor (vc * T^n = C), se già nota
  taylorN?: number; // n: esponente di Taylor, se già noto
  taylorReferencePoints?: [TaylorDataPoint, TaylorDataPoint]; // per ricavare n e C
}

export interface MachineProperties {
  nominalPower?: number; // kW
  efficiency?: number; // rendimento macchina, 0-1 (es. 0.8 = 80%)
}

export interface ToolProperties {
  diameter?: number; // mm, per fresa/punta/alesatore
  numberOfTeeth?: number; // z, numero di taglienti/denti
  cornerRadius?: number; // mm
  approachAngle?: number; // kappa, angolo di registrazione/attacco, gradi
  reliefAngle?: number; // gradi
  rakeAngle?: number; // gradi
  toolLifeMinutes?: number; // T, durata utensile assegnata
}

export interface TurningParameters {
  cuttingSpeed?: number; // vc, m/min
  spindleSpeed?: number; // n, giri/min
  feedPerRev?: number; // f, mm/giro
  depthOfCut?: number; // ap, mm (se già nota; altrimenti calcolata da diametri/lunghezze)
  initialDiameter?: number; // D0, mm (OP1: tornitura cilindrica)
  finalDiameter?: number; // Df, mm (OP1: tornitura cilindrica)
  initialLength?: number; // L_init, mm (OP2: sfacciatura)
  finalLength?: number; // L_final, mm (OP2: sfacciatura)
  externalDiameter?: number; // D_ext, mm (OP2: sfacciatura a vc costante)
  internalDiameter?: number; // D_int, mm (OP2: sfacciatura a vc costante)
  workpieceLength?: number; // L, mm
  overtravel?: number; // extra corsa entrata/uscita utensile, mm
  cuttingLength?: number; // lc, mm (default: workpieceLength + overtravel)
  feedRate?: number; // vf, mm/min (default: f * n)
  numberOfPasses?: number;
  material?: MaterialProperties;
  tool?: ToolProperties;
  machine?: MachineProperties;
}

// Tratto del profilo pezzo lungo il percorso utensile (fresatura periferica),
// usato per comporre la lunghezza di taglio complessiva (lc) passo per passo.
export type MillingProfileSegment =
  | { type: "linear"; length: number } // mm
  | { type: "arc"; radius: number; angleDeg: number }; // mm, gradi (es. 180 = semicerchio)

export interface MillingParameters {
  cuttingSpeed?: number; // vc, m/min
  spindleSpeed?: number; // n, giri/min
  feedPerTooth?: number; // fz, mm/dente
  feedPerRev?: number; // f = fz * z, mm/giro
  tableFeed?: number; // vf, mm/min
  numberOfTeeth?: number; // Z
  cutterDiameter?: number; // D, mm
  axialDepthOfCut?: number; // ap, mm
  radialDepthOfCut?: number; // ae, mm
  workpieceWidth?: number; // mm
  workpieceLength?: number; // mm
  approachAngle?: number; // angolo di ingaggio/entrata, gradi (fresatura frontale)
  cuttingLength?: number; // lc, mm (override diretto; default = approccio utensile + profileSegments)
  profileSegments?: MillingProfileSegment[]; // tratti del profilo pezzo, esclusa la corsa di approccio
  material?: MaterialProperties;
  tool?: ToolProperties;
  machine?: MachineProperties;
}

export interface DrillingParameters {
  cuttingSpeed?: number; // vc, m/min
  spindleSpeed?: number; // n, giri/min
  feedPerRev?: number; // f, mm/giro
  drillDiameter?: number; // D, mm
  holeDepth?: number; // mm
  pointAngle?: number; // ε, gradi (es. 118, 140)
  approachAllowance?: number; // extra corsa dovuta alla geometria della punta, mm
  cuttingLength?: number; // lc, mm (override diretto; default = holeDepth + approachAllowance)
  feedForce?: number; // Ff, N (forza di avanzamento, per la potenza di avanzamento Pf)
  material?: MaterialProperties;
  tool?: ToolProperties;
  machine?: MachineProperties;
}

export interface ReamingParameters extends DrillingParameters {
  preDrilledDiameter?: number; // diametro foro pre-esistente, mm
  allowance?: number; // sovrametallo di alesatura, mm
}

export interface BoringParameters extends TurningParameters {
  boreDepth?: number; // profondità alesatura, mm
}

// Struttura prodotta dal Vision & AI Orchestrator Agent a partire dallo screenshot.
export interface ExtractedCamProblem {
  operationType: OperationType;
  rawText?: string; // testo del problema come letto dallo screenshot
  turning?: TurningParameters;
  milling?: MillingParameters;
  drilling?: DrillingParameters;
  reaming?: ReamingParameters;
  boring?: BoringParameters;
  batchSize?: number; // numero di pezzi richiesti, per calcolo np
  shiftDurationMinutes?: number; // durata turno/tempo disponibile, per calcolo np
  questions?: string[]; // domande esplicite poste dal quiz
  notes?: string; // ambiguità o assunzioni segnalate dall'AI
}

// Un singolo passaggio nella risoluzione, mostrato nella scheda "Risoluzione Passo-Passo".
export interface CalculationStep {
  id: string;
  label: string; // es. "Velocità di rotazione mandrino (n)"
  formula: string; // es. "n = (vc * 1000) / (π * D)"
  substitution: string; // es. "n = (120 * 1000) / (π * 50)"
  result: number;
  unit: string; // es. "giri/min"
  note?: string; // assunzioni worst-case, arrotondamenti, ecc.
}

// Una risposta pronta per essere inserita nel box del quiz d'esame.
export interface QuizAnswer {
  label: string; // nome del parametro come richiesto dal quiz
  value: number;
  unit?: string;
  formattedValue: string; // formattato con virgola decimale, es. "14,94"
}

export interface CamSolution {
  operationType: OperationType;
  steps: CalculationStep[];
  quizAnswers: QuizAnswer[];
  warnings?: string[];
}
