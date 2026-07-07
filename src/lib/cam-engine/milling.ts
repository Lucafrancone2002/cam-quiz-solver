import type { MillingParameters, CamSolution, CalculationStep, QuizAnswer } from "@/types/cam";
import { toQuizAnswer } from "./formatting";

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function solveMillingPeripheral(params: MillingParameters): CamSolution {
  const steps: CalculationStep[] = [];
  const quizAnswers: QuizAnswer[] = [];
  const warnings: string[] = [];

  let stepCount = 0;
  const addStep = (step: Omit<CalculationStep, "id">) => {
    stepCount += 1;
    steps.push({ id: `step-${stepCount}`, ...step });
  };

  const { material, tool, machine } = params;
  const D = params.cutterDiameter;
  const ae = params.radialDepthOfCut;
  const ap = params.axialDepthOfCut;
  const Z = params.numberOfTeeth;
  const vc = params.cuttingSpeed;

  // 1. Angolo di impegno (φ) = arccos(1 - 2·ae/D)
  let phi: number | undefined;
  if (D !== undefined && ae !== undefined) {
    phi = Math.acos(1 - (2 * ae) / D);
    addStep({
      label: "Angolo di impegno (φ)",
      formula: "φ = arccos(1 - 2·ae / D)",
      substitution: `φ = arccos(1 - 2·${ae} / ${D})`,
      result: phi,
      unit: "rad",
      note: `Equivalente a ${((phi * 180) / Math.PI).toFixed(2)}°.`,
    });
    quizAnswers.push(toQuizAnswer("Angolo di impegno (φ)", phi, "rad", 4));
  }

  // 2. Passo angolare dei denti (φ0) = 2π / Z
  let phi0: number | undefined;
  if (Z !== undefined) {
    phi0 = (2 * Math.PI) / Z;
    addStep({
      label: "Passo angolare dei denti (φ0)",
      formula: "φ0 = 2π / Z",
      substitution: `φ0 = 2π / ${Z}`,
      result: phi0,
      unit: "rad",
    });
  }

  // 3. Numero di denti contemporaneamente in presa (z) = φ / φ0
  let engagedTeeth: number | undefined;
  if (phi !== undefined && phi0 !== undefined) {
    engagedTeeth = phi / phi0;
    const isInteger = Number.isInteger(Number(engagedTeeth.toFixed(6)));
    addStep({
      label: "Numero di denti contemporaneamente in presa (z)",
      formula: "z = φ / φ0",
      substitution: `z = ${phi.toFixed(4)} / ${phi0.toFixed(4)}`,
      result: engagedTeeth,
      unit: "denti",
      note: isInteger
        ? "z è intero: il numero di denti in presa è costante."
        : "z non è intero: verifichiamo lo scenario peggiore nelle posizioni angolari istantanee θ1=φ e θ2=φ-φ0.",
    });
  }

  // 4. Scenario peggiore: θ1 = φ, θ2 = φ - φ0
  let theta1: number | undefined;
  let theta2: number | undefined;
  if (phi !== undefined && phi0 !== undefined) {
    theta1 = phi;
    theta2 = phi - phi0;
    addStep({
      label: "Posizioni angolari dello scenario peggiore (θ1, θ2)",
      formula: "θ1 = φ; θ2 = φ - φ0",
      substitution: `θ1 = ${phi.toFixed(4)}; θ2 = ${phi.toFixed(4)} - ${phi0.toFixed(4)}`,
      result: theta2,
      unit: "rad",
      note: `θ1 = ${theta1.toFixed(4)} rad`,
    });
  }

  // 5. Avanzamento al dente (fz) = vf / (n·Z) oppure f / Z
  let fz = params.feedPerTooth;
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
  } else if (spindleSpeed === undefined && params.tableFeed !== undefined && params.feedPerRev !== undefined) {
    spindleSpeed = params.tableFeed / params.feedPerRev;
    addStep({
      label: "Velocità di rotazione mandrino (n)",
      formula: "n = vf / f",
      substitution: `n = ${params.tableFeed} / ${params.feedPerRev}`,
      result: spindleSpeed,
      unit: "giri/min",
    });
  }
  if (fz === undefined && params.tableFeed !== undefined && spindleSpeed !== undefined && Z !== undefined) {
    fz = params.tableFeed / (spindleSpeed * Z);
    addStep({
      label: "Avanzamento al dente (fz)",
      formula: "fz = vf / (n · Z)",
      substitution: `fz = ${params.tableFeed} / (${spindleSpeed.toFixed(4)} * ${Z})`,
      result: fz,
      unit: "mm/dente",
    });
  } else if (fz === undefined && params.feedPerRev !== undefined && Z !== undefined) {
    fz = params.feedPerRev / Z;
    addStep({
      label: "Avanzamento al dente (fz)",
      formula: "fz = f / Z",
      substitution: `fz = ${params.feedPerRev} / ${Z}`,
      result: fz,
      unit: "mm/dente",
    });
  }
  if (fz !== undefined) {
    quizAnswers.push(toQuizAnswer("Avanzamento al dente (fz)", fz, "mm/dente", 4));
  }

  // 6. Spessore del truciolo istantaneo (hD1, hD2)
  let hD1: number | undefined;
  let hD2: number | undefined;
  if (fz !== undefined && theta1 !== undefined && theta2 !== undefined) {
    hD1 = fz * Math.sin(theta1);
    hD2 = fz * Math.sin(theta2);
    addStep({
      label: "Spessore del truciolo istantaneo (hD1, hD2)",
      formula: "hD1 = fz · sin(θ1); hD2 = fz · sin(θ2)",
      substitution: `hD1 = ${fz.toFixed(4)} · sin(${theta1.toFixed(4)} rad); hD2 = ${fz.toFixed(4)} · sin(${theta2.toFixed(4)} rad)`,
      result: hD1,
      unit: "mm",
      note: `hD2 = ${hD2.toFixed(4)} mm${hD2 <= 0 ? " (≤ 0: il secondo tagliente non è realmente in presa in questo istante)" : ""}`,
    });
    quizAnswers.push(toQuizAnswer("Spessore truciolo hD1", hD1, "mm", 4));
    quizAnswers.push(toQuizAnswer("Spessore truciolo hD2", Math.max(hD2, 0), "mm", 4));
  }

  // 7. Forze di taglio sui singoli denti (Fc1, Fc2) = kcs · hD^(1-x) · ap
  let Fc1: number | undefined;
  let Fc2: number | undefined;
  const kcs = material?.kc11;
  const x = material?.kroneberg_mc;
  if (hD1 !== undefined && hD2 !== undefined && kcs !== undefined && x !== undefined && ap !== undefined) {
    Fc1 = kcs * Math.pow(hD1, 1 - x) * ap;
    // Se il secondo tagliente non è in presa (hD2 <= 0) il suo contributo è nullo.
    Fc2 = hD2 > 0 ? kcs * Math.pow(hD2, 1 - x) * ap : 0;
    addStep({
      label: "Forze di taglio sui singoli denti (Fc1, Fc2)",
      formula: "Fc = kcs · hD^(1-x) · ap",
      substitution: `Fc1 = ${kcs} · ${hD1.toFixed(4)}^(1-${x}) · ${ap}; Fc2 = ${kcs} · ${Math.max(hD2, 0).toFixed(4)}^(1-${x}) · ${ap}`,
      result: Fc1,
      unit: "N",
      note: `Fc2 = ${Fc2.toFixed(2)} N${hD2 <= 0 ? " (tagliente non in presa, contributo nullo)" : ""}`,
    });
    quizAnswers.push(toQuizAnswer("Forza di taglio Fc1", Fc1, "N"));
    quizAnswers.push(toQuizAnswer("Forza di taglio Fc2", Fc2, "N"));
  }

  // 8. Coppia di taglio totale (Tc) = (Fc1 · D/2 / 1000) + (Fc2 · D/2 / 1000)
  let Tc: number | undefined;
  if (Fc1 !== undefined && Fc2 !== undefined && D !== undefined) {
    Tc = (Fc1 * (D / 2)) / 1000 + (Fc2 * (D / 2)) / 1000;
    addStep({
      label: "Coppia di taglio totale (Tc)",
      formula: "Tc = (Fc1 · D/2 / 1000) + (Fc2 · D/2 / 1000)",
      substitution: `Tc = (${Fc1.toFixed(2)} · ${D}/2 / 1000) + (${Fc2.toFixed(2)} · ${D}/2 / 1000)`,
      result: Tc,
      unit: "Nm",
    });
    quizAnswers.push(toQuizAnswer("Coppia di taglio totale (Tc)", Tc, "Nm"));
  }

  // 9. Potenza di taglio (Pc) = Tc · ω, ω = 2π·n/60, e verifica di fattibilità
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
        substitution: `P_limite = ${efficiency} · ${nominalPower} = ${pLimit.toFixed(3)} kW  (Pc = ${pcKw.toFixed(3)} kW)`,
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

  // 10. Lunghezza di taglio complessiva (lc) = approccio utensile + tratti del profilo pezzo
  let cuttingLength = params.cuttingLength;
  if (cuttingLength === undefined) {
    let sum = 0;
    let hasContribution = false;
    if (D !== undefined && phi !== undefined) {
      const approach = (D / 2) * Math.sin(phi);
      sum += approach;
      hasContribution = true;
      addStep({
        label: "Corsa di approccio dell'utensile",
        formula: "approccio = D/2 · sin(φ)",
        substitution: `approccio = ${D}/2 · sin(${phi.toFixed(4)} rad)`,
        result: approach,
        unit: "mm",
      });
    }
    if (params.profileSegments) {
      params.profileSegments.forEach((segment, index) => {
        hasContribution = true;
        if (segment.type === "linear") {
          sum += segment.length;
          addStep({
            label: `Tratto rettilineo #${index + 1}`,
            formula: "lunghezza nota dal profilo pezzo",
            substitution: `${segment.length} mm`,
            result: segment.length,
            unit: "mm",
          });
        } else {
          const angleRad = degToRad(segment.angleDeg);
          const arcLength = segment.radius * angleRad;
          sum += arcLength;
          addStep({
            label: `Raccordo circolare #${index + 1}`,
            formula: "lunghezza arco = raggio · angolo[rad]",
            substitution: `${segment.radius} · (${segment.angleDeg}° = ${angleRad.toFixed(4)} rad)`,
            result: arcLength,
            unit: "mm",
          });
        }
      });
    }
    if (hasContribution) {
      cuttingLength = sum;
    }
  }
  if (cuttingLength !== undefined) {
    addStep({
      label: "Lunghezza di taglio complessiva (lc)",
      formula: "lc = Σ (approccio + tratti rettilinei + tratti circolari)",
      substitution: `lc = ${cuttingLength.toFixed(4)}`,
      result: cuttingLength,
      unit: "mm",
    });
    quizAnswers.push(toQuizAnswer("Lunghezza di taglio (lc)", cuttingLength, "mm"));
  }

  // 11. Tempo di taglio (tc) e numero di pezzi lavorabili (np)
  const feedRate =
    params.tableFeed ?? (fz !== undefined && spindleSpeed !== undefined && Z !== undefined ? fz * spindleSpeed * Z : undefined);
  const toolLifeMinutes = tool?.toolLifeMinutes;
  if (cuttingLength !== undefined && feedRate !== undefined) {
    const tcSeconds = (cuttingLength / feedRate) * 60;
    addStep({
      label: "Tempo di taglio (tc)",
      formula: "tc = (lc / vf) * 60",
      substitution: `tc = (${cuttingLength.toFixed(4)} / ${feedRate.toFixed(4)}) * 60`,
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
    warnings.push("Dati insufficienti per eseguire alcun calcolo di fresatura periferica con i parametri forniti.");
  }

  return {
    operationType: "milling-peripheral",
    steps,
    quizAnswers,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

function solveMillingFace(params: MillingParameters): CamSolution {
  void params; // fresatura frontale non ancora implementata
  return {
    operationType: "milling-face",
    steps: [],
    quizAnswers: [],
    warnings: [
      "La fresatura frontale non è ancora implementata: verrà sviluppata in una fase successiva del CAM Engineering Expert Agent.",
    ],
  };
}

export function solveMilling(params: MillingParameters, variant: "peripheral" | "face"): CamSolution {
  return variant === "peripheral" ? solveMillingPeripheral(params) : solveMillingFace(params);
}
