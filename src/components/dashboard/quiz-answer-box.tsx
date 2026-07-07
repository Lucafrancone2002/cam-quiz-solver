"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { QuizAnswer } from "@/types/cam";

interface QuizAnswerBoxProps {
  answer: QuizAnswer;
}

// Riproduce il layout di un box di risposta dei moduli d'esame (es. Microsoft Forms):
// etichetta della domanda sopra, valore numerico ben visibile sotto, pulsante Copia.
export function QuizAnswerBox({ answer }: QuizAnswerBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(answer.formattedValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-amber-50 px-4 py-3 dark:bg-amber-950/20">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{answer.label}</p>
        <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
          {answer.formattedValue}
          {answer.unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{answer.unit}</span>}
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copiato" : "Copia"}
      </Button>
    </div>
  );
}
