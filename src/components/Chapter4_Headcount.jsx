import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, 
  ComposedChart, Line, Legend 
} from 'recharts';
import { Users, Briefcase, TrendingUp, UserPlus, ChevronRight, Edit3, Save, Trash2, ArrowLeft, Activity, Link as LinkIcon, Calendar } from 'lucide-react';
import KPICard from './common/KPICard';

// [수정] depts 대신 headcountDB, onHeadcountUpdate 수신
const Chapter4_Headcount = ({ pnlData, headcountDB, onHeadcountUpdate, prodStats }) => {
  const [selectedDept, setSelectedDept] = useState(null);
  
  // 조회 기준 월 (기본값: 데이터가 있으면 가장 최근 월)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const months = Object.keys(headcountDB).sort();
    return months.length > 0 ? months[months.length - 1] : '';
  });

  // [핵심 Logic] 선택된 월의 부서 데이터 가져오기
  const currentDepts = useMemo(() => {
    return headcountDB[selectedMonth] || [];
  }, [headcountDB, selectedMonth]);

  // --- [Logic 1] 선택된 월의 통계 계산 ---
  const summary = useMemo(() => {
    // currentDepts(선택된 월 데이터)를 사용
    const totalHeadcount = currentDepts.reduce((acc, cur) => acc + cur.count, 0);
    const totalRevenue = pnlData ? pnlData.reduce((acc, cur) => acc + cur.rev, 0) : 6.2;
    const revPerHead = totalHeadcount > 0 ? (totalRevenue / totalHeadcount) : 0;
    const mfgHeadcount = currentDepts.find(d => d.id === 'mfg')?.count || 1;
    
    // 선택된 월의 생산량 데이터 매칭
    const currentStat = prodStats ? prodStats.find(s => s.month === selectedMonth) : null;
    const currentTotalBatch = currentStat ? (currentStat.oled + currentStat.api + currentStat.newBiz) : 0;
    
    const batchPerHead = mfgHeadcount > 0 ? (currentTotalBatch / mfgHeadcount) : 0;

    return { totalHeadcount, totalRevenue, revPerHead, mfgHeadcount, batchPerHead, currentTotalBatch };
  }, [currentDepts, pnlData, prodStats, selectedMonth]);

  // --- [Logic 2] 월별 생산성 트렌드 데이터 생성 ---
  const trendData = useMemo(() => {
    if (!prodStats || !headcountDB) return [];
    
    // DB에 있는 모든 월을 순회하며 Trend 데이터 생성
    return prodStats.map(stat => {
      const totalBatch = stat.oled + stat.api + stat.newBiz;
      
      // 해당 월의 인력 데이터 찾기 (없으면 0 처리)
      const monthDepts = headcountDB[stat.month] || [];
      const mfgCount = monthDepts.find(d => d.id === 'mfg')?.count || 0;
      
      return {
        month: stat.month,
        batch: totalBatch,
        productivity: mfgCount > 0 ? (totalBatch / mfgCount) : 0
      };
    });
  }, [prodStats, headcountDB]);

  // --- [Handlers] 선택된 월의 데이터 업데이트 ---
  
  const handleCountChange = (id, value) => {
    const num = parseInt(value) || 0;
    const newDepts = currentDepts.map(d => d.id === id ? { ...d, count: num } : d);
    // [업데이트] 부모의 핸들러 호출
    onHeadcountUpdate(selectedMonth, newDepts);
  };

  const handleAddMember = () => {
    if (!selectedDept) return;
    const newMember = { id: Date.now(), name: '', position: '', task: '', status: '대기' };
    const updatedDept = { ...selectedDept, members: [...selectedDept.members, newMember] };
    
    // 전체 Dept 리스트 업데이트
    const newDepts = currentDepts.map(d => d.id === selectedDept.id ? updatedDept : d);
    
    onHeadcountUpdate(selectedMonth, newDepts);
    setSelectedDept(updatedDept);
  };

  const handleMemberChange = (memberId, field, value) => {
    const updatedMembers = selectedDept.members.map(m => 
      m.id === memberId ? { ...m, [field]: value } : m
    );
    const updatedDept = { ...selectedDept, members: updatedMembers };
    
    const newDepts = currentDepts.map(d => d.id === selectedDept.id ? updatedDept : d);
    
    onHeadcountUpdate(selectedMonth, newDepts);
    setSelectedDept(updatedDept);
  };

  const handleDeleteMember = (memberId) => {
    const updatedMembers = selectedDept.members.filter(m => m.id !== memberId);
    const updatedDept = { ...selectedDept, members: updatedMembers };
    
    const newDepts = currentDepts.map(d => d.id === selectedDept.id ? updatedDept : d);
    
    onHeadcountUpdate(selectedMonth, newDepts);
    setSelectedDept(updatedDept);
  };

  // --- [View 1] 상세 페이지 ---
  if (selectedDept) {
    return (
      <div className="space-y-6 animate-fade-in bg-slate-50 min-h-screen pb-10">
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <button onClick={() => setSelectedDept(null)} className="text-sm text-slate-500 hover:text-indigo-600 flex items-center gap-1 mb-2 font-medium">
              <ArrowLeft size={16}/> Back to Overview
            </button>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: selectedDept.color }}></div>
              {selectedDept.name} 인력 상세 관리 ({selectedMonth})
            </h2>
          </div>
          <div className="text-right">
             <p className="text-xs text-slate-500 font-bold uppercase">Department Headcount</p>
             <p className="text-2xl font-bold text-slate-800">{selectedDept.count}명</p>
          </div>
        </div>
        
        {/* Member Table */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <Briefcase size={18} className="text-indigo-500"/> 주요 담당자 및 핵심 과제
            </h3>
            <button onClick={handleAddMember} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-indigo-700 transition shadow-sm">
              <UserPlus size={16} /> 인원 추가
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-y border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-24">직급</th>
                  <th className="py-3 px-3 w-32">성명</th>
                  <th className="py-3 px-3">핵심 과제 (R&R)</th>
                  <th className="py-3 px-3 w-24 text-center">상태</th>
                  <th className="py-3 px-3 w-16 text-center">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedDept.members.map(member => (
                  <tr key={member.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3">
                      <input className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300 transition-colors" 
                        placeholder="직급" value={member.position} onChange={e => handleMemberChange(member.id, 'position', e.target.value)} />
                    </td>
                    <td className="py-2 px-3">
                      <input className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300 font-bold text-slate-700 transition-colors" 
                        placeholder="이름" value={member.name} onChange={e => handleMemberChange(member.id, 'name', e.target.value)} />
                    </td>
                    <td className="py-2 px-3">
                      <input className="w-full bg-transparent outline-none border-b border-transparent focus:border-indigo-300 text-slate-600 transition-colors" 
                        placeholder="과제 내용 입력..." value={member.task} onChange={e => handleMemberChange(member.id, 'task', e.target.value)} />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <select className="bg-slate-50 border-none rounded text-xs py-1 px-2 outline-none cursor-pointer text-slate-600 font-medium"
                        value={member.status} onChange={e => handleMemberChange(member.id, 'status', e.target.value)}>
                        <option value="대기">대기</option>
                        <option value="진행">진행</option>
                        <option value="완료">완료</option>
                        <option value="지연">지연</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button onClick={() => handleDeleteMember(member.id)} className="text-slate-300 hover:text-red-500 transition">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {selectedDept.members.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">등록된 인원이 없습니다. 추가해주세요.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- [View 2] 메인 대시보드 ---
  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Select Month */}
      <div className="flex items-center justify-between">
         <h3 className="text-lg font-bold text-slate-700">인력 및 생산성 현황</h3>
         <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <Calendar size={16} className="text-slate-400"/>
            <span className="text-xs text-slate-500 font-bold">조회 기준:</span>
            <select 
              className="text-sm font-bold text-indigo-600 bg-transparent outline-none cursor-pointer"
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {Object.keys(headcountDB).sort().map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
         </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <KPICard title="총 인원 (Headcount)" value={`${summary.totalHeadcount}명`} sub="부서별 합계" alert={false} />
        
        <KPICard 
          title="인당 매출액 (Auto)" 
          value={`₩ ${(summary.revPerHead * 1000).toFixed(0)}M`} 
          sub={`매출 ${summary.totalRevenue.toFixed(1)}B ÷ ${summary.totalHeadcount}명`} 
          alert={summary.revPerHead < 0.15} 
        />

        {/* 선택된 월의 총 생산량 (ReadOnly) */}
        <div className="bg-slate-50 p-5 rounded-2xl shadow-inner border border-slate-200">
          <div className="flex justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
               <LinkIcon size={12}/> 월 총 생산량 ({selectedMonth})
            </span>
            <Activity size={16} className="text-slate-400"/>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-700">
               {summary.currentTotalBatch}
            </span>
            <span className="text-sm font-bold text-slate-400">Batch</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Ch.2 연동 (조회 기준 변경 가능)</p>
        </div>

        {/* 선택된 월의 제조 인당 Batch */}
        <KPICard 
          title="제조 인당 Batch" 
          value={`${summary.batchPerHead.toFixed(2)} Batch`} 
          sub={`생산 ${summary.currentTotalBatch} ÷ 제조 ${summary.mfgHeadcount}명`} 
          alert={summary.batchPerHead < 1.0} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. 부서별 인력 구조 (Editable & Clickable) */}
        <div className="col-span-1 space-y-4">
          <div className="flex justify-between items-center mb-2">
             <h3 className="font-bold text-slate-700">부서별 인원 관리 ({selectedMonth})</h3>
             <span className="text-xs text-slate-400">카드 클릭 시 상세 이동</span>
          </div>
          <div className="space-y-3">
            {currentDepts.map(dept => (
                <div 
                key={dept.id} 
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden group"
                onClick={() => setSelectedDept(dept)}
                >
                <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: dept.color }}></div>
                <div className="flex justify-between items-center pl-2">
                    <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-50 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors`}>
                        <Briefcase size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 text-sm">{dept.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                        상세 보기 <ChevronRight size={10}/>
                        </p>
                    </div>
                    </div>
                    <div className="flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 border-b border-slate-200 focus-within:border-indigo-500 pb-0.5">
                        <input 
                        type="number" 
                        className="w-10 text-right text-xl font-extrabold text-slate-900 bg-transparent outline-none p-0 m-0"
                        value={dept.count}
                        onChange={(e) => handleCountChange(dept.id, e.target.value)}
                        />
                        <span className="text-xs font-bold text-slate-400">명</span>
                    </div>
                    </div>
                </div>
                </div>
            ))}
          </div>
        </div>

        {/* 4. 생산성 트렌드 & 인원 차트 */}
        <div className="col-span-1 space-y-6">
            {/* 복합 차트: 인당 생산성 (막대) + 총 생산량 (라인) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                    <TrendingUp size={16} className="text-green-600"/> 생산성(Bar) & 생산량(Line) 추이
                </h3>
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorProdBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                              <stop offset="95%" stopColor="#10B981" stopOpacity={0.4}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                        <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false}/>
                        
                        <YAxis yAxisId="left" fontSize={11} axisLine={false} tickLine={false} label={{ value: '인당 Batch', angle: -90, position: 'insideLeft', fontSize: 10, fill:'#64748b' }}/>
                        <YAxis yAxisId="right" orientation="right" fontSize={11} axisLine={false} tickLine={false} label={{ value: 'Total Batch', angle: 90, position: 'insideRight', fontSize: 10, fill:'#94a3b8' }}/>
                        
                        <Tooltip 
                          contentStyle={{borderRadius:'8px', fontSize:'12px'}} 
                          formatter={(val, name) => [
                            name === 'productivity' ? `${val.toFixed(2)} Batch` : `${val} Batch`, 
                            name === 'productivity' ? '인당 생산성' : '총 생산량'
                          ]}
                        />
                        <Legend wrapperStyle={{fontSize: '11px', paddingTop: '10px'}}/>
                        
                        <Bar yAxisId="left" dataKey="productivity" name="인당 생산성" fill="url(#colorProdBar)" barSize={20} radius={[4,4,0,0]} />
                        <Line yAxisId="right" type="monotone" dataKey="batch" name="총 생산량" stroke="#F59E0B" strokeWidth={2} dot={{r:3}} strokeDasharray="3 3" />
                    </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 부서별 인원 차트 (선택된 월 기준) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                    <Users size={16} className="text-indigo-600"/> 부서별 인원 분포 ({selectedMonth})
                </h3>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={currentDepts} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11}} axisLine={false} tickLine={false}/>
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'8px', fontSize:'12px'}} />
                        <Bar dataKey="count" name="인원수" fill="#6366f1" barSize={20} radius={[0,4,4,0]}>
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