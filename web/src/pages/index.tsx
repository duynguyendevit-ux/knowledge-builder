'use client'

import { useState, useEffect } from 'react'
import { Upload, FileText, Brain, Network, Activity } from 'lucide-react'

export default function Home() {
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [stats, setStats] = useState({
    totalFiles: 0,
    summaries: 0,
    concepts: 0,
    connections: 0
  })

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kb-api.tomtom79.tech'

  const fetchStats = async () => {
    try {
      console.log('Fetching stats from:', `${API_URL}/api/stats`)
      const response = await fetch(`${API_URL}/api/stats`)
      const data = await response.json()
      console.log('Stats received:', data)
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
  }, [])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files))
    }
  }

  const processFiles = async () => {
    if (files.length === 0) return
    
    setProcessing(true)
    
    try {
      // Upload files
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      
      await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })
      
      // Trigger processing
      await fetch(`${API_URL}/api/process`, {
        method: 'POST'
      })
      
      // Wait a bit then refresh stats
      setTimeout(() => {
        fetchStats()
        setFiles([])
        setProcessing(false)
      }, 3000)
    } catch (error) {
      console.error('Failed to process files:', error)
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-gray-900" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Knowledge Builder</h1>
                <p className="text-xs text-gray-500 font-mono">HTTP/2 200 OK</p>
              </div>
            </div>
            <div className="text-xs text-gray-400 font-mono">v1.0.0</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded p-6 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-gray-700" />
              <div>
                <p className="text-xs text-gray-500 font-mono uppercase tracking-wide">Total Files</p>
                <p className="text-3xl font-bold text-gray-900 font-mono">{stats.totalFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded p-6 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-gray-700" />
              <div>
                <p className="text-xs text-gray-500 font-mono uppercase tracking-wide">Summaries</p>
                <p className="text-3xl font-bold text-gray-900 font-mono">{stats.summaries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded p-6 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-gray-700" />
              <div>
                <p className="text-xs text-gray-500 font-mono uppercase tracking-wide">Concepts</p>
                <p className="text-3xl font-bold text-gray-900 font-mono">{stats.concepts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded p-6 hover:border-gray-300 transition-colors">
            <div className="flex items-center gap-3">
              <Network className="w-6 h-6 text-gray-700" />
              <div>
                <p className="text-xs text-gray-500 font-mono uppercase tracking-wide">Connections</p>
                <p className="text-3xl font-bold text-gray-900 font-mono">{stats.connections}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white border border-gray-200 rounded p-8">
          <div className="flex items-center gap-3 mb-6">
            <Upload className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-bold text-gray-900">Upload Files</h2>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">Drop files here or click to upload</p>
              <p className="text-xs text-gray-400 font-mono">Supports: .md, .txt, .docx, .pdf</p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-gray-600 font-mono mb-3">{files.length} file(s) selected</p>
              <div className="space-y-2 mb-4">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700 font-mono bg-gray-50 px-3 py-2 rounded">
                    <FileText className="w-4 h-4" />
                    <span>{file.name}</span>
                    <span className="text-gray-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ))}
              </div>
              <button
                onClick={processFiles}
                disabled={processing}
                className="w-full bg-gray-900 text-white px-6 py-3 rounded font-mono hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Activity className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Process Files'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="text-xs text-gray-400 font-mono">304 Not Modified • Cached Response</p>
        </footer>
      </main>
    </div>
  )
}
