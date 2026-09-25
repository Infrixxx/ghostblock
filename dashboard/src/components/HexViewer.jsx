import React from 'react';

export default function HexViewer({ rawHex, baseOffset = 0 }) {
  if (!rawHex || rawHex.length === 0) {
    return <div className="hex-empty">Select a block to inspect raw bytes</div>;
  }

  const bytes = [];
  for (let i = 0; i < rawHex.length; i += 2) {
    bytes.push(rawHex.slice(i, i + 2));
  }

  const rows = [];
  for (let i = 0; i < bytes.length; i += 16) {
    rows.push(bytes.slice(i, i + 16));
  }

  const classifyByte = (hex) => {
    const val = parseInt(hex, 16);
    if (val === 0) return 'byte-null';
    if (val >= 32 && val <= 126) return 'byte-ascii';
    return 'byte-binary';
  };

  return (
    <div className="hex-container">
      <div className="hex-legend">
        <span className="legend-item"><span className="swatch byte-ascii"></span> Printable ASCII</span>
        <span className="legend-item"><span className="swatch byte-null"></span> 0x00 Slack / Null</span>
        <span className="legend-item"><span className="swatch byte-binary"></span> High-density Binary</span>
      </div>

      <div className="hex-editor-view">
        {rows.map((row, rowIdx) => {
          const rowOffset = baseOffset + rowIdx * 16;
          const hexOffset = '0x' + rowOffset.toString(16).padStart(8, '0').toUpperCase();

          const asciiChars = row.map(h => {
            const dec = parseInt(h, 16);
            return (dec >= 32 && dec <= 126) ? String.fromCharCode(dec) : '.';
          }).join('');

          return (
            <div key={rowIdx} className="hex-row">
              <span className="hex-addr">{hexOffset}</span>
              <span className="hex-bytes">
                {row.map((b, byteIdx) => (
                  <span key={byteIdx} className={`hex-byte ${classifyByte(b)}`}>
                    {b}
                  </span>
                ))}
              </span>
              <span className="hex-ascii">{asciiChars}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}