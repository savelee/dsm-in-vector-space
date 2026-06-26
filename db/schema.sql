-- PostgreSQL schema for DSM-5 Diagnostic Database

CREATE TABLE IF NOT EXISTS chapter_categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS diagnoses (
    diagnosis_id VARCHAR(50) PRIMARY KEY,
    category_id INTEGER REFERENCES chapter_categories(id) ON DELETE RESTRICT,
    name VARCHAR(255) NOT NULL,
    icd_10_code VARCHAR(20) NOT NULL,
    threshold_description TEXT NOT NULL,
    duration_rule TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS symptoms (
    symptom_id VARCHAR(50) PRIMARY KEY,
    symptom_name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS diagnosis_symptoms (
    diagnosis_id VARCHAR(50) REFERENCES diagnoses(diagnosis_id) ON DELETE CASCADE,
    symptom_id VARCHAR(50) REFERENCES symptoms(symptom_id) ON DELETE CASCADE,
    PRIMARY KEY (diagnosis_id, symptom_id)
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_diagnoses_category_id ON diagnoses(category_id);
CREATE INDEX IF NOT EXISTS idx_diagnosis_symptoms_symptom_id ON diagnosis_symptoms(symptom_id);
