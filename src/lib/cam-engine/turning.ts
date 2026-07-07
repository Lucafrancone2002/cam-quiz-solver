import type { TurningParameters, CamSolution, CalculationStep, QuizAnswer } from "@/types/cam";
import { toQuizAnswer } from "./formatting";

// Conversione critica gradi -> radianti: Math.sin/cos in JS accettano solo radianti.
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function solveTurning(
  params: TurningParameters,
  variant: "op1" | "op2"
): CamSolution {
  const steps: CalculationStep[] = [];
  const quizAnswers: QuizAnswer[] = [];
  const warnings: string[] = [];

  let stepCount = 0;
  const addStep = (step: Omit<CalculationStep, "id">) => {
    stepCount += 1;
    steps.push({ id: `step-${stepCount}`, ...step });
  };

  const { material, tool, machine } = params;
  const vc = params.cuttingSpeed; // m/min
  const f = params.feedPerRev; // mm/giro

  // 1. Profondità di passata (ap)
  // OP1 (tornitura cilindrica esterna): ap = (D_init - D_final) / 2
  // OP2 (sfacciatura): ap = L_init - L_final
  let ap = params.depthOfCut;
  if (ap === undefined) {
    if (variant === "op1" && params.initialDiameter !== undefined && params.finalDiameter !== undefined) {
      ap = (params.initialDiameter - params.finalDiameter) / 2;
      addStep({
        label: "Profondità di passata (ap) - tornitura cilindrica",
        formula: "ap = (D_init - D_final) / 2",
        substitution: `ap = (${params.initialDiameter} - ${params.finalDiameter}) / 2`,
        result: ap,
        unit: "mm",
      });
    } else if (variant === "op2" && params.initialLength !== undefined && params.finalLength !== undefined) {
      ap = params.initialLength - params.finalLength;
      addStep({
        label: "Profondità di passata (ap) - sfacciatura",
        formula: "ap = L_init - L_final",
        substitution: `ap = ${params.initialLength} - ${params.finalLength}`,
        result: ap,
        unit: "mm",
      });
    }
  }
  if (ap !== undefined) {
    quizAnswers.push(toQuizAnswer("Profondità di passata (ap)", ap, "mm"));
  }

  // 2. Velocità di rotazione mandrino (n), dal diametro di riferimento (mm -> m tramite /1000 su vc)
  let spindleSpeed = params.spindleSpeed;
  const referenceDiameter = params.initialDiameter ?? params.tool?.diameter;
  if (spindleSpeed === undefined && vc !== undefined && referenceDiameter) {
    spindleSpeed = (1000 * vc) / (Math.PI * referenceDiameter);
    addStep({
      label: "Velocità di rotazione mandrino (n)",
      formula: "n = (1000 * vc) / (π * D)",
      substitution: `n = (1000 * ${vc}) / (π * ${referenceDiameter})`,
      result: spindleSpeed,
      unit: "giri/min",
    });
    quizAnswers.push(toQuizAnswer("Velocità di rotazione mandrino (n)", spindleSpeed, "giri/min"));
  }

  // 3. Spessore del truciolo (hD) = f * sin(kappa_r), kappa_r convertito da gradi a radianti
  let hD: number | undefined;
  const kappaR = tool?.approachAngle;
  if (f !== undefined && kappaR !== undefined) {
    const kappaRRad = degToRad(kappaR);
    hD = f * Math.sin(kappaRRad);
    addStep({
      label: "Spessore del truciolo (hD)",
      formula: "hD = f * sin(κr)  [κr convertito da gradi a radianti: κr_rad = κr° * π/180]",
      substitution: `hD = ${f} * sin(${kappaR}° = ${kappaRRad.toFixed(4)} rad)`,
      result: hD,
      unit: "mm",
    });
    quizAnswers.push(toQuizAnswer("Spessore del truciolo (hD)", hD, "mm", 4));
  }

  // 4. Pressione specifica di taglio (kc) = kcs / hD^x  (legge di Kienzle/Kronenberg)
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

  // 5. Sezione del truciolo (AD) e Forza di taglio (Fc = kc * AD)
  let Fc: number | undefined;
  if (kc !== undefined && f !== undefined && ap !== undefined) {
    const AD = f * ap;
    addStep({
      label: "Sezione del truciolo (AD)",
      formula: "AD = f * ap",
      substitution: `AD = ${f} * ${ap.toFixed(4)}`,
      result: AD,
      unit: "mm²",
    });
    Fc = kc * AD;
    addStep({
      label: "Forza di taglio (Fc)",
      formula: "Fc = kc * AD",
      substitution: `Fc = ${kc.toFixed(4)} * ${AD.toFixed(4)}`,
      result: Fc,
      unit: "N",
    });
    quizAnswers.push(toQuizAnswer("Forza di taglio (Fc)", Fc, "N"));
  }

  // 6. Potenza di taglio (Pc) e verifica di fattibilità sulla macchina
  let toolLifeMinutes: number | undefined;
  if (Fc !== undefined && vc !== undefined) {
    // vc [m/min] / 60 -> m/s; Pc[W] = Fc[N] * vc[m/s]; /1000 -> kW
    const pcKw = (Fc * vc) / 60000;
    addStep({
      label: "Potenza di taglio (Pc)",
      formula: "Pc = (Fc * vc) / 60 / 1000  [vc convertita da m/min a m/s dividendo per 60, poi W -> kW dividendo per 1000]",
      substitution: `Pc = (${Fc.toFixed(2)} * ${vc}) / 60000`,
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
        formula: "P_limite = η * P_nominale; fattibile se Pc ≤ P_limite",
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

  // 7. Parametri di Taylor: n = ln(vc1/vc2) / ln(T2/T1), C = vc * T^n, poi T alla vc corrente
  let taylorN: number | undefined = material?.taylorN;
  let taylorC: number | undefined = material?.taylorC;
  const refPoints = material?.taylorReferencePoints;
  if ((taylorN === undefined || taylorC === undefined) && refPoints) {
    const [p1, p2] = refPoints;
    taylorN = Math.log(p1.cuttingSpeed / p2.cuttingSpeed) / Math.log(p2.toolLife / p1.toolLife);
    addStep({
      label: "Esponente di Taylor (n)",
      formula: "n = ln(vc1/vc2) / ln(T2/T1)",
      substitution: `n = ln(${p1.cuttingSpeed}/${p2.cuttingSpeed}) / ln(${p2.toolLife}/${p1.toolLife})`,
      result: taylorN,
      unit: "-",
    });
    taylorC = p1.cuttingSpeed * Math.pow(p1.toolLife, taylorN);
    addStep({
      label: "Costante di Taylor (C)",
      formula: "C = vc * T^n",
      substitution: `C = ${p1.cuttingSpeed} * ${p1.toolLife}^${taylorN.toFixed(4)}`,
      result: taylorC,
      unit: "-",
    });
    quizAnswers.push(toQuizAnswer("Esponente di Taylor (n)", taylorN, "-", 4));
    quizAnswers.push(toQuizAnswer("Costante di Taylor (C)", taylorC, "-", 2));
  }
  if (taylorN !== undefined && taylorC !== undefined && vc !== undefined) {
    toolLifeMinutes = Math.pow(taylorC / vc, 1 / taylorN);
    addStep({
      label: "Durata utensile alla velocità di taglio corrente (T)",
      formula: "T = (C / vc) ^ (1/n)",
      substitution: `T = (${taylorC.toFixed(4)} / ${vc}) ^ (1/${taylorN.toFixed(4)})`,
      result: toolLifeMinutes,
      unit: "min",
    });
    quizAnswers.push(toQuizAnswer("Durata utensile (T)", toolLifeMinutes, "min"));
  }
  // Barenatura (boring): la durata utensile è spesso fornita direttamente, senza
  // passare dall'equazione di Taylor.
  toolLifeMinutes = toolLifeMinutes ?? tool?.toolLifeMinutes;

  // 8. Numero di pezzi lavorabili per utensile (np): tc = (lc / vf) * 60 [s], np = floor(T[s] / tc[s])
  const cuttingLength =
    params.cuttingLength ??
    (params.workpieceLength !== undefined ? params.workpieceLength + (params.overtravel ?? 0) : undefined);
  const feedRate = params.feedRate ?? (f !== undefined && spindleSpeed !== undefined ? f * spindleSpeed : undefined);
  if (params.feedRate === undefined && f !== undefined && spindleSpeed !== undefined && feedRate !== undefined) {
    addStep({
      label: "Velocità di avanzamento (vf)",
      formula: "vf = f · n",
      substitution: `vf = ${f} · ${spindleSpeed.toFixed(4)}`,
      result: feedRate,
      unit: "mm/min",
    });
    quizAnswers.push(toQuizAnswer("Velocità di avanzamento (vf)", feedRate, "mm/min"));
  }
  if (cuttingLength !== undefined && feedRate !== undefined && toolLifeMinutes !== undefined) {
    const tcSeconds = (cuttingLength / feedRate) * 60;
    addStep({
      label: "Tempo di taglio per pezzo (tc)",
      formula: "tc = (lc / vf) * 60",
      substitution: `tc = (${cuttingLength} / ${feedRate.toFixed(4)}) * 60`,
      result: tcSeconds,
      unit: "s",
    });
    const toolLifeSeconds = toolLifeMinutes * 60;
    const np = Math.floor(toolLifeSeconds / tcSeconds);
    addStep({
      label: "Numero di pezzi lavorabili per utensile (np)",
      formula: "np = ⌊T[s] / tc[s]⌋",
      substitution: `np = ⌊(${toolLifeMinutes.toFixed(4)} * 60) / ${tcSeconds.toFixed(4)}⌋`,
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

  // 9. Sfacciatura a velocità di taglio costante (OP2): n_av dal diametro medio
  if (variant === "op2" && vc !== undefined && params.externalDiameter !== undefined && params.internalDiameter !== undefined) {
    const dMedia = (params.externalDiameter + params.internalDiameter) / 2;
    addStep({
      label: "Diametro medio (D_media)",
      formula: "D_media = (D_ext + D_int) / 2",
      substitution: `D_media = (${params.externalDiameter} + ${params.internalDiameter}) / 2`,
      result: dMedia,
      unit: "mm",
    });
    const nAv = (1000 * vc) / (Math.PI * dMedia);
    addStep({
      label: "Velocità di rotazione media (n_av) a vc costante",
      formula: "n_av = (1000 * vc) / (π * D_media)",
      substitution: `n_av = (1000 * ${vc}) / (π * ${dMedia.toFixed(4)})`,
      result: nAv,
      unit: "giri/min",
    });
    quizAnswers.push(toQuizAnswer("Velocità di rotazione media (n_av)", nAv, "giri/min"));
  }

  if (steps.length === 0) {
    warnings.push("Dati insufficienti per eseguire alcun calcolo di tornitura con i parametri forniti.");
  }

  return {
    operationType: variant === "op1" ? "turning-op1" : "turning-op2",
    steps,
    quizAnswers,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}
