import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { uploadApi } from '../api';
import { Transaction } from '../types';

export default function Upload() {
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const qc = useQueryClient();

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setStatus('uploading');
    setProgress(0);
    setError('');
    setResult([]);

    try {
      setStatus('processing');
      const res = await uploadApi.uploadPDF(file, (p) => setProgress(p));
      setResult(res.data.transactions);
      setStatus('done');
      qc.invalidateQueries({ queryKey: ['summary'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['monthly'] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string; detail?: string } } };
      setError(e.response?.data?.error || e.response?.data?.detail || 'Upload failed');
      setStatus('error');
    }
  }, [qc]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    disabled: status === 'uploading' || status === 'processing',
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Upload Bank Statement</h2>
        <p className="text-gray-400 text-sm mt-1">Upload a PDF — AI will categorize all transactions automatically</p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          isDragActive ? 'border-accent-500 bg-accent-500/10' : 'border-dark-500 bg-dark-800 hover:border-accent-500/50'
        } ${status === 'processing' ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="text-5xl mb-4">📄</div>
        {status === 'idle' && (
          <>
            <p className="text-white font-medium">{isDragActive ? 'Drop it here!' : 'Drag & drop your PDF here'}</p>
            <p className="text-gray-500 text-sm mt-2">or click to browse • PDF files only • max 20MB</p>
          </>
        )}
        {status === 'uploading' && (
          <>
            <p className="text-white font-medium">Uploading... {progress}%</p>
            <div className="mt-4 bg-dark-600 rounded-full h-2 w-64 mx-auto">
              <div className="bg-accent-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </>
        )}
        {status === 'processing' && (
          <>
            <p className="text-white font-medium animate-pulse">AI is categorizing transactions...</p>
            <p className="text-gray-500 text-sm mt-2">This may take 30–60 seconds for scanned PDFs</p>
          </>
        )}
        {status === 'error' && (
          <p className="text-red-400 font-medium">{error}</p>
        )}
      </div>

      {status === 'done' && result.length > 0 && (
        <div className="bg-dark-800 rounded-xl border border-green-500/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-green-400">✓</span>
            <h3 className="text-white font-semibold">Successfully parsed {result.length} transactions</h3>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {result.slice(0, 20).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-dark-600 last:border-0">
                <div>
                  <p className="text-sm text-white">{t.cleanDescription}</p>
                  <p className="text-xs text-gray-500">{t.category} • {new Date(t.date).toLocaleDateString('en-IN')}</p>
                </div>
                <span className={`text-sm font-semibold ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                  {t.type === 'credit' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))}
            {result.length > 20 && (
              <p className="text-center text-gray-500 text-sm py-2">+{result.length - 20} more — view in Transactions page</p>
            )}
          </div>
          <button
            onClick={() => { setStatus('idle'); setResult([]); }}
            className="mt-4 text-sm text-accent-400 hover:text-accent-300"
          >
            Upload another PDF
          </button>
        </div>
      )}
    </div>
  );
}
