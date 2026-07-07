// Punto di ingresso del CAM Engineering Expert Agent: riceve l'ExtractedCamProblem
// (prodotto dal Vision & AI Orchestrator Agent) ed esegue calcoli puramente
// deterministici, senza alcuna chiamata a modelli LLM.

import type { ExtractedCamProblem, CamSolution } from "@/types/cam";
import { solveTurning } from "./turning";
import { solveMilling } from "./milling";
import { solveDrilling, solveReaming } from "./drilling";

export function solveCamProblem(problem: ExtractedCamProblem): CamSolution {
  switch (problem.operationType) {
    case "turning-op1":
      return solveTurning(problem.turning ?? {}, "op1");
    case "turning-op2":
      return solveTurning(problem.turning ?? {}, "op2");
    case "milling-peripheral":
      return solveMilling(problem.milling ?? {}, "peripheral");
    case "milling-face":
      return solveMilling(problem.milling ?? {}, "face");
    case "drilling":
      return solveDrilling(problem.drilling ?? {});
    case "reaming":
      return solveReaming(problem.reaming ?? {});
    case "boring":
      // La barenatura è meccanicamente una tornitura interna: riusa lo stesso motore,
      // preservando però l'operationType "boring" nel risultato restituito.
      return { ...solveTurning(problem.boring ?? {}, "op1"), operationType: "boring" };
    default:
      throw new Error(`Tipo di operazione non riconosciuto: ${problem.operationType}`);
  }
}

export * from "./formatting";
