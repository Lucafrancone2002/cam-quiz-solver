import type { ExtractedCamProblem } from "@/types/cam";

// Esempio di ExtractedCamProblem per la tornitura OP1 (tornitura cilindrica esterna),
// usato per popolare il pannello di debug senza dover invocare l'AI di visione.
// Valori scelti in modo da essere internamente coerenti (ap, hD, kc, Fc, Pc, np
// derivano tutti dagli stessi dati di partenza).
export const sampleTurningOp1: ExtractedCamProblem = {
  operationType: "turning-op1",
  rawText:
    "Tornitura cilindrica esterna: D0=50mm, Df=45mm, vc=180 m/min, f=0.2 mm/giro, kappa_r=75°.",
  turning: {
    cuttingSpeed: 180,
    feedPerRev: 0.2,
    initialDiameter: 50,
    finalDiameter: 45,
    workpieceLength: 120,
    overtravel: 5,
    material: {
      name: "C45",
      kc11: 1600,
      kroneberg_mc: 0.25,
      taylorReferencePoints: [
        { cuttingSpeed: 150, toolLife: 30 },
        { cuttingSpeed: 200, toolLife: 10 },
      ],
    },
    tool: {
      approachAngle: 75,
    },
    machine: {
      nominalPower: 10,
      efficiency: 0.8,
    },
  },
};

export const sampleTurningOp2: ExtractedCamProblem = {
  operationType: "turning-op2",
  rawText: "Sfacciatura a velocità di taglio costante: D_ext=80mm, D_int=20mm, vc=160 m/min.",
  turning: {
    cuttingSpeed: 160,
    feedPerRev: 0.15,
    initialLength: 60,
    finalLength: 58,
    externalDiameter: 80,
    internalDiameter: 20,
    material: {
      name: "Al 7075",
      kc11: 900,
      kroneberg_mc: 0.3,
    },
    tool: {
      approachAngle: 90,
    },
  },
};

// Esame 22/06/2026, Problem 2 — componente in Ti-6Al-4V, lavorato in tre fasi
// (fresatura periferica di uno scalino, foratura, barenatura). Valori presi
// dal testo ufficiale, usati per verificare il motore al centesimo rispetto
// alla soluzione ufficiale (Tc=8,19Nm / Pc=2,6kW / np=52 per la fresatura;
// Pc=2,6kW / Pf=6,7W per la foratura; np=50 per la barenatura).
export const sampleMillingTiAlloy: ExtractedCamProblem = {
  operationType: "milling-peripheral",
  rawText:
    "Fresatura periferica di uno scalino su componente Ti-6Al-4V: D=12.7mm, Z=5, vf=785mm/min, f=0.26mm/giro, ap=20mm, ae=5mm.",
  milling: {
    cutterDiameter: 12.7,
    numberOfTeeth: 5,
    tableFeed: 785,
    feedPerRev: 0.26,
    axialDepthOfCut: 20,
    radialDepthOfCut: 5,
    // Profilo pezzo (esclusa la corsa di approccio D/2·sin(φ), calcolata automaticamente):
    // 80mm lineare + semicerchio di raggio (20 + D/2) + 75mm lineare + 2 tratti D/2 + 40mm lineare.
    profileSegments: [
      { type: "linear", length: 80 },
      { type: "arc", radius: 20 + 12.7 / 2, angleDeg: 180 },
      { type: "linear", length: 75 },
      { type: "linear", length: 12.7 / 2 },
      { type: "linear", length: 12.7 / 2 },
      { type: "linear", length: 40 },
    ],
    material: {
      name: "Ti-6Al-4V",
      kc11: 390,
      kroneberg_mc: 0.33,
    },
    tool: {
      toolLifeMinutes: 20,
    },
    machine: {
      nominalPower: 15,
      efficiency: 0.9,
    },
  },
};

export const sampleDrillingTiAlloy: ExtractedCamProblem = {
  operationType: "drilling",
  rawText: "Foratura su componente Ti-6Al-4V: D=19mm, ε=140°, f=0.2mm/giro, vc=60 m/min, Ff=1990N.",
  drilling: {
    drillDiameter: 19,
    feedPerRev: 0.2,
    cuttingSpeed: 60,
    pointAngle: 140,
    feedForce: 1990,
    material: {
      name: "Ti-6Al-4V",
      kc11: 1250,
      kroneberg_mc: 0.33,
    },
    tool: {
      numberOfTeeth: 2,
    },
  },
};

export const sampleBoringTiAlloy: ExtractedCamProblem = {
  operationType: "boring",
  rawText: "Barenatura del foro su componente Ti-6Al-4V: f=0.105mm/giro, n=958 giri/min, lc=30mm, T=15min.",
  boring: {
    feedPerRev: 0.105,
    spindleSpeed: 958,
    cuttingLength: 30,
    tool: {
      toolLifeMinutes: 15,
    },
  },
};
