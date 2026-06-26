/**
 * Relational DB Entities (as mapped in SQL database)
 */

export interface ChapterCategory {
  id: number;
  category_name: string;
}

export interface Diagnosis {
  diagnosis_id: string;
  category_id: number;
  name: string;
  icd_10_code: string;
  threshold_description: string;
  duration_rule: string;
}

export interface Symptom {
  symptom_id: string;
  symptom_name: string;
  description: string;
}

export interface DiagnosisSymptom {
  diagnosis_id: string;
  symptom_id: string;
}

/**
 * Normalized NoSQL / JSON Document Schema
 * (Improved strongly-typed representation)
 */

export interface DSM5Diagnosis {
  diagnosis_id: string;
  diagnosis_name: string;
  diagnostic_code: string;
  chapter_category: string;
  threshold_count: string;
  duration_rule: string;
  symptoms: Symptom[];
}
