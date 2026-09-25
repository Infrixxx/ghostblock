import React, { useState } from 'react';

const ENTROPY_TIERS = [
  { range: '0.0 - 1.0', label: 'Zero / Uniform Padding', desc: 'Null blocks, wiped sectors (0x00), or sparse allocation.' },
  { range: '1.0 - 3.5', label: 'Sparse / Structured', desc: 'Sparse configuration files, formatted tables, repetitive text.' },
  { range: '3.5 - 5.2', label: 'Plain Text / Source Code', desc: 'Human readable language, JSON, XML, or uncompiled code.' },
  { range: '5.2 - 6.8', label: 'Compiled Executables', desc: 'ELF/PE binaries, bytecode, or uncompressed bitmap graphics.' },
  { range: '6.8 - 7.5', label: 'Packed Data', desc: 'Compound binary formats, structured archives, or rich PDFs.' },
  { range: '7.5 - 8.0', label: 'Encrypted / Compressed', desc: 'Cryptographic ciphertext (AES/RSA) or high-compression files (ZIP, GZ).' }
];

export default function EntropyMeter({ value }) {
  const [showModal, setShowModal] = useState(false);
  const score = Math.max(0, Math.min(8, Number(value) || 0));
  const percentage = (score / 8) * 100;

  const getColor = (val) => {
    if (val < 1.0) return '#6b7280';
    if (val < 5.2) return '#10b981';
    if (val < 7.2) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="entropy-card">
      <div className="entropy-header">
        <span className="metric-label">Shannon Entropy: <strong>{score.toFixed(4)} / 8.0000</strong></span>
        <button className="info-btn" onClick={() => setShowModal(!showModal)} title="Entropy Details">ⓘ</button>
      </div>

      <div className="meter-track">
        <div 
          className="meter-fill" 
          style={{ width: `${percentage}%`, backgroundColor: getColor(score) }}
        />
      </div>

      {showModal && (
        <div className="entropy-modal">
          <h4>Shannon Entropy Classification</h4>
          <p>Measures random bit density (0.0 = completely uniform, 8.0 = maximum randomness):</p>
          <ul>
            {ENTROPY_TIERS.map((tier, idx) => (
              <li key={idx}>
                <strong>{tier.range} ({tier.label}):</strong> {tier.desc}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}