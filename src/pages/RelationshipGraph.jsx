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

  const [hoverNode, setHoverNode] = useState(null);
  const [imgCache, setImgCache] = useState({});

  // 預載入圖片快取
  useEffect(() => {
    if (!contacts) return;
    contacts.forEach(c => {
      if (c.avatar && !imgCache[c.id]) {
        const img = new Image();
        img.src = c.avatar;
        img.onload = () => {
          setImgCache(prev => ({ ...prev, [c.id]: img }));
        };
      }
    });
  }, [contacts]);

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

    const nodes = [];
    const links = [];
    const categoryNodeMap = new Map();

    // 1. 根據選擇的標籤過濾聯絡人
    const filteredContacts = filterTag === '全部' 
      ? contacts 
      : contacts.filter(c => (c.tags || []).includes(filterTag));

    // 2. 建立分類節點 (Hubs)
    // 只有在「全部」模式下才顯示分類中心點，或者顯示目前過濾的分類
    const activeCategories = filterTag === '全部' 
      ? categories.filter(c => c !== '全部')
      : [filterTag];

    activeCategories.forEach(cat => {
      const catId = `cat-${cat}`;
      let catColor = '#ffffff20';
      if (cat === '重要') catColor = '#fbbf24';
      else if (cat === '家人') catColor = '#f87171';
      else if (cat === '同事') catColor = '#60a5fa';
      else if (cat === '朋友') catColor = '#a78bfa';

      const catNode = {
        id: catId,
        name: cat,
        isCategory: true,
        val: 15, // 分類節點大一點
        color: catColor
      };
      nodes.push(catNode);
      categoryNodeMap.set(cat, catNode);
    });

    // 3. 建立聯絡人節點
    filteredContacts.forEach(c => {
      let nodeColor = '#10b981';
      if (c.importance > 80 || (c.tags || []).includes('重要')) nodeColor = '#fbbf24';
      else if ((c.tags || []).includes('家人')) nodeColor = '#f87171';
      else if ((c.tags || []).includes('同事')) nodeColor = '#60a5fa';
      else if ((c.tags || []).includes('朋友')) nodeColor = '#a78bfa';

      const contactNode = {
        id: c.id,
        name: c.name,
        val: (c.importance || 50) / 4 + 5,
        tags: c.tags || [],
        color: nodeColor,
        isContact: true,
        avatar: c.avatar
      };

      // 恢復儲存的位置
      if (c.position) {
        contactNode.fx = c.position.x;
        contactNode.fy = c.position.y;
      }

      nodes.push(contactNode);

      // 4. 建立聯絡人與分類的連線 (Hub & Spoke)
      // 這解決了 N-to-N 連線造成的混亂，改為 N-to-1
      (c.tags || []).forEach(tag => {
        if (categoryNodeMap.has(tag)) {
          links.push({
            source: contactNode.id,
            target: `cat-${tag}`,
            value: 1,
            color: 'rgba(255, 255, 255, 0.05)',
            isHubLink: true
          });
        }
      });
    });

    // 5. 建立聯絡人之間的「直接強連線」 (僅限於共同擁有 2 個以上標籤，或是特別指定的)
    for (let i = 0; i < filteredContacts.length; i++) {
      for (let j = i + 1; j < filteredContacts.length; j++) {
        const c1 = filteredContacts[i];
        const c2 = filteredContacts[j];
        const sharedTags = (c1.tags || []).filter(t => (c2.tags || []).includes(t));
        
        // 只有共同標籤大於 1 個，或者其中一個是「重要」時，才建立直接連線
        if (sharedTags.length > 1 || (sharedTags.length === 1 && sharedTags.includes('重要'))) {
          links.push({
            source: c1.id,
            target: c2.id,
            value: sharedTags.length * 2,
            color: 'rgba(255, 255, 255, 0.1)',
            isDirectLink: true
          });
        }
      }
    }

    return { nodes, links };
  }, [contacts, filterTag, categories]);

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
          onNodeClick={(node) => {
            // 手機端邏輯：第一次點擊選取（顯示關係），第二次點擊進入
            if (hoverNode && hoverNode.id === node.id) {
              if (node.isCategory) {
                setFilterTag(node.name);
                setHoverNode(null);
              } else {
                navigate(`/profile/${node.id}`);
              }
            } else {
              setHoverNode(node);
            }
          }}
          onBackgroundClick={() => setHoverNode(null)}
          onNodeHover={node => {
            // 保留滑鼠懸停功能，但在觸控裝置上主要靠 click
            if (node) setHoverNode(node);
          }}
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
              force.strength(node => node.isCategory ? -1200 : -300); 
            }
            if (forceName === 'link') {
              force.distance(link => link.isHubLink ? 120 : 60); 
              force.strength(link => link.isHubLink ? 0.4 : 0.05);
            }
          }}
          linkCanvasObject={(link, ctx, globalScale) => {
            if (!link.source || !link.target) return;
            
            const getID = (node) => typeof node === 'object' ? node.id : node;
            const sourceId = getID(link.source);
            const targetId = getID(link.target);
            const hoverId = hoverNode ? hoverNode.id : null;

            const isRelated = hoverId && (sourceId === hoverId || targetId === hoverId);
            const opacity = hoverNode ? (isRelated ? 0.6 : 0.02) : 0.15;
            
            // 檢查節點位置是否存在
            const sx = link.source.x;
            const sy = link.source.y;
            const tx = link.target.x;
            const ty = link.target.y;
            
            if (sx === undefined || sy === undefined || tx === undefined || ty === undefined) return;

            // 檢查節點距離，如果太遠則不畫線
            const MAX_DISTANCE = 250;
            const dx = tx - sx;
            const dy = ty - sy;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > MAX_DISTANCE) return;

            // 畫連線
            ctx.beginPath();
            ctx.strokeStyle = isRelated ? '#00e5ff' : link.color;
            ctx.globalAlpha = opacity;
            ctx.lineWidth = (isRelated ? 2 : 0.5) / Math.max(0.5, globalScale);
            ctx.moveTo(sx, sy);
            ctx.lineTo(tx, ty);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const isHovered = hoverNode && node.id === hoverNode.id;
            
            const getID = (n) => typeof n === 'object' ? n.id : n;
            const isRelated = hoverNode && !isHovered && graphData.links.some(l => {
              const sId = getID(l.source);
              const tId = getID(l.target);
              const hId = hoverNode.id;
              const nId = node.id;
              return (sId === nId && tId === hId) || (tId === nId && sId === hId);
            });

            const label = node.name;
            const baseSize = node.isCategory ? 12 : 7;
            const safeScale = Math.max(0.1, globalScale);
            const size = (isHovered ? baseSize * 1.5 : (isRelated ? baseSize * 1.2 : baseSize)) / safeScale;
            
            if (node.x === undefined || node.y === undefined) return;

            // 背景光暈 (Halo)
            if (isHovered || node.isCategory || (node.isContact && node.val > 20)) {
              try {
                const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 2.5);
                gradient.addColorStop(0, `${node.color}${isHovered ? '60' : '30'}`);
                gradient.addColorStop(1, 'transparent');
                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(node.x, node.y, size * 2.5, 0, 2 * Math.PI);
                ctx.fill();
              } catch (e) {
                // 防止 gradient 報錯導致黑屏
              }
            }

            if (node.isCategory) {
              // 分類 Hub 繪製
              ctx.fillStyle = '#0a0a0c';
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
              ctx.fill();
              
              ctx.strokeStyle = node.color;
              ctx.lineWidth = 2 / safeScale;
              ctx.setLineDash([2, 2]);
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
              ctx.stroke();
              ctx.setLineDash([]);

              // 文字
              ctx.font = `900 ${12 / safeScale}px "Inter"`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = '#ffffff';
              ctx.fillText(label, node.x, node.y);
            } else {
              // 聯絡人節點繪製
              ctx.save();
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
              ctx.clip();

              const img = imgCache[node.id];
              if (img) {
                ctx.drawImage(img, node.x - size, node.y - size, size * 2, size * 2);
              } else {
                ctx.fillStyle = node.color;
                ctx.fillRect(node.x - size, node.y - size, size * 2, size * 2);
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${size}px "Inter"`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label.charAt(0), node.x, node.y);
              }
              ctx.restore();

              // 外圈
              ctx.strokeStyle = isHovered ? '#00e5ff' : node.color;
              ctx.lineWidth = (isHovered ? 3 : 1.5) / safeScale;
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
              ctx.stroke();

              // 名字標籤
              if (isHovered || safeScale > 1.5) {
                ctx.font = `${isHovered ? '900' : '500'} ${10 / safeScale}px "Inter"`;
                ctx.textAlign = 'center';
                ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.5)';
                ctx.fillText(label, node.x, node.y + size + 10 / safeScale);
              }
            }
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
        {hoverNode && hoverNode.isContact && (
          <button 
            onClick={() => navigate(`/profile/${hoverNode.id}`)}
            className="h-12 px-6 rounded-2xl bg-primary text-white text-[12px] font-black uppercase tracking-wider flex items-center justify-center shadow-lg shadow-primary/30 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            查看 {hoverNode.name}
          </button>
        )}
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
