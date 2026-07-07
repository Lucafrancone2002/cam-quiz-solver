import type { QuizAnswer } from "@/types/cam";

/**
 * Formatta un numero secondo la convenzione italiana richiesta dai box del quiz
 * (virgola come separatore decimale, es. 14,94 oppure 51 se intero).
 */
export function formatQuizNumber(value: number, decimals = 2): string {
  const rounded = Number(value.toFixed(decimals));
  return rounded.toString().replace(".", ",");
}

export function toQuizAnswer(
  label: string,
  value: number,
  unit?: string,
  decimals = 2
): QuizAnswer {
  return {
    label,
    value,
    unit,
    formattedValue: formatQuizNumber(value, decimals),
  };
}
