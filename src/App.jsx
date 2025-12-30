import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Factory, TrendingDown, Users, ClipboardList,
  Menu, ChevronRight, Search, Bell, Settings, HelpCircle, BarChart3,
  X, AlertCircle, CheckCircle, Info
} from 'lucide-react';

// 컴포넌트 불러오기
import Chapter0_Executive from './components/Chapter0_Executive';
import Chapter1_FixedCost from './components/Chapter1_FixedCost';
import Chapter2_Production from './components/Chapter2_Production';
import Chapter3_CostReduction from './components/Chapter3_CostReduction';
import Chapter4_Headcount from './components/Chapter4_Headcount';
import Chapter5_ActionTracker from './components/Chapter5_ActionTracker';

// --- [전역 초기 데이터 정의] ---
// (기존 데이터 구조 유지)
const INITIAL_PNL = [
  { id: 1, name: 'OLED 소재', rev: 3.20, prevRev: 3.00, gm: 0.78, prevGm: 0.70, fixed: 0.62, prevFixed: 0.60 },
  { id: 2, name: 'API/중간체', rev: 2.40, prevRev: 2.50, gm: 0.50, prevGm: 0.55, fixed: 0.55, prevFixed: 0.55 },
  { id: 3, name: '신사업', rev: 0.60, prevRev: 0.50, gm: 0.08, prevGm: 0.05, fixed: 0.30, prevFixed: 0.25 },
];

const INITIAL_HISTORY = [
  { 
    month: '2024-11', status: '마감 완료', totalOp: -0.05, rev: 5.8, fixed: 1.46, ratio: 25.1,
    bu_data: [
      { name: 'OLED 소재', rev: 3.0, gm: 0.72, fixed: 0.60 },
      { name: 'API/중간체', rev: 2.3, gm: 0.48, fixed: 0.54 },
      { name: '신사업', rev: 0.5, gm: 0.05, fixed: 0.28 },
    ],
    cost_details: [
      { category: '원재료비', value: 2.5, color: '#3B82F6' },
      { category: '인건비', value: 1.8, color: '#10B981' },
      { category: '감가상각', value: 0.9, color: '#F59E0B' },
      { category: '외주용역', value: 0.6, color: '#EF4444' },
    ]
  },
  { 
    month: '2024-12', status: '마감 완료', totalOp: 0.12, rev: 6.2, fixed: 1.47, ratio: 23.7,
    bu_data: [
      { name: 'OLED 소재', rev: 2.9, gm: 0.70, fixed: 0.58 },
      { name: 'API/중간체', rev: 2.2, gm: 0.45, fixed: 0.53 },
      { name: '신사업', rev: 0.4, gm: 0.02, fixed: 0.25 },
    ],
    cost_details: [
      { category: '원재료비', value: 2.2, color: '#3B82F6' },
      { category: '인건비', value: 1.8, color: '#10B981' },
      { category: '감가상각', value: 0.9, color: '#F59E0B' },
      { category: '외주용역', value: 0.6, color: '#EF4444' },
    ]
  },
];

const INITIAL_PROD_STATS = [
  { month: '2024-08', util: 78.5, oled: 15, api: 12, newBiz: 3, late: 3 },
  { month: '2024-09', util: 80.2, oled: 16, api: 13, newBiz: 4, late: 2 },
  { month: '2024-10', util: 81.5, oled: 18, api: 12, newBiz: 5, late: 1 },
  { month: '2024-11', util: 82.0, oled: 20, api: 14, newBiz: 6, late: 0 },
  { month: '2024-12', util: 84.5, oled: 22, api: 15, newBiz: 8, late: 2 },
];

const INITIAL_CR_ACTIONS = [
  { id: 1, category: 'raw', item: '핵심 원재료 A', action: '2nd Vendor 도입', annualEffect: 0.5, status: '완료', risk: 'None', completedMonth: '2024-10' },
  { id: 2, category: 'util', item: '재생 용매', action: '회수율 70%→78%', annualEffect: 0.3, status: '진행중', risk: 'None', completedMonth: '2024-12' },
  { id: 3, category: 'out', item: '반복 분석', action: '월 40건 내재화', annualEffect: 0.2, status: '검토', risk: '인력 부하', completedMonth: '2025-01' },
  { id: 4, category: 'fail', item: '공정 불량', action: '재작업률 3% 저감', annualEffect: 0.15, status: '리스크', risk: '품질 승인 지연', completedMonth: '2025-02' },
];

const createDeptData = (rnd, mfg, qa, sales) => [
  { id: 'rnd', name: '연구 (R&D)', count: rnd, color: '#8B5CF6', members: [{ id: 1, name: '김연구', position: '수석', task: '신물질 A 합성', status: '진행' }] },
  { id: 'mfg', name: '제조 (Mfg)', count: mfg, color: '#3B82F6', members: [{ id: 1, name: '박공장', position: '팀장', task: '3호기 가동률 안정화', status: '진행' }] },
  { id: 'qa', name: '품질 (QA)', count: qa, color: '#F59E0B', members: [{ id: 1, name: '정품질', position: '책임', task: 'ISO 인증 갱신', status: '지연' }] },
  { id: 'sales', name: '영업/PM', count: sales, color: '#10B981', members: [{ id: 1, name: '한영업', position: '수석', task: 'Global C사 벤더 등록', status: '진행' }] },
];
const INITIAL_HEADCOUNT_DB = {
  '2024-08': createDeptData(15, 38, 14, 8),
  '2024-09': createDeptData(16, 39, 14, 8),
  '2024-10': createDeptData(16, 40, 15, 9),
  '2024-11': createDeptData(17, 41, 16, 9),
  '2024-12': createDeptData(18, 42, 16, 9),
};

const App = () => {
  const [activeTab, setActiveTab] = useState('chapter0');
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  // --- [State Management] ---
  const [pnlData, setPnlData] = useState(INITIAL_PNL);
  const [historyData, setHistoryData] = useState(INITIAL_HISTORY);
  const [prodStats, setProdStats] = useState(INITIAL_PROD_STATS);
  const [crActions, setCrActions] = useState(INITIAL_CR_ACTIONS);
  const [headcountDB, setHeadcountDB] = useState(INITIAL_HEADCOUNT_DB);

  // --- [New Features State] ---
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // --- [Logic 1: Search Implementation] ---
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = [];

    // 1. Search Business Units (P&L)
    pnlData.forEach(bu => {
      if (bu.name.toLowerCase().includes(query)) {
        results.push({ type: 'Business', label: bu.name, detail: `Revenue: ${bu.rev}B`, tab: 'chapter0' });
      }
    });

    // 2. Search Cost Reduction Items
    crActions.forEach(action => {
      if (action.item.toLowerCase().includes(query) || action.action.toLowerCase().includes(query)) {
        results.push({ type: 'Cost Save', label: action.item, detail: `${action.status} (${action.annualEffect}B)`, tab: 'chapter3' });
      }
    });

    // 3. Search Personnel (Latest Month)
    const latestMonth = Object.keys(headcountDB).sort().pop();
    if (latestMonth) {
      headcountDB[latestMonth].forEach(dept => {
        dept.members.forEach(member => {
          if (member.name.toLowerCase().includes(query) || member.task.toLowerCase().includes(query)) {
            results.push({ type: 'Personnel', label: `${member.name} (${member.position})`, detail: `${dept.name} - ${member.task}`, tab: 'chapter4' });
          }
        });
      });
    }

    setSearchResults(results);
  }, [searchQuery, pnlData, crActions, headcountDB]);

  // --- [Logic 2: Auto-Notification Logic] ---
  useEffect(() => {
    const newNotis = [];
    
    // Risk Detection from Cost Reduction
    crActions.forEach(action => {
      if (action.status === '리스크' || (action.risk && action.risk !== 'None')) {
        newNotis.push({ id: `risk-${action.id}`, type: 'alert', msg: `[Risk] ${action.item}: ${action.risk}` });
      }
    });

    // Low OTD Detection
    const latestProd = prodStats[prodStats.length - 1];
    const totalBatch = latestProd.oled + latestProd.api + latestProd.newBiz;
    const otd = totalBatch > 0 ? ((totalBatch - latestProd.late) / totalBatch) * 100 : 0;
    
    if (otd < 95) {
      newNotis.push({ id: 'otd-warning', type: 'warning', msg: `[Production] 최근 OTD가 ${otd.toFixed(1)}%로 목표(95%) 미달입니다.` });
    }

    setNotifications(newNotis);
  }, [crActions, prodStats]);

  const handleSearchResultClick = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // --- [Existing Handlers] ---
  const handlePnlChange = (id, field, value) => { /* ... 기존 로직 ... */
    const numValue = value === '' ? 0 : parseFloat(value);
    setPnlData(prev => prev.map(row => {
      if (row.id !== id) return row;
      let newRow = { ...row, [field]: numValue };
      if (field === 'rev') {
        const oldMargin = row.rev > 0 ? row.gm / row.rev : 0;
        newRow.gm = numValue * oldMargin; 
      }
      return newRow;
    }));
  };

  const handleSaveToArchive = (monthName) => { /* ... 기존 로직 ... */
    if (!monthName) return alert("저장할 '년-월'을 선택해주세요.");
    const totalRev = pnlData.reduce((acc, cur) => acc + cur.rev, 0);
    const totalGm = pnlData.reduce((acc, cur) => acc + cur.gm, 0);
    const totalFixed = pnlData.reduce((acc, cur) => acc + cur.fixed, 0);
    const totalOp = totalGm - totalFixed;
    const ratio = totalRev > 0 ? (totalFixed / totalRev) * 100 : 0;
    const newEntry = {
      month: monthName, status: '마감 완료', totalOp: totalOp, rev: totalRev, fixed: totalFixed, ratio: ratio,
      bu_data: pnlData.map(row => ({ ...row })),
      cost_details: [
        { category: '원재료비', value: totalRev * 0.4, color: '#3B82F6' },
        { category: '인건비', value: totalRev * 0.25, color: '#10B981' },
        { category: '감가상각', value: totalRev * 0.15, color: '#F59E0B' },
        { category: '기타', value: totalRev * 0.05, color: '#EF4444' },
      ]
    };
    setHistoryData(prev => {
      const exists = prev.find(h => h.month === monthName);
      if (exists) {
        if(window.confirm(`${monthName} 데이터가 이미 존재합니다. 덮어쓰시겠습니까?`)) {
          return prev.map(h => h.month === monthName ? newEntry : h);
        }
        return prev;
      }
      return [newEntry, ...prev].sort((a, b) => b.month.localeCompare(a.month));
    });
    alert(`${monthName} 실적이 성공적으로 저장되었습니다.`);
  };

  const handleHeadcountChange = (month, updatedDepts) => {
    setHeadcountDB(prev => ({ ...prev, [month]: updatedDepts }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'chapter0': return <Chapter0_Executive pnlData={pnlData} onPnlChange={handlePnlChange} historyData={historyData} onSaveArchive={handleSaveToArchive} />;
      case 'chapter1': return <Chapter1_FixedCost pnlData={pnlData} historyData={historyData} />;
      case 'chapter2': return <Chapter2_Production historyData={historyData} pnlData={pnlData} prodStats={prodStats} setProdStats={setProdStats} />;
      case 'chapter3': return <Chapter3_CostReduction actions={crActions} setActions={setCrActions} />;
      case 'chapter4': return <Chapter4_Headcount pnlData={pnlData} headcountDB={headcountDB} onHeadcountUpdate={handleHeadcountChange} prodStats={prodStats} />;
      case 'chapter5': 
      const latestMonth = Object.keys(headcountDB).sort().pop() || '2024-12';
      return (
        <Chapter5_ActionTracker 
          // [추가됨] 고정비 자동 감지를 위해 필요
          pnlData={pnlData} 
          
          // [추가됨] 생산 이슈 자동 감지를 위해 필요
          prodStats={prodStats} 
          
          // 기존 Props 유지
          crActions={crActions} 
          depts={headcountDB[latestMonth]} 
        />
      );
    }
  };

  const header = {
    title: activeTab === 'chapter0' ? 'Executive Dashboard' : 
           activeTab === 'chapter1' ? 'Fixed Cost Management' :
           activeTab === 'chapter2' ? 'Production & Sales' :
           activeTab === 'chapter3' ? 'Cost Reduction' :
           activeTab === 'chapter4' ? 'HR Management' : 'Action Tracker',
    sub: 'ITCHEM Global Operations System'
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 flex" onClick={() => { setIsSearchFocused(false); setShowNotifications(false); }}>
      {/* Sidebar */}
      <div className={`${isMenuOpen ? 'w-80' : 'w-20'} bg-slate-900 border-r border-slate-800 transition-all duration-300 flex flex-col z-30 shadow-xl`} onClick={e => e.stopPropagation()}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800/50 bg-slate-900">
          {isMenuOpen && (
            <div className="flex items-center gap-3 text-white">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
                <span className="text-white font-bold text-lg leading-none">I</span>
              </div>
              <div>
                <span className="block font-bold text-lg tracking-tight leading-none text-slate-100">ITCHEM</span>
                <span className="text-[10px] font-medium text-blue-400 tracking-widest uppercase">Global Operations</span>
              </div>
            </div>
          )}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition">
            <Menu size={20} />
          </button>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          <MenuHeading isOpen={isMenuOpen} text="개요 (Overview)" />
          <MenuButton active={activeTab === 'chapter0'} onClick={() => setActiveTab('chapter0')} icon={<BarChart3 size={20} />} label="1. 경영 요약 (Executive Summary)" isOpen={isMenuOpen} />
          <div className="my-2 border-t border-slate-800/50 mx-2"></div>
          <MenuHeading isOpen={isMenuOpen} text="재무 및 운영 (Financials & Ops)" />
          <MenuButton active={activeTab === 'chapter1'} onClick={() => setActiveTab('chapter1')} icon={<LayoutDashboard size={20} />} label="2. 고정비 관리 (Fixed Cost)" isOpen={isMenuOpen} />
          <MenuButton active={activeTab === 'chapter2'} onClick={() => setActiveTab('chapter2')} icon={<Factory size={20} />} label="3. 생산·매출 (Production & Sales)" isOpen={isMenuOpen} />
          <MenuButton active={activeTab === 'chapter3'} onClick={() => setActiveTab('chapter3')} icon={<TrendingDown size={20} />} label="4. 원가절감 (Cost Reduction)" isOpen={isMenuOpen} />
          <div className="my-2 border-t border-slate-800/50 mx-2"></div>
          <MenuHeading isOpen={isMenuOpen} text="조직 관리 (Organization)" />
          <MenuButton active={activeTab === 'chapter4'} onClick={() => setActiveTab('chapter4')} icon={<Users size={20} />} label="5. 인력 관리 (HR Management)" isOpen={isMenuOpen} />
          <MenuButton active={activeTab === 'chapter5'} onClick={() => setActiveTab('chapter5')} icon={<ClipboardList size={20} />} label="6. 액션 트래커 (Action Tracker)" isOpen={isMenuOpen} />
        </nav>

        <div className="p-4 border-t border-slate-800 mx-2 mb-2">
          <div className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${isMenuOpen ? 'bg-slate-800/50 hover:bg-slate-800 cursor-pointer' : 'justify-center'}`}>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600" />
            {isMenuOpen && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-slate-200 truncate">Kim Manager</p>
                <p className="text-xs text-slate-500 truncate">OLED Strategy Team</p>
              </div>
            )}
            {isMenuOpen && <Settings size={16} className="text-slate-500 hover:text-white transition" />}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative bg-[#F8FAFC]">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-20 sticky top-0 shadow-sm" onClick={e => e.stopPropagation()}>
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 tracking-tight">
              {header.title}
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{header.sub}</p>
          </div>
          
          <div className="flex items-center gap-6">
             {/* 1. Real-time Search Input */}
             <div className="hidden lg:block relative w-80">
                <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                  <Search size={16} className="text-slate-400 mr-2"/>
                  <input 
                    type="text" 
                    placeholder="Search data (BU, Item, People)..." 
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

                {/* Search Results Dropdown */}
                {isSearchFocused && searchQuery && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up max-h-80 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, idx) => (
                        <div 
                          key={idx} 
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-none flex items-center justify-between group"
                          onClick={() => handleSearchResultClick(result.tab)}
                        >
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                                result.type === 'Business' ? 'bg-blue-500' : 
                                result.type === 'Cost Save' ? 'bg-purple-500' : 'bg-emerald-500'
                              }`}>
                                {result.type}
                              </span>
                              <span className="text-sm font-bold text-slate-800">{result.label}</span>
                            </div>
                            <p className="text-xs text-slate-500">{result.detail}</p>
                          </div>
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500"/>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-400">검색 결과가 없습니다.</div>
                    )}
                  </div>
                )}
             </div>

             {/* 2. Notification Bell */}
             <div className="flex items-center gap-3 text-slate-400 relative">
                <button 
                  className={`p-2 rounded-md transition relative ${showNotifications ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 hover:text-blue-600'}`}
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell size={18} />
                  {notifications.length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-lg shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in-up">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-slate-700">Notifications</h3>
                      <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{notifications.length} New</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-400">새로운 알림이 없습니다.</div>
                      ) : (
                        notifications.map((noti) => (
                          <div key={noti.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 flex gap-3 relative group">
                            <div className="mt-1">
                              {noti.type === 'alert' ? <AlertCircle size={16} className="text-red-500"/> : <Info size={16} className="text-blue-500"/>}
                            </div>
                            <div className="flex-1">
                              <p className="text-xs font-bold text-slate-800 mb-0.5">{noti.type === 'alert' ? 'Risk Alert' : 'System Info'}</p>
                              <p className="text-xs text-slate-500 leading-snug">{noti.msg}</p>
                            </div>
                            <button 
                              onClick={(e) => { e.stopPropagation(); removeNotification(noti.id); }}
                              className="absolute top-2 right-2 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
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

const MenuHeading = ({ isOpen, text }) => (
  <div className={`px-4 pb-2 pt-4 ${!isOpen && 'hidden'}`}>
    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{text}</p>
  </div>
);

const MenuButton = ({ active, onClick, icon, label, isOpen }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 group relative
      ${active 
        ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-900/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'}`}
  >
    <span className={active ? 'text-white' : 'text-slate-400 group-hover:text-white transition'}>{icon}</span>
    {isOpen && <span className="whitespace-nowrap flex-1 text-left truncate">{label}</span>}
    {active && isOpen && <ChevronRight size={14} className="text-blue-300 ml-auto"/>}
  </button>
);

export default App;