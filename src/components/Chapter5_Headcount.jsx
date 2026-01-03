import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  ComposedChart, Line, Legend, Area 
} from 'recharts';
import { 
  Users, Briefcase, TrendingUp, UserPlus, ChevronRight, Edit3, Save, Trash2, 
  ArrowLeft, Activity, Link as LinkIcon, Calendar, Loader2, AlertCircle, Plus,
  CheckSquare, Square
} from 'lucide-react';
import KPICard from './common/KPICard';

// --- [Utility] ---
const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const Chapter5_Headcount = ({
  pnlData, headcountDB, onHeadcountUpdate, prodStats, historyData,
  selectedMonth, onMonthChange
}) => {
  const [selectedDept, setSelectedDept] = useState(null);

  // 선택된 월이 바뀌면 상세 보기 닫기
  useEffect(() => {
    setSelectedDept(null);
  }, [selectedMonth]);

  // 그래프 필터 상태
  const [visibleMetrics, setVisibleMetrics] = useState({
    productivity: true, // 인당 생산성 (Batch/명)
    batch: true,        // 총 생산량 (Batch)
    rev: false,         // 인당 매출 (B/명)
    op: false           // 인당 영업이익 (B/명)
  });

  const toggleMetric = (key) => {
    setVisibleMetrics(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // --- [Logic 1] 조회 가능한 월 (History Archive 기준) ---
  const availableMonths = useMemo(() => {
    if (!Array.isArray(historyData)) return [];
    return Array.from(new Set(historyData.map(h => h.month))).sort((a, b) => b.localeCompare(a));
  }, [historyData]);

  // 초기 로딩 시 가장 최신 월 선택 (App에서 제어하지만 방어적으로)
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      onMonthChange(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth, onMonthChange]);

  // --- [Data Prep] ---
  const currentDepts = useMemo(() => {
    if (!headcountDB || !selectedMonth) return [];
    return headcountDB[selectedMonth] || [];
  }, [headcountDB, selectedMonth]);

  // --- [Logic 2] 상단 KPI 통계 (선택된 월 기준) ---
  const summary = useMemo(() => {
    if (!selectedMonth) return { totalHeadcount: 0, totalRevenue: 0, revPerHead: 0, mfgHeadcount: 0, batchPerHead: 0, currentTotalBatch: 0, isArchived: false };

    // 1. 인원 집계
    const totalHeadcount = currentDepts.reduce((acc, cur) => acc + (parseInt(cur.count) || 0), 0);
    const mfgHeadcount = currentDepts.find(d => d.id === 'mfg' || d.name.includes('제조'))?.count || 1; 
    
    // 2. 재무 데이터 (Archive에서 가져옴 - 이미 B 단위)
    const archive = Array.isArray(historyData) ? historyData.find(h => h.month === selectedMonth) : null;
    const totalRevenue = archive ? safeNum(archive.rev) : 0;
    
    // 3. 생산 데이터 (ProdStats)
    const currentStat = Array.isArray(prodStats) ? prodStats.find(s => s.month === selectedMonth) : null;
    const currentTotalBatch = currentStat ? (safeNum(currentStat.oled) + safeNum(currentStat.api) + safeNum(currentStat.new_biz || currentStat.newBiz)) : 0;
    
    // 4. 지표 계산 (Revenue는 B 단위 유지)
    // 인당 매출: (Total Rev B) / (Headcount)
    const revPerHead = totalHeadcount > 0 ? (totalRevenue / totalHeadcount) : 0;
    
    // 인당 생산량: (Total Batch) / (Mfg Headcount)
    const batchPerHead = mfgHeadcount > 0 ? (currentTotalBatch / mfgHeadcount) : 0;

    return { 
      totalHeadcount, 
      totalRevenue, 
      revPerHead, 
      mfgHeadcount, 
      batchPerHead, 
      currentTotalBatch, 
      isArchived: !!archive 
    };
  }, [currentDepts, prodStats, selectedMonth, historyData]);

  // --- [Logic 3] 트렌드 차트 데이터 (History Data 기준 통합) ---
  const trendData = useMemo(() => {
    if (!Array.isArray(historyData)) return [];
    
    return historyData.map(hist => {
      const m = hist.month;
      
      // 1. 재무 데이터 (Archive - B 단위)
      const rev = safeNum(hist.rev);
      const op = safeNum(hist.totalOp) || (safeNum(hist.gm) - safeNum(hist.fixed));

      // 2. 생산 데이터 (ProdStats)
      const stat = Array.isArray(prodStats) ? prodStats.find(p => p.month === m) : null;
      const totalBatch = stat ? (safeNum(stat.oled) + safeNum(stat.api) + safeNum(stat.new_biz || stat.newBiz)) : 0;

      // 3. 인력 데이터 (HeadcountDB)
      const monthDepts = headcountDB ? headcountDB[m] : [];
      const mfgCount = Array.isArray(monthDepts) ? (monthDepts.find(d => d.id === 'mfg' || d.name.includes('제조'))?.count || 0) : 0;
      const totalHeadcount = Array.isArray(monthDepts) ? monthDepts.reduce((acc, cur) => acc + (parseInt(cur.count) || 0), 0) : 0;
      
      // 4. 지표 계산
      const productivity = mfgCount > 0 ? (totalBatch / mfgCount) : 0;
      
      // 인당 매출 및 영업이익 계산 (단위: B KRW/명)
      // 값이 너무 작게 나오면 (예: 0.05 B), 사용자에게는 0.05로 보여주되 단위가 B임을 인지시켜야 함.
      const revPerHead = totalHeadcount > 0 ? (rev / totalHeadcount) : 0;
      const opPerHead = totalHeadcount > 0 ? (op / totalHeadcount) : 0;

      return {
        month: m,
        revPerHead, 
        opPerHead,  
        batch: totalBatch,
        productivity
      };
    }).sort((a, b) => a.month.localeCompare(b.month)).slice(-12); // 최근 12개월만
  }, [historyData, prodStats, headcountDB]);

  // --- [Handlers] ---
  const handleDeptFieldChange = (id, field, value) => {
    const cleanValue = field === 'count' ? (parseInt(value) || 0) : value;
    const newDepts = currentDepts.map(d => d.id === id ? { ...d, [field]: cleanValue } : d);
    onHeadcountUpdate(selectedMonth, newDepts);
  };

  const handleAddDept = () => {
    if (!selectedMonth) return alert("월을 먼저 선택해주세요.");
    const newId = `dept_${Date.now()}`;
    const newDept = { id: newId, name: '신규 부서', count: 0, color: '#94a3b8', members: [] };
    const newDepts = [...currentDepts, newDept];
    onHeadcountUpdate(selectedMonth, newDepts);
  };

  const handleDeleteDept = (id, e) => {
    e.stopPropagation();
    if (!window.confirm("정말 이 부서를 삭제하시겠습니까?")) return;
    const newDepts = currentDepts.filter(d => d.id !== id);
    onHeadcountUpdate(selectedMonth, newDepts);
  };

  const handleAddMember = () => {
    if (!selectedDept) return;
    const newMember = { id: Date.now(), name: '', position: '', task: '', status: '대기' };
    const updatedDept = { ...selectedDept, members: [...(selectedDept.members || []), newMember] };
    const newDepts = currentDepts.map(d => d.id === selectedDept.id ? updatedDept : d);
    onHeadcountUpdate(selectedMonth, newDepts);
    setSelectedDept(updatedDept); 
  };

  const handleMemberChange = (memberId, field, value) => {
    const updatedMembers = selectedDept.members.map(m => m.id === memberId ? { ...m, [field]: value } : m);
    const updatedDept = { ...selectedDept, members: updatedMembers };
    const newDepts = currentDepts.map(d => d.id === selectedDept.id ? updatedDept : d);
    onHeadcountUpdate(selectedMonth, newDepts);
    setSelectedDept(updatedDept);
  };

  const handleDeleteMember = (memberId) => {
    if (!window.confirm("삭제하시겠습니까?")) return;
    const updatedMembers = selectedDept.members.filter(m => m.id !== memberId);
    const updatedDept = { ...selectedDept, members: updatedMembers };
    const newDepts = currentDepts.map(d => d.id === selectedDept.id ? updatedDept : d);
    onHeadcountUpdate(selectedMonth, newDepts);
    setSelectedDept(updatedDept);
  };

  const handleInitMonth = () => {
    if (!selectedMonth) return;
    const existingMonths = headcountDB ? Object.keys(headcountDB).sort() : [];
    const prevMonth = existingMonths.filter(m => m < selectedMonth).pop();
    let initialData = [];
    let confirmMsg = "";

    if (prevMonth) {
      confirmMsg = `${selectedMonth}월 데이터를 생성하시겠습니까?\n(전월 ${prevMonth} 데이터가 복사됩니다)`;
      initialData = JSON.parse(JSON.stringify(headcountDB[prevMonth]));
    } else {
      confirmMsg = `${selectedMonth}월 데이터를 초기화하시겠습니까?`;
      initialData = [
        { id: 'rnd', name: '연구 (R&D)', count: 0, color: '#8B5CF6', members: [] },
        { id: 'mfg', name: '제조 (Mfg)', count: 0, color: '#3B82F6', members: [] },
        { id: 'qa', name: '품질 (QA)', count: 0, color: '#F59E0B', members: [] },
        { id: 'sales', name: '영업/PM', count: 0, color: '#10B981', members: [] },
      ];
    }

    if (window.confirm(confirmMsg)) {
      onHeadcountUpdate(selectedMonth, initialData);
    }
  };

  if (!headcountDB && !historyData) {
    return <div className="flex h-64 items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> 데이터 로딩 중...</div>;
  }

  // --- [View 1: Detail View] ---
  if (selectedDept) {
    return (
      <div className="space-y-6 animate-fade-in bg-slate-50 min-h-screen pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4">
          <div>
            <button onClick={() => setSelectedDept(null)} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2 font-medium">
              <ArrowLeft size={16}/> Back to Overview
            </button>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: selectedDept.color }}></div>
              {selectedDept.name} 인력 상세
            </h2>
          </div>
          <div className="md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
             <p className="text-xs text-slate-500 font-bold uppercase">Total Headcount</p>
             <p className="text-2xl font-bold text-slate-800">{selectedDept.count}명</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Briefcase size={18} className="text-indigo-500"/> 주요 담당자 및 핵심 과제
            </h3>
            <button onClick={handleAddMember} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-indigo-700 transition shadow-sm">
              <UserPlus size={16} /> 인원 추가
            </button>
          </div>
          
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <div className="min-w-[600px] px-4 md:px-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-y border-slate-200 uppercase text-xs">
                  <tr>
                    <th className="py-3 px-3 w-24">직급</th>
                    <th className="py-3 px-3 w-32">성명</th>
                    <th className="py-3 px-3">핵심 과제 (R&R)</th>
                    <th className="py-3 px-3 w-24 text-center">상태</th>
                    <th className="py-3 px-3 w-16 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(selectedDept.members || []).map(member => (
                    <tr key={member.id} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3"><input className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300 transition-colors" placeholder="직급" value={member.position} onChange={e => handleMemberChange(member.id, 'position', e.target.value)} /></td>
                      <td className="py-2 px-3"><input className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300 font-bold text-slate-700 transition-colors" placeholder="이름" value={member.name} onChange={e => handleMemberChange(member.id, 'name', e.target.value)} /></td>
                      <td className="py-2 px-3"><input className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300 text-slate-600 transition-colors" placeholder="과제 내용 입력..." value={member.task} onChange={e => handleMemberChange(member.id, 'task', e.target.value)} /></td>
                      <td className="py-2 px-3 text-center">
                        <select className="bg-slate-50 border-none rounded text-xs py-1 px-2 outline-none cursor-pointer text-slate-600 font-medium" value={member.status} onChange={e => handleMemberChange(member.id, 'status', e.target.value)}>
                          <option value="대기">대기</option><option value="진행">진행</option><option value="완료">완료</option><option value="지연">지연</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-center"><button onClick={() => handleDeleteMember(member.id)} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                  {(!selectedDept.members || selectedDept.members.length === 0) && <tr><td colSpan="5" className="py-8 text-center text-slate-400">등록된 인원이 없습니다.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- [View 2: Overview] ---
  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-10">
      {/* 1. Header & Select Month */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
         <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-indigo-600"/> 인력 및 생산성 관리
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              History Archive에 저장된 데이터를 기반으로 분석합니다.
            </p>
         </div>
         <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm self-end sm:self-auto">
            <Calendar size={16} className="text-slate-400"/>
            <span className="text-xs text-slate-500 font-bold">조회 기준(Archive):</span>
            <select 
              className="text-sm font-bold text-indigo-600 bg-transparent outline-none cursor-pointer flex-1"
              value={selectedMonth} 
              onChange={(e) => onMonthChange(e.target.value)}
            >
              {availableMonths.length === 0 && <option value="">저장된 데이터 없음</option>}
              {availableMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
         </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <KPICard title="총 인원 (Headcount)" value={`${summary.totalHeadcount}명`} sub="부서별 합계" alert={false} />
        
        {/* 인당 매출액: Billion 단위 유지 */}
        <KPICard 
          title="인당 매출액 (Rev/HC)" 
          value={`₩ ${summary.revPerHead.toFixed(2)}B`} 
          sub={
            <span className="flex items-center gap-1">
              <span className="text-green-600 font-bold text-[10px] bg-green-50 px-1 rounded">Archived</span>
              Total: {summary.totalRevenue.toFixed(1)}B
            </span>
          }
          alert={summary.revPerHead < 0.1 && summary.totalRevenue > 0} 
        />

        <div className="bg-slate-50 p-5 rounded-2xl shadow-inner border border-slate-200 flex flex-col justify-between">
          <div className="flex justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
               <LinkIcon size={12}/> 월 총 생산량 ({selectedMonth})
            </span>
            <Activity size={16} className="text-slate-400"/>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-slate-700">
                {summary.currentTotalBatch}
              </span>
              <span className="text-sm font-bold text-slate-400">Batch</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">* Chapter 2 데이터 자동 연동</p>
          </div>
        </div>

        <KPICard 
          title="제조 인당 Batch" 
          value={`${summary.batchPerHead.toFixed(1)} Batch`} 
          sub={`생산 ${summary.currentTotalBatch} ÷ 제조 ${summary.mfgHeadcount}명`} 
          alert={summary.batchPerHead < 1.0 && summary.currentTotalBatch > 0} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. 부서별 인력 구조 */}
        <div className="col-span-1 space-y-4">
          <div className="flex justify-between items-center mb-2">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Briefcase size={18} className="text-slate-400"/> 부서별 인원 관리 ({selectedMonth})
             </h3>
             <div className="flex items-center gap-2">
               <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full hidden sm:inline-block">Card 클릭 시 상세 이동</span>
               <button onClick={handleAddDept} className="flex items-center gap-1 bg-white border border-slate-200 text-indigo-600 text-xs px-2 py-1 rounded-lg hover:bg-indigo-50 transition shadow-sm font-bold">
                 <Plus size={14}/> 부서 추가
               </button>
             </div>
          </div>
          
          {currentDepts.length === 0 && selectedMonth ? (
            <div className="bg-white p-8 rounded-xl border border-dashed border-slate-300 text-center flex flex-col items-center gap-3">
              <AlertCircle className="text-slate-300" size={32}/>
              <p className="text-sm text-slate-500">{selectedMonth}월 인력 데이터가 없습니다.</p>
              <button onClick={handleInitMonth} className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 transition">
                데이터 생성하기 (전월 복사)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {currentDepts.map(dept => (
                  <div 
                    key={dept.id} 
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
                    onClick={() => setSelectedDept(dept)}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2" style={{ backgroundColor: dept.color }}></div>
                    <input type="color" value={dept.color} onClick={(e) => e.stopPropagation()} onChange={(e) => handleDeptFieldChange(dept.id, 'color', e.target.value)} className="absolute left-0 top-0 bottom-0 w-2 opacity-0 cursor-pointer" title="색상 변경" />

                    <div className="flex justify-between items-center pl-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`p-2.5 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors`}>
                              <Briefcase size={18} />
                          </div>
                          
                          <div className="flex-1">
                              <input 
                                type="text"
                                className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors bg-transparent border-b border-transparent focus:border-indigo-300 outline-none w-full"
                                value={dept.name}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleDeptFieldChange(dept.id, 'name', e.target.value)}
                                placeholder="부서명 입력"
                              />
                              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 group-hover:text-indigo-400">
                                상세 보기 <ChevronRight size={10}/>
                              </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center gap-1 border-b border-slate-200 focus-within:border-indigo-500 pb-0.5 transition-colors">
                                  <input 
                                    type="number" 
                                    className="w-12 text-right text-xl font-extrabold text-slate-900 bg-transparent outline-none p-0 m-0"
                                    value={dept.count}
                                    onChange={(e) => handleDeptFieldChange(dept.id, 'count', e.target.value)}
                                  />
                                  <span className="text-xs font-bold text-slate-400 mb-1">명</span>
                              </div>
                            </div>
                            
                            <button onClick={(e) => handleDeleteDept(dept.id, e)} className="text-slate-300 hover:text-red-500 transition p-1 hover:bg-red-50 rounded" title="부서 삭제">
                              <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Charts (Interactive) */}
        <div className="col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                      <TrendingUp size={16} className="text-green-600"/> 생산성/인당 재무 Trend
                  </h3>
                  
                  {/* 항목 선택 Checkboxes */}
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    {[
                      { key: 'productivity', label: '인당 생산성', color: 'text-emerald-600' },
                      { key: 'batch', label: '총 생산량', color: 'text-amber-500' },
                      { key: 'rev', label: '인당 매출', color: 'text-blue-500' },
                      { key: 'op', label: '인당 OP', color: 'text-indigo-600' }
                    ].map(item => (
                      <button 
                        key={item.key} 
                        onClick={() => toggleMetric(item.key)}
                        className={`flex items-center gap-1 px-2 py-1 rounded border transition-colors ${visibleMetrics[item.key] ? 'bg-slate-100 border-slate-300 font-bold' : 'bg-white border-slate-100 text-slate-400'}`}
                      >
                         {visibleMetrics[item.key] ? <CheckSquare size={14} className={item.color}/> : <Square size={14}/>}
                         {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorProdBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#64748b'}}/>
                        
                        {/* Left: Count / Batch (정수)
                            Right: Amount (B KRW, 소수점) 
                        */}
                        <YAxis yAxisId="left" fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Count / Batch', angle: -90, position: 'insideLeft', fontSize: 9, fill:'#94a3b8' }}/>
                        <YAxis yAxisId="right" orientation="right" fontSize={10} axisLine={false} tickLine={false} label={{ value: 'Amount/Head (B KRW)', angle: 90, position: 'insideRight', fontSize: 9, fill:'#94a3b8' }}/>

                        <Tooltip 
                          contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize:'12px'}} 
                          formatter={(val, name) => {
                            if (name === 'Rev Per Head' || name === 'OP Per Head') return `₩${Number(val).toFixed(2)}B`;
                            return `${Number(val).toFixed(1)}`;
                          }}
                        />
                        <Legend wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} iconType="circle"/>

                        {/* 1. 인당 생산성 (Bar, Left) */}
                        {visibleMetrics.productivity && (
                          <Bar yAxisId="left" dataKey="productivity" name="Productivity" fill="url(#colorProdBar)" barSize={20} radius={[4,4,0,0]} />
                        )}
                        
                        {/* 2. 인당 매출 (Bar, Right) - B 단위 */}
                        {visibleMetrics.rev && (
                           <Bar yAxisId="right" dataKey="revPerHead" name="Rev Per Head" fill="url(#colorRev)" barSize={10} radius={[2,2,0,0]} />
                        )}

                        {/* 3. 총 생산량 (Line, Left) */}
                        {visibleMetrics.batch && (
                          <Line yAxisId="left" type="monotone" dataKey="batch" name="Total Batch" stroke="#F59E0B" strokeWidth={3} dot={{r:3}} />
                        )}

                        {/* 4. 인당 영업이익 (Line, Right) - B 단위 */}
                        {visibleMetrics.op && (
                          <Line yAxisId="right" type="monotone" dataKey="opPerHead" name="OP Per Head" stroke="#4F46E5" strokeWidth={2} strokeDasharray="5 5" dot={{r:3}} />
                        )}
                    </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                    <Users size={16} className="text-indigo-600"/> 부서별 인원 분포 ({selectedMonth})
                </h3>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentDepts} margin={{ top: 5, right: 20, left: 0, bottom: 0 }} layout="vertical" barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={90} tick={{fontSize: 11, fill: '#475569', fontWeight: 600}} axisLine={false} tickLine={false}/>
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 2px 5px rgba(0,0,0,0.1)', fontSize:'12px'}} />
                        <Bar dataKey="count" name="인원수" radius={[0,4,4,0]}>
                          {currentDepts.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Chapter5_Headcount;