"use client";

import { useState } from "react";
import { Beaker, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageDropzone } from "@/components/dashboard/image-dropzone";
import { DebugPanel } from "@/components/dashboard/debug-panel";
import { ResultsPanel } from "@/components/dashboard/results-panel";
import type { CamSolution, ExtractedCamProblem } from "@/types/cam";

function extractDataUrlParts(dataUrl: string): { imageBase64: string; mimeType: string } {
  const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
  if (!match) {
    return { imageBase64: dataUrl, mimeType: "image/png" };
  }
  return { mimeType: match[1], imageBase64: match[2] };
}

export default function Home() {
  const [images, setImages] = useState<string[]>([]);
  const [debugOpen, setDebugOpen] = useState(true);
  const [rawInput, setRawInput] = useState("");
  const [solution, setSolution] = useState<CamSolution | null>(null);
  const [isSolving, setIsSolving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const solveProblem = async (problem: ExtractedCamProblem): Promise<CamSolution> => {
    const res = await fetch("/api/solve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(problem),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Errore durante la risoluzione del problema.");
    }
    return data as CamSolution;
  };

  const handleSolve = async () => {
    setIsSolving(true);
    setError(null);
    try {
      const parsed = JSON.parse(rawInput);
      const data = await solveProblem(parsed);
      setSolution(data);
    } catch (err) {
      setSolution(null);
      if (err instanceof SyntaxError) {
        setError(
          "Il testo incollato non è un JSON valido. Il pannello Debug accetta solo un JSON conforme a ExtractedCamProblem."
        );
      } else {
        setError(err instanceof Error ? err.message : "Errore sconosciuto.");
      }
    } finally {
      setIsSolving(false);
    }
  };

  const handleAnalyze = async () => {
    const lastImage = images[images.length - 1];
    if (!lastImage) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const { imageBase64, mimeType } = extractDataUrlParts(lastImage);
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      const extracted = await analyzeRes.json();
      if (!analyzeRes.ok) {
        throw new Error(extracted.error ?? "Errore durante l'analisi dello screenshot.");
      }
      // Mostra nel pannello Debug il JSON estratto dall'AI, così l'utente può
      // verificarlo o correggerlo manualmente prima di un nuovo tentativo.
      setRawInput(JSON.stringify(extracted, null, 2));
      const solved = await solveProblem(extracted as ExtractedCamProblem);
      setSolution(solved);
    } catch (err) {
      setSolution(null);
      setAnalyzeError(err instanceof Error ? err.message : "Errore sconosciuto durante l'analisi.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="border-b bg-white dark:bg-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold">CAM Quiz Solver</h1>
            <p className="text-sm text-muted-foreground">
              Tornitura · Fresatura · Foratura — risoluzione passo-passo per i quiz d&apos;esame
            </p>
          </div>
          <Button variant="outline" onClick={() => setDebugOpen(true)}>
            <Beaker className="size-4" />
            Debug
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>1. Carica il problema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageDropzone images={images} onImagesChange={setImages} />
            <Button
              onClick={handleAnalyze}
              disabled={images.length === 0 || isAnalyzing}
              className="w-full sm:w-auto"
            >
              {isAnalyzing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {isAnalyzing ? "Analisi in corso…" : "Analizza con AI"}
            </Button>
            {analyzeError && (
              <Alert variant="destructive">
                <AlertDescription>{analyzeError}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Risultati</CardTitle>
          </CardHeader>
          <CardContent>
            <ResultsPanel solution={solution} />
          </CardContent>
        </Card>
      </main>

      <DebugPanel
        open={debugOpen}
        onOpenChange={setDebugOpen}
        rawInput={rawInput}
        onRawInputChange={setRawInput}
        onSolve={handleSolve}
        isSolving={isSolving}
        error={error}
      />
    </div>
  );
}
