import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  ComposedChart, Line, Legend 
} from 'recharts';
import { 
  Users, Briefcase, TrendingUp, UserPlus, ChevronRight, Edit3, Save, Trash2, 
  ArrowLeft, Activity, Link as LinkIcon, Calendar, Loader2, AlertCircle 
} from 'lucide-react';
import KPICard from './common/KPICard';

const Chapter4_Headcount = ({ pnlData, headcountDB, onHeadcountUpdate, prodStats, historyData }) => {
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');

  // --- [Logic 1] 조회 가능한 월 목록 통합 ---
  const availableMonths = useMemo(() => {
    const headMonths = headcountDB ? Object.keys(headcountDB) : [];
    const histMonths = historyData ? historyData.map(h => h.month) : [];
    const combined = Array.from(new Set([...headMonths, ...histMonths])).sort();
    return combined;
  }, [headcountDB, historyData]);

  // --- [Initialization] ---
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedMonth) {
      setSelectedMonth(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths, selectedMonth]);

  // --- [Data Prep] ---
  const currentDepts = useMemo(() => {
    if (!headcountDB || !selectedMonth) return [];
    return headcountDB[selectedMonth] || [];
  }, [headcountDB, selectedMonth]);

  // --- [Logic 2] 통계 계산 ---
  const summary = useMemo(() => {
    const totalHeadcount = currentDepts.reduce((acc, cur) => acc + (cur.count || 0), 0);
    
    let totalRevenue = 0;
    let isArchived = false;

    const archive = historyData ? historyData.find(h => h.month === selectedMonth) : null;
    
    if (archive) {
      totalRevenue = archive.rev || 0;
      isArchived = true;
    } else {
      totalRevenue = Array.isArray(pnlData) ? pnlData.reduce((acc, cur) => acc + (cur.rev || 0), 0) : 0;
    }

    const revPerHead = totalHeadcount > 0 ? (totalRevenue / totalHeadcount) : 0;
    const mfgHeadcount = currentDepts.find(d => d.id === 'mfg')?.count || 1; 
    
    const currentStat = prodStats ? prodStats.find(s => s.month === selectedMonth) : null;
    const currentTotalBatch = currentStat ? ((currentStat.oled || 0) + (currentStat.api || 0) + (currentStat.new_biz || currentStat.newBiz || 0)) : 0;
    
    const batchPerHead = mfgHeadcount > 0 ? (currentTotalBatch / mfgHeadcount) : 0;

    return { totalHeadcount, totalRevenue, revPerHead, mfgHeadcount, batchPerHead, currentTotalBatch, isArchived };
  }, [currentDepts, pnlData, prodStats, selectedMonth, historyData]);

  // --- [Logic 3] 트렌드 데이터 ---
  const trendData = useMemo(() => {
    if (!prodStats || !headcountDB) return [];
    
    return prodStats.map(stat => {
      const totalBatch = (stat.oled || 0) + (stat.api || 0) + (stat.new_biz || stat.newBiz || 0);
      const monthDepts = headcountDB[stat.month] || [];
      const mfgCount = monthDepts.find(d => d.id === 'mfg')?.count || 0;
      
      return {
        month: stat.month,
        batch: totalBatch,
        productivity: mfgCount > 0 ? (totalBatch / mfgCount) : 0
      };
    }).sort((a, b) => a.month.localeCompare(b.month)); 
  }, [prodStats, headcountDB]);

  // --- [Handlers] ---
  const handleCountChange = (id, value) => {
    const num = parseInt(value) || 0;
    if (!headcountDB[selectedMonth]) return alert("먼저 인원 데이터를 생성해야 합니다.");
    const newDepts = currentDepts.map(d => d.id === id ? { ...d, count: num } : d);
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

  // 인원 데이터 초기화 (전월 데이터 복사 로직)
  const handleInitMonth = () => {
    if (!selectedMonth) return;

    // 1. 기존에 저장된 월 리스트 가져오기
    const existingMonths = Object.keys(headcountDB).sort();
    
    // 2. 현재 선택된 월보다 '이전'인 월 중에서 가장 최신 월 찾기
    const prevMonth = existingMonths.filter(m => m < selectedMonth).pop();

    let initialData = [];
    let confirmMsg = "";

    if (prevMonth) {
      confirmMsg = `${selectedMonth}월 데이터를 생성하시겠습니까?\n(전월 ${prevMonth} 데이터가 복사됩니다)`;
      // Deep Copy
      initialData = JSON.parse(JSON.stringify(headcountDB[prevMonth]));
    } else {
      confirmMsg = `${selectedMonth}월 인력 데이터를 초기화하시겠습니까? (기본 템플릿 생성)`;
      // 기본 템플릿
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

  // --- [View 1: Detail View (Responsive)] ---
  if (selectedDept) {
    return (
      <div className="space-y-6 animate-fade-in bg-slate-50 min-h-screen pb-10">
        {/* Detail Header */}
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
        
        {/* Detail Table */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Briefcase size={18} className="text-indigo-500"/> 주요 담당자 및 핵심 과제
            </h3>
            <button onClick={handleAddMember} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-indigo-700 transition shadow-sm">
              <UserPlus size={16} /> 인원 추가
            </button>
          </div>
          
          {/* Responsive Table Wrapper */}
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

  // --- [View 2: Overview (Responsive)] ---
  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-10">
      {/* 1. Header & Select Month */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
         <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="text-indigo-600"/> 인력 및 생산성 관리
            </h2>
            <p className="text-sm text-slate-500 mt-1">부서별 인원 배치 및 인당 생산성(Productivity) 분석</p>
         </div>
         <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm self-end sm:self-auto">
            <Calendar size={16} className="text-slate-400"/>
            <span className="text-xs text-slate-500 font-bold">조회 기준:</span>
            <select 
              className="text-sm font-bold text-indigo-600 bg-transparent outline-none cursor-pointer"
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {availableMonths.length === 0 && <option value="">데이터 없음</option>}
              {availableMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
         </div>
      </div>

      {/* 2. KPI Cards (Responsive Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <KPICard title="총 인원 (Headcount)" value={`${summary.totalHeadcount}명`} sub="부서별 합계" alert={false} />
        
        <KPICard 
          title="인당 매출액 (Rev/HC)" 
          value={`₩ ${summary.revPerHead.toFixed(2)}B`} 
          sub={
            <span className="flex items-center gap-1">
              {summary.isArchived ? <span className="text-green-600 font-bold text-[10px] bg-green-50 px-1 rounded">Archived</span> : <span className="text-amber-600 font-bold text-[10px] bg-amber-50 px-1 rounded">Live P&L</span>}
              Total: {summary.totalRevenue.toFixed(1)}B
            </span>
          }
          alert={summary.revPerHead < 0.15} 
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
          value={`${summary.batchPerHead.toFixed(2)} Batch`} 
          sub={`생산 ${summary.currentTotalBatch} ÷ 제조 ${summary.mfgHeadcount}명`} 
          alert={summary.batchPerHead < 1.0} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. 부서별 인력 구조 */}
        <div className="col-span-1 space-y-4">
          <div className="flex justify-between items-center mb-2">
             <h3 className="font-bold text-slate-700 flex items-center gap-2">
               <Briefcase size={18} className="text-slate-400"/> 부서별 인원 관리 ({selectedMonth})
             </h3>
             <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Card 클릭 시 상세 이동</span>
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
                    <div className="flex justify-between items-center pl-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg bg-slate-50 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors`}>
                              <Briefcase size={18} />
                          </div>
                          <div>
                              <h4 className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{dept.name}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 group-hover:text-indigo-400">
                                상세 보기 <ChevronRight size={10}/>
                              </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1 border-b border-slate-200 focus-within:border-indigo-500 pb-0.5 transition-colors">
                              <input 
                                type="number" 
                                className="w-12 text-right text-xl font-extrabold text-slate-900 bg-transparent outline-none p-0 m-0"
                                value={dept.count}
                                onChange={(e) => handleCountChange(dept.id, e.target.value)}
                              />
                              <span className="text-xs font-bold text-slate-400 mb-1">명</span>
                          </div>
                        </div>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. Charts */}
        <div className="col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2 text-sm">
                    <TrendingUp size={16} className="text-green-600"/> 생산성(Bar) & 생산량(Line) 추이
                </h3>
                <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorProdBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0.2}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#64748b'}}/>
                        <YAxis yAxisId="left" fontSize={11} axisLine={false} tickLine={false} label={{ value: '인당 Batch', angle: -90, position: 'insideLeft', fontSize: 10, fill:'#94a3b8' }}/>
                        <YAxis yAxisId="right" orientation="right" fontSize={11} axisLine={false} tickLine={false} label={{ value: 'Total Batch', angle: 90, position: 'insideRight', fontSize: 10, fill:'#94a3b8' }}/>
                        <Tooltip 
                          contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize:'12px'}} 
                          formatter={(val, name) => [
                            `${Number(val).toFixed(1)} Batch`, 
                            name === 'productivity' ? '인당 생산성' : '총 생산량'
                          ]}
                        />
                        <Legend wrapperStyle={{fontSize: '11px', paddingTop: '10px'}} iconType="circle"/>
                        <Bar yAxisId="left" dataKey="productivity" name="인당 생산성" fill="url(#colorProdBar)" barSize={24} radius={[4,4,0,0]} />
                        <Line yAxisId="right" type="monotone" dataKey="batch" name="총 생산량" stroke="#F59E0B" strokeWidth={3} dot={{r:4, fill:'#fff', strokeWidth:2}} activeDot={{r:6}} />
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

export default Chapter4_Headcount;