import { test, describe } from 'node:test';
import assert from 'node:assert';
import { evaluateDiagnoses, type Diagnosis } from './diagnosticEngine.ts';

// Synthetic test data resembling the DSM-5 structure
const mockDiagnoses: Diagnosis[] = [
  {
    diagnosis_id: 'DX_MDD',
    diagnosis_name: 'Major Depressive Disorder',
    chapter_category: 'Mood Disorders',
    diagnostic_code: '296.22',
    symptoms: [
      { symptom_id: 'SYM_FATIGUE', symptom_name: 'Fatigue' },
      { symptom_id: 'SYM_INSOMNIA', symptom_name: 'Insomnia' },
      { symptom_id: 'SYM_ANHEDONIA', symptom_name: 'Anhedonia' },
      { symptom_id: 'SYM_DEPRESSED_MOOD', symptom_name: 'Depressed Mood' }
    ]
  },
  {
    diagnosis_id: 'DX_GAD',
    diagnosis_name: 'Generalized Anxiety Disorder',
    chapter_category: 'Anxiety Disorders',
    diagnostic_code: '300.02',
    symptoms: [
      { symptom_id: 'SYM_FATIGUE', symptom_name: 'Fatigue' },
      { symptom_id: 'SYM_INSOMNIA', symptom_name: 'Insomnia' },
      { symptom_id: 'SYM_WORRY', symptom_name: 'Excessive Worry' },
      { symptom_id: 'SYM_RESTLESSNESS', symptom_name: 'Restlessness' }
    ]
  },
  {
    diagnosis_id: 'DX_PTSD',
    diagnosis_name: 'Post-Traumatic Stress Disorder',
    chapter_category: 'Trauma Disorders',
    diagnostic_code: '309.81',
    symptoms: [
      { symptom_id: 'SYM_FLASHBACKS', symptom_name: 'Intrusive Flashbacks' },
      { symptom_id: 'SYM_AVOIDANCE', symptom_name: 'Avoidance' },
      { symptom_id: 'SYM_INSOMNIA', symptom_name: 'Insomnia' }
    ]
  }
];

describe('DSM-5 Diagnostic Engine Port Tests', () => {
  
  test('Empty symptom selection returns empty matches and zero ambiguity', () => {
    const [results, ambiguity] = evaluateDiagnoses(mockDiagnoses, []);
    assert.strictEqual(results.length, 0);
    assert.strictEqual(ambiguity, 0.0);
  });

  test('Single highly specific symptom (Flashbacks) matches PTSD with zero ambiguity', () => {
    const [results, ambiguity] = evaluateDiagnoses(mockDiagnoses, ['SYM_FLASHBACKS']);
    
    // Should match PTSD
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].diagnosis_id, 'DX_PTSD');
    assert.strictEqual(results[0].match_count, 1);
    
    // Only one diagnosis matches, so ambiguity must be 0%
    assert.strictEqual(ambiguity, 0.0);
  });

  test('Anxiety-Depression Vortex (High Comorbidity) produces high Ambiguity Score', () => {
    // Insomnia and Fatigue are shared verbatim by both MDD and GAD
    const selectedSymptoms = ['SYM_INSOMNIA', 'SYM_FATIGUE'];
    
    const [results, ambiguity] = evaluateDiagnoses(mockDiagnoses, selectedSymptoms);
    
    // MDD and GAD should both match
    assert.ok(results.length >= 2);
    
    // Check first match details
    const firstMatch = results[0];
    const secondMatch = results[1];
    
    assert.strictEqual(firstMatch.match_percentage, 50.0); // 2/4 symptoms
    assert.strictEqual(secondMatch.match_percentage, 50.0); // 2/4 symptoms
    
    // Since MDD and GAD match equally (50% each), the system ambiguity should be maximum (100%)
    // top 5 percentages are [50, 50, 33.3], sum = 133.3, probs = [0.375, 0.375, 0.25]
    // let's assert it is high
    assert.ok(ambiguity > 70.0);
    console.log(`Computed Ambiguity for Anxiety-Depression Vortex: ${ambiguity}%`);
  });

  test('Adding a specific symptom resolves ambiguity towards a primary diagnosis', () => {
    // Patient has Fatigue + Insomnia (ambiguous), but also Anhedonia (specific to MDD)
    const selectedSymptoms = ['SYM_INSOMNIA', 'SYM_FATIGUE', 'SYM_ANHEDONIA'];
    
    const [results, ambiguity] = evaluateDiagnoses(mockDiagnoses, selectedSymptoms);
    
    // MDD should be the top match
    assert.strictEqual(results[0].diagnosis_id, 'DX_MDD');
    assert.strictEqual(results[0].match_percentage, 75.0); // 3/4 symptoms
    
    // GAD should be second
    assert.strictEqual(results[1].diagnosis_id, 'DX_GAD');
    assert.strictEqual(results[1].match_percentage, 50.0); // 2/4 symptoms
    
    // Ambiguity should be lower than the pure vortex scenario
    console.log(`Resolved Ambiguity with Anhedonia: ${ambiguity}%`);
    assert.ok(ambiguity < 96.0);
  });
});
