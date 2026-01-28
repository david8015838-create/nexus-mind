import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNexus } from '../context/NexusContext';
import { useNavigate } from 'react-router-dom';

const RelationshipGraph = () => {
  const { contacts, userProfile, updateContactPosition } = useNexus();
  const navigate = useNavigate();
  const graphRef = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [filterTag, setFilterTag] = useState('全部');

  const categories = useMemo(() => {
    const customCats = userProfile?.categories || ['朋友', '同事', '家人', '交際', '重要'];
    return ['全部', ...customCats];
  }, [userProfile]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const graphData = useMemo(() => {
    if (!contacts) return { nodes: [], links: [] };

    // 根據選擇的標籤過濾聯絡人
    const filteredContacts = filterTag === '全部' 
      ? contacts 
      : contacts.filter(c => (c.tags || []).includes(filterTag));

    const nodes = filteredContacts.map(c => {
      // 根據分類分配顏色
      let nodeColor = '#10b981'; // 預設綠色 (普通)
      if (c.importance > 80 || (c.tags || []).includes('重要')) {
        nodeColor = '#fbbf24'; // 金色 (重要)
      } else if ((c.tags || []).includes('家人')) {
        nodeColor = '#f87171'; // 紅色
      } else if ((c.tags || []).includes('同事')) {
        nodeColor = '#60a5fa'; // 藍色
      } else if ((c.tags || []).includes('朋友')) {
        nodeColor = '#a78bfa'; // 紫色
      }

      const node = {
        id: c.id,
        name: c.name,
        val: (c.importance || 50) / 2, // 縮小一點節點
        tags: c.tags || [],
        color: nodeColor
      };

      // 恢復儲存的位置
      if (c.position) {
        node.fx = c.position.x;
        node.fy = c.position.y;
      }

      return node;
    });

    const links = [];
    // 建立連線邏輯：
    // 1. 如果選取特定分類，只顯示該分類內的關連
    // 2. 如果選取「全部」，則顯示所有關連，但線條顏色可以區分
    for (let i = 0; i < filteredContacts.length; i++) {
      for (let j = i + 1; j < filteredContacts.length; j++) {
        const c1 = filteredContacts[i];
        const c2 = filteredContacts[j];
        
        // 找出共同標籤
        const sharedTags = (c1.tags || []).filter(t => (c2.tags || []).includes(t));
        
        if (sharedTags.length > 0) {
          // 決定連線顏色（取第一個共同標籤）
          const primaryTag = sharedTags[0];
          let lineColor = 'rgba(255, 255, 255, 0.08)';
          
          if (primaryTag === '重要') lineColor = 'rgba(251, 191, 36, 0.2)';
          else if (primaryTag === '家人') lineColor = 'rgba(248, 113, 113, 0.2)';
          else if (primaryTag === '同事') lineColor = 'rgba(96, 165, 250, 0.2)';
          else if (primaryTag === '朋友') lineColor = 'rgba(167, 139, 250, 0.2)';

          links.push({
            source: c1.id,
            target: c2.id,
            value: sharedTags.length * 2,
            color: lineColor,
            label: sharedTags.join(', ')
          });
        }
      }
    }

    return { nodes, links };
  }, [contacts, filterTag]);

  return (
    <div className="w-full h-full bg-[#0a0a0c] relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 pt-12 pb-8 bg-gradient-to-b from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-white">關係圖譜</h1>
            <p className="text-white/40 text-[10px] font-black tracking-[0.2em] uppercase mt-0.5">Social Network Analysis</p>
          </div>
          <button 
            onClick={() => navigate(-1)}
            className="size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-primary transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setFilterTag(cat)}
              className={`flex h-8 shrink-0 items-center justify-center rounded-lg px-4 transition-all duration-300 border text-[10px] font-black uppercase tracking-wider ${
                filterTag === cat 
                  ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' 
                  : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full h-full">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="#0a0a0c"
          nodeLabel="name"
          nodeRelSize={4}
          linkColor={link => link.color}
          linkWidth={link => link.value}
          onNodeClick={(node) => navigate(`/profile/${node.id}`)}
          onNodeDragEnd={node => {
            node.fx = node.x;
            node.fy = node.y;
            updateContactPosition(node.id, { x: node.x, y: node.y });
          }}
          enableNodeDrag={true}
          cooldownTicks={100}
          d3AlphaDecay={0.01}
          d3VelocityDecay={0.1}
          d3Force={(forceName, force) => {
            if (forceName === 'charge') {
              force.strength(-150); // 增加節點間的斥力，讓類別更容易分開
            }
            if (forceName === 'link') {
              force.distance(50); // 縮短連線距離，讓同類別更緊湊
            }
          }}
          linkCanvasObject={(link, ctx, globalScale) => {
            // 檢查節點距離，如果太遠則不畫線
            const MAX_DISTANCE = 150;
            const dx = link.target.x - link.source.x;
            const dy = link.target.y - link.source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > MAX_DISTANCE) return;

            // 畫連線
            const fontSize = 10 / globalScale;
            ctx.beginPath();
            ctx.strokeStyle = link.color;
            ctx.lineWidth = link.value / globalScale;
            ctx.moveTo(link.source.x, link.source.y);
            ctx.lineTo(link.target.x, link.target.y);
            ctx.stroke();
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 11 / globalScale;
            ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
            
            // Draw node circle
            ctx.shadowColor = node.color;
            ctx.shadowBlur = 10 / globalScale;
            ctx.fillStyle = node.color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 4, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Draw label
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText(label, node.x, node.y + 10 / globalScale);
          }}
        />
      </div>

      {/* Legend */}
      <div className="absolute bottom-32 left-6 right-6 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md z-10">
        <div className="grid grid-cols-2 gap-y-2 text-[9px] font-black text-white/30 uppercase tracking-[0.15em]">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#fbbf24] shadow-[0_0_8px_rgba(251,191,36,0.5)]"></div>
            <span>重要 / 核心</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#f87171] shadow-[0_0_8px_rgba(248,113,113,0.5)]"></div>
            <span>家人 / 親屬</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#60a5fa] shadow-[0_0_8px_rgba(96,149,250,0.5)]"></div>
            <span>同事 / 商務</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#a78bfa] shadow-[0_0_8px_rgba(167,139,250,0.5)]"></div>
            <span>朋友 / 社交</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-44 right-6 flex flex-col gap-2 z-10">
        <button 
          onClick={() => graphRef.current.zoomToFit(400)}
          className="size-12 rounded-2xl bg-white/5 border border-white/10 text-white/40 flex items-center justify-center hover:bg-white/10 transition-all active:scale-90"
        >
          <span className="material-symbols-outlined text-[20px]">zoom_in_map</span>
        </button>
      </div>
    </div>
  );
};

export default RelationshipGraph;
