'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { ArrowLeft, Calendar, FileText } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function ArticleDetail() {
  const router = useRouter()
  const { slug } = router.query
  const [article, setArticle] = useState<any>(null)
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [toc, setToc] = useState<{id: string, text: string, level: number}[]>([])
  const [readingProgress, setReadingProgress] = useState(0)
  const [relatedArticles, setRelatedArticles] = useState<any[]>([])

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kb-api.tomtom79.tech'

  useEffect(() => {
    if (slug) {
      fetchArticle()
    }
  }, [slug])

  useEffect(() => {
    if (content) {
      extractTOC()
    }
  }, [content])

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight - windowHeight
      const scrolled = window.scrollY
      const progress = (scrolled / documentHeight) * 100
      setReadingProgress(Math.min(progress, 100))
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const extractTOC = () => {
    const headings: {id: string, text: string, level: number}[] = []
    const lines = content.split('\n')
    
    lines.forEach((line) => {
      const h2Match = line.match(/^## (.+)$/)
      const h3Match = line.match(/^### (.+)$/)
      
      if (h2Match) {
        const text = h2Match[1]
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        headings.push({ id, text, level: 2 })
      } else if (h3Match) {
        const text = h3Match[1]
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        headings.push({ id, text, level: 3 })
      }
    })
    
    setToc(headings)
  }

  const fetchArticle = async () => {
    try {
      const filename = `${slug}.md`
      
      const articlesResponse = await fetch(`${API_URL}/api/articles`)
      const articles = await articlesResponse.json()
      const articleMeta = articles.find((a: any) => a.filename === filename)
      
      if (articleMeta) {
        setArticle(articleMeta)
        
        const related = articles
          .filter((a: any) => a.filename !== filename)
          .slice(0, 3)
        setRelatedArticles(related)
      }
      
      const contentResponse = await fetch(`${API_URL}/api/articles/${filename}`)
      const data = await contentResponse.json()
      setContent(data.content)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch article:', error)
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
        <p className="text-[#8b7355] text-lg">Loading article...</p>
      </div>
    )
  }

  if (!article || !content) {
    return (
      <div className="min-h-screen bg-[#faf8f3] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#8b7355] text-lg mb-4">Article not found</p>
          <button
            onClick={() => router.push('/articles')}
            className="px-4 py-2 bg-[#8b7355] text-white rounded hover:bg-[#2c2416] transition-colors"
          >
            Back to Articles
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#faf8f3]">
      <div className="bg-white border-b border-[#d4c5a9] sticky top-0 z-10">
        <div className="h-1 bg-[#f5f1e8]">
          <div 
            className="h-full bg-[#8b7355] transition-all duration-150"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/articles')}
            className="flex items-center gap-1.5 text-sm text-[#8b7355] hover:text-[#2c2416] transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Articles</span>
          </button>
          
          <h1 className="text-2xl font-serif text-[#2c2416] mb-3">
            {article.title}
          </h1>
          
          <div className="flex items-center gap-4 text-xs text-[#8b7355]">
            <div className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>{article.concepts} concepts</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Generated {formatDate(article.generated)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex gap-8">
          {toc.length > 0 && (
            <div className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24">
                <h3 className="text-sm font-semibold text-[#2c2416] mb-3">Table of Contents</h3>
                <nav className="space-y-2">
                  {toc.map((item, index) => (
                    <a
                      key={index}
                      href={`#${item.id}`}
                      className={`block text-sm text-[#8b7355] hover:text-[#2c2416] transition-colors ${
                        item.level === 3 ? 'pl-4' : ''
                      }`}
                    >
                      {item.text}
                    </a>
                  ))}
                </nav>
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-lg border border-[#d4c5a9] p-8">
              <div className="
                [&_h1]:text-3xl [&_h1]:font-serif [&_h1]:text-[#2c2416] [&_h1]:mb-6
                [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:text-[#2c2416] [&_h2]:mt-10 [&_h2]:mb-4
                [&_h3]:text-xl [&_h3]:font-serif [&_h3]:text-[#2c2416] [&_h3]:mt-8 [&_h3]:mb-3
                [&_p]:text-[#4a4a4a] [&_p]:leading-relaxed [&_p]:mb-4
                [&_strong]:text-[#2c2416] [&_strong]:font-semibold
                [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4
                [&_li]:text-[#4a4a4a]
                [&_code]:bg-[#f5f1e8] [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-sm [&_code]:text-[#2c2416]
                [&_pre]:bg-[#2c2416] [&_pre]:text-white [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:mb-6
                [&_a]:text-[#8b7355] [&_a]:underline hover:[&_a]:text-[#2c2416]
              ">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h2: ({node, ...props}) => {
                      const text = props.children?.toString() || ''
                      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                      return <h2 id={id} {...props} />
                    },
                    h3: ({node, ...props}) => {
                      const text = props.children?.toString() || ''
                      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                      return <h3 id={id} {...props} />
                    }
                  }}
                >
                  {content}
                </ReactMarkdown>
              </div>

              {relatedArticles.length > 0 && (
                <div className="mt-12 pt-8 border-t border-[#d4c5a9]">
                  <h3 className="text-xl font-serif text-[#2c2416] mb-4">Related Articles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedArticles.map((related, index) => (
                      <a
                        key={index}
                        href={`/articles/${related.filename.replace('.md', '')}`}
                        className="block p-4 border border-[#d4c5a9] rounded-lg hover:shadow-md transition-shadow"
                      >
                        <h4 className="text-sm font-serif text-[#2c2416] mb-2">
                          {related.title}
                        </h4>
                        <p className="text-xs text-[#8b7355]">
                          {related.concepts} concepts
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
