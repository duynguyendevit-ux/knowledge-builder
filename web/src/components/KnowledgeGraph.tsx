import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Node {
  id: string
  name: string
  type: 'concept' | 'summary'
  backlinks?: number
}

interface Link {
  source: string
  target: string
}

interface KnowledgeGraphProps {
  nodes: Node[]
  links: Link[]
}

export default function KnowledgeGraph({ nodes, links }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return

    const width = 800
    const height = 600

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height])

    // Create simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))

    // Create links
    const link = svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#e8dcc8')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6)

    // Create nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<any, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)

    // Add circles
    node.append('circle')
      .attr('r', (d: any) => d.type === 'concept' ? 20 : 15)
      .attr('fill', (d: any) => d.type === 'concept' ? '#c2652a' : '#8b7355')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    // Add labels
    node.append('text')
      .text((d: any) => d.name)
      .attr('x', 0)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('fill', '#2d2520')
      .attr('font-family', 'Manrope, sans-serif')

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`)
    })

    // Drag functions
    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: any) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [nodes, links])

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-[#8b7355]">
        <p>No data to visualize. Upload and process files first.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#e8dcc8] rounded-lg p-6 overflow-hidden">
      <svg ref={svgRef} className="w-full" style={{ maxHeight: '600px' }} />
      <div className="mt-4 flex items-center gap-6 text-sm text-[#8b7355]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#c2652a]"></div>
          <span>Concepts</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#8b7355]"></div>
          <span>Summaries</span>
        </div>
      </div>
    </div>
  )
}
