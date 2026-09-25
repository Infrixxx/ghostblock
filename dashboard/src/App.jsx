import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:8080/api';

const detectSignature = (hexStr) => {
  if (!hexStr || hexStr === '') return { type: 'Unknown Sector', badge: 'bg-slate-700 text-slate-300' };
  const up = hexStr.toUpperCase();
  
  if (up.startsWith('25504446')) return { type: 'PDF Document', badge: 'bg-red-500/20 text-red-400 border-red-500/30' };
  if (up.startsWith('504B0304')) return { type: 'ZIP Archive', badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
  if (up.startsWith('89504E47')) return { type: 'PNG Image', badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
  if (up.startsWith('4D5A')) return { type: 'Windows EXE', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
  if (up.startsWith('0000000000000000')) return { type: 'Null Padding', badge: 'bg-slate-800 text-slate-500 border-slate-700' };
  
  const isAscii = up.match(/^(20|09|0A|0D|2[1-9A-F]|[3-7][0-9A-F]){8,}/);
  if (isAscii) return { type: 'ASCII Plaintext', badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };

  return { type: 'Raw Binary', badge: 'bg-slate-700/50 text-slate-400 border-slate-600' };
};

const extractAscii = (hexStr) => {
  if (!hexStr) return "";
  let ascii = "";
  for (let i = 0; i < hexStr.length; i += 2) {
    const dec = parseInt(hexStr.slice(i, i + 2), 16);
    ascii += ((dec >= 32 && dec <= 126) || dec === 10 || dec === 13) ? String.fromCharCode(dec) : '.';
  }
  return ascii;
};

export default function App() {
  const [scans, setScans] = useState([]);
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [rawPayload, setRawPayload] = useState(null);
  const [deletedOnly, setDeletedOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [apiStatus, setApiStatus] = useState('connecting');

  useEffect(() => {
    fetchScans();
  }, []);

  const fetchScans = async () => {
    try {
      const res = await fetch(`${API_BASE}/scans`);
      if (!res.ok) throw new Error("Network response was not ok");
      const data = await res.json();
      setScans(data);
      setApiStatus('online');
      if (data.length > 0 && !selectedScanId) setSelectedScanId(data[0].id);
    } catch (err) {
      setApiStatus('offline');
    }
  };

  const triggerScan = async () => {
    setIsScanning(true);
    try {
      await fetch(`${API_BASE}/scan`, { method: 'POST' });
      // Wait 1.5s for Rust process to complete block ingestion via SQLite WAL
      setTimeout(async () => {
        await fetchScans();
        setIsScanning(false);
      }, 1500);
    } catch (err) {
      console.error("Scan failed", err);
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (!selectedScanId) return;
    setLoading(true);
    fetch(`${API_BASE}/blocks?scanId=${selectedScanId}&deletedOnly=${deletedOnly}&limit=300&offset=0`)
      .then(res => res.json())
      .then(data => {
        setBlocks(data);
        setSelectedBlock(null);
        setRawPayload(null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedScanId, deletedOnly]);

  const handleBlockClick = async (block) => {
    setSelectedBlock(block);
    setRawPayload(null);
    try {
      const scan = scans.find(s => s.id === block.scanId);
      const res = await fetch(`${API_BASE}/blocks/${block.id}/raw?imagePath=${encodeURIComponent(scan?.imagePath || '../data/sample.img')}&offset=${block.physicalOffset}&length=512`);
      const data = await res.json();
      setRawPayload(data.hex);
    } catch {
      setRawPayload(block.rawHexPreview);
    }
  };

  const renderClassicHex = () => {
    if (!rawPayload) return <div className="animate-pulse text-slate-500">Retrieving physical payload...</div>;
    
    const bytes = [];
    for (let i = 0; i < rawPayload.length; i += 2) bytes.push(rawPayload.slice(i, i + 2));
    const rows = [];
    for (let i = 0; i < bytes.length; i += 16) rows.push(bytes.slice(i, i + 16));

    return rows.map((row, idx) => {
      const offset = (selectedBlock.physicalOffset + idx * 16).toString(16).padStart(8, '0').toUpperCase();
      const hexPart1 = row.slice(0, 8).join(' ');
      const hexPart2 = row.slice(8, 16).join(' ');
      const ascii = row.map(b => {
        const dec = parseInt(b, 16);
        return (dec >= 32 && dec <= 126) ? String.fromCharCode(dec) : '.';
      }).join('');

      return (
        <div key={idx} className="flex gap-4 hover:bg-slate-800/80 px-2 py-0.5 rounded cursor-crosshair text-[13px] transition-colors">
          <div className="text-slate-500 select-none">{offset}</div>
          <div className="text-cyan-300 w-[12rem] tracking-widest">{hexPart1}</div>
          <div className="text-cyan-300 w-[12rem] tracking-widest">{hexPart2}</div>
          <div className="text-emerald-400 border-l border-slate-700 pl-4 tracking-widest whitespace-pre">|{ascii}|</div>
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#020617] text-slate-300 font-sans overflow-hidden">
      
      {/* App Header */}
      <header className="h-16 flex items-center justify-between px-6 bg-slate-900 border-b border-slate-800 shrink-0 shadow-md">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-black tracking-widest text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">GHOST BLOCK</h1>
          <button 
            onClick={triggerScan} 
            disabled={isScanning || apiStatus === 'offline'}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 text-white font-bold py-1.5 px-4 rounded shadow-[0_0_10px_rgba(34,211,238,0.3)] transition-all flex items-center gap-2 text-sm"
          >
            {isScanning ? '⚙ SCANNING DISK...' : '▶ RUN NEW SCAN'}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-950 border border-slate-800">
            <span className={`w-2 h-2 rounded-full ${apiStatus === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
            <span className="text-xs font-mono text-slate-400">{apiStatus === 'online' ? 'CONNECTED' : 'OFFLINE'}</span>
          </div>

          <select 
            value={selectedScanId || ''}
            onChange={(e) => setSelectedScanId(Number(e.target.value))}
            className="px-3 py-1.5 text-sm font-medium bg-slate-950 border border-slate-700 rounded text-slate-200 outline-none"
          >
            {scans.length === 0 && <option value="" disabled>No Scans Found</option>}
            {scans.map(s => <option key={s.id} value={s.id}>Scan #{s.id} ({s.totalBlocks} Sectors)</option>)}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input 
              type="checkbox" 
              checked={deletedOnly}
              onChange={(e) => setDeletedOnly(e.target.checked)}
              className="w-4 h-4 accent-cyan-500"
            />
            <span className="text-sm font-medium text-slate-300">Unlinked Only</span>
          </label>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex flex-1 min-h-0">
        
        {/* Left Sidebar (Fixed Width) */}
        <aside className="w-[450px] flex flex-col border-r border-slate-800 bg-[#0b1120] shrink-0">
          <div className="px-4 py-3 border-b border-slate-800 bg-slate-900 flex justify-between items-center shrink-0">
            <h2 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Detected Artifacts</h2>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded">{blocks.length} Blocks</span>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center font-mono text-xs text-slate-500 animate-pulse">Scanning Ext4 Inodes...</div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap table-fixed">
                <thead className="sticky top-0 bg-[#0b1120]/95 backdrop-blur text-[10px] uppercase text-slate-500 z-10 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2 w-20">Block</th>
                    <th className="px-4 py-2 w-24">Offset</th>
                    <th className="px-4 py-2">Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {blocks.map(b => {
                    const sig = detectSignature(b.rawHexPreview);
                    return (
                      <tr 
                        key={b.id} 
                        onClick={() => handleBlockClick(b)}
                        className={`cursor-pointer transition-colors ${selectedBlock?.id === b.id ? 'bg-cyan-900/20' : 'hover:bg-slate-800/50'}`}
                      >
                        <td className={`px-4 py-3 font-mono text-xs ${selectedBlock?.id === b.id ? 'text-cyan-400' : 'text-slate-400'}`}>{b.blockNumber}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">0x{b.physicalOffset.toString(16).toUpperCase()}</td>
                        <td className="px-4 py-3 truncate">
                          <span className={`px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-bold rounded border ${sig.badge}`}>
                            {sig.type}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </aside>

        {/* Right Inspector Pane */}
        <section className="flex-1 flex flex-col bg-[#020617] min-w-0">
          {!selectedBlock ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
              <span className="text-4xl mb-4 opacity-50">⎔</span>
              <p className="font-mono tracking-widest uppercase text-sm">Select a block to inspect payload</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              
              {/* Metadata Header */}
              <div className="p-5 bg-slate-900 border-b border-slate-800 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-200 flex items-center gap-3">
                    SECTOR #{selectedBlock.blockNumber}
                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest rounded border ${detectSignature(selectedBlock.rawHexPreview).badge}`}>
                      {detectSignature(selectedBlock.rawHexPreview).type}
                    </span>
                  </h3>
                  <div className="flex gap-4 mt-2 text-xs font-mono text-slate-400">
                    <p>Offset: 0x{selectedBlock.physicalOffset.toString(16).toUpperCase()}</p>
                    <p>State: {selectedBlock.isDeleted ? 'Unlinked' : 'Active'}</p>
                    <p>Size: 512 Bytes</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Shannon Entropy</p>
                  <p className={`text-xl font-mono font-bold ${selectedBlock.entropy > 7.5 ? 'text-red-400' : 'text-cyan-400'}`}>
                    {selectedBlock.entropy.toFixed(4)} <span className="text-slate-600 text-xs">/ 8.0</span>
                  </p>
                </div>
              </div>

              {/* Data Views Grid */}
              <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 min-h-0">
                
                {/* Hex Column */}
                <div className="flex flex-col bg-[#080c17] border border-slate-800 rounded overflow-hidden min-h-0">
                  <div className="px-4 py-2 border-b border-slate-800 bg-slate-900 shrink-0">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hexadecimal Dump</h4>
                  </div>
                  <div className="flex-1 p-4 font-mono overflow-y-auto">
                    {renderClassicHex()}
                  </div>
                </div>

                {/* Text Extraction Column */}
                <div className="flex flex-col bg-[#080c17] border border-slate-800 rounded overflow-hidden min-h-0">
                  <div className="px-4 py-2 border-b border-slate-800 bg-slate-900 shrink-0">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ASCII Payload Extraction</h4>
                  </div>
                  <div className="flex-1 p-4 font-mono text-sm text-emerald-400 whitespace-pre-wrap overflow-y-auto break-all leading-relaxed">
                    {rawPayload ? extractAscii(rawPayload) : 'Extracting...'}
                  </div>
                </div>

              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}