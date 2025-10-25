"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { iconifySingleAction } from "./actions/iconify";
import type { IconifyResult } from "./actions/iconify";

type QueueItem = {
  id: string;
  file: File;
  status: 'pending' | 'generating' | 'complete' | 'error';
  result?: IconifyResult;
};

export default function ClientUI() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = useCallback((files: FileList) => {
    const newItems: QueueItem[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending' as const
    }));
    
    setQueue(prev => [...prev, ...newItems]);
    
    // Process files immediately
    processQueue([...queue, ...newItems]);
  }, [queue]);

  // Process queue items one by one
  const processQueue = async (items: QueueItem[]) => {
    for (const item of items) {
      if (item.status !== 'pending') continue;
      
      // Update status to generating
      setQueue(prev => prev.map(q => 
        q.id === item.id ? { ...q, status: 'generating' } : q
      ));

      try {
        const formData = new FormData();
        formData.append('image', item.file);
        
        const result = await iconifySingleAction(formData);
        
        // Update with result
        setQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, status: 'complete', result } : q
        ));
      } catch (error) {
        // Update with error
        setQueue(prev => prev.map(q => 
          q.id === item.id ? { 
            ...q, 
            status: 'error', 
            result: { 
              name: item.file.name, 
              error: error instanceof Error ? error.message : 'Failed to process' 
            } 
          } : q
        ));
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  // File input handler
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  };

  // Clear queue
  const clearQueue = () => {
    setQueue([]);
  };

  // Download all
  const downloadAll = () => {
    const completedItems = queue.filter(item => item.status === 'complete' && item.result?.b64);
    completedItems.forEach(item => {
      if (item.result?.b64) {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${item.result.b64}`;
        link.download = item.result.name;
        link.click();
      }
    });
  };

  // Download individual
  const downloadIndividual = (result: IconifyResult) => {
    if (result.b64) {
      const link = document.createElement('a');
      link.href = `data:image/png;base64,${result.b64}`;
      link.download = result.name;
      link.click();
    }
  };

  const completedCount = queue.filter(item => item.status === 'complete').length;
  const totalCount = queue.length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <header className="bg-black text-white py-12">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#FF6B35' }}>
            scapia
          </h1>
          <h2 className="text-3xl font-semibold mb-4">3D Icon Generator</h2>
          <p className="text-lg text-gray-300">
            Upload Reference Image → Download 3D Icons
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Action Buttons */}
        <div className="flex gap-4 mb-8 justify-center">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-upload px-6 py-3 rounded-lg font-medium flex items-center gap-2 relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload images
            {totalCount > 0 && (
              <span className="badge">{totalCount}</span>
            )}
          </button>

          <button
            onClick={clearQueue}
            className="btn-clear px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear queue
          </button>

          <button
            onClick={downloadAll}
            disabled={completedCount === 0}
            className="btn-download px-6 py-3 rounded-lg font-medium flex items-center gap-2 relative disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download all
            {completedCount > 0 && (
              <span className="badge">{completedCount}</span>
            )}
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
        />

        {/* Drag and Drop Zone */}
        {queue.length === 0 && (
          <div
            className={`border-2 border-dashed border-gray-300 rounded-lg p-12 text-center transition-colors ${
              isDragOver ? 'drag-over' : ''
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-xl text-gray-600 mb-2">Drop reference images here</p>
            <p className="text-sm text-gray-500">or click &quot;Upload images&quot; to browse</p>
          </div>
        )}

        {/* Results Grid */}
        {queue.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {queue.map((item) => (
              <div key={item.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                {item.status === 'generating' && (
                  <div className="skeleton w-full h-32 rounded-lg mb-4"></div>
                )}
                
                {item.status === 'complete' && item.result && (
                  <>
                    <Image
                      src={`data:image/png;base64,${item.result.b64}`}
                      alt={`Generated icon ${item.result.name}`}
                      width={128}
                      height={128}
                      className="w-32 h-32 object-contain mx-auto mb-4"
                    />
                    <button
                      onClick={() => downloadIndividual(item.result!)}
                      className="btn-download-individual w-full py-2 px-4 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download
                    </button>
                  </>
                )}
                
                {item.status === 'error' && item.result && (
                  <div className="text-center">
                    <div className="w-32 h-32 bg-red-50 rounded-lg mb-4 flex items-center justify-center">
                      <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <p className="text-red-600 text-sm">{item.result.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}