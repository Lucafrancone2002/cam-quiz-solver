import type { DrillingParameters, ReamingParameters, CamSolution, CalculationStep, QuizAnswer } from "@/types/cam";
import { toQuizAnswer } from "./formatting";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function solveDrilling(params: DrillingParameters): CamSolution {
  const steps: CalculationStep[] = [];
  const quizAnswers: QuizAnswer[] = [];
  const warnings: string[] = [];

  let stepCount = 0;
  const addStep = (step: Omit<CalculationStep, "id">) => {
    stepCount += 1;
    steps.push({ id: `step-${stepCount}`, ...step });
  };

  const { material, tool, machine } = params;
  const D = params.drillDiameter;
  const f = params.feedPerRev;
  const vc = params.cuttingSpeed;
  const epsilon = params.pointAngle;

  // 1. Velocità di rotazione mandrino (n), se non fornita direttamente
  let spindleSpeed = params.spindleSpeed;
  if (spindleSpeed === undefined && vc !== undefined && D !== undefined) {
    spindleSpeed = (1000 * vc) / (Math.PI * D);
    addStep({
      label: "Velocità di rotazione mandrino (n)",
      formula: "n = (1000 * vc) / (π * D)",
      substitution: `n = (1000 * ${vc}) / (π * ${D})`,
      result: spindleSpeed,
      unit: "giri/min",
    });
    quizAnswers.push(toQuizAnswer("Velocità di rotazione mandrino (n)", spindleSpeed, "giri/min"));
  }

  // 2. Spessore del truciolo (hD) = (f/2) · sin(ε/2)
  let hD: number | undefined;
  if (f !== undefined && epsilon !== undefined) {
    const halfEpsilonRad = degToRad(epsilon / 2);
    hD = (f / 2) * Math.sin(halfEpsilonRad);
    addStep({
      label: "Spessore del truciolo (hD)",
      formula: "hD = (f/2) · sin(ε/2)  [ε convertito da gradi a radianti]",
      substitution: `hD = (${f}/2) · sin(${epsilon}°/2 = ${halfEpsilonRad.toFixed(4)} rad)`,
      result: hD,
      unit: "mm",
    });
    quizAnswers.push(toQuizAnswer("Spessore del truciolo (hD)", hD, "mm", 4));
  }

  // 3. Pressione specifica di taglio (kc) = kcs / hD^x
  let kc: number | undefined;
  const kcs = material?.kc11;
  const x = material?.kroneberg_mc;
  if (hD !== undefined && kcs !== undefined && x !== undefined) {
    kc = kcs / Math.pow(hD, x);
    addStep({
      label: "Pressione specifica di taglio (kc)",
      formula: "kc = kcs / (hD ^ x)",
      substitution: `kc = ${kcs} / (${hD.toFixed(4)} ^ ${x})`,
      result: kc,
      unit: "N/mm²",
    });
    quizAnswers.push(toQuizAnswer("Pressione di taglio (kc)", kc, "N/mm²", 2));
  }

  // 4. Area del truciolo (AD) = f · D / 4
  let AD: number | undefined;
  if (f !== undefined && D !== undefined) {
    AD = (f * D) / 4;
    addStep({
      label: "Area del truciolo (AD)",
      formula: "AD = f · D / 4",
      substitution: `AD = ${f} · ${D} / 4`,
      result: AD,
      unit: "mm²",
    });
  }

  // 5. Forza di taglio (Fc) = kc · AD
  let Fc: number | undefined;
  if (kc !== undefined && AD !== undefined) {
    Fc = kc * AD;
    addStep({
      label: "Forza di taglio (Fc)",
      formula: "Fc = kc · AD",
      substitution: `Fc = ${kc.toFixed(4)} · ${AD.toFixed(4)}`,
      result: Fc,
      unit: "N",
    });
    quizAnswers.push(toQuizAnswer("Forza di taglio (Fc)", Fc, "N"));
  }

  // 6. Coppia di taglio (Tc) = Fc · D/2 / 1000
  let Tc: number | undefined;
  if (Fc !== undefined && D !== undefined) {
    Tc = (Fc * (D / 2)) / 1000;
    addStep({
      label: "Coppia di taglio (Tc)",
      formula: "Tc = Fc · D/2 / 1000",
      substitution: `Tc = ${Fc.toFixed(2)} · ${D}/2 / 1000`,
      result: Tc,
      unit: "Nm",
    });
    quizAnswers.push(toQuizAnswer("Coppia di taglio (Tc)", Tc, "Nm"));
  }

  // 7. Potenza di taglio (Pc) = Tc · ω, ω = 2π·n/60, e verifica di fattibilità
  if (Tc !== undefined && spindleSpeed !== undefined) {
    const omega = (2 * Math.PI * spindleSpeed) / 60;
    addStep({
      label: "Velocità angolare mandrino (ω)",
      formula: "ω = 2π · n / 60",
      substitution: `ω = 2π · ${spindleSpeed.toFixed(4)} / 60`,
      result: omega,
      unit: "rad/s",
    });
    const pcKw = (Tc * omega) / 1000;
    addStep({
      label: "Potenza di taglio (Pc)",
      formula: "Pc = Tc · ω  [Nm·rad/s = W, /1000 per i kW]",
      substitution: `Pc = ${Tc.toFixed(4)} · ${omega.toFixed(4)} / 1000`,
      result: pcKw,
      unit: "kW",
    });
    quizAnswers.push(toQuizAnswer("Potenza di taglio (Pc)", pcKw, "kW", 3));

    const nominalPower = machine?.nominalPower;
    const efficiency = machine?.efficiency;
    if (nominalPower !== undefined && efficiency !== undefined) {
      const pLimit = efficiency * nominalPower;
      const feasible = pcKw <= pLimit;
      addStep({
        label: "Verifica di fattibilità",
        formula: "P_limite = η · P_nominale; fattibile se Pc ≤ P_limite",
        substitution: `P_limite = ${efficiency} * ${nominalPower} = ${pLimit.toFixed(3)} kW  (Pc = ${pcKw.toFixed(3)} kW)`,
        result: pLimit,
        unit: "kW",
        note: feasible
          ? "Lavorazione fattibile: Pc ≤ P_limite."
          : "Lavorazione NON fattibile: Pc supera la potenza limite della macchina.",
      });
      quizAnswers.push({
        label: "Fattibilità (Pc ≤ P_limite)",
        value: feasible ? 1 : 0,
        formattedValue: feasible ? "SI" : "NO",
      });
      if (!feasible) {
        warnings.push("La potenza di taglio richiesta (Pc) supera la potenza limite disponibile sulla macchina.");
      }
    }
  }

  // 8. Potenza di avanzamento (Pf) = Ff · vf / (60 · 1000)
  const feedForce = params.feedForce;
  let feedRate: number | undefined;
  if (f !== undefined && spindleSpeed !== undefined) {
    feedRate = f * spindleSpeed;
    addStep({
      label: "Velocità di avanzamento (vf)",
      formula: "vf = f · n",
      substitution: `vf = ${f} · ${spindleSpeed.toFixed(4)}`,
      result: feedRate,
      unit: "mm/min",
    });
  }
  if (feedForce !== undefined && feedRate !== undefined) {
    // Ff [N] * vf [mm/min] / (60 * 1000) = W (mm/min -> m/s tramite /1000 e /60 combinati)
    const pfW = (feedForce * feedRate) / (60 * 1000);
    addStep({
      label: "Potenza di avanzamento (Pf)",
      formula: "Pf = Ff · vf / (60 · 1000)",
      substitution: `Pf = ${feedForce} · ${feedRate.toFixed(4)} / (60 · 1000)`,
      result: pfW,
      unit: "W",
    });
    quizAnswers.push(toQuizAnswer("Potenza di avanzamento (Pf)", pfW, "W", 1));
  }

  // 9. Tempo di taglio (tc) e numero di pezzi lavorabili (np)
  const cuttingLength =
    params.cuttingLength ??
    (params.holeDepth !== undefined ? params.holeDepth + (params.approachAllowance ?? 0) : undefined);
  const toolLifeMinutes = tool?.toolLifeMinutes;
  if (cuttingLength !== undefined && feedRate !== undefined) {
    const tcSeconds = (cuttingLength / feedRate) * 60;
    addStep({
      label: "Tempo di taglio (tc)",
      formula: "tc = (lc / vf) * 60",
      substitution: `tc = (${cuttingLength} / ${feedRate.toFixed(4)}) * 60`,
      result: tcSeconds,
      unit: "s",
    });
    quizAnswers.push(toQuizAnswer("Tempo di taglio (tc)", tcSeconds, "s"));

    if (toolLifeMinutes !== undefined) {
      const toolLifeSeconds = toolLifeMinutes * 60;
      const np = Math.floor(toolLifeSeconds / tcSeconds);
      addStep({
        label: "Numero di pezzi lavorabili per utensile (np)",
        formula: "np = ⌊T[s] / tc[s]⌋",
        substitution: `np = ⌊(${toolLifeMinutes} * 60) / ${tcSeconds.toFixed(4)}⌋`,
        result: np,
        unit: "pezzi",
        note: "Troncamento all'intero inferiore (Math.floor): non si può lavorare una frazione di pezzo.",
      });
      quizAnswers.push({
        label: "Numero di pezzi lavorabili (np)",
        value: np,
        formattedValue: np.toString(),
      });
    }
  }

  if (steps.length === 0) {
    warnings.push("Dati insufficienti per eseguire alcun calcolo di foratura con i parametri forniti.");
  }

  return {
    operationType: "drilling",
    steps,
    quizAnswers,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// Barenatura/Alesatura: la velocità di taglio è già impostata da vc/n; qui si calcola
// solo il tempo di taglio e il numero di pezzi lavorabili per utensile.
export function solveReaming(params: ReamingParameters): CamSolution {
  const steps: CalculationStep[] = [];
  const quizAnswers: QuizAnswer[] = [];
  const warnings: string[] = [];

  let stepCount = 0;
  const addStep = (step: Omit<CalculationStep, "id">) => {
    stepCount += 1;
    steps.push({ id: `step-${stepCount}`, ...step });
  };

  const { tool } = params;
  const f = params.feedPerRev;
  const D = params.drillDiameter;
  const vc = params.cuttingSpeed;

  let spindleSpeed = params.spindleSpeed;
  if (spindleSpeed === undefined && vc !== undefined && D !== undefined) {
    spindleSpeed = (1000 * vc) / (Math.PI * D);
    addStep({
      label: "Velocità di rotazione mandrino (n)",
      formula: "n = (1000 * vc) / (π * D)",
      substitution: `n = (1000 * ${vc}) / (π * ${D})`,
      result: spindleSpeed,
      unit: "giri/min",
    });
    quizAnswers.push(toQuizAnswer("Velocità di rotazione mandrino (n)", spindleSpeed, "giri/min"));
  }

  // Velocità di avanzamento (vf) = f · n
  let feedRate: number | undefined;
  if (f !== undefined && spindleSpeed !== undefined) {
    feedRate = f * spindleSpeed;
    addStep({
      label: "Velocità di avanzamento (vf)",
      formula: "vf = f · n",
      substitution: `vf = ${f} · ${spindleSpeed.toFixed(4)}`,
      result: feedRate,
      unit: "mm/min",
    });
    quizAnswers.push(toQuizAnswer("Velocità di avanzamento (vf)", feedRate, "mm/min"));
  }

  // Tempo di taglio (tc) = (lc / vf) * 60
  const cuttingLength =
    params.cuttingLength ??
    (params.holeDepth !== undefined ? params.holeDepth + (params.approachAllowance ?? 0) : undefined);
  const toolLifeMinutes = tool?.toolLifeMinutes;
  if (cuttingLength !== undefined && feedRate !== undefined) {
    const tcSeconds = (cuttingLength / feedRate) * 60;
    addStep({
      label: "Tempo di taglio (tc)",
      formula: "tc = (lc / vf) * 60",
      substitution: `tc = (${cuttingLength} / ${feedRate.toFixed(4)}) * 60`,
      result: tcSeconds,
      unit: "s",
    });
    quizAnswers.push(toQuizAnswer("Tempo di taglio (tc)", tcSeconds, "s"));

    // Numero di pezzi (np) = floor(T / tc), T e tc uniformati in secondi
    if (toolLifeMinutes !== undefined) {
      const toolLifeSeconds = toolLifeMinutes * 60;
      const np = Math.floor(toolLifeSeconds / tcSeconds);
      addStep({
        label: "Numero di pezzi lavorabili per utensile (np)",
        formula: "np = ⌊T[s] / tc[s]⌋",
        substitution: `np = ⌊(${toolLifeMinutes} * 60) / ${tcSeconds.toFixed(4)}⌋`,
        result: np,
        unit: "pezzi",
        note: "Troncamento all'intero inferiore (Math.floor): non si può lavorare una frazione di pezzo.",
      });
      quizAnswers.push({
        label: "Numero di pezzi lavorabili (np)",
        value: np,
        formattedValue: np.toString(),
      });
    }
  }

  if (steps.length === 0) {
    warnings.push("Dati insufficienti per eseguire alcun calcolo di alesatura/barenatura con i parametri forniti.");
  }

  return {
    operationType: "reaming",
    steps,
    quizAnswers,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
