import React, { useState } from 'react';

type CaptureResult = {
  image: string;
  metadata: {
    width: number;
    height: number;
    sizeBytes: number;
    tokens: number;
    timeMs: number;
    title: string;
    resolvedUrl: string;
  };
};

function App() {
  const [url, setUrl] = useState('https://www.cnn.com');
  const [fullPage, setFullPage] = useState(false);
  const [skipClean, setSkipClean] = useState(false);
  const [readerMode, setReaderMode] = useState(true);
  const [waitForSelector, setWaitForSelector] = useState('');
  const [viewportWidth, setViewportWidth] = useState('1280');
  const [timeout, setTimeoutVal] = useState('30000');
  const [mcpServer, setMcpServer] = useState(true);

  const [activeTab, setActiveTab] = useState('split');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [rawResult, setRawResult] = useState<CaptureResult | null>(null);
  const [cleanResult, setCleanResult] = useState<CaptureResult | null>(null);

  const handleCapture = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // For split view, we need both. If raw only, just raw. If clean only, just clean.
      // In a real app we'd do this smartly, but for playground we'll fetch both if split view is requested.
      
      const fetchCapture = async (skip: boolean) => {
        const res = await fetch('http://localhost:3001/api/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            fullPage,
            skipClean: skip,
            waitForSelector: waitForSelector || undefined,
            viewportWidth: parseInt(viewportWidth),
            timeoutMs: parseInt(timeout)
          })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        return data.data;
      };

      if (activeTab === 'split' || activeTab === 'clean') {
        const clean = await fetchCapture(false);
        setCleanResult(clean);
      }
      
      if (activeTab === 'split' || activeTab === 'raw') {
        const raw = await fetchCapture(true);
        setRawResult(raw);
      }
      
    } catch (err: any) {
      setError(err.message || 'Capture failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div style={{display: 'flex', alignItems: 'center'}}>
          <div className="logo">VisionAPI <span>playground</span></div>
          <div className="nav-links">
            <a className="nav-link active">Capture</a>
            <a className="nav-link">Benchmark</a>
            <a className="nav-link">Selectors</a>
          </div>
        </div>
        <div className="header-right">
          <span>MCP server</span>
          <label className="toggle-switch">
            <input type="checkbox" checked={mcpServer} onChange={e => setMcpServer(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <label className="input-label">URL</label>
            <input 
              type="text" 
              className="text-input" 
              value={url} 
              onChange={e => setUrl(e.target.value)} 
              placeholder="https://..."
            />
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">CAPTURE OPTIONS</div>
            
            <div className="toggle-row">
              <span className="toggle-label">Full page</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={fullPage} onChange={e => setFullPage(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
            
            <div className="toggle-row">
              <span className="toggle-label">Skip clean</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={skipClean} onChange={e => setSkipClean(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
            
            <div className="toggle-row">
              <span className="toggle-label">Reader mode</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={readerMode} onChange={e => setReaderMode(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            <div className="input-group" style={{marginTop: '16px'}}>
              <label className="input-label">Wait for selector (optional)</label>
              <input 
                type="text" 
                className="text-input" 
                value={waitForSelector} 
                onChange={e => setWaitForSelector(e.target.value)}
                placeholder="article h1"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Viewport width</label>
              <select className="select-input" value={viewportWidth} onChange={e => setViewportWidth(e.target.value)}>
                <option value="1280">1280px (default)</option>
                <option value="1920">1920px (desktop)</option>
                <option value="375">375px (mobile)</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Timeout</label>
              <select className="select-input" value={timeout} onChange={e => setTimeoutVal(e.target.value)}>
                <option value="30000">30s</option>
                <option value="60000">60s</option>
              </select>
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-section-title">SITE PROFILE</div>
            <div className="site-profile">
              <div>Detected: <span>{url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span></div>
              <div>Profile: <span className="profile-type">news site</span></div>
              <div>Custom rules: <span>none</span></div>
            </div>
          </div>

          <button 
            className="btn-primary" 
            onClick={handleCapture}
            disabled={isLoading || !url}
          >
            {isLoading ? 'Capturing...' : 'Run capture'}
          </button>
          
          {error && <div style={{color: '#ef4444', fontSize: '13px', marginTop: '12px'}}>{error}</div>}
        </aside>

        {/* Workspace */}
        <main className="workspace">
          <div className="toolbar">
            <div className="tabs">
              <button className={`tab ${activeTab === 'split' ? 'active' : ''}`} onClick={() => setActiveTab('split')}>Split view</button>
              <button className={`tab ${activeTab === 'raw' ? 'active' : ''}`} onClick={() => setActiveTab('raw')}>Raw only</button>
              <button className={`tab ${activeTab === 'clean' ? 'active' : ''}`} onClick={() => setActiveTab('clean')}>Clean only</button>
              <button className={`tab ${activeTab === 'json' ? 'active' : ''}`} onClick={() => setActiveTab('json')}>JSON</button>
            </div>
            
            {(rawResult && cleanResult && activeTab === 'split') && (
              <div className="stats-badge">
                <span className="stats-saved">
                  {((1 - (cleanResult.metadata.sizeBytes / rawResult.metadata.sizeBytes)) * 100).toFixed(1)}% saved
                </span>
                <span>
                  {formatBytes(cleanResult.metadata.sizeBytes)}
                </span>
              </div>
            )}
          </div>

          <div className="viewer-area">
            {isLoading ? (
              <div className="empty-state">
                <div style={{textAlign: 'center'}}>
                  <div className="loading-spinner"></div>
                  <div>Processing capture...</div>
                </div>
              </div>
            ) : !rawResult && !cleanResult ? (
              <div className="empty-state">Enter a URL and click Run capture</div>
            ) : (
              <>
                {(activeTab === 'split' || activeTab === 'raw') && rawResult && (
                  <div className="viewer-pane">
                    <div className="viewer-header">
                      <div className="viewer-title">Raw</div>
                      <div className="viewer-stats">
                        {rawResult.metadata.tokens.toLocaleString()} tokens • {formatBytes(rawResult.metadata.sizeBytes)}
                      </div>
                    </div>
                    <div className="image-container">
                      <img src={rawResult.image} alt="Raw capture" />
                    </div>
                  </div>
                )}
                
                {(activeTab === 'split' || activeTab === 'clean') && cleanResult && (
                  <div className="viewer-pane">
                    <div className="viewer-header">
                      <div className="viewer-title">Clean</div>
                      <div className="viewer-stats success">
                        {cleanResult.metadata.tokens.toLocaleString()} tokens • {formatBytes(cleanResult.metadata.sizeBytes)}
                      </div>
                    </div>
                    <div className="image-container">
                      <img src={cleanResult.image} alt="Clean capture" />
                    </div>
                  </div>
                )}
                
                {activeTab === 'json' && (
                  <div className="viewer-pane" style={{padding: '24px', overflow: 'auto', backgroundColor: '#1e1e1e'}}>
                    <pre style={{color: '#e0e0e0', fontSize: '13px'}}>
                      {JSON.stringify({ raw: rawResult?.metadata, clean: cleanResult?.metadata }, null, 2)}
                    </pre>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
