import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient'; 
import { 
  Factory, Save, Settings, AlertCircle, 
  CheckCircle2, XCircle, Activity, X, GripVertical, Trash2, Plus, Calendar, Package, BarChart3, MousePointer2, PlusCircle, RotateCcw, Tag, Layers, ChevronDown
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

// --- [Utility] 안전한 데이터 처리 및 ID 생성 ---

const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// ID 중복 방지를 위한 UUID 생성기
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'r-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

// JSON 파싱 에러 방지
const safeParse = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    const parsed = JSON.parse(item);
    return parsed || defaultValue;
  } catch (e) {
    console.error(`JSON Parsing Error [${key}]:`, e);
    return defaultValue;
  }
};

// --- [Constants] ---

const BU_CATEGORIES = [
  { id: 'OLED', label: 'OLED 소재', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'API', label: 'API/중간체', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: '신사업', label: '신사업', color: 'bg-amber-100 text-amber-700 border-amber-200' }
];

const CAPACITY_STYLES = {
  100:  { size: 60,  color: 'bg-slate-100 border-slate-400 text-slate-600' },
  200:  { size: 65,  color: 'bg-blue-50 border-blue-300 text-blue-600' },
  500:  { size: 70,  color: 'bg-cyan-50 border-cyan-300 text-cyan-600' },
  1000: { size: 80,  color: 'bg-teal-50 border-teal-400 text-teal-600' },
  2000: { size: 90,  color: 'bg-emerald-50 border-emerald-400 text-emerald-600' },
  3000: { size: 100, color: 'bg-amber-50 border-amber-400 text-amber-600' },
  5000: { size: 110, color: 'bg-rose-50 border-rose-400 text-rose-600' },
  default: { size: 80, color: 'bg-indigo-50 border-indigo-300 text-indigo-600' }
};

const ROW_HEIGHT = 160; 

const getCategoryColor = (catId) => {
    const found = BU_CATEGORIES.find(c => c.id === catId);
    return found ? found.color : 'bg-slate-100 text-slate-600 border-slate-200';
};

// --- [Helper] 표준 가동률 계산 ---
const calculateStandardUtilization = (items, currentYearMonth) => {
  if (!items || !Array.isArray(items) || items.length === 0 || !currentYearMonth) return 0;
  
  const [yearStr, monthStr] = currentYearMonth.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);
  
  if (isNaN(year) || isNaN(month)) return 0;

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0); 
  const totalDaysInMonth = monthEnd.getDate();

  let intervals = [];
  items.forEach(item => {
    if (!item.startDate || !item.endDate) return;
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    if (end < monthStart || start > monthEnd) return;

    const effectiveStart = start < monthStart ? monthStart : start;
    const effectiveEnd = end > monthEnd ? monthEnd : end;
    
    intervals.push({
      start: effectiveStart.getDate(),
      end: effectiveEnd.getDate()
    });
  });

  if (intervals.length === 0) return 0;

  intervals.sort((a, b) => a.start - b.start);
  
  const merged = [];
  let currentStart = intervals[0].start;
  let currentEnd = intervals[0].end;

  for (let i = 1; i < intervals.length; i++) {
    if (intervals[i].start <= currentEnd + 1) { 
      currentEnd = Math.max(currentEnd, intervals[i].end);
    } else {
      merged.push({ start: currentStart, end: currentEnd });
      currentStart = intervals[i].start;
      currentEnd = intervals[i].end;
    }
  }
  merged.push({ start: currentStart, end: currentEnd });

  const totalOccupiedDays = merged.reduce((acc, curr) => acc + (curr.end - curr.start + 1), 0);
  const util = (totalOccupiedDays / totalDaysInMonth) * 100;
  return util.toFixed(1);
};

// --- [Sub Component] Reactor Node ---
const ReactorNode = React.memo(({ 
  reactor, logData, isEditMode, onMouseDown, onClick, onDelete 
}) => {
  const util = safeNum(logData?.utilization);
  const status = logData?.status || 'Idle';
  const capacity = reactor.capacity || 1000;
  const itemCount = Array.isArray(logData?.items) ? logData.items.length : 0;
  
  const styleSet = CAPACITY_STYLES[capacity] || CAPACITY_STYLES.default;
  const isRunning = status === 'Running';

  const gaugeData = [{ name: 'Util', value: util }, { name: 'Rest', value: 100 - util }];
  const displayProduct = itemCount > 0 && logData?.items 
    ? (itemCount > 1 ? `${logData.items[0].name} +${itemCount-1}` : logData.items[0].name)
    : logData?.product;

  return (
    <div
      className={`absolute flex flex-col items-center justify-center transition-transform duration-200 select-none group
        ${isEditMode ? 'cursor-move z-20' : 'cursor-pointer z-10 hover:brightness-95'}
      `}
      style={{ 
        left: reactor.x_pos, 
        top: reactor.y_pos,
        width: styleSet.size,
        height: styleSet.size,
        transform: 'translate(-50%, -50%)'
      }}
      onMouseDown={(e) => isEditMode && onMouseDown(e, reactor.id)}
      onClick={() => !isEditMode && onClick(reactor)} 
    >
      {isEditMode && (
        <button 
          onMouseDown={(e) => { e.stopPropagation(); onDelete(reactor.id); }}
          className="absolute -top-2 -right-2 z-50 bg-rose-500 text-white rounded-full p-1 shadow-md hover:bg-rose-600 transform scale-0 group-hover:scale-100 transition-transform"
          title="Delete Reactor"
        >
          <X size={12} strokeWidth={3}/>
        </button>
      )}

      <div className={`relative w-full h-full rounded-full border-4 shadow-md flex flex-col items-center justify-center bg-white ${styleSet.color}`}>
        <div className="absolute inset-0 opacity-20 pointer-events-none">
           <ResponsiveContainer width="100%" height="100%">
             <PieChart>
               <Pie data={gaugeData} innerRadius="40%" outerRadius="50%" startAngle={90} endAngle={-270} dataKey="value" stroke="none">
                 <Cell fill="#000" />
                 <Cell fill="transparent" />
               </Pie>
             </PieChart>
           </ResponsiveContainer>
        </div>
        <div className="text-center z-10 flex flex-col items-center leading-none">
           <span className="text-[9px] font-extrabold opacity-60 mb-0.5">{capacity}L</span>
           <span className="text-xs font-black text-slate-800">{reactor.name}</span>
           <span className={`text-[9px] font-bold mt-1 px-1 rounded-full ${isRunning ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {util}%
           </span>
        </div>
        <div className="absolute top-0 right-0 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
           {status === 'Running' && <Activity size={14} className="text-emerald-500 animate-pulse"/>}
           {status === 'Maintenance' && <XCircle size={14} className="text-rose-500"/>}
           {status === 'Idle' && <AlertCircle size={14} className="text-slate-300"/>}
        </div>
      </div>
      
      {displayProduct && (
        <div className={`absolute -bottom-6 bg-slate-800/90 text-white text-[10px] px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap z-30 flex items-center gap-1 transition-opacity ${isEditMode ? 'opacity-50' : 'opacity-100'}`}>
          {itemCount > 1 && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block"/>}
          {displayProduct}
        </div>
      )}
    </div>
  );
});

// --- [Main Component] ---
const Chapter7_ReactorLayout = ({ 
  reactorLogs = [], 
  reactorConfig = [],
  onUpdateLayout, 
  onUpdateLog, 
  selectedMonth 
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [allReactorsMap, setAllReactorsMap] = useState(() => safeParse('matflow_reactors_monthly_v2', {}));
  const [currentReactors, setCurrentReactors] = useState([]);
  const [localLogs, setLocalLogs] = useState(() => safeParse('matflow_logs_v2', Array.isArray(reactorLogs) ? reactorLogs : []));
  const [isSaving, setIsSaving] = useState(false); 

  useEffect(() => {
    if (Array.isArray(reactorLogs)) {
      setLocalLogs(reactorLogs);
    }
  }, [reactorLogs]);

  useEffect(() => {
    if (reactorConfig && reactorConfig.length > 0) {
        setCurrentReactors(reactorConfig);
        if (selectedMonth) {
            setAllReactorsMap(prev => ({ ...prev, [selectedMonth]: reactorConfig }));
        }
    }
  }, [reactorConfig, selectedMonth]);

  const [factoryZones, setFactoryZones] = useState(() => {
    const defaultZones = [
      { id: 0, name: 'Synthesis Factory 1' },
      { id: 1, name: 'Synthesis Factory 2' },
      { id: 2, name: 'Purification Plant' },
      { id: 3, name: 'Pilot Plant' },
    ];
    return safeParse('matflow_zones_v2', defaultZones);
  });

  const [selectedReactor, setSelectedReactor] = useState(null);
  const containerRef = useRef(null);
  const [draggingState, setDraggingState] = useState(null); 
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!selectedMonth) return;
    if (reactorConfig && reactorConfig.length > 0) return;

    const existingLayout = allReactorsMap[selectedMonth];

    if (existingLayout && Array.isArray(existingLayout)) {
        setCurrentReactors(existingLayout);
    } else {
        const sortedMonths = Object.keys(allReactorsMap).sort();
        const prevMonth = sortedMonths.filter(m => m < selectedMonth).pop();

        if (prevMonth && allReactorsMap[prevMonth]) {
            const copiedLayout = JSON.parse(JSON.stringify(allReactorsMap[prevMonth]));
            setCurrentReactors(copiedLayout);
            
            setAllReactorsMap(prev => {
                const updated = { ...prev, [selectedMonth]: copiedLayout };
                localStorage.setItem('matflow_reactors_monthly_v2', JSON.stringify(updated));
                return updated;
            });
            if (onUpdateLayout) onUpdateLayout(copiedLayout);

        } else {
            const oldVersion = localStorage.getItem('matflow_reactors_v2');
            if (oldVersion) {
                try {
                    const parsedOld = JSON.parse(oldVersion);
                    if (Array.isArray(parsedOld)) {
                        setCurrentReactors(parsedOld);
                        return; 
                    }
                } catch(e) {}
            }
            setCurrentReactors([]);
        }
    }
  }, [selectedMonth, allReactorsMap, reactorConfig, onUpdateLayout]);

  useEffect(() => { localStorage.setItem('matflow_logs_v2', JSON.stringify(localLogs)); }, [localLogs]);
  useEffect(() => { localStorage.setItem('matflow_zones_v2', JSON.stringify(factoryZones)); }, [factoryZones]);

  // --- Modal & Calc State ---
  const [editingItems, setEditingItems] = useState([]);
  const [calculatedUtil, setCalculatedUtil] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);

  useEffect(() => {
    if (selectedReactor) {
      const log = (localLogs || []).find(l => l.reactor_id === selectedReactor.id && l.month === selectedMonth);
      
      let items = [];
      if (Array.isArray(log?.items) && log.items.length > 0) {
          items = log.items.map(item => ({ ...item, id: item.id || generateId() }));
      } else if (log?.product) {
          items = [{ id: generateId(), category: 'OLED', name: log.product, startDate: `${selectedMonth}-01`, endDate: `${selectedMonth}-28`, quantity: 0, price: 0 }];
      } else {
          if (selectedMonth) {
            items = [{ id: generateId(), category: 'OLED', name: '', startDate: `${selectedMonth}-01`, endDate: `${selectedMonth}-05`, quantity: 0, price: 0 }];
          }
      }
      setEditingItems(items);
    }
  }, [selectedReactor, selectedMonth, localLogs]); 

  useEffect(() => {
    const util = calculateStandardUtilization(editingItems, selectedMonth);
    setCalculatedUtil(util);
    const revenue = editingItems.reduce((sum, item) => {
        return sum + ((safeNum(item.quantity) * safeNum(item.price))) / 1000000000;
    }, 0);
    setTotalRevenue(revenue);
  }, [editingItems, selectedMonth]);

  // --- Handlers: Layout & Zones ---
  const handleZoneNameChange = (id, newName) => {
    setFactoryZones(prev => prev.map(z => z.id === id ? { ...z, name: newName } : z));
  };

  const handleAddFactoryZone = () => {
    const newId = factoryZones.length > 0 ? Math.max(...factoryZones.map(z => z.id)) + 1 : 0;
    setFactoryZones([...factoryZones, { id: newId, name: `New Factory ${newId + 1}` }]);
  };

  const handleExistingDragStart = (e, id) => {
    if (!isEditMode) return;
    const reactor = currentReactors.find(r => r.id === id);
    if (!reactor) return;
    setDraggingState({ type: 'EXISTING', id: id, capacity: reactor.capacity || 1000 });
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handlePaletteDragStart = (e, capacity) => {
    if (!isEditMode) return;
    setDraggingState({ type: 'NEW', capacity: capacity, id: generateId() });
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!draggingState) return;
    e.preventDefault();
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (e) => {
    if (draggingState && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const isInside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      if (isInside) {
        const relX = e.clientX - rect.left + containerRef.current.scrollLeft;
        const relY = e.clientY - rect.top + containerRef.current.scrollTop;
        const rowIndex = Math.floor(relY / ROW_HEIGHT);
        const snappedY = (rowIndex * ROW_HEIGHT) + (ROW_HEIGHT / 2);
        const snappedX = Math.round(relX / 20) * 20;

        if (rowIndex >= 0 && rowIndex < factoryZones.length) {
            if (draggingState.type === 'EXISTING') {
              setCurrentReactors(prev => prev.map(r => r.id === draggingState.id ? { ...r, x_pos: snappedX, y_pos: snappedY } : r));
            } else if (draggingState.type === 'NEW') {
              const newReactor = {
                id: draggingState.id, 
                name: `R-${Math.floor(Math.random()*1000)}`,
                capacity: draggingState.capacity,
                type: 'GL',
                x_pos: snappedX,
                y_pos: snappedY
              };
              setCurrentReactors(prev => [...prev, newReactor]);
            }
        }
      }
    }
    setDraggingState(null);
  };

  useEffect(() => {
    if (draggingState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingState]);

  const handleSaveChanges = () => {
    if (!selectedMonth) return alert("월을 선택해주세요.");
    const updatedMap = { ...allReactorsMap, [selectedMonth]: currentReactors };
    setAllReactorsMap(updatedMap);
    localStorage.setItem('matflow_reactors_monthly_v2', JSON.stringify(updatedMap));
    if (onUpdateLayout) onUpdateLayout(currentReactors);
    setIsEditMode(false);
  };

  const handleDirectDelete = (id) => {
    if(window.confirm("Delete this reactor immediately?")) {
      const updatedList = currentReactors.filter(r => r.id !== id);
      setCurrentReactors(updatedList);
    }
  };

  const handleDeleteFromModal = () => {
    if(!selectedReactor) return;
    if(window.confirm("Delete this reactor?")) {
      const updatedList = currentReactors.filter(r => r.id !== selectedReactor.id);
      setCurrentReactors(updatedList);
      if (!isEditMode) {
           const updatedMap = { ...allReactorsMap, [selectedMonth]: updatedList };
           setAllReactorsMap(updatedMap);
           localStorage.setItem('matflow_reactors_monthly_v2', JSON.stringify(updatedMap));
           if (onUpdateLayout) onUpdateLayout(updatedList);
      }
      setSelectedReactor(null);
    }
  };

  const handleAddItem = () => {
    let startStr = '';
    let endStr = '';
    if (selectedMonth) {
        startStr = `${selectedMonth}-01`;
        endStr = `${selectedMonth}-05`;
    } else {
        const today = new Date();
        startStr = today.toISOString().split('T')[0];
        const future = new Date(today);
        future.setDate(today.getDate() + 4);
        endStr = future.toISOString().split('T')[0];
    }
    setEditingItems([...editingItems, { id: generateId(), category: 'OLED', name: '', startDate: startStr, endDate: endStr, quantity: 0, price: 0 }]);
  };
  
  const handleRemoveItem = (itemId) => setEditingItems(prev => prev.filter(i => i.id !== itemId));
  const handleItemChange = (id, field, value) => setEditingItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  
  // 🔥 [핵심 수정] 저장 시 ID를 수동으로 계산하여 DB에 Insert (Auto Increment 미설정 대응)
  const handleDataSave = async (e) => {
    e.preventDefault();
    if (!selectedReactor) return;
    
    setIsSaving(true);
    const formData = new FormData(e.target);
    const derivedStatus = formData.get('statusOverride') || (calculatedUtil > 0 ? 'Running' : 'Idle');
    
    // 1. 커스텀 카테고리(기본 3개 외) 추출
    const customCategories = new Set();
    editingItems.forEach(item => {
        const cat = item.category;
        // BU_CATEGORIES(OLED, API, 신사업)에 없고, 비어있지 않은 카테고리만 대상
        if (cat && !BU_CATEGORIES.some(bc => bc.id === cat)) {
            customCategories.add(cat);
        }
    });

    // 2. Supabase에 없으면 Insert (수동 ID 생성 로직 추가)
    if (customCategories.size > 0) {
        try {
            const catArray = Array.from(customCategories);
            
            // (A) 이미 존재하는지 확인
            const { data: existingRows, error: fetchError } = await supabase
                .from('pnl_data')
                .select('name')
                .in('name', catArray);
            
            if (fetchError) throw fetchError;

            const existingNames = new Set((existingRows || []).map(r => r.name));
            const newNames = catArray.filter(c => !existingNames.has(c)); // 진짜 없는 것만 필터링

            if (newNames.length > 0) {
                // (B) [중요] ID 수동 계산: 현재 가장 큰 ID를 가져와서 +1, +2, ...
                const { data: maxIdData } = await supabase
                    .from('pnl_data')
                    .select('id')
                    .order('id', { ascending: false })
                    .limit(1);

                let nextId = (maxIdData && maxIdData.length > 0) ? maxIdData[0].id + 1 : 1;

                const rowsToInsert = newNames.map(name => ({
                    id: nextId++, // ID 수동 할당
                    name: name,
                    rev: 0,
                    gm: 0,
                    fixed: 0
                }));

                const { error: insertError } = await supabase.from('pnl_data').insert(rowsToInsert);
                
                if (insertError) {
                    console.error("Auto-insert Category Error:", insertError);
                    alert("새 카테고리 저장 중 DB 오류가 발생했습니다.\n" + insertError.message);
                } else {
                    console.log("New categories added:", newNames);
                }
            }
        } catch (err) {
            console.error("Failed to sync categories:", err);
            alert("카테고리 동기화 실패: " + err.message);
        }
    }

    // 3. 기존 저장 로직 (Local & Logs)
    const updatePayload = {
      reactor_id: selectedReactor.id,
      month: selectedMonth,
      items: editingItems,
      product: editingItems.length > 0 ? editingItems[0].name : '', 
      utilization: parseFloat(calculatedUtil),
      status: derivedStatus,
      total_revenue: totalRevenue
    };

    setLocalLogs(prev => {
        const existingIdx = prev.findIndex(l => l.reactor_id === selectedReactor.id && l.month === selectedMonth);
        if (existingIdx >= 0) {
            const newLogs = [...prev];
            newLogs[existingIdx] = updatePayload;
            return newLogs;
        }
        return [...prev, updatePayload];
    });

    if(onUpdateLog) onUpdateLog(updatePayload);
    setIsSaving(false);
    setSelectedReactor(null);
  };

  // --- Right Panel Aggregation ---
  const logsForMonth = (localLogs || []).filter(l => l.month === selectedMonth);
  const totalReactorCount = currentReactors.length;
  const totalUtilSum = logsForMonth.reduce((acc, cur) => acc + (safeNum(cur.utilization)), 0);
  const avgUtil = totalReactorCount > 0 ? (totalUtilSum / totalReactorCount).toFixed(1) : 0;
  const activeCount = logsForMonth.filter(l => l.status === 'Running').length;

  const allMonthlyItems = logsForMonth.flatMap(log => {
      const reactor = currentReactors.find(r => r.id === log.reactor_id);
      const rName = reactor ? reactor.name : 'Unknown';
      const items = Array.isArray(log.items) ? log.items : (log.product ? [{ name: log.product, startDate: '', endDate: '', quantity: 0, price: 0, category: 'OLED' }] : []);
      return items.map(item => ({ ...item, reactorName: rName, reactorId: log.reactor_id, totalVal: ((safeNum(item.quantity) * safeNum(item.price))) / 1000000000 }));
  }).sort((a, b) => {
     if (b.totalVal !== a.totalVal) return b.totalVal - a.totalVal;
     return (a.startDate || '').localeCompare(b.startDate || '');
  });

  const totalMonthlyRevenue = allMonthlyItems.reduce((acc, item) => acc + item.totalVal, 0);
  const totalMonthlyQty = allMonthlyItems.reduce((acc, item) => acc + safeNum(item.quantity), 0);

  const categoryAggregates = allMonthlyItems.reduce((acc, item) => {
      const cat = item.category || 'OLED';
      if (!acc[cat]) { acc[cat] = { revenue: 0, qty: 0, count: 0 }; }
      acc[cat].revenue += item.totalVal; acc[cat].qty += safeNum(item.quantity); acc[cat].count += 1;
      return acc;
  }, {});

  const categorySummaryList = Object.entries(categoryAggregates).map(([cat, data]) => ({ category: cat, ...data })).sort((a, b) => b.revenue - a.revenue);
  
  const handleSummaryItemClick = (reactorId) => {
    const reactor = currentReactors.find(r => r.id === reactorId);
    if (reactor) setSelectedReactor(reactor);
  };

  return (
    <div className="flex flex-col h-screen max-h-[calc(100vh-100px)] animate-fade-in select-none">
      
      {/* 1. Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 shrink-0 mb-4 z-30 relative">
        <div className="flex items-center gap-4 w-full lg:w-auto">
           <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Factory size={24}/></div>
           <div>
              <h2 className="text-lg font-bold text-slate-800">Production Planning ({selectedMonth})</h2>
              <p className="text-xs text-slate-500">Monthly Reactor Layout • Standard Utilization</p>
           </div>
           <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
           <div className="hidden md:flex gap-4 text-sm">
              <div><span className="text-slate-400 font-bold text-[10px] uppercase block">Avg Util</span><span className="font-black text-slate-800">{avgUtil}%</span></div>
              <div><span className="text-slate-400 font-bold text-[10px] uppercase block">Running</span><span className="font-black text-emerald-600">{activeCount} / {totalReactorCount}</span></div>
           </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
           {isEditMode ? (
             <button onClick={handleSaveChanges} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-sm">
               <Save size={16}/> Save {selectedMonth} Layout
             </button>
           ) : (
             <button onClick={() => setIsEditMode(true)} className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-50">
               <Settings size={16}/> Edit Layout
             </button>
           )}
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-hidden relative">
         
         {/* LEFT: Canvas */}
         <div className="flex-1 relative border border-slate-300 rounded-xl overflow-auto bg-slate-100 shadow-inner flex flex-col">
             {isEditMode && (
                <div className="sticky top-4 left-4 right-4 mx-4 mt-4 bg-slate-800 text-white p-3 rounded-xl shadow-lg flex items-center gap-4 overflow-x-auto z-40">
                   <span className="text-xs font-bold text-slate-400 uppercase shrink-0 px-2 flex items-center gap-1"><MousePointer2 size={12}/> Drag:</span>
                   {[100, 500, 1000, 2000, 3000, 5000].map(size => (
                        <div key={size} onMouseDown={(e) => handlePaletteDragStart(e, size)}
                          className={`relative flex items-center justify-center rounded-full bg-slate-700 border-2 border-slate-600 hover:border-white cursor-grab shrink-0 transition-all active:scale-95`}
                          style={{ width: 40, height: 40 }}><span className="text-[10px] font-bold">{size}</span>
                        </div>
                   ))}
                   <div className="h-6 w-px bg-slate-600 mx-2"></div>
                   <span className="text-[10px] text-slate-400">Add Factory:</span>
                   <button onClick={handleAddFactoryZone} className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition">
                      <PlusCircle size={14}/> Zone
                   </button>
                </div>
             )}

             <div ref={containerRef} className="w-full relative min-w-[800px]" style={{ height: Math.max(factoryZones.length * ROW_HEIGHT, 600), paddingBottom: isEditMode ? 100 : 0 }}>
                {factoryZones.map((zone, idx) => (
                  <div key={zone.id} className="w-full border-b border-slate-300 bg-white flex items-center group relative hover:bg-slate-50 transition-colors"
                    style={{ height: ROW_HEIGHT, top: idx * ROW_HEIGHT, position: 'absolute' }}>
                     <div className="w-48 h-full border-r border-slate-200 bg-slate-50 flex items-center justify-center p-4 z-0 relative">
                        <GripVertical className="absolute left-2 text-slate-300 opacity-0 group-hover:opacity-50" size={16}/>
                        {isEditMode ? (
                          <input type="text" value={zone.name} onChange={(e) => handleZoneNameChange(zone.id, e.target.value)}
                            className="w-full bg-white border border-blue-300 rounded px-2 py-1 text-sm font-bold text-center text-slate-800 outline-none"/>
                        ) : (
                          <span className="text-sm font-black text-slate-500 uppercase text-center leading-tight px-2">{zone.name}</span>
                        )}
                     </div>
                     <div className="flex-1 h-full relative" style={{ backgroundImage: 'linear-gradient(to right, #f1f5f9 1px, transparent 1px)', backgroundSize: '40px 100%' }}></div>
                  </div>
                ))}
                
                {currentReactors.map((reactor) => {
                  const log = logsForMonth.find(l => l.reactor_id === reactor.id);
                  const isBeingDragged = draggingState?.type === 'EXISTING' && draggingState.id === reactor.id;
                  if (isBeingDragged) return null;
                  return (
                    <ReactorNode 
                        key={reactor.id} 
                        reactor={reactor} 
                        logData={log} 
                        isEditMode={isEditMode} 
                        onMouseDown={handleExistingDragStart} 
                        onClick={setSelectedReactor}
                        onDelete={handleDirectDelete}
                    />
                  );
                })}
             </div>
         </div>

         {/* RIGHT: Production Summary Panel */}
         <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col shrink-0 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
               <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 size={18} className="text-indigo-600"/> Monthly Summary
               </h3>
               <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                     <span className="text-[10px] font-bold text-slate-400 uppercase block">Est. Revenue (B)</span>
                     <span className="text-sm font-black text-emerald-600">{totalMonthlyRevenue.toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                     <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Qty</span>
                     <span className="text-sm font-black text-slate-700">{totalMonthlyQty.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">g</span></span>
                  </div>
               </div>
            </div>

            {/* Category Breakdown */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 space-y-2">
                <div className="flex items-center gap-1">
                   <Layers size={12} className="text-slate-400"/>
                   <span className="text-[10px] font-bold text-slate-500 uppercase">Category Breakdown</span>
                </div>
                <div className="space-y-1.5">
                    {categorySummaryList.length === 0 && <span className="text-[10px] text-slate-400">No data.</span>}
                    {categorySummaryList.map(cat => (
                        <div key={cat.category} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getCategoryColor(cat.category)}`}>
                                    {BU_CATEGORIES.find(c => c.id === cat.category)?.label || cat.category}
                                </span>
                                <span className="text-[10px] text-slate-400">({cat.count})</span>
                            </div>
                            <div className="text-right leading-none">
                                <div className="text-[11px] font-bold text-emerald-600 mb-0.5">{cat.revenue.toLocaleString()} B</div>
                                <div className="text-[9px] font-bold text-slate-400">{cat.qty.toLocaleString()} g</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
               {allMonthlyItems.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">No production planned.</div>
               ) : (
                  allMonthlyItems.map((item, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => handleSummaryItemClick(item.reactorId)}
                        className="bg-white border border-slate-100 hover:border-indigo-400 cursor-pointer rounded-lg p-3 shadow-sm transition group"
                    >
                       <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2 overflow-hidden pr-2">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${getCategoryColor(item.category)}`}>
                                  {BU_CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                              </span>
                              <span className="font-bold text-slate-700 text-sm truncate">{item.name || 'Unnamed Product'}</span>
                          </div>
                          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                             {item.reactorName}
                          </span>
                       </div>
                       <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-2 pl-1">
                          <Calendar size={10}/> {item.startDate} ~ {item.endDate}
                       </div>
                       <div className="flex justify-between items-end border-t border-slate-50 pt-2">
                          <div>
                             <span className="text-[10px] text-slate-400 uppercase block">Volume</span>
                             <span className="text-xs font-bold text-slate-700">{item.quantity} g</span>
                          </div>
                          <div className="text-right">
                             <span className="text-[10px] text-slate-400 uppercase block">Rev (B)</span>
                             <span className="text-xs font-bold text-emerald-600">{item.totalVal.toLocaleString()}</span>
                          </div>
                       </div>
                    </div>
                  ))
               )}
            </div>
         </div>
      </div>

      {/* Global Drag Ghost */}
      {draggingState && (
         <div className="fixed pointer-events-none z-[9999]" style={{ left: mousePos.x, top: mousePos.y, transform: 'translate(-50%, -50%)' }}>
            <div className={`rounded-full border-4 border-dashed border-indigo-500 bg-indigo-100/90 flex items-center justify-center shadow-2xl backdrop-blur-sm`}
                 style={{ width: CAPACITY_STYLES[draggingState.capacity]?.size || 80, height: CAPACITY_STYLES[draggingState.capacity]?.size || 80 }}>
               <span className="text-xs font-bold text-indigo-600">{draggingState.capacity}L</span>
            </div>
         </div>
      )}

      {/* Modal */}
      {selectedReactor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in" onClick={() => setSelectedReactor(null)}>
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              <div className="bg-slate-900 px-6 py-5 flex justify-between items-center shrink-0">
                 <div>
                    <h3 className="font-bold text-xl text-white">{selectedReactor.name} Plan</h3>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{selectedReactor.capacity}L Reactor • {selectedMonth}</span>
                 </div>
                 <button onClick={() => setSelectedReactor(null)} className="text-slate-400 hover:text-white transition"><X size={24}/></button>
              </div>
              <form onSubmit={handleDataSave} className="flex flex-col flex-1 overflow-hidden">
                 <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* KPI Box */}
                    <div className="flex gap-4">
                        <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">Time Utilization</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className={`text-2xl font-black ${calculatedUtil > 100 ? 'text-rose-500' : 'text-indigo-600'}`}>{calculatedUtil}%</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">Revenue (B)</span>
                            <div className="flex items-baseline gap-1 mt-1">
                                <span className="text-emerald-700 text-2xl font-black">{totalRevenue.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="w-32">
                             <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Status Override</label>
                             <select name="statusOverride" defaultValue={(logsForMonth.find(l => l.reactor_id === selectedReactor.id)?.status) || ''} className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold outline-none">
                                <option value="">Auto</option>
                                <option value="Maintenance">Maint</option>
                                <option value="Idle">Idle</option>
                             </select>
                        </div>
                    </div>
                    {/* List */}
                    <div>
                        <div className="flex justify-between items-end mb-2">
                             <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><Package size={16}/> Schedule</label>
                             <button type="button" onClick={handleAddItem} className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold transition"><Plus size={14}/> Add Item</button>
                        </div>
                        <div className="space-y-3">
                            {editingItems.map((item, idx) => {
                                const isCustomCategory = !BU_CATEGORIES.some(c => c.id === item.category);
                                const badgeColor = getCategoryColor(item.category);
                                return (
                                <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col gap-3 group relative">
                                    <div className="flex gap-3 items-start">
                                        <div className="bg-slate-100 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded mt-2">{idx + 1}</div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="col-span-1 md:col-span-2 flex gap-2">
                                                <div className="relative w-36 shrink-0">
                                                    <select 
                                                        value={isCustomCategory ? 'custom' : item.category}
                                                        onChange={(e) => {
                                                            if(e.target.value === 'custom') handleItemChange(item.id, 'category', ''); 
                                                            else handleItemChange(item.id, 'category', e.target.value);
                                                        }}
                                                        className={`w-full text-[10px] font-bold rounded px-2 py-1.5 outline-none appearance-none border ${badgeColor}`}
                                                    >
                                                        {BU_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}
                                                        <option value="custom">직접입력 (기타)</option>
                                                    </select>
                                                    <div className="absolute right-2 top-1.5 pointer-events-none opacity-50"><Tag size={10}/></div>
                                                </div>
                                                {isCustomCategory && (
                                                    <input 
                                                        type="text" 
                                                        placeholder="카테고리 직접 입력"
                                                        value={item.category}
                                                        onChange={(e) => handleItemChange(item.id, 'category', e.target.value)}
                                                        className="flex-1 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-bold outline-none focus:border-indigo-500 animate-fade-in"
                                                        autoFocus
                                                    />
                                                )}
                                                {!isCustomCategory && (
                                                    <input 
                                                        type="text" placeholder="Product Name" value={item.name} 
                                                        onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} 
                                                        className="flex-1 bg-slate-50 border-b border-slate-200 px-2 py-1 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-colors"
                                                    />
                                                )}
                                            </div>
                                            {isCustomCategory && (
                                                <div className="col-span-1 md:col-span-2">
                                                    <input type="text" placeholder="Product Name" value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} className="w-full bg-slate-50 border-b border-slate-200 px-2 py-1 text-sm font-bold focus:bg-white focus:border-indigo-500 outline-none transition-colors"/>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 relative">
                                                    <span className="text-[9px] text-slate-400 absolute -top-1.5 left-0">Start</span>
                                                    <input type="date" value={item.startDate} onChange={(e) => handleItemChange(item.id, 'startDate', e.target.value)} className="w-full text-xs bg-transparent border-b border-slate-200 py-1 outline-none font-medium text-slate-700 focus:border-indigo-500"/>
                                                </div>
                                                <span className="text-slate-300 mt-2">~</span>
                                                <div className="flex-1 relative">
                                                    <span className="text-[9px] text-slate-400 absolute -top-1.5 left-0">End</span>
                                                    <input type="date" value={item.endDate} onChange={(e) => handleItemChange(item.id, 'endDate', e.target.value)} className="w-full text-xs bg-transparent border-b border-slate-200 py-1 outline-none font-medium text-slate-700 focus:border-indigo-500"/>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="flex-1 flex items-center border border-slate-200 rounded px-2 bg-slate-50">
                                                    <span className="text-[10px] text-slate-400 mr-1">Qty</span>
                                                    <input type="number" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', parseFloat(e.target.value))} className="w-full bg-transparent text-xs font-bold outline-none text-right py-1"/>
                                                </div>
                                                <div className="flex-1 flex items-center border border-slate-200 rounded px-2 bg-slate-50">
                                                    <span className="text-[10px] text-slate-500 font-bold mr-1">원/g</span>
                                                    <input type="number" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', parseFloat(e.target.value))} className="w-full bg-transparent text-xs font-bold outline-none text-right py-1"/>
                                                </div>
                                            </div>
                                            <div className="col-span-1 md:col-span-2 flex justify-end items-center gap-1 text-[10px] text-slate-400 border-t border-slate-100 pt-1 mt-1">
                                                <span>Est. Revenue:</span>
                                                <span className="font-bold text-emerald-600">{(((safeNum(item.quantity) * safeNum(item.price))) / 1000000000).toLocaleString()} B</span>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-slate-300 hover:text-rose-500 p-1"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                 </div>
                 <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between gap-3 shrink-0">
                    <button type="button" onClick={handleDeleteFromModal} className="px-4 py-2 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 transition text-sm font-bold flex items-center gap-2"><Trash2 size={16}/> Delete</button>
                    <button type="submit" disabled={isSaving} className="flex-1 bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition shadow-lg flex justify-center items-center gap-2">
                        {isSaving ? <Activity className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} Save
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default Chapter7_ReactorLayout;