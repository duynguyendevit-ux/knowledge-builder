'use client'

import { useState, useEffect } from 'react'
import { Upload, FileText, Brain, Network, Activity } from 'lucide-react'
import dynamic from 'next/dynamic'

const KnowledgeGraph = dynamic(() => import('../components/KnowledgeGraph'), { ssr: false })

export default function Home() {
  const [files, setFiles] = useState<File[]>([])
  const [processing, setProcessing] = useState(false)
  const [url, setUrl] = useState('')
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [stats, setStats] = useState({
    totalFiles: 0,
    summaries: 0,
    concepts: 0,
    connections: 0
  })
  const [graphData, setGraphData] = useState<{ nodes: any[], links: any[] }>({ nodes: [], links: [] })
  const [processingStatus, setProcessingStatus] = useState<any>(null)

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

  const fetchGraphData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/graph`)
      const data = await response.json()
      setGraphData(data)
    } catch (error) {
      console.error('Failed to fetch graph data:', error)
    }
  }

  const fetchProcessingStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/status`)
      const data = await response.json()
      setProcessingStatus(data)
    } catch (error) {
      console.error('Failed to fetch processing status:', error)
    }
  }

  // Fetch stats on mount
  useEffect(() => {
    fetchStats()
    fetchGraphData()
    fetchProcessingStatus()
    
    // Poll status every 2 seconds when processing
    const interval = setInterval(() => {
      fetchProcessingStatus()
    }, 2000)
    
    return () => clearInterval(interval)
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
        fetchGraphData()
        setFiles([])
        setProcessing(false)
      }, 3000)
    } catch (error) {
      console.error('Failed to process files:', error)
      setProcessing(false)
    }
  }

  const fetchFromUrl = async () => {
    if (!url) return
    
    setFetchingUrl(true)
    
    try {
      const response = await fetch(`${API_URL}/api/fetch-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      
      if (response.ok) {
        // Trigger processing
        await fetch(`${API_URL}/api/process`, {
          method: 'POST'
        })
        
        setTimeout(() => {
          fetchStats()
          fetchGraphData()
          setUrl('')
          setFetchingUrl(false)
        }, 3000)
      } else {
        alert('Failed to fetch URL')
        setFetchingUrl(false)
      }
    } catch (error) {
      console.error('Failed to fetch URL:', error)
      alert('Failed to fetch URL')
      setFetchingUrl(false)
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
              Add Knowledge
            </h2>
          </div>

          {/* URL Input */}
          <div className="mb-8">
            <label className="block text-sm text-[#8b7355] mb-3">Fetch from URL</label>
            <div className="flex gap-3">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="flex-1 px-4 py-3 border border-[#e8dcc8] rounded-lg focus:outline-none focus:border-[#c2652a] text-[#2d2520]"
              />
              <button
                onClick={fetchFromUrl}
                disabled={fetchingUrl || !url}
                className="bg-[#c2652a] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#a85424] disabled:bg-[#b8a490] disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {fetchingUrl ? (
                  <span className="flex items-center gap-2">
                    <Activity className="w-5 h-5 animate-spin" />
                    Fetching...
                  </span>
                ) : (
                  'Fetch & Analyze'
                )}
              </button>
            </div>
            <p className="text-xs text-[#b8a490] mt-2">Enter a URL to fetch and analyze web content</p>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#e8dcc8]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-[#8b7355]">or upload files</span>
            </div>
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

          {processingStatus?.isProcessing && (
            <div className="mt-6 bg-[#faf5ee] border border-[#e8dcc8] rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Activity className="w-5 h-5 text-[#c2652a] animate-spin" />
                <p className="text-sm font-semibold text-[#2d2520]">Processing...</p>
              </div>
              <div className="space-y-2 text-sm text-[#8b7355]">
                <p>Current: {processingStatus.currentFile || 'Initializing...'}</p>
                <p>Progress: {processingStatus.processedFiles} / {processingStatus.totalFiles} files</p>
                {processingStatus.logs.length > 0 && (
                  <div className="mt-3 max-h-32 overflow-y-auto bg-white rounded p-2 text-xs font-mono">
                    {processingStatus.logs.slice(-5).map((log: any, i: number) => (
                      <div key={i} className="text-[#8b7355]">
                        {new Date(log.timestamp).toLocaleTimeString()}: {log.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

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

        {/* Knowledge Graph */}
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-6">
            <Network className="w-7 h-7 text-[#c2652a]" />
            <h2 className="text-3xl font-bold text-[#2d2520]" style={{ fontFamily: 'EB Garamond, serif' }}>
              Knowledge Graph
            </h2>
          </div>
          <KnowledgeGraph nodes={graphData.nodes} links={graphData.links} />
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-sm text-[#b8a490]">Powered by AI • Built with care</p>
        </footer>
      </main>
    </div>
  )
}
