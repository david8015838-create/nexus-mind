import React, { useMemo, useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useNexus } from '../context/NexusContext';
import { useNavigate } from 'react-router-dom';

const RelationshipGraph = () => {
  const { contacts, userProfile, updateContactPosition, customLinks, addCustomLink, deleteCustomLink } = useNexus();
  const navigate = useNavigate();
  const graphRef = useRef();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [filterTag, setFilterTag] = useState('全部');

  const [hoverNode, setHoverNode] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [imgCache, setImgCache] = useState({});
  const [frame, setFrame] = useState(0);

  // 強制持續重繪以維持動畫
  useEffect(() => {
    let requestRef;
    const animate = () => {
      setFrame(f => f + 1);
      requestRef = requestAnimationFrame(animate);
    };
    requestRef = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef);
  }, []);

  // 新增：連線模式狀態
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

    // 1. 根據選擇的標籤過濾聯絡人
    const filteredContacts = filterTag === '全部' 
      ? contacts 
      : contacts.filter(c => (c.tags || []).includes(filterTag));

    // 2. 建立聯絡人節點 (不再建立分類節點)
    filteredContacts.forEach(c => {
      let nodeColor = '#10b981'; // 預設綠色
      const tags = c.tags || [];
      
      // 根據標籤決定主色調
      if (tags.includes('重要')) nodeColor = '#fbbf24';
      else if (tags.includes('家人')) nodeColor = '#f87171';
      else if (tags.includes('同事')) nodeColor = '#60a5fa';
      else if (tags.includes('朋友')) nodeColor = '#a78bfa';

      const contactNode = {
        id: c.id,
        name: c.name,
        // val 決定節點引力大小，重要性越高引力越強
        val: (c.importance || 50) / 10 + 5,
        tags: tags,
        color: nodeColor,
        isContact: true,
        avatar: c.avatar,
        importance: c.importance || 50
      };

      if (c.position) {
        contactNode.fx = c.position.x;
        contactNode.fy = c.position.y;
      }

      nodes.push(contactNode);
    });

    // 3. 建立聯絡人之間的「自然引力連線」與「手動連線」
    // 邏輯：預設僅連線同分類的人，或手動建立的連線
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        
        // 檢查是否有手動建立的連線
        const customLink = customLinks?.find(l => 
          (l.sourceId === n1.id && l.targetId === n2.id) || 
          (l.sourceId === n2.id && l.targetId === n1.id)
        );
        const hasCustomLink = !!customLink;

        // 只有「全部」模式下才考慮 sharedTags，且必須大於 0
        // 如果是特定標籤模式，則只顯示該標籤內的連線
        const sharedTags = n1.tags.filter(t => n2.tags.includes(t));
        
        // 嚴格過濾：
        // 1. 如果有手動連線，一定顯示
        // 2. 如果沒有手動連線，則必須：
        //    a. 兩個人擁有的共同標籤中，包含任一主要分類標籤
        const mainCategories = categories.filter(c => c !== '全部');
        const hasSharedMainCategory = sharedTags.some(t => mainCategories.includes(t));
        
        let shouldShowAutoLink = false;
        if (filterTag === '全部') {
          // 在全部視角下，只連起具有共同「主要分類標籤」的人
          shouldShowAutoLink = hasSharedMainCategory;
        } else {
          // 在特定分類下，只連起該分類內的人
          shouldShowAutoLink = n1.tags.includes(filterTag) && n2.tags.includes(filterTag);
        }

        if (hasCustomLink || shouldShowAutoLink) {
          links.push({
            id: hasCustomLink ? customLink.id : `auto-${n1.id}-${n2.id}`,
            source: n1.id,
            target: n2.id,
            // 手動連線賦予更強的視覺表現
            value: hasCustomLink ? 8 : sharedTags.length * 2,
            strength: hasCustomLink ? 0.5 : sharedTags.length * 0.2,
            distance: hasCustomLink ? 100 : 150 / (sharedTags.length + 0.5),
            color: hasCustomLink ? '#ffffff' : n1.color, 
            sharedTags: sharedTags,
            isCustom: hasCustomLink
          });
        }
      }
    }

    return { nodes, links };
  }, [contacts, filterTag, customLinks]);

  const handleNodeClick = (node) => {
    if (isConnectMode) {
      if (!connectSource) {
        setConnectSource(node);
      } else if (connectSource.id !== node.id) {
        // 建立連線
        addCustomLink(connectSource.id, node.id);
        setConnectSource(null);
      } else {
        setConnectSource(null);
      }
      return;
    }

    const now = Date.now();
    const DOUBLE_CLICK_DELAY = 300; // 300ms 判定為雙擊

    if (hoverNode && hoverNode.id === node.id && (now - lastClickTime) < DOUBLE_CLICK_DELAY) {
      // 雙擊：開啟檔案
      navigate(`/profile/${node.id}`);
    } else {
      // 單擊：僅選取
      setHoverNode(node);
      setSelectedLink(null);
    }
    setLastClickTime(now);
  };

  return (
    <div 
      className="w-full h-full bg-[#050507] relative overflow-hidden"
      onMouseMove={(e) => {
        if (isConnectMode && connectSource) {
          setMousePos({ x: e.clientX, y: e.clientY });
        }
      }}
    >
      {/* 增加背景星空效果 */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1a2e_0%,transparent_100%)]"></div>
        {[...Array(20)].map((_, i) => (
          <div 
            key={i}
            className="absolute rounded-full bg-white animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${Math.random() * 3 + 2}s`
            }}
          ></div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 pt-12 pb-8 bg-gradient-to-b from-[#050507] via-[#050507]/80 to-transparent">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">人脈星系</h1>
            <p className="text-primary/60 text-[10px] font-black tracking-[0.3em] uppercase mt-0.5">Nexus Galaxy System</p>
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
        {/* 連線模式下的預覽線 */}
        {isConnectMode && connectSource && (
          <svg className="absolute inset-0 pointer-events-none z-30 w-full h-full">
            <line 
              x1={graphRef.current?.nodeRelSize ? graphRef.current.nodeCanvasObject ? dimensions.width/2 : 0 : 0} 
              y1={0} 
              x2={0} 
              y2={0} 
              stroke="white" 
              strokeWidth="2" 
              strokeDasharray="5,5"
              className="animate-pulse"
            />
            {/* 這裡我們改用更簡單的方式：在 Canvas 繪製中處理，或者直接用一個跟隨鼠標的 div */}
          </svg>
        )}

        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="transparent"
          nodeRelSize={4}
          linkPointerAreaRadius={10}
          onNodeClick={handleNodeClick}
          onLinkClick={(link) => {
            if (link.isCustom) {
              setSelectedLink(link);
              setHoverNode(null);
            }
          }}
          onBackgroundClick={() => {
            setHoverNode(null);
            setSelectedLink(null);
            if (isConnectMode) {
              setConnectSource(null);
            }
          }}
          onNodeHover={node => {
            if (node) setHoverNode(node);
          }}
          onNodeDragEnd={node => {
            node.fx = node.x;
            node.fy = node.y;
            updateContactPosition(node.id, { x: node.x, y: node.y });
          }}
          enableNodeDrag={true}
          cooldownTicks={100}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          d3Force={(forceName, force) => {
            if (forceName === 'charge') {
              force.strength(-500).distanceMax(1000); 
            }
            if (forceName === 'link') {
              force.distance(link => link.distance); 
              force.strength(link => link.strength);
            }
            if (forceName === 'collision') {
              // 增加碰撞力，防止節點重疊
              force.radius(node => (node.val * 2) + 20);
            }
          }}
          linkCanvasObject={(link, ctx, globalScale) => {
            if (!link.source || !link.target) return;
            
            const getID = (node) => typeof node === 'object' ? node.id : node;
            const sourceId = getID(link.source);
            const targetId = getID(link.target);
            const hoverId = hoverNode ? hoverNode.id : null;
            const isSelected = selectedLink && (
              (getID(selectedLink.source) === sourceId && getID(selectedLink.target) === targetId) ||
              (getID(selectedLink.source) === targetId && getID(selectedLink.target) === sourceId)
            );

            const isRelated = (hoverId && (sourceId === hoverId || targetId === hoverId)) || isSelected;
            
            if (hoverId && !isRelated && !isSelected) return; // 非相關連線在選取時完全隱藏
            if (selectedLink && !isSelected) return; // 選取特定連線時隱藏其他連線

            const sx = link.source.x;
            const sy = link.source.y;
            const tx = link.target.x;
            const ty = link.target.y;
            
            if (sx === undefined || sy === undefined || tx === undefined || ty === undefined) return;

            // 繪製粒子流連線
            const time = Date.now() * 0.001;
            const opacity = isSelected ? 1.0 : (isRelated ? 0.8 : (link.isCustom ? 0.6 : 0.2));
            
            ctx.beginPath();
            const gradient = ctx.createLinearGradient(sx, sy, tx, ty);
            
            if (link.isCustom || isSelected) {
              const color = isSelected ? '#ef4444' : '#ffffff'; // 選取時變紅
              gradient.addColorStop(0, `rgba(${isSelected ? '239, 68, 68' : '255, 255, 255'}, 0)`);
              gradient.addColorStop(0.5, `rgba(${isSelected ? '239, 68, 68' : '255, 255, 255'}, ${opacity})`);
              gradient.addColorStop(1, `rgba(${isSelected ? '239, 68, 68' : '255, 255, 255'}, 0)`);
            } else {
              gradient.addColorStop(0, `${link.color}00`);
              gradient.addColorStop(0.5, `${link.color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`);
              gradient.addColorStop(1, `${link.color}00`);
            }
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = (isRelated || link.isCustom || isSelected ? 4 : 1) / Math.max(0.5, globalScale);
            ctx.moveTo(sx, sy);
            ctx.lineTo(tx, ty);
            ctx.stroke();

            // 繪製流動的小粒子
            if (isRelated || link.isCustom || isSelected) {
              const particlePos = (time % 1);
              const px = sx + (tx - sx) * particlePos;
              const py = sy + (ty - sy) * particlePos;
              
              ctx.fillStyle = isSelected ? '#ef4444' : (link.isCustom ? '#ffffff' : link.color);
              ctx.beginPath();
              ctx.arc(px, py, (link.isCustom || isSelected ? 3 : 2) / globalScale, 0, 2 * Math.PI);
              ctx.fill();
              
              // 為手動連線增加發光粒子
              if (link.isCustom || isSelected) {
                ctx.shadowBlur = isSelected ? 15 : 10;
                ctx.shadowColor = isSelected ? '#ef4444' : '#ffffff';
                ctx.fill();
                ctx.shadowBlur = 0;
              }
            }
          }}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const isHovered = hoverNode && node.id === hoverNode.id;
            const getID = (n) => typeof n === 'object' ? n.id : n;
            const isRelated = hoverNode && !isHovered && graphData.links.some(l => {
              const sId = getID(l.source);
              const tId = getID(l.target);
              return (sId === node.id && tId === hoverNode.id) || (tId === node.id && sId === hoverNode.id);
            });

            // 呼吸感邏輯 - 顯著增強縮放與頻率
            const seed = (node.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % 100;
            const time = (Date.now() + seed * 100) * 0.003; // 加快頻率
            const breath = Math.sin(time) * 0.25 + 1.1; // 0.85 ~ 1.35 之間的縮放，基礎設為 1.1 讓它偏大
            const glowBreath = Math.sin(time * 1.5) * 0.4 + 0.6; // 0.2 ~ 1.0 之間的發光感更強

            const safeScale = Math.max(0.1, globalScale);
            const baseSize = (10 + (node.importance / 15)) * breath; // 增大基礎尺寸
            const size = (isHovered ? baseSize * 1.6 : (isRelated ? baseSize * 1.2 : baseSize)) / safeScale;
            
            if (node.x === undefined || node.y === undefined) return;

            // 1. 軌道環 (Orbits)
            if (isHovered || isRelated) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, size * 1.5, 0, 2 * Math.PI);
              ctx.strokeStyle = `${node.color}40`;
              ctx.lineWidth = 1 / safeScale;
              ctx.setLineDash([5, 5]);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            // 2. 背景發光 (Glow)
            const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, size * 3.5);
            const alphaVal = isHovered ? 0.5 : (isRelated ? 0.3 : 0.15);
            const alpha = Math.floor(alphaVal * glowBreath * 255).toString(16).padStart(2, '0');
            
            gradient.addColorStop(0, `${node.color}${alpha}`);
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * 3.5, 0, 2 * Math.PI);
            ctx.fill();

            // 3. 頭像繪製
            ctx.save();
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.clip();

            const img = imgCache[node.id];
            if (img) {
              ctx.drawImage(img, node.x - size, node.y - size, size * 2, size * 2);
            } else {
              ctx.fillStyle = '#1a1a2e';
              ctx.fill();
              ctx.fillStyle = node.color;
              
              // 繪製全名，根據長度調整字型大小
              const name = node.name || 'Unknown';
              const fontSize = Math.max(4, size * 2 / (name.length > 3 ? name.length * 0.7 : 2));
              ctx.font = `bold ${fontSize}px "Inter"`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(name, node.x, node.y);
            }
            ctx.restore();

            // 4. 外邊框
            ctx.strokeStyle = isHovered ? '#ffffff' : node.color;
            ctx.lineWidth = (isHovered ? 3 : 2) / safeScale;
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
            ctx.stroke();

            // 5. 發光點綴
            if (isHovered) {
              ctx.shadowBlur = 15 * glowBreath;
              ctx.shadowColor = '#ffffff';
              ctx.stroke();
              ctx.shadowBlur = 0;
            }

            // 5. 標籤
            if (isHovered || safeScale > 1.2) {
              const labelY = node.y + size + (12 / safeScale);
              ctx.font = `${isHovered ? '900' : '600'} ${12 / safeScale}px "Inter"`;
              
              // 標籤背景
              const textWidth = ctx.measureText(node.name).width;
              ctx.fillStyle = 'rgba(0,0,0,0.6)';
              ctx.roundRect(node.x - textWidth/2 - 5, labelY - 8, textWidth + 10, 16, 4);
              ctx.fill();

              ctx.textAlign = 'center';
              ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
              ctx.fillText(node.name, node.x, labelY + 4);
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
        <button 
          onClick={() => {
            setIsConnectMode(!isConnectMode);
            setConnectSource(null);
          }}
          className={`size-12 rounded-2xl border flex items-center justify-center transition-all active:scale-90 ${
            isConnectMode 
              ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30' 
              : 'bg-white/5 border-white/10 text-white/40'
          }`}
          title={isConnectMode ? "關閉連線模式" : "開啟連線模式"}
        >
          <span className="material-symbols-outlined text-[20px]">
            {isConnectMode ? 'link_off' : 'add_link'}
          </span>
        </button>

        {isConnectMode && (
          <div className="h-12 px-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-[12px] font-black uppercase tracking-wider flex items-center justify-center shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
            {connectSource 
              ? `正在連線 ${connectSource.name} ... 點擊目標聯絡人` 
              : '請選擇第一個聯絡人開始建立連線'}
          </div>
        )}

        {selectedLink && (
          <button 
            onClick={() => {
              deleteCustomLink(selectedLink.id);
              setSelectedLink(null);
            }}
            className="h-12 px-6 rounded-2xl bg-red-500 text-white text-[12px] font-black uppercase tracking-wider flex items-center justify-center shadow-lg shadow-red-500/30 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <span className="material-symbols-outlined mr-2 text-[18px]">link_off</span>
            刪除此連線
          </button>
        )}

        {hoverNode && hoverNode.isContact && !isConnectMode && (
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
