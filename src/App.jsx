import React, { useState } from 'react';
import { 
  Activity, Factory, LayoutDashboard, Menu, TrendingDown, Users, ClipboardList,
  ChevronRight, Search, Bell, Settings, HelpCircle
} from 'lucide-react';

// 컴포넌트 불러오기 (경로 유지)
import Chapter1_FixedCost from './components/Chapter1_FixedCost';
import Chapter2_Production from './components/Chapter2_Production';
import Chapter3_CostReduction from './components/Chapter3_CostReduction';
import Chapter4_Headcount from './components/Chapter4_Headcount';
import Chapter5_ActionTracker from './components/Chapter5_ActionTracker';

const App = () => {
  const [activeTab, setActiveTab] = useState('chapter1');
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const renderContent = () => {
    switch (activeTab) {
      case 'chapter1': return <Chapter1_FixedCost />;
      case 'chapter2': return <Chapter2_Production />;
      case 'chapter3': return <Chapter3_CostReduction />;
      case 'chapter4': return <Chapter4_Headcount />;
      case 'chapter5': return <Chapter5_ActionTracker />;
      default: return <Chapter1_FixedCost />;
    }
  };

  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'chapter1': return { title: '고정비 통제', sub: 'Fixed Cost Control' };
      case 'chapter2': return { title: '생산·매출 연동', sub: 'Production Linkage' };
      case 'chapter3': return { title: '원가절감 관리', sub: 'Cost Reduction' };
      case 'chapter4': return { title: '인력 관리', sub: 'Headcount & HR' };
      case 'chapter5': return { title: '액션 트래커', sub: 'Monthly Action Plan' };
      default: return { title: '', sub: '' };
    }
  };

  const header = getHeaderInfo();

  return (
    <div className="min-h-screen bg-slate-50/80 font-sans text-slate-900 flex">
      {/* Sidebar: 세련된 엔터프라이즈 스타일 */}
      <div className={`${isMenuOpen ? 'w-72' : 'w-20'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col z-30 shadow-sm`}>
        {/* Brand Area */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100">
          {isMenuOpen && (
            <div className="flex items-center gap-2.5 text-indigo-900">
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg leading-none">I</span>
              </div>
              <div>
                <span className="block font-bold text-lg tracking-tight leading-none">ITCHEM</span>
                <span className="text-[10px] font-medium text-indigo-400 tracking-widest uppercase">Enterprise MIS</span>
              </div>
            </div>
          )}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-slate-400 hover:text-indigo-600 p-1 rounded-lg hover:bg-slate-100 transition">
            <Menu size={20} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-hide">
          <MenuHeading isOpen={isMenuOpen} text="Financials & Ops" />
          <MenuButton active={activeTab === 'chapter1'} onClick={() => setActiveTab('chapter1')} icon={<LayoutDashboard size={20} />} label="고정비 통제" isOpen={isMenuOpen} />
          <MenuButton active={activeTab === 'chapter2'} onClick={() => setActiveTab('chapter2')} icon={<Factory size={20} />} label="생산·매출 연동" isOpen={isMenuOpen} />
          <MenuButton active={activeTab === 'chapter3'} onClick={() => setActiveTab('chapter3')} icon={<TrendingDown size={20} />} label="원가절감 관리" isOpen={isMenuOpen} />
          
          <div className="my-4"></div>
          <MenuHeading isOpen={isMenuOpen} text="Organization" />
          <MenuButton active={activeTab === 'chapter4'} onClick={() => setActiveTab('chapter4')} icon={<Users size={20} />} label="인력 관리" isOpen={isMenuOpen} />
          <MenuButton active={activeTab === 'chapter5'} onClick={() => setActiveTab('chapter5')} icon={<ClipboardList size={20} />} label="액션 트래커" isOpen={isMenuOpen} />
        </nav>

        {/* User Profile (Bottom) */}
        <div className="p-4 border-t border-slate-100 mx-2 mb-2">
          <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${isMenuOpen ? 'bg-slate-50 hover:bg-indigo-50 cursor-pointer' : 'justify-center'}`}>
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-10 h-10 rounded-full bg-white border-2 border-white shadow-sm" />
            {isMenuOpen && (
              <div className="overflow-hidden flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">김관리 수석</p>
                <p className="text-xs text-slate-500 truncate">OLED 전략기획팀</p>
              </div>
            )}
            {isMenuOpen && <Settings size={16} className="text-slate-400" />}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header: 깔끔하고 넓은 느낌 */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between px-8 z-20 sticky top-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 tracking-tight">
              {header.title}
            </h2>
            <p className="text-sm font-medium text-slate-500 mt-0.5">
              {header.sub}
            </p>
          </div>
          <div className="flex items-center gap-6">
             {/* 검색창 */}
             <div className="hidden lg:flex items-center bg-slate-100/50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:border-indigo-400 focus-within:bg-white transition-all w-72">
                <Search size={18} className="text-slate-400 mr-3"/>
                <input type="text" placeholder="Search anything..." className="bg-transparent border-none text-sm w-full focus:outline-none text-slate-700 placeholder-slate-400"/>
             </div>
             
             <div className="flex items-center gap-4 text-slate-400">
                <button className="p-2 rounded-full hover:bg-slate-100 hover:text-indigo-600 transition relative">
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
                <button className="p-2 rounded-full hover:bg-slate-100 hover:text-indigo-600 transition">
                  <HelpCircle size={20} />
                </button>
             </div>
          </div>
        </header>

        {/* Contents Wrapper */}
        <main className="flex-1 overflow-y-auto p-8 scrollbar-hide relative z-10">
          <div className="max-w-[1600px] mx-auto space-y-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

// 메뉴 섹션 헤더
const MenuHeading = ({ isOpen, text }) => (
  <div className={`px-4 pb-2 pt-4 ${!isOpen && 'hidden'}`}>
    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{text}</p>
  </div>
);

// 메뉴 버튼 (세련된 스타일)
const MenuButton = ({ active, onClick, icon, label, isOpen }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] transition-all duration-200 group relative
      ${active 
        ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-200/50' 
        : 'text-slate-600 hover:bg-indigo-50/80 hover:text-indigo-700 font-medium'}`}
  >
    {icon}
    {isOpen && <span className="whitespace-nowrap flex-1 text-left">{label}</span>}
    {active && isOpen && <ChevronRight size={16} className="text-indigo-200 animate-pulse"/>}
    {!isOpen && active && <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-white rounded-full opacity-30"></div>}
  </button>
);

export default App;