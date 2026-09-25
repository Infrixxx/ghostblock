import React, { useState, useEffect } from 'react';
import EntropyMeter from './components/EntropyMeter';
import HexViewer from './components/HexViewer';
import './App.css';

const API_BASE = 'http://localhost:8080/api';

export default function App() {
  const [scans, setScans] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [rawPayload, setRawPayload] = useState(null);
  const [deletedOnly, setDeletedOnly] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const res = await fetch(`${API_BASE}/scans`);
      const data = await res.json();
      setScans(data);
      if (data.length > 0) {
        setSelectedScanId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load scans:', err);
    }
  };

  useEffect(() => {
    if (selectedScanId) {
      loadBlocks(selectedScanId, deletedOnly);
    }
  }, [selectedScanId, deletedOnly]);

  const loadBlocks = async (scanId, filterDeleted) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/blocks?scanId=${scanId}&deletedOnly=${filterDeleted}&limit=50&offset=0`);
      const data = await res.json();
      setBlocks(data);
      if (data.length > 0) {
        selectBlock(data[0]);
      } else {
        setSelectedBlock(null);
        setRawPayload(null);
      }
    } catch (err) {
      console.error('Failed to load blocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectBlock = async (block) => {
    setSelectedBlock(block);
    try {
      const scan = scans.find(s => s.id === block.scanId);
      const imagePath = scan ? scan.imagePath : '../data/sample.img';
      const res = await fetch(`${API_BASE}/blocks/${block.id}/raw?imagePath=${encodeURIComponent(imagePath)}&offset=${block.physicalOffset}&length=256`);
      const data = await res.json();
      setRawPayload(data.hex || block.rawHexPreview);
    } catch {
      setRawPayload(block.rawHexPreview);
    }
  };

  return (
    <div className="ghost-layout">
      <header className="ghost-nav">
        <h1>GHOST BLOCK <span>// Forensic Sector Inspector</span></h1>
        <div className="nav-controls">
          <label>Scan Session:</label>
          <select 
            value={selectedScanId || ''} 
            onChange={(e) => setSelectedScanId(Number(e.target.value))}
          >
            {scans.map(s => (
              <option key={s.id} value={s.id}>
                Scan #{s.id} ({s.status}) - {s.totalBlocks} Blocks
              </option>
            ))}
          </select>
          <label className="toggle">
            <input 
              type="checkbox" 
              checked={deletedOnly} 
              onChange={(e) => setDeletedOnly(e.target.checked)} 
            />
            Show Deleted / Slack Only
          </label>
        </div>
      </header>

      <main className="ghost-body">
        <section className="table-pane">
          <h3>Carved Sectors ({blocks.length})</h3>
          {loading ? (
            <p className="loading">Scanning SQLite blocks...</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Block #</th>
                    <th>Offset</th>
                    <th>Entropy</th>
                    <th>State</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map(b => (
                    <tr 
                      key={b.id} 
                      className={selectedBlock?.id === b.id ? 'active-row' : ''}
                      onClick={() => selectBlock(b)}
                    >
                      <td>{b.blockNumber}</td>
                      <td>0x{b.physicalOffset.toString(16).toUpperCase()}</td>
                      <td>{b.entropy.toFixed(4)}</td>
                      <td>
                        <span className={`badge ${b.isDeleted ? 'badge-deleted' : 'badge-allocated'}`}>
                          {b.isDeleted ? 'DELETED' : 'ALLOCATED'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="inspector-pane">
          {selectedBlock ? (
            <>
              <div className="metadata-banner">
                <div><strong>Block:</strong> #{selectedBlock.blockNumber}</div>
                <div><strong>Physical Offset:</strong> 0x{selectedBlock.physicalOffset.toString(16).toUpperCase()} ({selectedBlock.physicalOffset} bytes)</div>
                <div><strong>Type:</strong> {selectedBlock.fileType || 'Raw Binary / Slack'}</div>
              </div>

              <EntropyMeter value={selectedBlock.entropy} />

              <h3>Sector Hex Dump (First 256 Bytes)</h3>
              <HexViewer rawHex={rawPayload} baseOffset={selectedBlock.physicalOffset} />
            </>
          ) : (
            <div className="empty-state">No block selected</div>
          )}
        </section>
      </main>
    </div>
  );
}