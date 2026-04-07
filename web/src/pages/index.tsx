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
    <div className="min-h-screen bg-[#faf5ee]" style={{ fontFamily: 'Manrope, sans-serif' }}>
      {/* Header */}
      <header className="bg-white border-b border-[#e8dcc8]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Brain className="w-10 h-10 text-[#c2652a]" />
              <div>
                <h1 className="text-4xl font-bold text-[#2d2520]" style={{ fontFamily: 'EB Garamond, serif' }}>
                  Knowledge Builder
                </h1>
                <p className="text-sm text-[#8b7355] mt-1">AI-powered knowledge management</p>
              </div>
            </div>
            <div className="text-xs text-[#b8a490]">v1.0.0</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white border border-[#e8dcc8] rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-[#c2652a]" />
              <div>
                <p className="text-xs text-[#8b7355] uppercase tracking-wider mb-1">Total Files</p>
                <p className="text-4xl font-bold text-[#2d2520]" style={{ fontFamily: 'EB Garamond, serif' }}>
                  {stats.totalFiles}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e8dcc8] rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <FileText className="w-8 h-8 text-[#c2652a]" />
              <div>
                <p className="text-xs text-[#8b7355] uppercase tracking-wider mb-1">Summaries</p>
                <p className="text-4xl font-bold text-[#2d2520]" style={{ fontFamily: 'EB Garamond, serif' }}>
                  {stats.summaries}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e8dcc8] rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <Brain className="w-8 h-8 text-[#c2652a]" />
              <div>
                <p className="text-xs text-[#8b7355] uppercase tracking-wider mb-1">Concepts</p>
                <p className="text-4xl font-bold text-[#2d2520]" style={{ fontFamily: 'EB Garamond, serif' }}>
                  {stats.concepts}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e8dcc8] rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <Network className="w-8 h-8 text-[#c2652a]" />
              <div>
                <p className="text-xs text-[#8b7355] uppercase tracking-wider mb-1">Connections</p>
                <p className="text-4xl font-bold text-[#2d2520]" style={{ fontFamily: 'EB Garamond, serif' }}>
                  {stats.connections}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white border border-[#e8dcc8] rounded-lg p-10">
          <div className="flex items-center gap-3 mb-8">
            <Upload className="w-7 h-7 text-[#c2652a]" />
            <h2 className="text-3xl font-bold text-[#2d2520]" style={{ fontFamily: 'EB Garamond, serif' }}>
              Upload Files
            </h2>
          </div>

          <div className="border-2 border-dashed border-[#e8dcc8] rounded-lg p-12 text-center hover:border-[#c2652a] transition-colors">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-16 h-16 text-[#b8a490] mx-auto mb-4" />
              <p className="text-lg text-[#2d2520] mb-2">Drop files here or click to upload</p>
              <p className="text-sm text-[#8b7355]">Supports: .md, .txt, .docx, .pdf</p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-8">
              <p className="text-sm text-[#8b7355] mb-4">{files.length} file(s) selected</p>
              <div className="space-y-3 mb-6">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-[#2d2520] bg-[#faf5ee] px-4 py-3 rounded-lg border border-[#e8dcc8]">
                    <FileText className="w-5 h-5 text-[#c2652a]" />
                    <span className="flex-1">{file.name}</span>
                    <span className="text-[#8b7355]">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>
                ))}
              </div>
              <button
                onClick={processFiles}
                disabled={processing}
                className="w-full bg-[#c2652a] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-[#a85424] disabled:bg-[#b8a490] disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-3">
                    <Activity className="w-6 h-6 animate-spin" />
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
        <footer className="mt-16 text-center">
          <p className="text-sm text-[#b8a490]">Powered by AI • Built with care</p>
        </footer>
      </main>
    </div>
  )
}
