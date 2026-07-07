"use client";

import { Beaker, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  sampleTurningOp1,
  sampleTurningOp2,
  sampleMillingTiAlloy,
  sampleDrillingTiAlloy,
  sampleBoringTiAlloy,
} from "@/lib/sample-problems";

interface DebugPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawInput: string;
  onRawInputChange: (value: string) => void;
  onSolve: () => void;
  isSolving: boolean;
  error?: string | null;
}

export function DebugPanel({
  open,
  onOpenChange,
  rawInput,
  onRawInputChange,
  onSolve,
  isSolving,
  error,
}: DebugPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Beaker className="size-4" />
            Debug — Risolvi senza AI
          </SheetTitle>
          <SheetDescription>
            Incolla qui un JSON conforme a <code>ExtractedCamProblem</code> per testare il motore
            di calcolo direttamente, senza passare dallo screenshot e dal modello di visione.
            Utile anche per ispezionare/correggere il JSON estratto dall&apos;AI prima di
            risolverlo di nuovo.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRawInputChange(JSON.stringify(sampleTurningOp1, null, 2))}
            >
              Esempio Tornitura OP1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRawInputChange(JSON.stringify(sampleTurningOp2, null, 2))}
            >
              Esempio Sfacciatura OP2
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRawInputChange(JSON.stringify(sampleMillingTiAlloy, null, 2))}
            >
              Esame 22/06 — Fresatura
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRawInputChange(JSON.stringify(sampleDrillingTiAlloy, null, 2))}
            >
              Esame 22/06 — Foratura
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRawInputChange(JSON.stringify(sampleBoringTiAlloy, null, 2))}
            >
              Esame 22/06 — Barenatura
            </Button>
          </div>

          <Textarea
            value={rawInput}
            onChange={(event) => onRawInputChange(event.target.value)}
            placeholder='{ "operationType": "turning-op1", "turning": { ... } }'
            className="min-h-72 flex-1 resize-none font-mono text-xs"
          />

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <SheetFooter>
          <Button onClick={onSolve} disabled={isSolving || rawInput.trim().length === 0}>
            {isSolving && <Loader2 className="size-4 animate-spin" />}
            Risolvi senza AI
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
