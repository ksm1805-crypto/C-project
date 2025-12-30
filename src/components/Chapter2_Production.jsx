import React, { useState, useMemo, useEffect } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Cell
} from 'recharts';
import { 
  Factory, CheckCircle, Calendar, AlertTriangle, TrendingUp, Activity, BarChart3
} from 'lucide-react';

// --- [Data: Weekly Checklist] ---
const WEEKLY_CHECKLIST = [
  { week: 'Week 1', title: '계획 확정 & 병목 체크', desc: '수주/납기/생산계획 확정 (제품 믹스 포함)', done: true },
  { week: 'Week 2', title: '수율/불량 & CAPA 분석', desc: 'Top 3 원인분석 + 재작업 비용 가시화', done: false },
  { week: 'Week 3', title: '매출 인식 & 재고 점검', desc: 'Backlog 관리 + 완제품/재공 재고 확인', done: false },
  { week: 'Week 4', title: 'KPI 리뷰 & 차월 계획', desc: 'Plan vs Act 분석 + 차월 고정비 액션 확정', done: false },
];

const Chapter2_Production = ({ historyData, pnlData, prodStats, onUpdateStats }) => {
  const [selectedMonth, setSelectedMonth] = useState('2024-12');
  const [tasks, setTasks] = useState(WEEKLY_CHECKLIST);

  // --- [Logic 1: Data Merging & Filtering] ---
  const mergedData = useMemo(() => {
    const allMonths = new Set([
        ...(prodStats || []).map(d => d.month),
        ...(historyData || []).map(d => d.month)
    ]);
    
    const sortedMonths = Array.from(allMonths).sort();

    const fullData = sortedMonths.map(month => {
      const stat = prodStats ? prodStats.find(p => p.month === month) : null;
      
      const cleanStat = {
        oled: stat?.oled || 0,
        api: stat?.api || 0,
        new_biz: stat?.new_biz || 0, // DB Column Name
        late: stat?.late || 0,
        util: stat?.util || 0
      };
      
      const fin = historyData ? historyData.find(h => h.month === month) : null;
      const rev = fin ? fin.rev : 0;

      const totalBatch = cleanStat.oled + cleanStat.api + cleanStat.new_biz;
      const otd = totalBatch > 0 ? ((totalBatch - cleanStat.late) / totalBatch) * 100 : 0;
      const revPerBatch = totalBatch > 0 ? (rev / totalBatch) : 0;

      return {
        month,
        ...cleanStat,
        totalBatch,
        revenue: rev,
        revPerBatch,
        otd
      };
    });

    return fullData.slice(-6);
  }, [prodStats, historyData]);

  const currentStat = mergedData.find(d => d.month === selectedMonth) || (mergedData.length > 0 ? mergedData[mergedData.length - 1] : {});

  // 사업부별 상세 분석 데이터
  const buAnalysisData = useMemo(() => {
    const oledRev = pnlData?.find(p => p.id === 1)?.rev || 0;
    const apiRev = pnlData?.find(p => p.id === 2)?.rev || 0;
    const newBizRev = pnlData?.find(p => p.id === 3)?.rev || 0;

    return [
      { name: 'OLED', batch: currentStat.oled || 0, rev: oledRev, color: '#3B82F6' },
      { name: 'API', batch: currentStat.api || 0, rev: apiRev, color: '#10B981' },
      { name: '신사업', batch: currentStat.new_biz || 0, rev: newBizRev, color: '#F59E0B' },
    ].map(item => ({
      ...item,
      eff: item.batch > 0 ? (item.rev / item.batch) : 0
    }));
  }, [pnlData, currentStat]);

  // [Supabase Sync Logic]
  const handleInputChange = (field, value) => {
    const numVal = value === '' ? 0 : parseFloat(value);
    
    const exists = prodStats.find(item => item.month === selectedMonth);
    let updatedStats;

    if (exists) {
      updatedStats = prodStats.map(item => 
        item.month === selectedMonth ? { ...item, [field]: numVal } : item
      );
    } else {
      const newEntry = { 
        month: selectedMonth, 
        oled: 0, api: 0, new_biz: 0, late: 0, util: 0, 
        [field]: numVal 
      };
      updatedStats = [...prodStats, newEntry].sort((a, b) => a.month.localeCompare(b.month));
    }
    onUpdateStats(updatedStats);
  };

  const toggleTask = (idx) => {
    const newTasks = [...tasks];
    newTasks[idx].done = !newTasks[idx].done;
    setTasks(newTasks);
  };

  const handleTaskTextChange = (idx, field, value) => {
    const newTasks = [...tasks];
    newTasks[idx][field] = value;
    setTasks(newTasks);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="text-blue-600"/> 생산·매출 연동 관리
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            생산 Batch와 매출(Revenue)의 연관성을 모니터링하고 관리합니다.
          </p>
        </div>
      </div>

      <div className="space-y-6 animate-fade-in">
          {/* 1. Month Selector */}
          <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
             <span className="text-sm font-bold text-slate-500 flex items-center gap-2"><Calendar size={16}/> 조회 월 선택 (최근 6개월):</span>
             <div className="flex bg-slate-100 p-1 rounded-lg overflow-x-auto">
                {mergedData.map(d => (
                   <button
                      key={d.month}
                      onClick={() => setSelectedMonth(d.month)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                         selectedMonth === d.month 
                         ? 'bg-white text-blue-700 shadow-sm' 
                         : 'text-slate-400 hover:text-slate-600'
                      }`}
                   >
                      {d.month}
                   </button>
                ))}
             </div>
          </div>

          {/* 2. Batch Input Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
             <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 group focus-within:ring-2 ring-blue-500 transition-all">
                <div className="flex justify-between mb-2">
                   <span className="text-xs font-bold text-slate-500 uppercase">설비 가동률</span>
                   <Activity size={16} className="text-blue-500"/>
                </div>
                <div className="flex items-baseline gap-1">
                   <input 
                      type="number" className="text-3xl font-extrabold text-slate-900 w-20 bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-blue-500"
                      value={currentStat.util || 0} onChange={(e) => handleInputChange('util', e.target.value)}
                   />
                   <span className="text-sm font-bold text-slate-400">%</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Target 85%</p>
             </div>

             <div className="md:col-span-2 bg-white p-5 rounded-lg shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase">
                      <Factory size={16} className="text-blue-500"/> 월 생산 Batch 입력 ({selectedMonth})
                   </h3>
                   <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">Total: {currentStat.totalBatch || 0} Batch</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                   {[
                      { label: 'OLED', field: 'oled', val: currentStat.oled, color: 'text-blue-600' },
                      { label: 'API', field: 'api', val: currentStat.api, color: 'text-emerald-600' },
                      { label: '신사업', field: 'new_biz', val: currentStat.new_biz, color: 'text-amber-600' }
                   ].map((item) => (
                      <div key={item.field} className="flex flex-col">
                         <label className="text-xs font-bold text-slate-400 mb-1">{item.label}</label>
                         <input 
                            type="number" 
                            className={`w-full text-xl font-bold border-b border-slate-200 outline-none focus:border-blue-500 bg-transparent ${item.color}`}
                            value={item.val || 0}
                            onChange={(e) => handleInputChange(item.field, e.target.value)}
                         />
                      </div>
                   ))}
                </div>
             </div>

             <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 relative overflow-hidden">
                <div className={`absolute top-0 left-0 bottom-0 w-1 ${currentStat.otd >= 95 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div className="flex justify-between mb-2 pl-2">
                   <span className="text-xs font-bold text-slate-500 uppercase">납기 준수율 (OTD)</span>
                   {currentStat.otd >= 95 ? <CheckCircle size={16} className="text-green-500"/> : <AlertTriangle size={16} className="text-red-500"/>}
                </div>
                <div className="pl-2">
                   <h3 className={`text-3xl font-extrabold ${currentStat.otd >= 95 ? 'text-green-600' : 'text-red-600'}`}>
                      {(currentStat.otd || 0).toFixed(1)}%
                   </h3>
                   <div className="flex items-center gap-2 mt-2 bg-slate-50 p-1.5 rounded-lg">
                      <span className="text-xs text-slate-500">지연:</span>
                      <input 
                         type="number" className="w-8 text-right text-sm font-bold bg-white border border-slate-300 rounded focus:border-red-500 outline-none px-1"
                         value={currentStat.late || 0} onChange={(e) => handleInputChange('late', e.target.value)}
                      />
                      <span className="text-xs text-slate-400">Batch</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Charts */}
             <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                   <span className="flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> 사업부별 생산 효율성</span>
                </h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={buAnalysisData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }} barGap={0}>
                         <CartesianGrid stroke="#f1f5f9" vertical={false} />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: '12px', fill: '#64748b' }} />
                         <YAxis yAxisId="left" label={{ value: 'Batch 수', angle: -90, position: 'insideLeft', fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                         <YAxis yAxisId="right" orientation="right" label={{ value: 'Rev/Batch (B)', angle: 90, position: 'insideRight', fill:'#94a3b8' }} axisLine={false} tickLine={false} />
                         
                         {/* [수정 완료] name 비교 로직을 'Batch당 매출(우)'로 변경하여 툴팁 오류 해결 */}
                         <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value, name) => {
                                // name은 <Bar> 컴포넌트의 name 속성값을 따라갑니다.
                                if (name === 'Batch당 매출(우)') {
                                    return [`₩ ${Number(value).toFixed(2)}B`, 'Batch당 매출'];
                                }
                                return [`${value} Batch`, '생산량'];
                            }}
                         />
                         <Legend />
                         <Bar yAxisId="left" dataKey="batch" name="생산량(좌)" fill="#3B82F6" barSize={40} radius={[4,4,0,0]} />
                         <Bar yAxisId="right" dataKey="eff" name="Batch당 매출(우)" fill="#F97316" barSize={40} radius={[4,4,0,0]} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

             <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                   <span className="flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500"/> 월별 생산 vs 매출 트렌드 (최근 6개월)</span>
                </h3>
                <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={mergedData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                         <CartesianGrid stroke="#f1f5f9" vertical={false} />
                         <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: '12px', fill: '#64748b' }} />
                         <YAxis yAxisId="left" hide />
                         <YAxis yAxisId="right" orientation="right" hide />
                         <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}/>
                         <Legend />
                         <Bar yAxisId="left" dataKey="totalBatch" name="총 Batch" fill="#cbd5e1" barSize={30} radius={[4,4,0,0]} />
                         <Line yAxisId="right" type="monotone" dataKey="revenue" name="매출액 (Ch.0 연동)" stroke="#10B981" strokeWidth={3} dot={{r:4}} />
                      </ComposedChart>
                   </ResponsiveContainer>
                </div>
             </div>
          </div>
          
          {/* Weekly Rhythm Checklist (로컬 상태 유지) */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                 <Calendar size={18} className="text-orange-500"/> {selectedMonth} 운영 리듬 체크
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 {tasks.map((task, idx) => (
                    <div 
                       key={idx} 
                       className={`p-4 rounded-lg border transition-all flex flex-col gap-2 ${
                          task.done 
                          ? 'bg-emerald-50/50 border-emerald-200' 
                          : 'bg-white border-slate-100 hover:border-blue-300'
                       }`}
                    >
                       <div className="flex justify-between items-center cursor-pointer select-none" onClick={() => toggleTask(idx)}>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                             task.done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>{task.week}</span>
                          {task.done ? <CheckCircle size={16} className="text-emerald-600"/> : <div className="w-4 h-4 rounded-full border border-slate-300"></div>}
                       </div>
                       <div className="flex-1">
                          <input 
                             type="text"
                             className={`w-full text-sm font-bold bg-transparent outline-none border-b border-transparent focus:border-slate-300 pb-0.5 ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}
                             value={task.title}
                             onChange={(e) => handleTaskTextChange(idx, 'title', e.target.value)}
                          />
                          <textarea 
                             className={`w-full text-xs mt-1 bg-transparent outline-none resize-none h-10 ${task.done ? 'text-slate-300' : 'text-slate-500'}`}
                             value={task.desc}
                             onChange={(e) => handleTaskTextChange(idx, 'desc', e.target.value)}
                          />
                       </div>
                    </div>
                 ))}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Chapter2_Production;