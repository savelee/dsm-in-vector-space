import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Network } from 'vis-network';
import type { Diagnosis } from '../utils/diagnosticEngine';

interface SemanticSpaceProps {
  diagnoses: Diagnosis[];
  showLabels: boolean;
}

interface TSNEPoint {
  symptom_id?: string;
  symptom_name?: string;
  description?: string;
  diagnosis_id?: string;
  diagnosis_name?: string;
  chapter_category?: string;
  diagnostic_code?: string;
  symptoms_list?: string;
  x: number;
  y: number;
  category?: string;
}

type ProjectionLevel = 'symptom' | 'overlap' | 'diagnosis';

// Dark-theme optimized vibrant color palette for classification groupings
const PALETTE = [
  '#1db954', '#00e5ff', '#ff007f', '#ffb703', '#ab47bc', 
  '#ff5722', '#e040fb', '#00e676', '#3f51b5', '#009688',
  '#8bc34a', '#e91e63', '#ffeb3b', '#607d8b', '#00f5d4'
];

interface SelectedNodeInfo {
  type: 'diagnosis' | 'symptom';
  name: string;
  id: string;
  code?: string;
  chapter?: string;
  description?: string;
}

export const SemanticSpace: React.FC<SemanticSpaceProps> = ({ diagnoses, showLabels }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  
  const [level, setLevel] = useState<ProjectionLevel>('symptom');
  const [symptomsData, setSymptomsData] = useState<TSNEPoint[]>([]);
  const [dxData, setDxData] = useState<TSNEPoint[]>([]);
  const [selectedDxNames, setSelectedDxNames] = useState<string[]>(['Major Depressive Disorder', 'Generalized Anxiety Disorder']);
  
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch precomputed t-SNE caches from public/data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch symptom t-SNE cache
        const symRes = await fetch('data/tsne_cache.json');
        if (!symRes.ok) throw new Error('Failed to load symptom t-SNE data');
        const symJson: TSNEPoint[] = await symRes.json();
        setSymptomsData(symJson);

        // Fetch diagnosis centroid t-SNE cache
        const dxRes = await fetch('data/tsne_dx_cache.json');
        if (!dxRes.ok) throw new Error('Failed to load diagnosis t-SNE data');
        const dxJson: TSNEPoint[] = await dxRes.json();
        setDxData(dxJson);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred while loading semantic space coordinates.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // 2. Compute the Symptom-Disorder Overlap Dataset on the fly
  const overlapData = useMemo(() => {
    if (symptomsData.length === 0 || diagnoses.length === 0) return [];

    const coordsMap = new Map<string, { x: number; y: number }>();
    symptomsData.forEach((point) => {
      if (point.symptom_id) {
        coordsMap.set(point.symptom_id, { x: point.x, y: point.y });
      }
    });

    const overlap: (TSNEPoint & { diagnosis_name: string })[] = [];
    diagnoses.forEach((dx) => {
      const dxName = dx.diagnosis_name;
      const chapter = dx.chapter_category || 'Unknown';
      const symptoms = dx.symptoms || [];

      symptoms.forEach((sym) => {
        const symId = sym.symptom_id;
        const symName = sym.symptom_name;
        const symDesc = sym.description || sym.symptom_description || '';
        const coords = coordsMap.get(symId);

        if (coords) {
          overlap.push({
            symptom_id: symId,
            symptom_name: symName,
            description: symDesc,
            x: coords.x,
            y: coords.y,
            diagnosis_name: dxName,
            chapter_category: chapter,
          });
        }
      });
    });

    return overlap;
  }, [symptomsData, diagnoses]);

  // Extract all unique diagnosis names present in the overlap dataset for filtering
  const allDiagnosisNames = useMemo(() => {
    const names = new Set<string>();
    overlapData.forEach((d) => {
      if (d.diagnosis_name) names.add(d.diagnosis_name);
    });
    return Array.from(names).sort();
  }, [overlapData]);

  // 3. Build and render the Vis.js Network
  useEffect(() => {
    if (!containerRef.current || (symptomsData.length === 0 && dxData.length === 0)) return;

    setIsLoading(true);
    setSelectedNode(null); // Clear active selection on level/filter change

    const nodesArray: any[] = [];
    const edgesArray: any[] = [];

    // Scale multiplier to spread coordinates comfortably on a high-res canvas
    const SCALE_FACTOR = 32;

    if (level === 'symptom') {
      // Group unique symptoms by category prefix (e.g. SYM_MDD -> MDD)
      const categories = Array.from(new Set(symptomsData.map(p => p.category || 'General'))).sort();
      const catColorMap = new Map<string, string>();
      categories.forEach((cat, idx) => {
        catColorMap.set(cat, PALETTE[idx % PALETTE.length]);
      });

      symptomsData.forEach((p) => {
        const cat = p.category || 'General';
        const color = catColorMap.get(cat) || '#00e5ff';
        const symId = p.symptom_id || '';
        const symName = p.symptom_name || '';

        nodesArray.push({
          id: `sym_${symId}`,
          label: showLabels ? symName : '',
          x: p.x * SCALE_FACTOR,
          y: p.y * SCALE_FACTOR,
          physics: false, // Freeze at t-SNE coordinates
          color: {
            background: color,
            border: '#121212',
            highlight: { background: color, border: '#ffffff' }
          },
          shape: 'dot',
          size: 10,
          borderWidth: 1.5,
          font: { color: '#ffffff', background: '#121212', size: 14, face: 'Plus Jakarta Sans, sans-serif' },
          customData: {
            type: 'symptom',
            id: symId,
            name: symName,
            description: p.description || 'No description available.'
          }
        });
      });
    } else if (level === 'diagnosis') {
      // Group diagnosis centroids by their chapter category
      const chapters = Array.from(new Set(dxData.map(p => p.chapter_category || 'Unknown'))).sort();
      const chapterColorMap = new Map<string, string>();
      chapters.forEach((chapter, idx) => {
        chapterColorMap.set(chapter, PALETTE[idx % PALETTE.length]);
      });

      dxData.forEach((p) => {
        const chapter = p.chapter_category || 'Unknown';
        const color = chapterColorMap.get(chapter) || '#1db954';
        const dxId = p.diagnosis_id || '';
        const dxName = p.diagnosis_name || '';

        nodesArray.push({
          id: `dx_${dxId}`,
          label: showLabels ? dxName : '',
          x: p.x * SCALE_FACTOR,
          y: p.y * SCALE_FACTOR,
          physics: false, // Freeze at t-SNE coordinates
          color: {
            background: color,
            border: '#121212',
            highlight: { background: color, border: '#ffffff' }
          },
          shape: 'dot',
          size: 14,
          borderWidth: 2,
          font: { color: '#ffffff', background: '#121212', size: 15, face: 'Plus Jakarta Sans, sans-serif' },
          customData: {
            type: 'diagnosis',
            id: dxId,
            name: dxName,
            code: p.diagnostic_code,
            chapter: chapter,
            description: `A core diagnostic category representing the clinical centroid of ${dxName}.`
          }
        });
      });
    } else if (level === 'overlap') {
      // Symptom-Disorder Overlap Mode (Constellation Starbursts)
      const filteredOverlap = overlapData.filter((p) => selectedDxNames.includes(p.diagnosis_name));

      // Color code per selected diagnosis
      const dxColorMap = new Map<string, string>();
      selectedDxNames.forEach((name, idx) => {
        dxColorMap.set(name, PALETTE[idx % PALETTE.length]);
      });

      // 1. Render the central selected Diagnosis Nodes
      selectedDxNames.forEach((dxName) => {
        const centroid = dxData.find(d => d.diagnosis_name === dxName);
        if (centroid) {
          const color = dxColorMap.get(dxName) || '#1db954';
          const dxId = centroid.diagnosis_id || dxName;

          nodesArray.push({
            id: `dx_${dxId}`,
            label: showLabels ? dxName : '',
            x: centroid.x * SCALE_FACTOR,
            y: centroid.y * SCALE_FACTOR,
            physics: false,
            color: {
              background: color,
              border: '#ffffff',
              highlight: { background: color, border: '#ffffff' }
            },
            shape: 'diamond', // Central diamond anchors
            size: 20,
            borderWidth: 2,
            font: { color: '#ffffff', background: '#121212', size: 16, face: 'Plus Jakarta Sans, sans-serif' },
            customData: {
              type: 'diagnosis',
              id: dxId,
              name: dxName,
              code: centroid.diagnostic_code,
              chapter: centroid.chapter_category,
              description: 'Selected psychiatric category serving as a constellation anchor.'
            }
          });
        }
      });

      // 2. Render Symptom Nodes and draw spoke edges
      filteredOverlap.forEach((p) => {
        const symId = p.symptom_id || '';
        const symName = p.symptom_name || '';
        const parentDx = p.diagnosis_name;
        const color = dxColorMap.get(parentDx) || '#00e5ff';
        const nodeUniqueId = `sym_${parentDx}_${symId}`;

        // Add Symptom node
        nodesArray.push({
          id: nodeUniqueId,
          label: showLabels ? symName : '',
          x: p.x * SCALE_FACTOR,
          y: p.y * SCALE_FACTOR,
          physics: false,
          color: {
            background: color,
            border: '#121212',
            highlight: { background: color, border: '#ffffff' }
          },
          shape: 'dot',
          size: 10,
          borderWidth: 1.5,
          font: { color: '#ffffff', background: '#121212', size: 13, face: 'Plus Jakarta Sans, sans-serif' },
          customData: {
            type: 'symptom',
            id: symId,
            name: symName,
            description: p.description || 'No description available.'
          }
        });

        // Add edge connecting Diagnosis to Symptom
        const centroid = dxData.find(d => d.diagnosis_name === parentDx);
        if (centroid) {
          edgesArray.push({
            from: `dx_${centroid.diagnosis_id || parentDx}`,
            to: nodeUniqueId,
            color: color,
            width: 1.5,
            arrows: {
              to: { enabled: true, scaleFactor: 0.4 }
            },
            dashes: true // Dotted constellation lines!
          });
        }
      });
    }

    const data = {
      nodes: nodesArray,
      edges: edgesArray
    };

    const options = {
      layout: {
        improvedLayout: false
      },
      physics: {
        enabled: false // Explicitly disable physics to respect t-SNE geometry
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        selectable: true,
        selectConnectedEdges: false,
        dragNodes: false, // Keep nodes fixed at coordinate projections
        zoomView: true,
        dragView: true
      }
    };

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Draw background Cartesian grid dynamically (pans and zooms in sync with nodes)
    (network as any).on('beforeDrawing', (ctx: CanvasRenderingContext2D) => {
      ctx.save();
      
      // 1. Draw a dense, crisp coordinate grid (highly visible blueprint style)
      ctx.strokeStyle = '#555555'; // Prominent, lighter gray grid lines
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 8]); // Tight, crisp dotted pattern

      const gridSpacing = 150; // 150px spacing
      const limit = 3000; // Large bounds to cover zoom extents

      // Vertical grid lines
      for (let x = -limit; x <= limit; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, -limit);
        ctx.lineTo(x, limit);
        ctx.stroke();
      }

      // Horizontal grid lines
      for (let y = -limit; y <= limit; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(-limit, y);
        ctx.lineTo(limit, y);
        ctx.stroke();
      }

      ctx.restore();
    });

    // Selection handlers
    network.on('selectNode', (params: any) => {
      const selectedId = params.nodes[0];
      const matchedNode = nodesArray.find(n => n.id === selectedId);
      if (matchedNode && matchedNode.customData) {
        setSelectedNode(matchedNode.customData);
      }
    });

    network.on('deselectNode', () => {
      setSelectedNode(null);
    });

    network.on('stabilizationIterationsDone', () => {
      setIsLoading(false);
    });

    // Fallback loading timer
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [level, symptomsData, dxData, overlapData, selectedDxNames]);

  const handleDxToggle = (dxName: string) => {
    if (selectedDxNames.includes(dxName)) {
      if (selectedDxNames.length > 1) {
        setSelectedDxNames(selectedDxNames.filter((name) => name !== dxName));
      }
    } else {
      setSelectedDxNames([...selectedDxNames, dxName]);
    }
  };

  if (error) {
    return (
      <div className="card alert-high">
        <div className="card-title">⚠️ Projection Loading Failed</div>
        <p className="description-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h3 className="card-title">📊 Semantic Vector Space</h3>
          <p className="description-text" style={{ marginBottom: 0 }}>
            A map of clinical language. Symptoms and disorders positioned close to each other share deep conceptual and diagnostic relationships.
          </p>
        </div>

        {/* Level Toggles */}
        <div className="preset-row" style={{ flexShrink: 0 }}>
          <button 
            className={`btn ${level === 'symptom' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setLevel('symptom')}
          >
            Symptom Space
          </button>
          <button 
            className={`btn ${level === 'diagnosis' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setLevel('diagnosis')}
          >
            Diagnosis Centroids
          </button>
          <button 
            className={`btn ${level === 'overlap' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setLevel('overlap')}
          >
            Symptom-Disorder Overlap
          </button>
        </div>
      </div>

      {/* Dynamic Overlap Comparison Checklist */}
      {level === 'overlap' && (
        <div style={{
          backgroundColor: '#121212',
          padding: '20px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Select Disorders to Map Constellations
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            {allDiagnosisNames.map((name) => {
              const isSelected = selectedDxNames.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => handleDxToggle(name)}
                  style={{
                    fontFamily: 'var(--font-family)',
                    fontSize: '13px',
                    fontWeight: '700',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: isSelected ? '2px solid var(--primary-color)' : '2px solid var(--border-color)',
                    backgroundColor: isSelected ? 'rgba(29, 185, 84, 0.12)' : '#181818',
                    color: isSelected ? 'var(--primary-color)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minHeight: '38px'
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Immersive Constellation Canvas */}
      <div className="canvas-container" style={{ position: 'relative' }}>
        {isLoading && (
          <div className="canvas-loading">
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #333333',
                borderTop: '4px solid #1db954',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 12px auto'
              }}></div>
              <p style={{ color: '#b3b3b3', fontFamily: 'var(--font-family)', fontSize: '15px' }}>Projecting Semantic Constellation...</p>
            </div>
          </div>
        )}

        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />


        {/* Floating Info Panel - Reuses the exact same Touch UI */}
        {selectedNode && (
          <div className="node-info-panel">
            <div className="node-info-title">
              <span style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: selectedNode.type === 'diagnosis' ? '#1db954' : '#00e5ff',
                marginRight: '6px'
              }}></span>
              <strong>{selectedNode.name}</strong>
              {selectedNode.code && (
                <span style={{
                  fontSize: '11px',
                  backgroundColor: '#282828',
                  color: '#1db954',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontWeight: '600',
                  marginLeft: '8px',
                  border: '1px solid #1db954'
                }}>{selectedNode.code}</span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#b3b3b3', marginBottom: '8px', fontWeight: '500' }}>
              {selectedNode.type === 'diagnosis' ? `Chapter: ${selectedNode.chapter}` : `Symptom ID: ${selectedNode.id}`}
            </div>
            <div className="node-info-desc">
              {selectedNode.type === 'diagnosis' ? (
                <div>{selectedNode.description}</div>
              ) : (
                <div>{selectedNode.description}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
