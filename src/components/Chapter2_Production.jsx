import React, { useState, useMemo, useEffect } from 'react';
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Cell
} from 'recharts';
import { 
  Factory, CheckCircle, Calendar, AlertTriangle, TrendingUp, Activity, BarChart3, 
  LayoutTemplate, Network, ArrowRight, Zap, DollarSign, Beaker, Layers
} from 'lucide-react';

// --- [Data 1: Overview Tab용 상수] ---
const WEEKLY_CHECKLIST = [
  { week: 'Week 1', title: '계획 확정 & 병목 체크', desc: '수주/납기/생산계획 확정 (제품 믹스 포함)', done: true },
  { week: 'Week 2', title: '수율/불량 & CAPA 분석', desc: 'Top 3 원인분석 + 재작업 비용 가시화', done: false },
  { week: 'Week 3', title: '매출 인식 & 재고 점검', desc: 'Backlog 관리 + 완제품/재공 재고 확인', done: false },
  { week: 'Week 4', title: 'KPI 리뷰 & 차월 계획', desc: 'Plan vs Act 분석 + 차월 고정비 액션 확정', done: false },
];

// --- [Data 2: Driver Tree Tab용 초기 데이터] ---
const DRIVER_DATA = {
  'OLED 소재': {
    capacity: 60, utilization: 75.0, yield: 98.5, revPerBatch: 0.15, vcPerBatch: 0.08, fixedCost: 2.1, prevBatches: 40
  },
  'API/중간체': {
    capacity: 50, utilization: 76.0, yield: 95.0, revPerBatch: 0.12, vcPerBatch: 0.07, fixedCost: 1.5, prevBatches: 35
  },
  '신사업': {
    capacity: 20, utilization: 60.0, yield: 88.0, revPerBatch: 0.20, vcPerBatch: 0.12, fixedCost: 0.8, prevBatches: 8
  }
};

// --- [Sub-Component: Driver Node] ---
const DriverNode = ({ title, value, unit, sub, icon: Icon, color, type = 'normal', onChange }) => {
  const isInput = type === 'input';
  const isResult = type === 'result';
  
  return (
    <div className={`relative flex flex-col p-4 rounded-xl border ${
      isResult ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 
      isInput ? 'bg-white border-blue-200 shadow-sm ring-2 ring-blue-50' : 'bg-slate-50 border-slate-200'
    } min-w-[140px] md:min-w-[160px] transition-all hover:scale-105 z-10`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-bold uppercase tracking-wider ${isResult ? 'text-blue-200' : 'text-slate-500'}`}>{title}</span>
        {Icon && <Icon size={14} className={isResult ? 'text-white' : color} />}
      </div>
      <div className="flex items-end gap-1">
        {isInput ? (
          <input 
            type="number"
            step="0.01"
            className="text-2xl font-extrabold text-slate-900 w-24 bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-blue-500 p-0 m-0"
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
          />
        ) : (
          <span className={`text-2xl font-extrabold ${isResult ? 'text-white' : 'text-slate-800'}`}>{value}</span>
        )}
        <span className={`text-xs font-medium mb-1 ${isResult ? 'text-blue-200' : 'text-slate-400'}`}>{unit}</span>
      </div>
      {sub && <div className={`text-[10px] mt-1 ${isResult ? 'text-blue-100' : 'text-slate-500'}`}>{sub}</div>}
      <div className="absolute top-1/2 -right-3 w-3 h-px bg-slate-300 hidden md:block"></div>
    </div>
  );
};

const Chapter2_Production = ({ historyData, pnlData, prodStats, setProdStats }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMonth, setSelectedMonth] = useState('2024-12');
  const [tasks, setTasks] = useState(WEEKLY_CHECKLIST);

  // --- [Logic 1: Data Merging & Filtering] ---
  // 생산(prodStats)과 매출(historyData)을 날짜 기준으로 병합하고 '최근 6개월'만 필터링
  const mergedData = useMemo(() => {
    // 1. 존재하는 모든 월(Month) 수집 (Unique)
    const allMonths = new Set([
        ...(prodStats || []).map(d => d.month),
        ...(historyData || []).map(d => d.month)
    ]);
    
    // 2. 오름차순 정렬
    const sortedMonths = Array.from(allMonths).sort();

    // 3. 데이터 매핑 (Outer Join 방식)
    const fullData = sortedMonths.map(month => {
      // 생산 데이터 찾기 (없으면 0 초기화)
      const stat = prodStats ? prodStats.find(p => p.month === month) : null;
      const cleanStat = stat || { oled: 0, api: 0, newBiz: 0, late: 0, util: 0 };
      
      // 재무(매출) 데이터 찾기 (없으면 0 초기화)
      const fin = historyData ? historyData.find(h => h.month === month) : null;
      const rev = fin ? fin.rev : 0;

      const totalBatch = cleanStat.oled + cleanStat.api + cleanStat.newBiz;
      const otd = totalBatch > 0 ? ((totalBatch - cleanStat.late) / totalBatch) * 100 : 0;
      
      // Batch 당 매출 (효율성 지표)
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

    // 4. [핵심] 최근 6개월 데이터만 자르기
    // 데이터가 6개 미만이면 전체 반환, 많으면 뒤에서 6개만 반환
    return fullData.slice(-6);
  }, [prodStats, historyData]);

  // 현재 선택된 월의 데이터 (없으면 빈 객체)
  const currentStat = mergedData.find(d => d.month === selectedMonth) || (mergedData.length > 0 ? mergedData[mergedData.length - 1] : {});

  // 사업부별 상세 분석 데이터 (Chart용) - P&L Data 연동
  const buAnalysisData = useMemo(() => {
    const oledRev = pnlData.find(p => p.id === 1)?.rev || 0;
    const apiRev = pnlData.find(p => p.id === 2)?.rev || 0;
    const newBizRev = pnlData.find(p => p.id === 3)?.rev || 0;

    return [
      { name: 'OLED', batch: currentStat.oled || 0, rev: oledRev, color: '#3B82F6' },
      { name: 'API', batch: currentStat.api || 0, rev: apiRev, color: '#10B981' },
      { name: '신사업', batch: currentStat.newBiz || 0, rev: newBizRev, color: '#F59E0B' },
    ].map(item => ({
      ...item,
      eff: item.batch > 0 ? (item.rev / item.batch) : 0
    }));
  }, [pnlData, currentStat]);

  const handleInputChange = (field, value) => {
    const numVal = value === '' ? 0 : parseFloat(value);
    
    setProdStats(prev => {
      const exists = prev.find(item => item.month === selectedMonth);
      if (exists) {
        return prev.map(item => item.month === selectedMonth ? { ...item, [field]: numVal } : item);
      } else {
        // 만약 prodStats에 해당 월 데이터가 없었다면(예: historyData만 있었던 경우), 새로 생성
        const newEntry = { month: selectedMonth, oled: 0, api: 0, newBiz: 0, late: 0, util: 0, [field]: numVal };
        return [...prev, newEntry].sort((a, b) => a.month.localeCompare(b.month));
      }
    });
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

  // --- [Logic 2: Driver Tree Tab State & Handlers] ---
  const [selectedBu, setSelectedBu] = useState('OLED 소재');
  const [driverState, setDriverState] = useState(DRIVER_DATA['OLED 소재']);
  const [simYield, setSimYield] = useState(0); 
  const [simBatch, setSimBatch] = useState(0); 

  useEffect(() => {
    setDriverState(DRIVER_DATA[selectedBu]);
    setSimBatch(0);
    setSimYield(0);
  }, [selectedBu]);

  const handleDriverChange = (field, val) => {
    const numVal = parseFloat(val);
    setDriverState(prev => ({
      ...prev,
      [field]: isNaN(numVal) ? 0 : numVal
    }));
  };

  // Value Driver Calculation
  const calculatedBatches = (driverState.capacity * driverState.utilization) / 100;
  const currentBatches = calculatedBatches + simBatch;
  const currentYield = Math.min(100, driverState.yield + simYield);
  const yieldImpactFactor = currentYield / driverState.yield; 
  const totalRev = currentBatches * driverState.revPerBatch * yieldImpactFactor; 
  const totalVc = currentBatches * driverState.vcPerBatch;
  const contributionMargin = totalRev - totalVc; 
  const totalOp = contributionMargin - driverState.fixedCost;
  const prevOp = (driverState.prevBatches * driverState.revPerBatch) - (driverState.prevBatches * driverState.vcPerBatch) - driverState.fixedCost;
  const opGrowth = prevOp !== 0 ? ((totalOp - prevOp) / Math.abs(prevOp)) * 100 : 0;
  
  const bridgeData = [
      { name: '전월 OP', value: prevOp },
      { name: '물량/Mix', value: (totalOp - prevOp), isDiff: true },
      { name: '금월 OP', value: totalOp, isTotal: true }
  ];

  const renderTabButton = (id, label, icon) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
        activeTab === id 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
      }`}
    >
      {icon} {label}
    </button>
  );

  if (!mergedData.length) return <div>Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* 1. Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Factory className="text-blue-600"/> 생산·매출 연동 관리
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {activeTab === 'overview' 
              ? '생산 Batch와 매출(Revenue)의 연관성을 모니터링하고 관리합니다.' 
              : '핵심 변수(CAPA, 판가 등) 변화가 영업이익에 미치는 영향을 분석합니다.'}
          </p>
        </div>
        <div className="flex gap-2">
          {renderTabButton('overview', 'Production Overview', <LayoutTemplate size={16}/>)}
          {renderTabButton('driver', '수익성 분석 (Logic Tree)', <Network size={16}/>)}
        </div>
      </div>

      {activeTab === 'overview' && (
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
                      { label: '신사업', field: 'newBiz', val: currentStat.newBiz, color: 'text-amber-600' }
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
                         <Tooltip 
                            cursor={{fill: 'transparent'}}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value, name) => [name === 'eff' ? `₩ ${value.toFixed(2)}B` : `${value} Batch`, name === 'eff' ? 'Batch당 매출' : '생산량']}
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
          
          {/* Weekly Rhythm Checklist */}
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
      )}

      {activeTab === 'driver' && (
        <div className="space-y-6 animate-fade-in">
          {/* ... (Driver Tab 내용은 기존 로직과 UI(rounded-lg)만 적용하여 유지) ... */}
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 w-fit">
            <span className="text-xs font-bold text-slate-500 px-3">사업부 선택:</span>
            {Object.keys(DRIVER_DATA).map(bu => (
              <button
                key={bu}
                onClick={() => { setSelectedBu(bu); setSimBatch(0); setSimYield(0); }}
                className={`px-3 py-1.5 rounded-md text-sm font-bold transition-all ${
                  selectedBu === bu 
                  ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                {bu}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white p-8 rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                <Activity size={16}/> 수익성 분석 (Logic Tree)
              </h3>
              <div className="flex flex-col gap-8 min-w-[600px]">
                {/* ... (Logic Tree Nodes) ... */}
                <div className="flex items-center gap-6 relative">
                  <div className="w-24 text-right text-xs font-bold text-slate-400">물량<br/>(Volume)</div>
                  <div className="flex-1 flex items-center gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100 relative">
                    <DriverNode title="생산능력 (CAPA)" value={driverState.capacity} unit="Batch" icon={Factory} color="text-slate-400" type="input" onChange={(val) => handleDriverChange('capacity', val)}/>
                    <div className="text-slate-300 font-bold">×</div>
                    <DriverNode title="가동률" value={driverState.utilization} unit="%" type="input" icon={Zap} color="text-amber-500" onChange={(val) => handleDriverChange('utilization', val)}/>
                    <ArrowRight className="text-slate-300"/>
                    <DriverNode title="총 생산량" value={currentBatches.toFixed(1)} unit="Batch" type="result" icon={Layers} sub={`전월: ${driverState.prevBatches}`}/>
                  </div>
                </div>

                <div className="flex items-center gap-6 relative">
                  <div className="w-24 text-right text-xs font-bold text-slate-400">단위 손익<br/>(Unit)</div>
                  <div className="flex-1 grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-2">
                       <div className="flex-1">
                          <DriverNode title="배치당 판가 (ASP)" value={driverState.revPerBatch} unit="B" icon={DollarSign} color="text-blue-500" type="input" onChange={(val) => handleDriverChange('revPerBatch', val)}/>
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="flex-1">
                          <DriverNode title="배치당 변동비" value={driverState.vcPerBatch} unit="B" icon={Beaker} color="text-red-500" type="input" onChange={(val) => handleDriverChange('vcPerBatch', val)}/>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 relative">
                  <div className="w-24 text-right text-xs font-bold text-slate-400">재무 성과<br/>(Financial)</div>
                  <div className="flex-1 flex gap-4">
                    <div className="flex-1 bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100 rounded-lg p-4 flex flex-col justify-center space-y-3 shadow-sm">
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">총 매출 (Rev)</span>
                          <span className="font-bold text-blue-600">₩ {totalRev.toFixed(2)}B</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">(-) 총 변동비</span>
                          <span className="font-bold text-red-500">₩ {totalVc.toFixed(2)}B</span>
                       </div>
                       <div className="h-px bg-blue-200 w-full"></div>
                       <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-blue-900">공헌이익 (CM)</span>
                          <span className="text-blue-900">₩ {contributionMargin.toFixed(2)}B</span>
                       </div>
                       <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">(-) 고정비</span>
                          <span className="font-bold text-slate-600">₩ {driverState.fixedCost.toFixed(2)}B</span>
                       </div>
                    </div>
                    <div className="flex items-center">
                       <ArrowRight className="text-blue-300 mr-4" size={24}/>
                       <div className={`w-40 p-5 rounded-lg shadow-lg text-center transform transition-all border ${totalOp >= 0 ? 'bg-blue-600 border-blue-500' : 'bg-red-500 border-red-400'}`}>
                          <p className="text-blue-200 text-xs font-bold uppercase mb-1">영업이익 (OP)</p>
                          <p className="text-3xl font-extrabold text-white">₩{totalOp.toFixed(2)}B</p>
                          <p className="text-blue-100 text-xs mt-2 flex justify-center items-center gap-1">
                            <TrendingUp size={12}/> {opGrowth > 0 ? '+' : ''}{opGrowth.toFixed(1)}% vs Prev
                          </p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Zap size={18} className="text-amber-500"/> 시뮬레이션 (What-If)
                 </h3>
                 <div className="space-y-6">
                    <div>
                       <div className="flex justify-between mb-2 text-sm">
                          <span className="text-slate-600 font-medium">생산량 추가 조정</span>
                          <span className="text-blue-600 font-bold">{simBatch > 0 ? '+' : ''}{simBatch} Batch</span>
                       </div>
                       <input type="range" min="-10" max="10" step="1" value={simBatch} onChange={(e) => setSimBatch(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
                    </div>
                    <div>
                       <div className="flex justify-between mb-2 text-sm">
                          <span className="text-slate-600 font-medium">수율 개선</span>
                          <span className="text-emerald-600 font-bold">{simYield > 0 ? '+' : ''}{simYield}%p</span>
                       </div>
                       <input type="range" min="-5" max="5" step="0.5" value={simYield} onChange={(e) => setSimYield(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"/>
                    </div>
                 </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex-1">
                 <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> 이익 증감 분석 (Bridge)</h3>
                 <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={bridgeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}}/>
                          <YAxis hide/>
                          <Tooltip cursor={{fill: 'transparent'}} formatter={(value) => `₩${value.toFixed(2)}B`}/>
                          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                             {bridgeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.isTotal ? '#2563EB' : entry.value > 0 ? '#10b981' : '#ef4444'} />)}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chapter2_Production;