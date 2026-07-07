"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { QuizAnswerBox } from "@/components/dashboard/quiz-answer-box";
import type { CamSolution } from "@/types/cam";

interface ResultsPanelProps {
  solution: CamSolution | null;
}

export function ResultsPanel({ solution }: ResultsPanelProps) {
  if (!solution) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
        <p>Nessun risultato ancora.</p>
        <p>Carica uno screenshot oppure apri il pannello Debug e incolla i dati del problema.</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="quiz" className="w-full">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="quiz">Box Esame (Risposte Rapide)</TabsTrigger>
        <TabsTrigger value="steps">Procedimento Passo-Passo</TabsTrigger>
      </TabsList>

      {solution.warnings && solution.warnings.length > 0 && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>
            <ul className="list-inside list-disc">
              {solution.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <TabsContent value="quiz" className="mt-3">
        {solution.quizAnswers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessuna risposta calcolabile con i dati forniti.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {solution.quizAnswers.map((answer, index) => (
              <QuizAnswerBox key={index} answer={answer} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="steps" className="mt-3">
        {solution.steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nessun passaggio calcolato con i dati forniti.</p>
        ) : (
          <ol className="space-y-4">
            {solution.steps.map((step, index) => (
              <li key={step.id} className="rounded-lg border p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {index + 1}. {step.label}
                  </p>
                  <p className="font-mono text-sm font-bold whitespace-nowrap">
                    {step.result.toFixed(4).replace(/\.?0+$/, "").replace(".", ",")} {step.unit}
                  </p>
                </div>
                <Separator className="my-2" />
                <p className="font-mono text-xs text-muted-foreground">{step.formula}</p>
                <p className="mt-1 font-mono text-xs">{step.substitution}</p>
                {step.note && <p className="mt-2 text-xs text-amber-700 dark:text-amber-500">{step.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </TabsContent>
    </Tabs>
  );
}
