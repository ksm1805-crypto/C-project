import React, { useState } from 'react';
import { 
  Activity, Factory, LayoutDashboard, Menu, TrendingDown, Users, ClipboardList,
  ChevronRight, Search, Bell
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
    <div className="min-h-screen bg-[#F2F4F7] flex font-sans text-gray-800">
      {/* Sidebar: 증권사 스타일 (Light & Bordered) */}
      <div className={`${isMenuOpen ? 'w-60' : 'w-16'} bg-white border-r border-gray-300 transition-all duration-300 flex flex-col z-20`}>
        {/* Brand Area */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-blue-900">
          {isMenuOpen && (
            <div className="flex items-center gap-2 text-white">
              <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center font-bold text-xs">IT</div>
              <span className="font-bold tracking-tight">CHEM MIS</span>
            </div>
          )}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-blue-200 hover:text-white">
            <Menu size={18} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
          <MenuButton 
            active={activeTab === 'chapter1'} onClick={() => setActiveTab('chapter1')} 
            icon={<LayoutDashboard size={18} />} label="고정비 통제" isOpen={isMenuOpen} 
          />
          <MenuButton 
            active={activeTab === 'chapter2'} onClick={() => setActiveTab('chapter2')} 
            icon={<Factory size={18} />} label="생산·매출 연동" isOpen={isMenuOpen} 
          />
          <MenuButton 
            active={activeTab === 'chapter3'} onClick={() => setActiveTab('chapter3')} 
            icon={<TrendingDown size={18} />} label="원가절감 관리" isOpen={isMenuOpen} 
          />
          <MenuButton 
            active={activeTab === 'chapter4'} onClick={() => setActiveTab('chapter4')} 
            icon={<Users size={18} />} label="인력 관리" isOpen={isMenuOpen} 
          />
          <div className="my-2 border-t border-gray-200 mx-4"></div>
          <MenuButton 
            active={activeTab === 'chapter5'} onClick={() => setActiveTab('chapter5')} 
            icon={<ClipboardList size={18} />} label="액션 트래커" isOpen={isMenuOpen} 
          />
        </nav>

        {/* User Profile (Bottom) */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-gray-300 bg-white flex items-center justify-center font-bold text-xs text-blue-900">UA</div>
            {isMenuOpen && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900 truncate">OLED 사업부장</p>
                <p className="text-[10px] text-gray-500 truncate">관리자 모드</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header: 금융 대시보드 느낌 */}
        <header className="h-14 bg-white border-b border-gray-300 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="text-gray-400 font-light">menu</span>
              <ChevronRight size={14} className="text-gray-400"/>
              {header.title}
            </h2>
            <span className="px-2 py-0.5 rounded-sm bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
              {header.sub}
            </span>
          </div>
          <div className="flex items-center gap-4">
             {/* 검색창 흉내 */}
             <div className="hidden md:flex items-center bg-gray-100 rounded-sm px-3 py-1.5 border border-gray-200">
                <Search size={14} className="text-gray-400 mr-2"/>
                <input type="text" placeholder="코드/항목 검색" className="bg-transparent border-none text-xs w-48 focus:outline-none"/>
             </div>
             <div className="w-px h-4 bg-gray-300"></div>
             <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                LIVE DATA
             </div>
             <Bell size={18} className="text-gray-400 hover:text-blue-600 cursor-pointer"/>
          </div>
        </header>

        {/* Contents Wrapper */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

// 메뉴 버튼 (스타일 개선)
const MenuButton = ({ active, onClick, icon, label, isOpen }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 border-l-4
      ${active 
        ? 'border-blue-600 bg-blue-50 text-blue-800 font-bold' 
        : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 font-medium'}`}
  >
    {icon}
    {isOpen && <span className="whitespace-nowrap">{label}</span>}
  </button>
);

export default App;