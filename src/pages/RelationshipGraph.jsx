import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNexus } from '../context/NexusContext';
import { useNavigate } from 'react-router-dom';

const RelationshipGraph = () => {
  const { contacts } = useNexus();
  const navigate = useNavigate();
  const graphRef = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo(() => {
    if (!contacts) return { nodes: [], links: [] };

    const nodes = contacts.map(c => ({
      id: c.id,
      name: c.name,
      val: c.importance || 50,
      tags: c.tags || [],
      color: c.importance > 80 ? '#fbbf24' : '#10b981'
    }));

    const links = [];
    // Connect contacts that share tags
    for (let i = 0; i < contacts.length; i++) {
      for (let j = i + 1; j < contacts.length; j++) {
        const c1 = contacts[i];
        const c2 = contacts[j];
        const sharedTags = (c1.tags || []).filter(t => (c2.tags || []).includes(t));
        
        if (sharedTags.length > 0) {
          links.push({
            source: c1.id,
            target: c2.id,
            value: sharedTags.length,
            label: sharedTags.join(', ')
          });
        }
      }
    }

    return { nodes, links };
  }, [contacts]);

  return (
    <div className="w-full h-full bg-[#0a0a0c] relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 px-6 pt-12 pb-8 bg-gradient-to-b from-[#0a0a0c] to-transparent pointer-events-none">
        <h1 className="text-2xl font-black text-white pointer-events-auto">關係圖譜</h1>
        <p className="text-white/40 text-xs font-bold tracking-[0.2em] uppercase mt-1 pointer-events-auto">Social Network Analysis</p>
      </div>

      <div className="w-full h-full pt-20">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width > 480 ? 480 : dimensions.width}
          height={dimensions.height - 160}
          backgroundColor="#0a0a0c"
          nodeLabel="name"
          nodeRelSize={6}
          nodeAutoColorBy="group"
          linkColor={() => 'rgba(255, 255, 255, 0.1)'}
          linkWidth={link => link.value}
          onNodeClick={(node) => navigate(`/profile/${node.id}`)}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Inter, sans-serif`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

            ctx.fillStyle = node.color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'white';
            
            // Text shadow/outline for readability
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(label, node.x, node.y + 10);
            ctx.shadowBlur = 0;
          }}
        />
      </div>

      {/* Legend / Info */}
      <div className="absolute bottom-24 left-6 right-6 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
        <div className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-amber-400"></div>
            <span>核心圈子 (重要)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500"></div>
            <span>普通聯絡</span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => graphRef.current.zoomToFit(400)}
        className="absolute bottom-40 right-6 size-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center hover:bg-primary/20 transition-all active:scale-90"
      >
        <span className="material-symbols-outlined">zoom_in_map</span>
      </button>
    </div>
  );
};

export default RelationshipGraph;
