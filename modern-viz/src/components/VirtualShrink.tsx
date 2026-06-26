import React, { useState, useMemo } from 'react';
import { evaluateDiagnoses } from '../utils/diagnosticEngine';
import type { Diagnosis, Symptom } from '../utils/diagnosticEngine';

interface VirtualShrinkProps {
  diagnoses: Diagnosis[];
  symptoms: Symptom[];
}

export const VirtualShrink: React.FC<VirtualShrinkProps> = ({
  diagnoses,
  symptoms
}) => {
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>([]);
  const [symptomSearch, setSymptomSearch] = useState<string>('');

  // 1. Core Clinical Scenario Presets
  const handlePresetAnxietyDepression = () => {
    setSelectedSymptomIds([
      'SYM_MDD_FATIGUE',  // Fatigue or loss of energy
      'SYM_MDD_SLEEP',    // Sleep Disturbance (insomnia/hypersomnia)
      'SYM_GAD_CONC',     // Concentration difficulty
      'SYM_GAD_RESTLESS', // Feeling keyed up or on edge
    ]);
  };

  const handlePresetSchizoaffective = () => {
    setSelectedSymptomIds([
      'SYM_SCHIZ_DEL',    // Delusions
      'SYM_SCHIZ_HAL',    // Hallucinations
      'SYM_MAN_GRAND',    // Grandiosity
      'SYM_MAN_SLEEP',    // Decreased need for sleep
    ]);
  };

  const handleClearSelections = () => {
    setSelectedSymptomIds([]);
  };

  // 2. Toggle a symptom selected state
  const handleSymptomToggle = (symptomId: string) => {
    if (selectedSymptomIds.includes(symptomId)) {
      setSelectedSymptomIds(selectedSymptomIds.filter((id) => id !== symptomId));
    } else {
      setSelectedSymptomIds([...selectedSymptomIds, symptomId]);
    }
  };

  // 3. Evaluate matching diagnoses and ambiguity score
  const [matchingResults, ambiguityScore] = useMemo(() => {
    return evaluateDiagnoses(diagnoses, selectedSymptomIds);
  }, [diagnoses, selectedSymptomIds]);

  // 4. Filter symptom checklist by search query
  const filteredSymptoms = useMemo(() => {
    const query = symptomSearch.trim().toLowerCase();
    if (!query) return symptoms;
    return symptoms.filter(
      (s) =>
        s.symptom_name.toLowerCase().includes(query) ||
        s.symptom_id.toLowerCase().includes(query) ||
        (s.symptom_description && s.symptom_description.toLowerCase().includes(query))
    );
  }, [symptoms, symptomSearch]);

  // 5. Determine ambiguity colors and alert message levels
  const ambiguityColorClass = () => {
    if (ambiguityScore < 30) return 'alert-low';
    if (ambiguityScore < 70) return 'alert-medium';
    return 'alert-high';
  };

  const ambiguityColorHex = () => {
    if (ambiguityScore < 30) return '#1db954'; // Spotify Green
    if (ambiguityScore < 70) return '#ffb703'; // Soft Gold
    return '#f25c54'; // Neon Red
  };

  return (
    <div className="shrink-grid">
      {/* Left Column: Symptom Input Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="card">
          <h3 className="card-title">🔮 Patient Symptom Evaluator</h3>
          <p className="card-subtitle">
            Select patient symptoms to simulate the DSM's categorical filtering engine. 
            Observe how the <strong>Ambiguity Meter</strong> responds when symptoms overlap across distinct diagnostic boundaries.
          </p>

          {/* Preset Buttons - Touch Optimized Pill Shapes */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Load Preset Scenarios</label>
            <div className="preset-row">
              <button className="btn btn-outline" onClick={handlePresetAnxietyDepression}>
                🌀 Anxiety-Depression Vortex
              </button>
              <button className="btn btn-outline" onClick={handlePresetSchizoaffective}>
                🎭 Schizoaffective Borderland
              </button>
              {selectedSymptomIds.length > 0 && (
                <button 
                  className="btn btn-outline" 
                  style={{ color: '#f25c54', borderColor: '#4a1c1d', backgroundColor: 'rgba(242, 92, 84, 0.05)' }} 
                  onClick={handleClearSelections}
                >
                  Clear All ({selectedSymptomIds.length})
                </button>
              )}
            </div>
          </div>

          {/* Symptom Card Selector with Search */}
          <div className="form-group">
            <label>Search and Select Symptoms</label>
            <input
              type="text"
              placeholder="Search symptoms (e.g., fatigue, sleep, mood)..."
              className="input-control"
              value={symptomSearch}
              onChange={(e) => setSymptomSearch(e.target.value)}
              style={{ marginBottom: '16px' }}
            />
            
            <div className="symptoms-list-grid" style={{ minHeight: '340px', maxHeight: '440px' }}>
              {filteredSymptoms.length > 0 ? (
                filteredSymptoms.map((sym) => {
                  const isSelected = selectedSymptomIds.includes(sym.symptom_id);
                  return (
                    <div
                      key={sym.symptom_id}
                      className={`symptom-checkbox-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSymptomToggle(sym.symptom_id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by card click
                      />
                      <div>
                        <span>{sym.symptom_name}</span>
                        {sym.symptom_description && (
                          <div style={{ fontSize: '11px', color: '#b3b3b3', marginTop: '4px', fontStyle: 'italic', lineHeight: 1.3 }}>
                            {sym.symptom_description.length > 55 ? sym.symptom_description.substring(0, 52) + '...' : sym.symptom_description}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ gridColumn: '1 / -1', padding: '32px', textAlign: 'center', color: '#b3b3b3' }}>
                  No symptoms match your search query.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Matches Candidate List (Responsive Dark Theme Cards) */}
        {selectedSymptomIds.length > 0 && (
          <div className="card">
            <h3 className="card-title">📋 Matching Diagnostic Candidates</h3>
            <p className="card-subtitle">
              Disorders matches ordered by highest symptom criteria met.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {matchingResults.length > 0 ? (
                matchingResults.map((match) => (
                  <div
                    key={match.diagnosis_id}
                    style={{
                      border: '1px solid #282828',
                      borderRadius: '8px',
                      padding: '18px',
                      backgroundColor: '#1f1f1f', // Premium dark grey card background
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontSize: '14.5px', fontWeight: '700', color: '#ffffff' }}>
                          {match.diagnosis_name}
                        </span>
                        <div style={{ fontSize: '12px', color: '#b3b3b3', marginTop: '2px', fontWeight: 500 }}>
                          {match.chapter_category} • Code: <strong style={{ color: '#ffffff' }}>{match.diagnostic_code || 'N/A'}</strong>
                        </div>
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: '700',
                        backgroundColor: 'rgba(29, 185, 84, 0.1)',
                        color: '#1db954',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        border: '1px solid #1db954'
                      }}>
                        {match.match_percentage}% Match
                      </span>
                    </div>

                    {/* Criteria Progress Bar */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#b3b3b3', marginBottom: '6px' }}>
                        <span>Symptom Criteria Met</span>
                        <span>{match.match_count} of {match.total_symptoms}</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: '#282828', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${match.match_percentage}%`,
                          backgroundColor: '#1db954', // Spotify Green criteria progress bar
                          borderRadius: '3px'
                        }}></div>
                      </div>
                    </div>

                    {/* Exhibited symptoms sub-card */}
                    <div style={{ fontSize: '12px', marginTop: '4px', borderTop: '1px dotted #333333', paddingTop: '10px' }}>
                      <span style={{ color: '#b3b3b3', fontWeight: '500' }}>Exhibited Symptoms: </span>
                      <span style={{ color: '#1ed760', fontWeight: '600' }}>
                        {match.matched_symptom_names.join(', ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '24px', textAlign: 'center', color: '#b3b3b3' }}>
                  No matching DSM candidates for this symptom profile.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Diagnostic Live Analytics */}
      <div className="diagnostic-dashboard">
        <div className="metrics-panel">
          {/* Ambiguity Score Card */}
          <div className={`metric-card ${selectedSymptomIds.length > 0 ? ambiguityColorClass() : ''}`}>
            <span className="metric-label">System Ambiguity Score</span>
            <span className="metric-value" style={{ color: selectedSymptomIds.length > 0 ? ambiguityColorHex() : '#555555' }}>
              {selectedSymptomIds.length > 0 ? `${ambiguityScore}%` : '0%'}
            </span>
            {selectedSymptomIds.length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '4px',
                backgroundColor: ambiguityColorHex()
              }} />
            )}
          </div>

          {/* Potential Diagnoses Count Card */}
          <div className="metric-card">
            <span className="metric-label">Potential Diagnoses</span>
            <span className="metric-value" style={{ color: matchingResults.length > 0 ? '#1db954' : '#555555' }}>
              {matchingResults.length}
            </span>
          </div>

          {/* Diagnostic Context Alert Panel */}
          {selectedSymptomIds.length > 0 ? (
            ambiguityScore > 70 ? (
              <div className="diagnostic-alert error">
                <strong>⚠️ COMORBIDITY LOOP DETECTED</strong>
                <p>
                  The diagnostic engine has hit high ambiguity. The patient's symptom profile maps to multiple distinct disorder categories simultaneously.
                </p>
                <p style={{ fontSize: '11.5px', marginTop: '8px', lineHeight: 1.5, color: '#fca5a5' }}>
                  Under the DSM's rigid categorical model, this creates a tautological loop where the clinician is forced to diagnose both conditions, exposing the artificiality of discrete psychological boundaries.
                </p>
              </div>
            ) : matchingResults.length === 1 ? (
              <div className="diagnostic-alert success">
                <strong>🎯 CLEAN CLASSIFICATION</strong>
                <p>
                  The symptom profile maps cleanly onto a single primary diagnostic category. The ambiguity index is low, suggesting a highly discrete symptom cluster.
                </p>
              </div>
            ) : (
              <div className="diagnostic-alert info">
                <strong>💡 DIFFERENTIAL DIAGNOSIS ACTIVE</strong>
                <p>
                  Multiple clinical categories share these symptoms. A human clinician would now apply secondary timeline mechanics, duration rules, and exclusionary hierarchies to separate the diagnostic candidate lines.
                </p>
              </div>
            )
          ) : (
            <div className="diagnostic-alert info" style={{ backgroundColor: '#181818', color: '#b3b3b3', border: '1px solid #282828' }}>
              <strong>🔮 Instructions</strong>
              <p>
                Select symptoms from the left panel or click one of the clinical presets to launch the live differential diagnosis simulation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
