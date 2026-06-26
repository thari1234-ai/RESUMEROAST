"use client";

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import API_BASE from '../lib/api';

interface ResumeUploadProps {
  onParsedText: (text: string) => void;
  dark?: boolean;
  disabled?: boolean;
  onAuthRequired?: () => void;
}

export default function ResumeUpload({ onParsedText, dark = true, disabled = false, onAuthRequired }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const border = dark ? '#3f3f46' : '#e4e4e7';
  const subtle = dark ? '#27272a' : '#f4f4f5';
  const textSub = dark ? '#71717a' : '#6b7280';

  const selectFile = (f: File) => {
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are supported.');
      return;
    }
    setFile(f);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) selectFile(e.target.files[0]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    if (e.dataTransfer.files?.[0]) selectFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!file || disabled) return;
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('ca_token');
    try {
      const res = await fetch(`${API_BASE}/parse-resume`, {
        method: 'POST', body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Server error');
      }
      const data = await res.json();
      if (!data.text || data.text.trim().length < 10) throw new Error('Could not extract text. Is the PDF readable (not scanned image)?');
      onParsedText(data.text);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to backend on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleZoneClick = () => {
    if (disabled) { onAuthRequired?.(); return; }
    inputRef.current?.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={handleZoneClick}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: 120, border: `2px dashed ${isDragging ? '#3b82f6' : disabled ? '#d1d5db' : border}`,
          borderRadius: 12, cursor: 'pointer', transition: 'all 0.15s',
          background: isDragging ? (dark ? '#1e3a5f22' : '#eff6ff') : subtle,
          opacity: disabled ? 0.65 : 1,
          padding: 20,
        }}
      >
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
            <FileText size={28} color="#3b82f6" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontWeight: 600, fontSize: 13, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
              <p style={{ fontSize: 11, color: textSub, margin: '2px 0 0' }}>{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = ''; }}
              style={{ padding: 4, borderRadius: 6, border: `1px solid ${border}`, background: 'transparent', cursor: 'pointer', display: 'flex', color: textSub }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Upload size={28} color={textSub} style={{ marginBottom: 8 }} />
            <p style={{ fontWeight: 600, fontSize: 13, margin: '0 0 4px', color: dark ? '#d4d4d8' : '#374151' }}>Drag & drop your PDF here</p>
            <p style={{ fontSize: 12, color: textSub, margin: 0 }}>or click to browse</p>
          </div>
        )}
        <input ref={inputRef} type="file" style={{ display: 'none' }} accept=".pdf" onChange={handleFileChange} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', background: dark ? '#450a0a40' : '#fef2f2', border: `1px solid ${dark ? '#7f1d1d60' : '#fecaca'}`, borderRadius: 10, color: dark ? '#f87171' : '#b91c1c', fontSize: 13 }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          {error}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={disabled ? onAuthRequired : handleUpload}
        disabled={!disabled && (!file || loading)}
        className="rmr-analyze-btn"
        style={{
          width: '100%', padding: '12px 0', borderRadius: 10, fontWeight: 700, fontSize: 14, border: 'none',
          cursor: (!disabled && (!file || loading)) ? 'not-allowed' : 'pointer',
          background: (!disabled && !file && !loading) ? '#f4f4f5' : '#0a0a0a',
          color: (!disabled && !file && !loading) ? '#a1a1aa' : '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          position: 'relative', overflow: 'hidden',
          transition: 'transform 0.15s, box-shadow 0.15s, background 0.2s',
          boxShadow: (!disabled && !file && !loading) ? 'none' : '0 2px 12px rgba(0,0,0,0.18)',
        }}
      >
        {loading
          ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Parsing Resume...</>
          : <><CheckCircle size={16} /> Analyze Resume</>
        }
      </button>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer {
          0%   { transform: translateX(-100%) skewX(-15deg); }
          100% { transform: translateX(220%) skewX(-15deg); }
        }
        .rmr-analyze-btn::after {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 45%;
          height: 100%;
          background: rgba(255,255,255,0.12);
          animation: shimmer 2.2s ease-in-out infinite;
          pointer-events: none;
        }
        .rmr-analyze-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0,0,0,0.22) !important;
        }
        .rmr-analyze-btn:active:not(:disabled) {
          transform: translateY(0px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
        }
      `}</style>
    </div>
  );
}
