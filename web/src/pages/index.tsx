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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Knowledge Builder</h1>
          </div>
          <p className="text-gray-600 mt-2">AI-powered knowledge management system</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Files</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalFiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Summaries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.summaries}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Concepts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.concepts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3">
              <Network className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Connections</p>
                <p className="text-2xl font-bold text-gray-900">{stats.connections}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Upload Raw Data
          </h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-lg text-gray-600 mb-2">
                Drop files here or click to upload
              </p>
              <p className="text-sm text-gray-500">
                Supports: PDF, MD, TXT, DOCX, images
              </p>
            </label>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Selected Files ({files.length})</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <FileText className="w-4 h-4" />
                    {file.name}
                  </div>
                ))}
              </div>
              
              <button
                onClick={processFiles}
                disabled={processing}
                className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
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

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <FileText className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Auto-Summarization</h3>
            <p className="text-gray-600">
              Automatically generate summaries for all documents using LLM
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <Brain className="w-12 h-12 text-purple-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Concept Extraction</h3>
            <p className="text-gray-600">
              Extract and organize key concepts from your knowledge base
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <Network className="w-12 h-12 text-orange-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Connection Discovery</h3>
            <p className="text-gray-600">
              Find relationships and connections between different documents
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
