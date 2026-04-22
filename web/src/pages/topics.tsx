'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Network, ChevronDown, ChevronUp, Download } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'

const KnowledgeGraph = dynamic(() => import('../components/KnowledgeGraph'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96"><div className="text-[#8b7355]">Loading graph...</div></div>
})

export default function Topics() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [topics, setTopics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set())
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kb-api.tomtom79.tech'

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('kb_token')
      if (!storedToken) {
        router.push('/')
        return
      }
      setToken(storedToken)
    }
  }, [router])

  useEffect(() => {
    if (token) {
      fetchTopics()
    }
  }, [token])

  const fetchTopics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/topics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await response.json()
      setTopics(data)
    } catch (error) {
      console.error('Failed to fetch topics:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTopic = (topicName: string) => {
    const newExpanded = new Set(expandedTopics)
    if (newExpanded.has(topicName)) {
      newExpanded.delete(topicName)
    } else {
      newExpanded.add(topicName)
    }
    setExpandedTopics(newExpanded)
  }

  const getTopicGraphData = (topic: any) => {
    if (!topic.conceptDetails) return { nodes: [], links: [] }
    
    const nodes = topic.conceptDetails.map((concept: any) => ({
      id: concept.name,
      name: concept.name,
      description: concept.description,
      confidence: concept.confidence || 'EXTRACTED'
    }))

    // Create links between concepts in the same topic
    const links: any[] = []
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        links.push({
          source: nodes[i].id,
          target: nodes[j].id,
          type: 'related'
        })
      }
    }

    return { nodes, links }
  }

  const exportTopicToMarkdown = (topic: any) => {
    let markdown = `# ${topic.name}\n\n`
    markdown += `${topic.summary}\n\n`
    markdown += `## Concepts\n\n`
    
    topic.conceptDetails?.forEach((concept: any) => {
      markdown += `### ${concept.name}\n\n`
      markdown += `${concept.description || 'No description'}\n\n`
      markdown += `**Confidence:** ${concept.confidence || 'EXTRACTED'}\n\n`
    })

    // Download
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${topic.name.replace(/\s+/g, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f1e8] flex items-center justify-center">
        <div className="text-[#8b7355] text-xl">Loading topics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f5f1e8]">
      {/* Header */}
      <div className="bg-white border-b border-[#d4c5a9] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-[#8b7355]" />
              <h1 className="text-2xl font-serif text-[#2c2416]">Knowledge Topics</h1>
            </div>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-[#8b7355] hover:text-[#2c2416] transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {topics.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#8b7355] text-lg">No topics found. Upload some documents first!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {topics.map((topic, index) => (
              <div key={index} className="bg-white rounded-lg border border-[#d4c5a9] overflow-hidden">
                {/* Topic Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-[#f5f1e8] transition-colors"
                  onClick={() => toggleTopic(topic.name)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-serif text-[#2c2416]">{topic.name}</h2>
                        <span className="px-2 py-1 bg-[#8b7355] text-white text-xs rounded">
                          {topic.concepts?.length || 0} concepts
                        </span>
                      </div>
                      <p className="text-[#8b7355] leading-relaxed">{topic.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          exportTopicToMarkdown(topic)
                        }}
                        className="p-2 hover:bg-[#d4c5a9] rounded transition-colors"
                        title="Export to Markdown"
                      >
                        <Download className="w-5 h-5 text-[#8b7355]" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTopic(selectedTopic === topic.name ? null : topic.name)
                        }}
                        className="p-2 hover:bg-[#d4c5a9] rounded transition-colors"
                        title="View Graph"
                      >
                        <Network className="w-5 h-5 text-[#8b7355]" />
                      </button>
                      {expandedTopics.has(topic.name) ? (
                        <ChevronUp className="w-5 h-5 text-[#8b7355]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#8b7355]" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedTopics.has(topic.name) && (
                  <div className="border-t border-[#d4c5a9] p-6 bg-[#faf8f3]">
                    <h3 className="text-lg font-serif text-[#2c2416] mb-4">Concepts in this topic:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {topic.conceptDetails?.map((concept: any, idx: number) => (
                        <div key={idx} className="bg-white p-4 rounded border border-[#d4c5a9]">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-[#2c2416]">{concept.name}</h4>
                            <span className={`px-2 py-1 text-xs rounded ${
                              concept.confidence === 'EXTRACTED' 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-orange-100 text-orange-800'
                            }`}>
                              {concept.confidence || 'EXTRACTED'}
                            </span>
                          </div>
                          <p className="text-sm text-[#8b7355] leading-relaxed">
                            {concept.description || 'No description available'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Graph View */}
                {selectedTopic === topic.name && (
                  <div className="border-t border-[#d4c5a9] p-6 bg-white">
                    <h3 className="text-lg font-serif text-[#2c2416] mb-4">Knowledge Graph</h3>
                    <div className="h-[500px] border border-[#d4c5a9] rounded">
                      <KnowledgeGraph data={getTopicGraphData(topic)} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
