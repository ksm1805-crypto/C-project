import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from './supabaseClient';
import {
  LayoutDashboard, Factory, TrendingDown, Users, ClipboardList,
  Menu, ChevronRight, Search, Bell, BarChart3,
  X, AlertCircle, Info, Loader2, LogOut, Cloud, Check,
  BrainCircuit, Plus, Trash2 
} from 'lucide-react';

// Component Imports
import Login from './Login';
import Chapter0_Executive from './components/Chapter0_Executive';
import Chapter1_AI_Insights from './components/Chapter1_AI_Insights';
import Chapter2_FixedCost from './components/Chapter2_FixedCost';
import Chapter3_Production from './components/Chapter3_Production';
import Chapter4_CostReduction from './components/Chapter4_CostReduction';
import Chapter5_Headcount from './components/Chapter5_Headcount';
import Chapter6_ActionTracker from './components/Chapter6_ActionTracker';
import Chapter7_ReactorLayout from './components/Chapter7_ReactorLayout';

// [Optimization] Memoization
const MemoChapter0 = React.memo(Chapter0_Executive);
const MemoChapter1 = React.memo(Chapter1_AI_Insights);
const MemoChapter2 = React.memo(Chapter2_FixedCost);
const MemoChapter3 = React.memo(Chapter3_Production);
const MemoChapter4 = React.memo(Chapter4_CostReduction);
const MemoChapter5 = React.memo(Chapter5_Headcount);
const MemoChapter6 = React.memo(Chapter6_ActionTracker);
const MemoChapter7 = React.memo(Chapter7_ReactorLayout);

// [Utility] Safe Data Handling
const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// [Security] 관리자 비밀번호 설정 (원하는 비밀번호로 변경하세요)
const ADMIN_PASSWORD = "1234";

const App = () => {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('chapter0');
  const [isMenuOpen, setIsMenuOpen] = useState(window.innerWidth >= 1024);

  const [dataLoading, setDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); 

  // --- Data State ---
  const [pnlData, setPnlData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [prodStats, setProdStats] = useState([]);
  const [crActions, setCrActions] = useState([]);
  const [headcountDB, setHeadcountDB] = useState({});

  const [reactorConfig, setReactorConfig] = useState([]);
  const [reactorLogs, setReactorLogs] = useState([]);

  // Global Month
  const [workMonth, setWorkMonth] = useState(() => {
    return localStorage.getItem('sunchem_current_month') || new Date().toISOString().slice(0, 7);
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // --- [Data Sync Logic] ---
  const calculatePnlFromLogs = useCallback((currentPnl, currentLogs, targetMonth) => {
    const monthlyLogs = currentLogs.filter(l => String(l.month).slice(0, 7) === targetMonth);
    
    let revenueMap = { 'OLED': 0, 'API': 0, '신사업': 0 };
    
    for (const log of monthlyLogs) {
      if (Array.isArray(log.items)) {
        for (const item of log.items) {
          const cat = (item.category || 'OLED');
          const revenueB = (safeNum(item.quantity) * safeNum(item.price)) / 1_000_000_000;
          
          if (cat === 'OLED') revenueMap['OLED'] += revenueB;
          else if (cat === 'API') revenueMap['API'] += revenueB;
          else revenueMap['신사업'] += revenueB;
        }
      }
    }

    return currentPnl.map(row => {
      let newRev = row.rev;
      const name = (row.name || '').toUpperCase();

      if (name.includes('OLED')) newRev = revenueMap['OLED'];
      else if (name.includes('API') || name.includes('중간체')) newRev = revenueMap['API'];
      else if (name.includes('신사업') || name.includes('NEW')) newRev = revenueMap['신사업'];
      else return row; 

      if (Math.abs(newRev - row.rev) > 0.001) {
        return { ...row, rev: parseFloat(newRev.toFixed(3)) };
      }
      return row;
    });
  }, []);

  // --- Auth & Data Fetch ---
  useEffect(() => {
    const handleResize = () => setIsMenuOpen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) fetchAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchAllData = async () => {
    try {
      setDataLoading(true);
      const [pnlRes, histRes, prodRes, crRes, headRes, rConfigRes, rLogRes] = await Promise.all([
        supabase.from('pnl_data').select('*').order('id'),
        supabase.from('history_archive').select('*'),
        supabase.from('prod_stats').select('*').order('month'),
        supabase.from('cr_actions').select('*').order('id'),
        supabase.from('headcount_db').select('*'),
        supabase.from('reactor_config').select('*').order('id'),
        supabase.from('reactor_logs').select('*'),
      ]);

      let loadedPnl = pnlRes.data || [];
      const loadedLogs = rLogRes.data || [];

      // Unit Check
      loadedPnl = loadedPnl.map(row => ({
        ...row,
        rev: row.rev > 1000 ? row.rev / 1_000_000_000 : row.rev,
        gm: row.gm > 1000 ? row.gm / 1_000_000_000 : row.gm,
        fixed: row.fixed > 1000 ? row.fixed / 1_000_000_000 : row.fixed,
      }));

      // Initial Sync
      if (loadedLogs.length > 0 && loadedPnl.length > 0) {
        loadedPnl = calculatePnlFromLogs(loadedPnl, loadedLogs, workMonth);
      }

      setPnlData(loadedPnl);
      setReactorLogs(loadedLogs);
      setReactorConfig(rConfigRes.data || []);

      if (histRes.data) {
        const parsed = histRes.data.map(h => h.data).filter(Boolean)
          .sort((a, b) => (b.month || "").localeCompare(a.month || ""));
        
        const safeParsed = parsed.map(h => ({
            ...h,
            rev: h.rev > 1000 ? h.rev / 1_000_000_000 : h.rev,
            totalOp: h.totalOp > 1000 ? h.totalOp / 1_000_000_000 : h.totalOp
        }));
        setHistoryData(safeParsed);
      } else setHistoryData([]);

      setProdStats(prodRes.data || []);
      setCrActions(crRes.data || []);

      const dbMap = {};
      (headRes.data || []).forEach(row => {
        const m = (row.month || '').substring(0, 7);
        dbMap[m] = row.depts || [];
      });
      setHeadcountDB(dbMap);

    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const availableMonths = useMemo(() => {
    const set = new Set();
    (historyData || []).forEach(h => h?.month && set.add(h.month));
    (reactorLogs || []).forEach(l => l?.month && set.add(String(l.month).slice(0, 7)));
    if (workMonth) set.add(workMonth);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [historyData, reactorLogs, workMonth]);

  // --- Handlers ---

  const handleMonthChange = useCallback((val) => {
    if (!val) return;
    setWorkMonth(val);
    localStorage.setItem('sunchem_current_month', val);
    setPnlData(prev => calculatePnlFromLogs(prev, reactorLogs, val));
  }, [calculatePnlFromLogs, reactorLogs]);

  const handleCreateMonth = useCallback(() => {
    const val = prompt('YYYY-MM:', workMonth);
    if (val && /^\d{4}-\d{2}$/.test(val)) handleMonthChange(val);
  }, [workMonth, handleMonthChange]);

  // [Changed] Delete Month Feature (Password Protected)
  const handleDeleteMonth = useCallback(async () => {
    // 1. 비밀번호 확인
    const input = window.prompt("데이터를 영구 삭제하려면 관리자 비밀번호를 입력하세요:");
    if (input === null) return; // 취소 누름
    if (input !== ADMIN_PASSWORD) {
      alert("비밀번호가 올바르지 않습니다.");
      return;
    }

    // 2. 재확인
    if (!window.confirm(`[최종 경고] ${workMonth}월의 모든 데이터를 정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

    setIsDeleting(true);
    try {
      const targetMonth = workMonth;

      // Supabase Delete
      await Promise.all([
        supabase.from('reactor_logs').delete().eq('month', targetMonth),
        supabase.from('prod_stats').delete().eq('month', targetMonth),
        supabase.from('headcount_db').delete().eq('month', targetMonth),
        supabase.from('history_archive').delete().eq('month', targetMonth),
      ]);

      // Local State Update
      setReactorLogs(prev => prev.filter(l => l.month !== targetMonth));
      setProdStats(prev => prev.filter(p => p.month !== targetMonth));
      setHistoryData(prev => prev.filter(h => h.month !== targetMonth));
      setHeadcountDB(prev => {
        const next = { ...prev };
        delete next[targetMonth];
        return next;
      });

      // P&L View Reset (해당 월 로그가 지워졌으므로 매출 초기화)
      setPnlData(prev => prev.map(row => ({ ...row, rev: 0 })));

      setNotifications(prev => [{ id: Date.now(), type: 'success', msg: `${targetMonth} Data Deleted.` }, ...prev]);
      alert(`${targetMonth}월 데이터가 안전하게 삭제되었습니다.`);

    } catch (e) {
      console.error("Delete Error", e);
      alert("삭제 중 오류가 발생했습니다: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  }, [workMonth]);


  const handleReactorLogUpdate = useCallback((logEntry) => {
    if (!logEntry) return;

    let nextLogs = [];
    setReactorLogs(prev => {
      const filtered = prev.filter(l => !(l.reactor_id === logEntry.reactor_id && l.month === logEntry.month));
      nextLogs = [...filtered, logEntry];
      return nextLogs;
    });

    if (String(logEntry.month).slice(0, 7) === workMonth) {
      setPnlData(prev => calculatePnlFromLogs(prev, nextLogs, workMonth));
      setNotifications(prev => [{ id: Date.now(), type: 'info', msg: 'P&L Synced with Factory Log' }, ...prev]);
    }
  }, [workMonth, calculatePnlFromLogs]);

  const handleLayoutUpdate = useCallback((newLayout) => {
    setReactorConfig(newLayout);
  }, []);

  const handlePnlChange = useCallback((id, field, value) => {
    const val = safeNum(value);
    setPnlData(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
  }, []);

  const handleProdStatsUpdate = useCallback((s) => setProdStats(s), []);
  const handleCrActionsUpdate = useCallback((a) => setCrActions(a), []);
  const handleHeadcountChange = useCallback((m, d) => setHeadcountDB(prev => ({...prev, [m]: d})), []);

  const handleArchiveDelete = useCallback(async (m) => {
    if (!window.confirm(`Delete ${m}?`)) return;
    try {
      await supabase.from('history_archive').delete().eq('month', m);
      await supabase.from('prod_stats').delete().eq('month', m);
      setHistoryData(p => p.filter(h => h.month !== m));
      setProdStats(p => p.filter(p => p.month !== m));
    } catch(e) { alert("Fail"); }
  }, []);

  const handleSaveToArchive = useCallback(async (monthName) => {
    if (!monthName) return alert("Select Month");
    try {
      const newEntryData = {
        month: monthName, status: 'Closed', totalOp: 0, rev: 0, fixed: 0, ratio: 0,
        bu_data: pnlData, cost_details: []
      };
      const { error } = await supabase.from('history_archive').upsert({ month: monthName, data: newEntryData });
      if (error) throw error;
      setHistoryData(prev => [newEntryData, ...prev.filter(h => h.month !== monthName)].sort((a,b)=>b.month.localeCompare(a.month)));
      alert("Archived.");
    } catch (e) { alert("Archive Failed"); }
  }, [pnlData]);

  // --- Global Save ---
  const handleGlobalSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const results = [];
      const pnlPromise = Promise.all(pnlData.map(row => supabase.from('pnl_data').update(row).eq('id', row.id)));
      results.push({ name: 'P&L', promise: pnlPromise });

      if (reactorLogs.length) results.push({ name: 'ReactorLogs', promise: supabase.from('reactor_logs').upsert(reactorLogs, { onConflict: 'reactor_id, month' }) });
      if (reactorConfig.length) {
        const cleanConf = reactorConfig.map(({ id, name, type, capacity, x_pos, y_pos }) => ({
           id: typeof id === 'number' ? id : undefined, name, type, capacity, x_pos, y_pos
        }));
        results.push({ name: 'ReactorConfig', promise: supabase.from('reactor_config').upsert(cleanConf) });
      }
      if (prodStats.length) results.push({ name: 'ProdStats', promise: supabase.from('prod_stats').upsert(prodStats) });
      if (crActions.length) results.push({ name: 'CrActions', promise: supabase.from('cr_actions').upsert(crActions) });
      
      const hcPromises = Object.keys(headcountDB).map(m => supabase.from('headcount_db').upsert({ month: m, depts: headcountDB[m] }));
      if(hcPromises.length) results.push({ name: 'Headcount', promise: Promise.all(hcPromises) });

      const outcomes = await Promise.allSettled(results.map(r => r.promise));
      
      const failed = [];
      outcomes.forEach((res, idx) => { if (res.status === 'rejected') failed.push(results[idx].name); });

      if (failed.length > 0) {
        alert(`저장 실패: ${failed.join(', ')}`);
      } else {
        const { data: refreshedConfig } = await supabase.from('reactor_config').select('*').order('id');
        if (refreshedConfig) setReactorConfig(refreshedConfig);
        
        setNotifications(prev => [{ id: Date.now(), type: 'success', msg: 'Saved to Supabase.' }, ...prev]);
      }
    } catch (error) {
      console.error("Save Error:", error);
      alert("Save Failed.");
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [isSaving, pnlData, reactorLogs, reactorConfig, prodStats, crActions, headcountDB]);

  // Search Logic (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) { setSearchResults([]); return; }
      
      const res = [];
      pnlData.forEach(b => { if ((b.name||'').toLowerCase().includes(q)) res.push({ type: 'Biz', label: b.name, detail: `Rev: ${b.rev}`, tab: 'chapter0' }); });
      crActions.forEach(a => { if ((a.item||'').toLowerCase().includes(q)) res.push({ type: 'Cost Save', label: a.item, detail: a.status, tab: 'chapter4' }); });
      reactorConfig.forEach(r => { if ((r.name||'').toLowerCase().includes(q)) res.push({ type: 'Facility', label: r.name, detail: r.type, tab: 'chapter7' }); });
      setSearchResults(res);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, pnlData, crActions, reactorConfig]);

  // Keydown
  useEffect(() => {
    const k = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleGlobalSave(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [handleGlobalSave]);

  const handleLogout = useCallback(() => supabase.auth.signOut(), []);
  
  const handleMenuClick = useCallback((t) => { 
    setActiveTab(t); 
    if(window.innerWidth<1024) setIsMenuOpen(false);
    setSearchQuery(''); setSearchResults([]); setIsSearchFocused(false);
  }, []);

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;
  if (!session) return <Login />;

  const renderContent = () => {
    if (dataLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin mr-2"/>Syncing DB...</div>;
    
    const commonProps = { pnlData, historyData, prodStats, headcountDB, selectedMonth: workMonth, onMonthChange: handleMonthChange };

    switch (activeTab) {
      case 'chapter0': return <MemoChapter0 {...commonProps} reactorLogs={reactorLogs} reactorConfig={reactorConfig} onPnlChange={handlePnlChange} onSaveArchive={handleSaveToArchive} onDeleteArchive={handleArchiveDelete}/>;
      case 'chapter1': return <MemoChapter1 {...commonProps} />;
      case 'chapter2': return <MemoChapter2 {...commonProps} />;
      case 'chapter3': return <MemoChapter3 {...commonProps} onUpdateStats={handleProdStatsUpdate} />;
      case 'chapter4': return <MemoChapter4 actions={crActions} onUpdateActions={handleCrActionsUpdate} />;
      case 'chapter5': return <MemoChapter5 {...commonProps} onHeadcountUpdate={handleHeadcountChange} />;
      case 'chapter6': return <MemoChapter6 {...commonProps} crActions={crActions} depts={headcountDB[workMonth] || []} />;
      case 'chapter7': return <MemoChapter7 reactorConfig={reactorConfig} reactorLogs={reactorLogs} onUpdateLayout={handleLayoutUpdate} onUpdateLog={handleReactorLogUpdate} selectedMonth={workMonth} onMonthChange={handleMonthChange} historyData={historyData} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 flex overflow-hidden" onClick={() => { setIsSearchFocused(false); setShowNotifications(false); }}>
      {isMenuOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setIsMenuOpen(false)} />}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col ${isMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'} lg:static`} onClick={e=>e.stopPropagation()}>
         <div className="h-16 flex items-center px-4 bg-slate-900 text-white gap-3 border-b border-slate-800">
           <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold">I</div>
           {isMenuOpen && <div><span className="font-bold block">SUNCHEM</span><span className="text-[10px] text-blue-400">Global Ops</span></div>}
         </div>
         <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto scrollbar-hide">
            <MenuHeading isOpen={isMenuOpen} text="Overview"/>
            <MenuButton active={activeTab==='chapter0'} onClick={()=>handleMenuClick('chapter0')} icon={<BarChart3 size={20}/>} label="1. 경영 요약" isOpen={isMenuOpen}/>
            <MenuButton active={activeTab==='chapter1'} onClick={()=>handleMenuClick('chapter1')} icon={<BrainCircuit size={20}/>} label="2. AI 예측" isOpen={isMenuOpen}/>
            <div className="border-t border-slate-800 my-2 mx-2"></div>
            <MenuHeading isOpen={isMenuOpen} text="Operations"/>
            <MenuButton active={activeTab==='chapter2'} onClick={()=>handleMenuClick('chapter2')} icon={<LayoutDashboard size={20}/>} label="3. 고정비 관리" isOpen={isMenuOpen}/>
            <MenuButton active={activeTab==='chapter3'} onClick={()=>handleMenuClick('chapter3')} icon={<Factory size={20}/>} label="4. 생산·매출" isOpen={isMenuOpen}/>
            <MenuButton active={activeTab==='chapter4'} onClick={()=>handleMenuClick('chapter4')} icon={<TrendingDown size={20}/>} label="5. 원가절감" isOpen={isMenuOpen}/>
            <div className="border-t border-slate-800 my-2 mx-2"></div>
            <MenuHeading isOpen={isMenuOpen} text="Organization"/>
            <MenuButton active={activeTab==='chapter5'} onClick={()=>handleMenuClick('chapter5')} icon={<Users size={20}/>} label="6. 인력 관리" isOpen={isMenuOpen}/>
            <MenuButton active={activeTab==='chapter6'} onClick={()=>handleMenuClick('chapter6')} icon={<ClipboardList size={20}/>} label="7. 액션 트래커" isOpen={isMenuOpen}/>
            <MenuButton active={activeTab==='chapter7'} onClick={()=>handleMenuClick('chapter7')} icon={<Factory size={20}/>} label="8. 월간 생산 아웃풋" isOpen={isMenuOpen}/>
         </nav>
         <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 justify-center text-slate-400 hover:text-white cursor-pointer" onClick={handleLogout}>
              <LogOut size={20}/> {isMenuOpen && <span className="text-sm">Logout</span>}
            </div>
         </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
         <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0" onClick={e=>e.stopPropagation()}>
            <div className="flex items-center gap-4">
               <button onClick={()=>setIsMenuOpen(!isMenuOpen)} className="lg:hidden"><Menu/></button>
               <h2 className="font-bold text-lg">Executive Dashboard</h2>
            </div>
            <div className="flex items-center gap-3">
               
               {/* Month Controls with Delete Feature */}
               <div className="hidden md:flex items-center gap-2">
                 <select value={workMonth} onChange={(e)=>handleMonthChange(e.target.value)} className="bg-slate-50 border rounded px-2 py-1 text-sm font-bold">
                    {availableMonths.map(m=><option key={m} value={m}>{m}</option>)}
                 </select>
                 <button onClick={handleCreateMonth} className="p-1 border rounded hover:bg-slate-50" title="Create New Month"><Plus size={16}/></button>
                 
                 {/* Delete Month Button */}
                 <button 
                   onClick={handleDeleteMonth} 
                   disabled={isDeleting}
                   className="p-1 border rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors ml-1" 
                   title="Delete Selected Month Data"
                 >
                   {isDeleting ? <Loader2 size={16} className="animate-spin text-red-500"/> : <Trash2 size={16}/>}
                 </button>
               </div>

               <button onClick={handleGlobalSave} disabled={isSaving} className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-bold border transition ${isSaving ? 'bg-green-50 text-green-700' : 'bg-white hover:bg-slate-50'}`}>
                 {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Cloud size={16}/>} Save
               </button>
               
               {/* Search Bar */}
               <div className="relative w-48 hidden md:block">
                  <div className="flex items-center bg-slate-100 rounded px-2 py-1 border focus-within:border-blue-500">
                     <Search size={14} className="text-slate-400 mr-2"/>
                     <input type="text" placeholder="Search..." className="bg-transparent text-sm w-full outline-none" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onFocus={()=>setIsSearchFocused(true)}/>
                     {searchQuery && <X size={14} className="cursor-pointer text-slate-400" onClick={()=>{setSearchQuery(''); setSearchResults([]);}}/>}
                  </div>
                  {isSearchFocused && searchQuery && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto z-50">
                        {searchResults.map((r,i)=>(
                            <div key={i} className="p-2 hover:bg-slate-50 cursor-pointer text-sm" onClick={()=>handleMenuClick(r.tab)}>
                                <span className="font-bold mr-2 text-xs bg-slate-200 px-1 rounded">{r.type}</span>
                                {r.label} <span className="text-xs text-slate-400 ml-1">{r.detail}</span>
                            </div>
                        ))}
                    </div>
                  )}
               </div>

               {/* Notifications */}
               <div className="relative">
                  <Bell size={20} className="text-slate-400 cursor-pointer" onClick={()=>setShowNotifications(!showNotifications)}/>
                  {notifications.length>0 && <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>}
                  {showNotifications && (
                    <div className="absolute right-0 top-8 w-72 bg-white shadow-xl border rounded-lg p-2 z-50 max-h-64 overflow-auto">
                      {notifications.map(n=><div key={n.id} className="text-xs p-2 border-b last:border-0 hover:bg-slate-50">{n.msg}</div>)}
                    </div>
                  )}
               </div>
            </div>
         </header>
         <main className="flex-1 overflow-auto p-6">{renderContent()}</main>
      </div>
    </div>
  );
};

const MenuHeading = React.memo(({ isOpen, text }) => (
  <div className={`px-4 pb-2 pt-4 ${!isOpen && 'hidden'}`}>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{text}</p>
  </div>
));

const MenuButton = React.memo(({ active, onClick, icon, label, isOpen }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all group ${active ? 'bg-blue-600 text-white font-semibold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    <span className="shrink-0">{icon}</span>
    {isOpen && <span className="truncate">{label}</span>}
  </button>
));

export default App;