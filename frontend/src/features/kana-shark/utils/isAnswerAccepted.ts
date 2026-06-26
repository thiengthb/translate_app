import { normalizeRomaji, romajiVariants } from "./normalizeRomaji";

export function isAnswerAccepted(input: string, expectedAnswers: string[]): boolean {
  const normalizedInput = normalizeRomaji(input);
  if (!normalizedInput) return false;

  return expectedAnswers.some((answer) => {
    const variants = romajiVariants(answer);
    return variants.includes(normalizedInput);
  });
}

export function hasPotentialAnswer(input: string, expectedAnswers: string[]): boolean {
  const normalizedInput = normalizeRomaji(input);
  if (!normalizedInput) return true;

  return expectedAnswers.some((answer) =>
    romajiVariants(answer).some((variant) => variant.startsWith(normalizedInput)),
  );
}
