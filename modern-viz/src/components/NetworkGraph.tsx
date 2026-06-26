import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import type { Diagnosis, Symptom } from '../utils/diagnosticEngine';

interface NetworkGraphProps {
  diagnoses: Diagnosis[];
  selectedChapter: string;
  searchQuery: string;
}

interface SelectedNodeInfo {
  type: 'diagnosis' | 'symptom';
  name: string;
  id: string;
  code?: string;
  chapter?: string;
  description?: string;
  threshold?: string | number;
  duration?: string;
}

export const NetworkGraph: React.FC<NetworkGraphProps> = ({
  diagnoses,
  selectedChapter,
  searchQuery,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!containerRef.current || diagnoses.length === 0) return;

    setIsLoading(true);

    const addedNodes = new Set<string>();
    const nodesArray: any[] = [];
    const edgesArray: any[] = [];
    const query = searchQuery.trim().toLowerCase();

    // Map to quickly look up symptom metadata
    const symptomMetadata = new Map<string, Symptom>();

    // Step 1: Collect nodes and edges based on filters
    diagnoses.forEach((dx) => {
      const chapter = dx.chapter_category || 'Unknown';

      // Chapter category filter
      if (selectedChapter !== 'All' && chapter !== selectedChapter) {
        return;
      }

      const dxId = dx.diagnosis_id;
      const dxName = dx.diagnosis_name;
      const dxCode = dx.diagnostic_code || '';
      const isDxMatch = query && (
        dxName.toLowerCase().includes(query) ||
        dxId.toLowerCase().includes(query) ||
        dxCode.toLowerCase().includes(query)
      );

      // Add Diagnosis Node
      if (!addedNodes.has(dxId)) {
        // High contrast dark mode colors: Spotify Green for standard, Magenta for match, charcoal for dimmed
        const color = query
          ? (isDxMatch ? '#ff007f' : '#282828')
          : '#1db954'; 

        const size = isDxMatch ? 26 : 20;
        const borderHighlight = query && isDxMatch ? '#ff007f' : '#1ed760';

        // Determine font styling dynamically based on search matching
        let fontConfig;
        if (query) {
          if (isDxMatch) {
            fontConfig = { color: '#ffffff', background: '#ff007f', size: 18, face: 'Inter, sans-serif' };
          } else {
            fontConfig = { color: '#555555', size: 12, face: 'Inter, sans-serif' }; // No background, shrunk
          }
        } else {
          fontConfig = { color: '#ffffff', background: '#121212', size: 16, face: 'Inter, sans-serif' }; // Standard masked label
        }

        nodesArray.push({
          id: dxId,
          label: dxName,
          title: `${dxName} (${dxCode})`, // Fallback tooltip
          color: {
            background: color,
            border: query && isDxMatch ? '#b00050' : '#15883e',
            highlight: { background: '#1ed760', border: borderHighlight }
          },
          size: size,
          shape: 'dot',
          borderWidth: 2,
          font: fontConfig,
          customData: {
            type: 'diagnosis',
            name: dxName,
            id: dxId,
            code: dxCode,
            chapter: chapter,
            threshold: dx.threshold_count,
            duration: dx.duration_rule
          }
        });
        addedNodes.add(dxId);
      }

      // Process symptoms for this diagnosis
      const symptoms = dx.symptoms || [];
      symptoms.forEach((sym) => {
        const symId = sym.symptom_id;
        const symName = sym.symptom_name;
        const symDesc = sym.description || sym.symptom_description || '';
        symptomMetadata.set(symId, sym);

        const isSymMatch = query && (
          symName.toLowerCase().includes(query) ||
          symId.toLowerCase().includes(query) ||
          symDesc.toLowerCase().includes(query)
        );

        // Add Symptom Node
        if (!addedNodes.has(symId)) {
          // Neon Cyan for standard symptoms, Magenta for match, charcoal for dimmed
          const color = query
            ? (isSymMatch ? '#ff007f' : '#282828')
            : '#00e5ff';

          const size = isSymMatch ? 18 : 12;
          const borderHighlight = query && isSymMatch ? '#ff007f' : '#00e5ff';

          // Determine font styling dynamically based on search matching
          let symFontConfig;
          if (query) {
            if (isSymMatch) {
              symFontConfig = { color: '#ffffff', background: '#ff007f', size: 16, face: 'Inter, sans-serif' };
            } else {
              symFontConfig = { color: '#555555', size: 11, face: 'Inter, sans-serif' }; // No background, shrunk
            }
          } else {
            symFontConfig = { color: '#e0e0e0', background: '#121212', size: 14, face: 'Inter, sans-serif' }; // Standard masked label
          }

          nodesArray.push({
            id: symId,
            label: symName,
            title: symName,
            color: {
              background: color,
              border: query && isSymMatch ? '#b00050' : '#00a8cc',
              highlight: { background: '#00e5ff', border: borderHighlight }
            },
            size: size,
            shape: 'dot',
            borderWidth: 1.5,
            font: symFontConfig,
            customData: {
              type: 'symptom',
              name: symName,
              id: symId,
              description: symDesc
            }
          });
          addedNodes.add(symId);
        }

        // Add Edge: Diagnosis -> Symptom
        // Dimmed out unless matches query
        const edgeColor = query
          ? ((isDxMatch || isSymMatch) ? '#ff007f' : '#222222')
          : '#333333';
        const edgeWidth = query && (isDxMatch || isSymMatch) ? 3 : 1.2;

        edgesArray.push({
          from: dxId,
          to: symId,
          color: edgeColor,
          width: edgeWidth,
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 0.5
            }
          },
          selectionWidth: 2,
          hoverWidth: 1.5
        });
      });
    });

    const data = {
      nodes: nodesArray,
      edges: edgesArray
    };

    // Step 2: Configure Vis-network Options
    const options = {
      layout: {
        improvedLayout: false // Disable to clear console warnings and boost performance on large networks
      },
      physics: {
        solver: 'barnesHut',
        barnesHut: {
          gravitationalConstant: -2400,
          centralGravity: 0.15,
          springLength: 130,
          springConstant: 0.04,
          damping: 0.88,
          avoidOverlap: 0.85
        },
        stabilization: {
          enabled: true,
          iterations: 150,
          updateInterval: 25,
          fit: true
        }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        selectable: true,
        selectConnectedEdges: true,
        dragNodes: true,
        zoomView: true,
        dragView: true,
        keyboard: false
      },
      nodes: {
        scaling: {
          min: 10,
          max: 30
        }
      }
    };

    // Step 3: Instantiate Network
    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Attach event listeners for selection (essential for touch targets)
    network.on('selectNode', (params: any) => {
      const selectedId = params.nodes[0];
      const nodeData = nodesArray.find((n) => n.id === selectedId);
      if (nodeData && nodeData.customData) {
        setSelectedNode(nodeData.customData);
      }
    });

    network.on('deselectNode', () => {
      setSelectedNode(null);
    });

    network.on('stabilizationIterationsDone', () => {
      setIsLoading(false);
    });

    // Fallback if stabilization is too fast or doesn't run
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);

    return () => {
      clearTimeout(timer);
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [diagnoses, selectedChapter, searchQuery]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
            <p style={{ color: '#b3b3b3' }}>Stabilizing Network Topology...</p>
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      
      <div ref={containerRef} className="canvas-container" />

      {/* Floating Info Panel - Highly optimized for Touch Screens */}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>Diagnostic Threshold:</strong> {selectedNode.threshold || 'Not specified'}</div>
                <div><strong>Duration Rules:</strong> {selectedNode.duration || 'Not specified'}</div>
              </div>
            ) : (
              <div>{selectedNode.description || 'No description available.'}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
