import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // [중요] Supabase 클라이언트 임포트
import { 
  LayoutDashboard, Factory, TrendingDown, Users, ClipboardList,
  Menu, ChevronRight, Search, Bell, Settings, BarChart3,
  X, AlertCircle, Info, Loader2, LogOut, Cloud, Check
} from 'lucide-react';

// 컴포넌트 불러오기
import Login from './Login'; 
import Chapter0_Executive from './components/Chapter0_Executive';
import Chapter1_FixedCost from './components/Chapter1_FixedCost';
import Chapter2_Production from './components/Chapter2_Production';
import Chapter3_CostReduction from './components/Chapter3_CostReduction';
import Chapter4_Headcount from './components/Chapter4_Headcount';
import Chapter5_ActionTracker from './components/Chapter5_ActionTracker';

const App = () => {
  // --- [Authentication State] ---
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- [App State] ---
  const [activeTab, setActiveTab] = useState('chapter0');
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // [NEW] 저장 중 로딩 상태

  // --- [Data State] ---
  const [pnlData, setPnlData] = useState([]);
  const [historyData, setHistoryData] = useState([]);
  const [prodStats, setProdStats] = useState([]);
  const [crActions, setCrActions] = useState([]);
  const [headcountDB, setHeadcountDB] = useState({});

  // --- [UI Feature State] ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // --- [1. Auth Check Logic] ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- [2. Data Fetch Logic] ---
  useEffect(() => {
    if (session) {
      fetchAllData();
    }
  }, [session]);

  const fetchAllData = async () => {
    try {
      setDataLoading(true);
      const [pnlRes, histRes, prodRes, crRes, headRes] = await Promise.all([
        supabase.from('pnl_data').select('*').order('id'),
        supabase.from('history_archive').select('*'),
        supabase.from('prod_stats').select('*').order('month'),
        supabase.from('cr_actions').select('*').order('id'),
        supabase.from('headcount_db').select('*')
      ]);

      if (pnlRes.data) setPnlData(pnlRes.data);
      if (histRes.data) {
        const parsedHistory = histRes.data.map(h => h.data).sort((a, b) => b.month.localeCompare(a.month));
        setHistoryData(parsedHistory);
      }
      if (prodRes.data) setProdStats(prodRes.data);
      if (crRes.data) setCrActions(crRes.data);
      if (headRes.data) {
        const dbMap = {};
        headRes.data.forEach(row => {
          dbMap[row.month] = row.depts;
        });
        setHeadcountDB(dbMap);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  // --- [NEW] Global Save Logic (Cloud Sync) ---
  const handleGlobalSave = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const promises = [];

      // 1. P&L Update
      pnlData.forEach(row => {
        promises.push(supabase.from('pnl_data').update(row).eq('id', row.id));
      });

      // 2. Prod Stats Update
      if (prodStats.length > 0) {
        promises.push(supabase.from('prod_stats').upsert(prodStats));
      }

      // 3. CR Actions Update
      if (crActions.length > 0) {
        promises.push(supabase.from('cr_actions').upsert(crActions));
      }

      // 4. Headcount Update
      Object.keys(headcountDB).forEach(month => {
        promises.push(supabase.from('headcount_db').upsert({ month, depts: headcountDB[month] }));
      });

      await Promise.all(promises);

      // 성공 알림 추가
      const newNoti = { id: Date.now(), type: 'success', msg: '모든 데이터가 클라우드에 성공적으로 저장되었습니다.' };
      setNotifications(prev => [newNoti, ...prev]);
      
      // 3초 후 알림 자동 삭제 (옵션)
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== newNoti.id)), 3000);

    } catch (error) {
      console.error("Global Save Error:", error);
      alert("데이터 저장 중 오류가 발생했습니다.");
    } finally {
      // UX를 위해 최소 0.5초 대기 후 로딩 상태 해제
      setTimeout(() => setIsSaving(false), 500);
    }
  };

  // [NEW] Keyboard Shortcut Listener (Ctrl + S)
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl+S (Windows/Linux) or Command+S (Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault(); // 브라우저 기본 저장 대화상자 차단
        handleGlobalSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pnlData, prodStats, crActions, headcountDB]); // 최신 상태를 참조하기 위해 의존성 배열 추가


  // --- [Existing Logic] Search & Notification ---
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase();
    const results = [];
    pnlData.forEach(bu => {
      if (bu.name.toLowerCase().includes(query)) results.push({ type: 'Business', label: bu.name, detail: `Revenue: ${bu.rev}B`, tab: 'chapter0' });
    });
    crActions.forEach(action => {
      if (action.item.toLowerCase().includes(query)) results.push({ type: 'Cost Save', label: action.item, detail: `${action.status}`, tab: 'chapter3' });
    });
    setSearchResults(results);
  }, [searchQuery, pnlData, crActions]);

  // --- [Handlers] ---
  const handleLogout = async () => { await supabase.auth.signOut(); };
  
  // Data Handlers (Optimistic Updates + Supabase Direct Update)
  const handlePnlChange = async (id, field, value) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    const updatedData = pnlData.map(row => {
      if (row.id !== id) return row;
      let newRow = { ...row, [field]: numValue };
      if (field === 'rev') newRow.gm = numValue * (row.rev > 0 ? row.gm / row.rev : 0);
      return newRow;
    });
    setPnlData(updatedData);
    // 개별 수정 시에도 즉시 저장 (Global Save는 일괄 동기화/백업 용도)
    await supabase.from('pnl_data').update(updatedData.find(r => r.id === id)).eq('id', id);
  };

  const handleSaveToArchive = async (monthName) => {
    if (!monthName) return alert("저장할 '년-월'을 선택해주세요.");
    const totalRev = pnlData.reduce((acc, cur) => acc + cur.rev, 0);
    const totalGm = pnlData.reduce((acc, cur) => acc + cur.gm, 0);
    const totalFixed = pnlData.reduce((acc, cur) => acc + cur.fixed, 0);
    const totalOp = totalGm - totalFixed;
    const ratio = totalRev > 0 ? (totalFixed / totalRev) * 100 : 0;
    const newEntryData = { 
        month: monthName, status: '마감 완료', totalOp, rev: totalRev, fixed: totalFixed, ratio, 
        bu_data: pnlData, 
        cost_details: [] // Ch.1 데이터는 여기서 별도 조회하지 않음 (필요 시 수정 가능)
    };
    const { error } = await supabase.from('history_archive').upsert({ month: monthName, data: newEntryData });
    if (!error) {
      alert(`${monthName} 실적이 저장되었습니다.`);
      setHistoryData(prev => {
        const filtered = prev.filter(h => h.month !== monthName);
        return [newEntryData, ...filtered].sort((a, b) => b.month.localeCompare(a.month));
      });
    }
  };

  const handleHeadcountChange = async (month, updatedDepts) => {
    setHeadcountDB(prev => ({ ...prev, [month]: updatedDepts }));
    await supabase.from('headcount_db').upsert({ month: month, depts: updatedDepts });
  };
  const handleProdStatsUpdate = async (newStatsArray) => {
    setProdStats(newStatsArray);
    await supabase.from('prod_stats').upsert(newStatsArray);
  };
  const handleCrActionsUpdate = async (newActions) => {
    setCrActions(newActions);
  };
  const handleSearchResultClick = (tab) => {
    setActiveTab(tab); setSearchQuery(''); setSearchResults([]); setIsSearchFocused(false);
  };

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-indigo-500" size={32}/></div>;
  if (!session) return <Login />;

  const renderContent = () => {
    if (dataLoading) return <div className="flex h-[calc(100vh-200px)] items-center justify-center flex-col gap-4"><Loader2 className="animate-spin text-blue-600" size={48}/><p className="text-slate-500 font-medium">데이터를 불러오는 중입니다...</p></div>;
    switch (activeTab) {
      case 'chapter0': return <Chapter0_Executive pnlData={pnlData} onPnlChange={handlePnlChange} historyData={historyData} onSaveArchive={handleSaveToArchive} />;
      case 'chapter1': return <Chapter1_FixedCost pnlData={pnlData} historyData={historyData} />;
      case 'chapter2': return <Chapter2_Production historyData={historyData} pnlData={pnlData} prodStats={prodStats} onUpdateStats={handleProdStatsUpdate} />;
      case 'chapter3': return <Chapter3_CostReduction actions={crActions} onUpdateActions={handleCrActionsUpdate} />;
      case 'chapter4': return <Chapter4_Headcount pnlData={pnlData} headcountDB={headcountDB} onHeadcountUpdate={handleHeadcountChange} prodStats={prodStats} historyData={historyData} />;
      case 'chapter5': 
        const latestMonth = Object.keys(headcountDB).sort().pop() || '2024-12';
        return <Chapter5_ActionTracker pnlData={pnlData} prodStats={prodStats} crActions={crActions} depts={headcountDB[latestMonth]} />;
      default: return null;
    }
  };

  const headerTitle = {
    chapter0: 'Executive Dashboard', chapter1: 'Fixed Cost Management', chapter2: 'Production & Sales',
    chapter3: 'Cost Reduction', chapter4: 'HR Management', chapter5: 'Action Tracker'
  }[activeTab];

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 flex" onClick={() => { setIsSearchFocused(false); setShowNotifications(false); }}>
      {/* Sidebar */}
      <div className={`${isMenuOpen ? 'w-80' : 'w-20'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col z-30 shadow-xl`} onClick={e => e.stopPropagation()}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/50 bg-slate-900">
          {isMenuOpen && (
            <div className="flex items-center gap-3 text-white">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50"><span className="text-white font-bold text-lg leading-none">I</span></div>
              <div><span className="block font-bold text-lg tracking-tight leading-none text-slate-100">ITCHEM</span><span className="text-[10px] font-medium text-blue-400 tracking-widest uppercase">Global Operations</span></div>
            </div>
          )}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"><Menu size={20} /></button>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          <MenuHeading isOpen={isMenuOpen} text="Overview" />
          <MenuButton active={activeTab === 'chapter0'} onClick={() => setActiveTab('chapter0')} icon={<BarChart3 size={20} />} label="1. 경영 요약" isOpen={isMenuOpen} />
          <div className="my-2 border-t border-slate-800/50 mx-2"></div>
          <MenuHeading isOpen={isMenuOpen} text="Operations" />
          <MenuButton active={activeTab === 'chapter1'} onClick={() => setActiveTab('chapter1')} icon={<LayoutDashboard size={20} />} label="2. 고정비 관리" isOpen={isMenuOpen} />
          <MenuButton active={activeTab === 'chapter2'} onClick={() => setActiveTab('chapter2')} icon={<Factory size={20} />} label="3. 생산·매출" isOpen={isMenuOpen} />
          <MenuButton active={activeTab === 'chapter3'} onClick={() => setActiveTab('chapter3')} icon={<TrendingDown size={20} />} label="4. 원가절감" isOpen={isMenuOpen} />
          <div className="my-2 border-t border-slate-800/50 mx-2"></div>
          <MenuHeading isOpen={isMenuOpen} text="Organization" />
          <MenuButton active={activeTab === 'chapter4'} onClick={() => setActiveTab('chapter4')} icon={<Users size={20} />} label="5. 인력 관리" isOpen={isMenuOpen} />
          <MenuButton active={activeTab === 'chapter5'} onClick={() => setActiveTab('chapter5')} icon={<ClipboardList size={20} />} label="6. 액션 트래커" isOpen={isMenuOpen} />
        </nav>
        <div className="p-4 border-t border-slate-800 mx-2 mb-2">
          <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isMenuOpen ? 'bg-slate-800/50 hover:bg-slate-800' : 'justify-center'}`}>
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm border border-slate-600">{session.user.email[0].toUpperCase()}</div>
            {isMenuOpen && <div className="overflow-hidden flex-1"><p className="text-sm font-bold text-slate-200 truncate">{session.user.email.split('@')[0]}</p><p className="text-xs text-slate-500 truncate">Administrator</p></div>}
            {isMenuOpen && <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition" title="Logout"><LogOut size={16}/></button>}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-20 sticky top-0 shadow-sm" onClick={e => e.stopPropagation()}>
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">{headerTitle}</h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">ITCHEM Global Operations System</p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* [NEW] Save to Cloud Button */}
             <button 
                onClick={handleGlobalSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${isSaving ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600'}`}
                title="Save all changes to Cloud (Ctrl+S)"
             >
                {isSaving ? <Loader2 size={18} className="animate-spin"/> : <Cloud size={18} />}
                <span className="text-xs font-bold hidden sm:inline">{isSaving ? 'Saving...' : 'Save to Cloud'}</span>
             </button>

             {/* Search Input */}
             <div className="hidden lg:block relative w-64">
                <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                  <Search size={16} className="text-slate-400 mr-2"/>
                  <input 
                    type="text" 
                    placeholder="Search..." 
                    className="bg-transparent border-none text-sm w-full focus:outline-none text-slate-700 placeholder-slate-400"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {/* Search Results Dropdown (생략 없이 포함) */}
                {isSearchFocused && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up max-h-80 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, idx) => (
                        <div key={idx} className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-none flex items-center justify-between group" onClick={() => handleSearchResultClick(result.tab)}>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${result.type === 'Business' ? 'bg-blue-500' : result.type === 'Cost Save' ? 'bg-purple-500' : 'bg-emerald-500'}`}>{result.type}</span>
                              <span className="text-sm font-bold text-slate-800">{result.label}</span>
                            </div>
                            <p className="text-xs text-slate-500">{result.detail}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500"/>
                        </div>
                      ))
                    ) : (<div className="p-4 text-center text-sm text-slate-400">검색 결과가 없습니다.</div>)}
                  </div>
                )}
             </div>

             {/* Notification Bell */}
             <div className="flex items-center gap-3 text-slate-400 relative">
                <button 
                  className={`p-2 rounded-md transition relative ${showNotifications ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 hover:text-blue-600'}`}
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell size={18} />
                  {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>}
                </button>
                {showNotifications && (
                  <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-lg shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-slate-700">Notifications</h3>
                      <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{notifications.length} New</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? <div className="p-6 text-center text-sm text-slate-400">알림이 없습니다.</div> : 
                        notifications.map((noti) => (
                          <div key={noti.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 flex gap-3">
                            <div className="mt-1">{noti.type === 'alert' ? <AlertCircle size={16} className="text-red-500"/> : noti.type === 'success' ? <Check size={16} className="text-green-500"/> : <Info size={16} className="text-blue-500"/>}</div>
                            <div className="flex-1"><p className="text-xs font-bold text-slate-800 mb-0.5">{noti.type === 'alert' ? 'Risk Alert' : noti.type === 'success' ? 'System' : 'Info'}</p><p className="text-xs text-slate-500 leading-snug">{noti.msg}</p></div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                )}
             </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 scrollbar-hide relative z-10">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const MenuHeading = ({ isOpen, text }) => (<div className={`px-4 pb-2 pt-4 ${!isOpen && 'hidden'}`}><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{text}</p></div>);
const MenuButton = ({ active, onClick, icon, label, isOpen }) => (<button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 group relative ${active ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}><span className={active ? 'text-white' : 'text-slate-400 group-hover:text-white transition'}>{icon}</span>{isOpen && <span className="whitespace-nowrap flex-1 text-left truncate">{label}</span>}{active && isOpen && <ChevronRight size={14} className="text-blue-300 ml-auto"/>}</button>);

export default App;