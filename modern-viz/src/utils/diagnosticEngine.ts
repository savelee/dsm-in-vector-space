/**
 * Diagnostic engine module simulating DSM diagnostic filtering and comorbidity loops.
 */

export interface Symptom {
  symptom_id: string;
  symptom_name: string;
  symptom_description?: string;
  description?: string;
  category?: string;
}

export interface Diagnosis {
  diagnosis_id: string;
  diagnosis_name: string;
  chapter_category?: string;
  diagnostic_code?: string;
  threshold_count?: number | string;
  duration_rule?: string;
  symptoms: Symptom[];
}

export interface MatchingResult {
  diagnosis_id: string;
  diagnosis_name: string;
  chapter_category: string;
  diagnostic_code: string;
  threshold_count: number | string;
  duration_rule: string;
  match_count: number;
  total_symptoms: number;
  match_percentage: number;
  matched_symptom_names: string[];
}

/**
 * Evaluates how closely each diagnosis matches the list of selected symptoms.
 * 
 * @param diagnoses The list of all DSM diagnoses.
 * @param selectedSymptomIds The set of symptom IDs currently exhibited by the patient.
 * @returns A tuple/array containing:
 *          - A list of matching diagnosis results sorted by match percentage and count.
 *          - A system ambiguity score (entropy-based, from 0.0 to 100.0).
 */
export function evaluateDiagnoses(
  diagnoses: Diagnosis[],
  selectedSymptomIds: string[]
): [MatchingResult[], number] {
  if (!selectedSymptomIds || selectedSymptomIds.length === 0) {
    return [[], 0.0];
  }

  const selectedSet = new Set(selectedSymptomIds);
  const results: MatchingResult[] = [];

  for (const dx of diagnoses) {
    const dxId = dx.diagnosis_id;
    const dxName = dx.diagnosis_name;
    const chapter = dx.chapter_category || "Unknown";
    const symptoms = dx.symptoms || [];

    const dxSymptomIds = symptoms.map((s) => s.symptom_id);
    const totalDxSymptoms = dxSymptomIds.length;

    if (totalDxSymptoms === 0) {
      continue;
    }

    // Count matches
    const matchedSymptomIds = dxSymptomIds.filter((id) => selectedSet.has(id));
    const matchCount = matchedSymptomIds.length;
    const matchPercentage = (matchCount / totalDxSymptoms) * 100.0;

    if (matchCount > 0) {
      // Find names of the matched symptoms
      const matchedSymptomNames = symptoms
        .filter((s) => selectedSet.has(s.symptom_id))
        .map((s) => s.symptom_name);

      results.push({
        diagnosis_id: dxId,
        diagnosis_name: dxName,
        chapter_category: chapter,
        diagnostic_code: dx.diagnostic_code || "",
        threshold_count: dx.threshold_count || "",
        duration_rule: dx.duration_rule || "",
        match_count: matchCount,
        total_symptoms: totalDxSymptoms,
        match_percentage: parseFloat(matchPercentage.toFixed(1)),
        matched_symptom_names: matchedSymptomNames,
      });
    }
  }

  // Sort results by match percentage (descending) and then match count (descending)
  results.sort((a, b) => {
    if (b.match_percentage !== a.match_percentage) {
      return b.match_percentage - a.match_percentage;
    }
    return b.match_count - a.match_count;
  });

  // Calculate System Ambiguity Score (Shannon Entropy-based)
  // High entropy means the selected symptoms match multiple diagnoses equally, causing high ambiguity.
  let ambiguityScore = 0.0;
  if (results.length > 1) {
    // Normalize top matching percentages into a probability distribution
    // Focus on top 5 matches to keep metric clinically focused
    const topMatches = results.slice(0, 5);
    const percentages = topMatches.map((r) => r.match_percentage);
    const totalPercentage = percentages.reduce((sum, p) => sum + p, 0);

    if (totalPercentage > 0) {
      const probabilities = percentages.map((p) => p / totalPercentage);
      
      // Shannon Entropy formula: -sum(p * log2(p))
      let entropy = 0;
      for (const p of probabilities) {
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      }
      
      // Max entropy for N items is log2(N)
      const maxEntropy = Math.log2(probabilities.length);
      if (maxEntropy > 0) {
        // Normalize to 0 - 100% scale
        ambiguityScore = (entropy / maxEntropy) * 100.0;
      }
    }
  }

  return [results, parseFloat(ambiguityScore.toFixed(1))];
}
