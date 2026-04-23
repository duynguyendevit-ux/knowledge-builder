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

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kb-api.tomtom79.tech'

  useEffect(() => {
    if (slug) {
      fetchArticle()
    }
  }, [slug])

  const fetchArticle = async () => {
    try {
      const filename = `${slug}.md`
      
      // Fetch article metadata
      const articlesResponse = await fetch(`${API_URL}/api/articles`)
      const articles = await articlesResponse.json()
      const articleMeta = articles.find((a: any) => a.filename === filename)
      
      if (articleMeta) {
        setArticle(articleMeta)
      }
      
      // Fetch article content
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
      {/* Header */}
      <div className="bg-white border-b border-[#d4c5a9]">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <button
            onClick={() => router.push('/articles')}
            className="flex items-center gap-2 text-[#8b7355] hover:text-[#2c2416] transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Articles</span>
          </button>
          
          <h1 className="text-4xl font-serif text-[#2c2416] mb-4">
            {article.title}
          </h1>
          
          <div className="flex items-center gap-6 text-sm text-[#8b7355]">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>{article.concepts} concepts</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Generated {formatDate(article.generated)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg border border-[#d4c5a9] p-8">
          <div className="
            [&_h1]:text-3xl [&_h1]:font-serif [&_h1]:text-[#2c2416] [&_h1]:mb-6 [&_h1]:pb-3 [&_h1]:border-b [&_h1]:border-[#d4c5a9]
            [&_h2]:text-2xl [&_h2]:font-serif [&_h2]:text-[#2c2416] [&_h2]:mt-10 [&_h2]:mb-4
            [&_h3]:text-xl [&_h3]:font-serif [&_h3]:text-[#2c2416] [&_h3]:mt-8 [&_h3]:mb-3
            [&_h4]:text-lg [&_h4]:font-serif [&_h4]:text-[#2c2416] [&_h4]:mt-6 [&_h4]:mb-2
            [&_p]:text-[#4a4a4a] [&_p]:leading-relaxed [&_p]:mb-4 [&_p]:text-base
            [&_strong]:text-[#2c2416] [&_strong]:font-semibold
            [&_em]:italic [&_em]:text-[#4a4a4a]
            [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-4 [&_ul]:space-y-2
            [&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-4 [&_ol]:space-y-2
            [&_li]:text-[#4a4a4a] [&_li]:leading-relaxed
            [&_code]:bg-[#f5f1e8] [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:text-sm [&_code]:text-[#2c2416] [&_code]:font-mono
            [&_pre]:bg-[#2c2416] [&_pre]:text-white [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-6 [&_pre]:text-sm
            [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-white
            [&_a]:text-[#8b7355] [&_a]:underline [&_a]:decoration-1 hover:[&_a]:text-[#2c2416] hover:[&_a]:decoration-2
            [&_blockquote]:border-l-4 [&_blockquote]:border-[#d4c5a9] [&_blockquote]:pl-4 [&_blockquote]:py-2 [&_blockquote]:italic [&_blockquote]:text-[#4a4a4a] [&_blockquote]:bg-[#faf8f3] [&_blockquote]:my-6
            [&_hr]:border-[#d4c5a9] [&_hr]:my-8
            [&_table]:w-full [&_table]:border-collapse [&_table]:mb-6
            [&_th]:bg-[#f5f1e8] [&_th]:text-[#2c2416] [&_th]:font-semibold [&_th]:p-3 [&_th]:text-left [&_th]:border [&_th]:border-[#d4c5a9]
            [&_td]:text-[#4a4a4a] [&_td]:p-3 [&_td]:border [&_td]:border-[#d4c5a9]
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
