import type { ParsedLabelResult } from "../types/scan";

function normalizeText(input: string): string {
  return input
    .toUpperCase()
    .replace(/[—–]/g, "-")
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[§$]/g, "S")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function unique(values: Array<string | null | undefined>): string[] {
  return [
    ...new Set(values.filter((v): v is string => !!v && v.trim().length > 0)),
  ];
}

function normalizeArticleCode(value: string): string {
  let cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // OCR classique : I -> 1 ou 4
  if (/^[14]\d{6}$/.test(cleaned)) {
    cleaned = `I${cleaned.slice(1)}`;
  }

  return cleaned;
}

function isValidArticleCode(value: string): boolean {
  return /^I\d{6}$/.test(value);
}

function getArticleDigits(articleCode: string): string {
  return articleCode.replace(/^I/, "");
}

function normalizeLotCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9-]/g, "");
}

function normalizeLotSuffixArticle(rawSuffix: string): string {
  const cleaned = rawSuffix.replace(/[^A-Z0-9]/g, "");
  if (/^[14]\d{6}$/.test(cleaned)) {
    return `I${cleaned.slice(1)}`;
  }
  return cleaned;
}

function isValidLotCode(value: string): boolean {
  return /^[0-9]{8}-B45-I\d{6}$/.test(value);
}

function extractArticleCandidates(text: string): string[] {
  const candidates: string[] = [];

  for (const match of text.matchAll(/\b([I14]\d{6})\b/g)) {
    const normalized = normalizeArticleCode(match[1]);
    if (isValidArticleCode(normalized)) {
      candidates.push(normalized);
    }
  }

  return unique(candidates);
}

function buildLotFromParts(
  prefix8: string,
  articleCode: string
): string | null {
  const cleanPrefix = prefix8.replace(/O/g, "0");
  const normalizedArticle = normalizeArticleCode(articleCode);

  if (!/^\d{8}$/.test(cleanPrefix)) return null;
  if (!isValidArticleCode(normalizedArticle)) return null;

  const lot = `${cleanPrefix}-B45-${normalizedArticle}`;
  return isValidLotCode(lot) ? lot : null;
}

function extractLotCandidates(
  text: string,
  detectedArticle: string | null
): string[] {
  const candidates: string[] = [];

  // 1) Cas propre ou semi-propre : XXXXXXXX-B45-I061014
  // ou XXXXXXXX-B45-4061014 / XXXXXXXX-B45-1061014
  for (const match of text.matchAll(/\b([0-9O]{8})-B45-([I14]\d{6})\b/g)) {
    const prefix = match[1].replace(/O/g, "0");
    const article = normalizeLotSuffixArticle(match[2]);
    const rebuilt = buildLotFromParts(prefix, article);
    if (rebuilt) {
      candidates.push(rebuilt);
    }
  }

  // 2) Cas OCR compact : XXXXXXXX-8454060998 ou XXXXXXXX8454060998
  if (detectedArticle && isValidArticleCode(detectedArticle)) {
    const articleDigits = getArticleDigits(detectedArticle);

    const compactPattern = new RegExp(
      String.raw`\b([0-9O]{8})[- ]?845[14]?${articleDigits}\b`,
      "g"
    );

    for (const match of text.matchAll(compactPattern)) {
      const rebuilt = buildLotFromParts(match[1], detectedArticle);
      if (rebuilt) {
        candidates.push(rebuilt);
      }
    }

    const ultraCompactPattern = new RegExp(
      String.raw`\b([0-9O]{8})845[14]?${articleDigits}\b`,
      "g"
    );

    for (const match of text.matchAll(ultraCompactPattern)) {
      const rebuilt = buildLotFromParts(match[1], detectedArticle);
      if (rebuilt) {
        candidates.push(rebuilt);
      }
    }
  }

  return unique(candidates);
}

export function parseLabelText(
  rawText: string,
  confidence?: number
): ParsedLabelResult {
  const normalized = normalizeText(rawText);

  const articleCandidates = extractArticleCandidates(normalized);
  let articleNumber = articleCandidates[0] ?? null;

  const lotCandidates = extractLotCandidates(normalized, articleNumber);
  let lotNumber = lotCandidates[0] ?? null;

  // Si l'article n'a pas été trouvé directement, on le reconstruit depuis le lot
  if (!articleNumber && lotNumber) {
    const suffix = lotNumber.split("-")[2];
    const normalizedSuffix = normalizeArticleCode(suffix);
    if (isValidArticleCode(normalizedSuffix)) {
      articleNumber = normalizedSuffix;
    }
  }

  return {
    rawText: normalized,
    articleNumber,
    lotNumber,
    confidence,
  };
}
