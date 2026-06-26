import React, { useEffect, useState, useMemo } from 'react';
import type { Diagnosis, Symptom } from './utils/diagnosticEngine';
import { NetworkGraph } from './components/NetworkGraph';
import { SemanticSpace } from './components/SemanticSpace';
import { VirtualShrink } from './components/VirtualShrink';

type ActiveTab = 'network' | 'vector' | 'shrink';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('network');
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    // Start collapsed on tablets and mobile screens, open on desktops
    return typeof window !== 'undefined' ? window.innerWidth <= 1024 : false;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch static datasets from public assets
  useEffect(() => {
    const loadStaticData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch diagnoses
        const dxRes = await fetch('data/diagnoses.json');
        if (!dxRes.ok) throw new Error('Failed to fetch diagnoses database.');
        const dxData: Diagnosis[] = await dxRes.json();
        setDiagnoses(dxData);

        // Fetch unique symptoms
        const symRes = await fetch('data/unique_symptoms.json');
        if (!symRes.ok) throw new Error('Failed to fetch unique symptoms database.');
        const symData: Symptom[] = await symRes.json();
        setSymptoms(symData);

      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An unexpected error occurred while loading DSM-5 datasets.');
      } finally {
        setLoading(false);
      }
    };

    loadStaticData();
  }, []);

  // 2. Extract unique chapter categories for the sidebar dropdown
  const chapters = useMemo(() => {
    if (diagnoses.length === 0) return [];
    const chapterSet = new Set<string>();
    diagnoses.forEach((dx) => {
      if (dx.chapter_category) {
        chapterSet.add(dx.chapter_category);
      }
    });
    return Array.from(chapterSet).sort();
  }, [diagnoses]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #dadce0',
            borderTop: '4px solid #1a73e8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }}></div>
          <p style={{ color: '#5f6368', fontWeight: 500 }}>Loading DSM-5 Semantic Architecture...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8fafc',
        padding: '24px',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
          maxWidth: '480px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '48px' }}>⚠️</span>
          <h2 style={{ fontSize: '20px', margin: '16px 0 8px 0', color: '#202124' }}>System Startup Failure</h2>
          <p style={{ color: '#5f6368', fontSize: '14px', lineHeight: 1.6, marginBottom: '20px' }}>{error}</p>
          <p style={{ color: '#5f6368', fontSize: '12px' }}>
            Verify that the static files exist in <code>modern-viz/public/data/</code> and reload the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Premium Minimal Header with Hamburger Menu Toggle */}
      <header className="header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            className="hamburger-btn"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            title={isSidebarCollapsed ? "Open Settings Panel" : "Collapse Settings Panel"}
            aria-label="Toggle settings sidebar"
          >
            ☰
          </button>
          <h1>🧠 DSM-5 Semantic Network Explorer</h1>
        </div>
      </header>

      {/* Main App Workspace */}
      <div className="main-content">
        {/* Sidebar Controls (collapsible) */}
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          <div>
            <h2>⚙️ DSM-5 Settings</h2>
            <p>Configure the global filters for the topological and semantic visualizations.</p>
          </div>

          <div className="form-group">
            <label htmlFor="chapter-select">Filter by Chapter</label>
            <select
              id="chapter-select"
              className="select-control"
              value={selectedChapter}
              onChange={(e) => setSelectedChapter(e.target.value)}
              disabled={activeTab === 'vector'} // Vector space has internal filters
            >
              <option value="All">All Chapters</option>
              {chapters.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="search-input">Interactive Search</label>
            <input
              id="search-input"
              type="text"
              className="input-control"
              placeholder="Search ID, name, desc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={activeTab === 'vector'}
            />
          </div>

          {/* Premium Left-Bordered Hypothesis Callout Card */}
          <div className="sidebar-hypothesis-card">
            <h3 className="hypothesis-title">🧠 My Hypothesis</h3>
            <h4 className="hypothesis-subtitle">Checklist vs. Decision Tree</h4>
            <p className="hypothesis-text">
              Physical medicine diagnostics use **discrete biological decision trees** (e.g., Common Cold vs. COVID-19).
            </p>
            <p className="hypothesis-text">
              Conversely, the DSM relies on **categorical checklists** of overlapping symptoms. Because different disorders share identical symptom definitions, their boundaries are porous and entangled.
            </p>
            <p className="hypothesis-text">
              This app maps this collapse: the vector space clusters symptoms by linguistic proximity, and the simulator triggers a **Comorbidity Loop Warning** when the checklist model fails.
            </p>
          </div>
        </aside>

        {/* Dynamic Visualization Panel */}
        <main className="viewport">
          {/* Tab Selection Bar */}
          <nav className="tab-bar">
            <button
              className={`tab-button ${activeTab === 'network' ? 'active' : ''}`}
              onClick={() => setActiveTab('network')}
            >
              🕸️ Topological Network Graph
            </button>
            <button
              className={`tab-button ${activeTab === 'vector' ? 'active' : ''}`}
              onClick={() => setActiveTab('vector')}
            >
              📊 Semantic Vector Space
            </button>
            <button
              className={`tab-button ${activeTab === 'shrink' ? 'active' : ''}`}
              onClick={() => setActiveTab('shrink')}
            >
              🔮 Virtual Shrink Simulator
            </button>
          </nav>

          {/* Tab Viewports */}
          <div className="tab-panel">
            {activeTab === 'network' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }}>
                <div style={{ flexShrink: 0 }}>
                  <h3 className="card-title">Topological Network Graph</h3>
                  <p className="description-text">
                    This physics-based network maps explicit DSM-5 diagnostic criteria. Color-coded <strong>Disorder Nodes (green)</strong> connect to <strong>Symptom Nodes (cyan)</strong>. Drag, zoom, and tap nodes to view structural details.
                  </p>
                </div>
                <div style={{ flex: 1, minHeight: '450px' }}>
                  <NetworkGraph
                    diagnoses={diagnoses}
                    selectedChapter={selectedChapter}
                    searchQuery={searchQuery}
                  />
                </div>
              </div>
            )}

            {activeTab === 'vector' && (
              <SemanticSpace diagnoses={diagnoses} />
            )}

            {activeTab === 'shrink' && (
              <VirtualShrink diagnoses={diagnoses} symptoms={symptoms} />
            )}
          </div>
        </main>
      </div>
      
      {/* Premium Copyright & Medical Disclaimer Footer */}
      <footer className="footer">
        <div className="footer-copyright">
          All rights reserved Lee Boonstra. <a href="https://www.leeboonstra.dev" target="_blank" rel="noopener noreferrer">www.leeboonstra.dev</a> • <a href="https://github.com/savelee/dsm-in-vector-space" target="_blank" rel="noopener noreferrer">Browse DSM Data (GitHub)</a>
        </div>
        <div className="footer-disclaimer">
          <strong>Disclaimer:</strong> This application is an engineering proof-of-concept and visualization tool. The author is a software engineer, not a psychiatrist or medical professional. The contents, maps, and simulations of this tool are for educational and analytical purposes only, and must not be used for clinical diagnosis, medical advice, or treatment decisions. The author is not responsible for any clinical outcomes or decisions made using this application.
        </div>
      </footer>
    </div>
  );
};

export default App;
