import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { 
  Target, Plus, CheckSquare, TrendingDown, Edit, Save, 
  Calculator, ArrowRight, Trash2, X, Loader2,
  Factory, Zap, DollarSign, Beaker, Layers, Activity, BarChart3, LayoutTemplate, Network, User
} from 'lucide-react';
import KPICard from './common/KPICard';

// --- [Data] Logic Tree Data ---
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

const COST_STRUCTURE = [
  { id: 'raw', name: '원재료', driver: '단가 / 대체 / 수율', color: '#3B82F6' },
  { id: 'util', name: '용매·유틸', driver: '회수율 / 소비량', color: '#10B981' },
  { id: 'out', name: '외주비', driver: '내재화 / 단가', color: '#F59E0B' },
  { id: 'fail', name: '품질실패', driver: '재작업 / 재시험', color: '#EF4444' },
];

// --- [Component] Driver Node (Responsive Width) ---
const DriverNode = ({ title, value, unit, sub, icon: Icon, color, type = 'normal', onChange }) => {
  const isInput = type === 'input';
  const isResult = type === 'result';
  return (
    <div className={`relative flex flex-col p-4 rounded-xl border ${
      isResult ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 
      isInput ? 'bg-white border-blue-200 shadow-sm ring-2 ring-blue-50' : 'bg-slate-50 border-slate-200'
    } min-w-[130px] md:min-w-[160px] transition-all hover:scale-105 z-10`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${isResult ? 'text-blue-200' : 'text-slate-500'}`}>{title}</span>
        {Icon && <Icon size={14} className={isResult ? 'text-white' : color} />}
      </div>
      <div className="flex items-end gap-1">
        {isInput ? (
          <input 
            type="number" step="0.01" className="text-xl md:text-2xl font-extrabold text-slate-900 w-20 md:w-24 bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-blue-500 p-0 m-0"
            value={value} onChange={(e) => onChange && onChange(e.target.value)}
          />
        ) : (
          <span className={`text-xl md:text-2xl font-extrabold ${isResult ? 'text-white' : 'text-slate-800'}`}>{value}</span>
        )}
        <span className={`text-[10px] md:text-xs font-medium mb-1 ${isResult ? 'text-blue-200' : 'text-slate-400'}`}>{unit}</span>
      </div>
      {sub && <div className={`text-[10px] mt-1 ${isResult ? 'text-blue-100' : 'text-slate-500'}`}>{sub}</div>}
      {/* Hidden on mobile to prevent layout issues in stack mode */}
      <div className="absolute top-1/2 -right-3 w-3 h-px bg-slate-300 hidden md:block"></div>
    </div>
  );
};

const Chapter3_CostReduction = ({ actions: initialActions, onUpdateActions }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState({ annual: 1.5 }); 
  const [simulationBase, setSimulationBase] = useState({ revenue: 6.2, cost: 5.5 });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newAction, setNewAction] = useState({ 
    category: 'raw', item: '', action: '', annualEffect: 0, status: '검토', risk: '', completedMonth: '', owner: '' 
  });

  const [selectedBu, setSelectedBu] = useState('OLED 소재');
  const [driverState, setDriverState] = useState(DRIVER_DATA['OLED 소재']);
  const [simYield, setSimYield] = useState(0); 
  const [simBatch, setSimBatch] = useState(0);

  // --- [Supabase Logic] ---
  useEffect(() => {
    fetchActions();
  }, []);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('cr_actions').select('*').order('id', { ascending: true });
      if (error) throw error;
      const formatted = data.map(item => ({
        ...item, annualEffect: item.annual_effect, completedMonth: item.completed_month
      }));
      setActions(formatted);
      if(onUpdateActions) onUpdateActions(formatted);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  // --- [Logic Tree Handlers] ---
  useEffect(() => {
    setDriverState(DRIVER_DATA[selectedBu]);
    setSimBatch(0);
    setSimYield(0);
  }, [selectedBu]);

  const handleDriverChange = (field, val) => {
    const numVal = parseFloat(val);
    setDriverState(prev => ({ ...prev, [field]: isNaN(numVal) ? 0 : numVal }));
  };

  // --- [Calculations] ---
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

  const summary = useMemo(() => {
    const safeActions = actions || [];
    const byStatus = safeActions.reduce((acc, cur) => {
      const effect = cur.annualEffect || 0;
      const key = cur.status === '완료' ? 'completed' : cur.status === '진행중' ? 'inProgress' : 'risk'; 
      acc[key] += effect;
      return acc;
    }, { completed: 0, inProgress: 0, risk: 0 });
    const totalEstimated = byStatus.completed + byStatus.inProgress + byStatus.risk;
    const gap = targets.annual - totalEstimated;
    const achievementRate = targets.annual > 0 ? (totalEstimated / targets.annual) * 100 : 0;
    const chartData = [
      { name: '절감 목표', target: targets.annual, completed: 0, inProgress: 0, risk: 0, gap: 0 },
      { name: '예상 효과', target: 0, completed: byStatus.completed, inProgress: byStatus.inProgress, risk: byStatus.risk, gap: gap > 0 ? gap : 0 }
    ];
    return { totalEstimated, byStatus, gap, achievementRate, chartData };
  }, [actions, targets]);

  const simulation = useMemo(() => {
    const currentOP = simulationBase.revenue - simulationBase.cost;
    const currentOPRatio = simulationBase.revenue > 0 ? (currentOP / simulationBase.revenue) * 100 : 0;
    const projectedCost = simulationBase.cost - summary.totalEstimated;
    const projectedOP = simulationBase.revenue - projectedCost;
    const projectedOPRatio = simulationBase.revenue > 0 ? (projectedOP / simulationBase.revenue) * 100 : 0;
    return { currentOP, currentOPRatio, projectedOP, projectedOPRatio, improvement: projectedOP - currentOP };
  }, [simulationBase, summary.totalEstimated]);

  // --- [Handlers] ---
  const handleAdd = () => {
    setNewAction({ category: 'raw', item: '', action: '', annualEffect: 0, status: '검토', risk: '', completedMonth: '', owner: '' });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setNewAction({ ...item });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if(!window.confirm('정말 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('cr_actions').delete().eq('id', id);
      if (error) throw error;
      const updated = actions.filter(a => a.id !== id);
      setActions(updated);
      if(onUpdateActions) onUpdateActions(updated);
    } catch (e) {
      console.error("Delete Error", e);
      alert("삭제 실패");
    }
  };

  const handleSave = async () => {
    if (!newAction.item || !newAction.annualEffect) return alert('항목명과 금액은 필수입니다.');
    
    const payload = {
      id: editingId || Date.now(),
      category: newAction.category,
      item: newAction.item,
      action: newAction.action,
      annual_effect: newAction.annualEffect,
      status: newAction.status,
      risk: newAction.risk,
      completed_month: newAction.completedMonth,
      owner: newAction.owner 
    };

    try {
      const { error } = await supabase.from('cr_actions').upsert(payload);
      if (error) throw error;
      let updatedActions;
      if (editingId) {
        updatedActions = actions.map(a => a.id === editingId ? { ...newAction, id: editingId } : a);
      } else {
        updatedActions = [...actions, { ...newAction, id: payload.id }];
      }
      setActions(updatedActions);
      if(onUpdateActions) onUpdateActions(updatedActions);
      setShowForm(false);
    } catch (e) {
      console.error("Save Error", e);
      alert("저장 실패");
    }
  };

  if (loading && actions.length === 0) return <div className="flex justify-center p-10"><Loader2 className="animate-spin text-purple-600"/></div>;

  return (
    <div className="space-y-6 animate-fade-in pb-20 lg:pb-10">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><TrendingDown className="text-purple-600"/> 원가절감 및 수익성 관리</h2>
          <p className="text-sm text-slate-500 mt-1">액션 아이템 관리 및 Profit Logic Tree 시뮬레이션</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto">
          <button onClick={() => setActiveTab('overview')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><LayoutTemplate size={16}/> <span className="hidden sm:inline">원가절감</span> 현황</button>
          <button onClick={() => setActiveTab('logictree')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'logictree' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Network size={16}/> <span className="hidden sm:inline">수익성</span> 분석</button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Cards (Responsive Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            <KPICard 
              title="연간 절감 목표" 
              value={
                <div className="flex items-center gap-1">
                  <span>₩</span>
                  <input 
                    type="number" 
                    step="0.1" 
                    className="w-24 bg-transparent border-b border-dashed border-slate-300 focus:border-purple-500 outline-none text-2xl md:text-3xl font-extrabold text-slate-900 text-center"
                    value={targets.annual}
                    onChange={(e) => setTargets({...targets, annual: parseFloat(e.target.value) || 0})}
                  />
                  <span>B</span>
                </div>
              } 
              sub="전사 목표 (클릭하여 수정)" 
            />
            <KPICard title="현재 예상 효과" value={`₩ ${summary.totalEstimated.toFixed(2)}B`} sub={`목표의 ${summary.achievementRate.toFixed(1)}%`} alert={summary.totalEstimated < targets.annual} />
            <KPICard title="목표 대비 달성도" value={`${summary.achievementRate.toFixed(1)}%`} sub="Target Achievement Rate" alert={summary.achievementRate < 100} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart */}
            <div className="col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Target size={18} className="text-purple-600"/> 목표 vs 예상</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.chartData} barGap={10} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false}/>
                      <YAxis hide/>
                      <Tooltip cursor={{fill: 'transparent'}} formatter={(val) => `₩ ${val.toFixed(2)}B`}/>
                      <Bar dataKey="target" name="목표" fill="#e2e8f0" barSize={40} radius={[4,4,4,4]} />
                      <Bar dataKey="completed" stackId="a" name="완료" fill="#10B981" barSize={40} />
                      <Bar dataKey="inProgress" stackId="a" name="진행" fill="#3B82F6" barSize={40} />
                      <Bar dataKey="risk" stackId="a" name="리스크" fill="#F59E0B" barSize={40} radius={[4,4,0,0]}/>
                      <Bar dataKey="gap" stackId="a" name="Gap" fill="#f1f5f9" stroke="#cbd5e1" strokeDasharray="4 4" barSize={40} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* List (Responsive Scroll) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><CheckSquare size={18} className="text-blue-600"/> 절감 액션 트래커</h3>
                <button onClick={handleAdd} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-purple-700 transition shadow-sm"><Plus size={16} /> 신규 과제</button>
              </div>
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <div className="min-w-[800px] px-4 md:px-0">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-600 font-medium border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-3 w-24 text-center">구분</th>
                        <th className="py-3 px-3">항목 / 액션</th>
                        <th className="py-3 px-3 text-right">연간효과</th>
                        <th className="py-3 px-3 text-center">완료월</th>
                        <th className="py-3 px-3 text-center">담당자</th>
                        <th className="py-3 px-3 text-center">상태</th>
                        <th className="py-3 px-3 text-red-500">Risk</th>
                        <th className="py-3 px-3 text-center">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {actions.length === 0 ? <tr><td colSpan="8" className="text-center py-4 text-slate-400">등록된 과제가 없습니다.</td></tr> : actions.map(action => (
                          <tr key={action.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 text-center align-top"><span className="inline-block whitespace-nowrap text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 min-w-[50px] text-center">{COST_STRUCTURE.find(c => c.id === action.category)?.name || action.category}</span></td>
                            <td className="py-3 px-3"><div className="font-bold text-slate-800">{action.item}</div><div className="text-xs text-indigo-500">{action.action}</div></td>
                            <td className="py-3 px-3 text-right font-bold text-slate-800">₩ {(action.annualEffect || 0).toFixed(2)}B</td>
                            <td className="py-3 px-3 text-center text-slate-600 font-medium">{action.completedMonth || '-'}</td>
                            <td className="py-3 px-3 text-center text-slate-700 font-bold text-xs">{action.owner || '-'}</td>
                            <td className="py-3 px-3 text-center"><span className={`text-[10px] px-2 py-1 rounded-full font-bold ${action.status==='완료' ? 'bg-green-100 text-green-700' : action.status==='진행중' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{action.status}</span></td>
                            <td className="py-3 px-3 text-xs text-red-500 font-medium truncate max-w-[100px]" title={action.risk}>{action.risk || '-'}</td>
                            <td className="py-3 px-3 flex justify-center gap-2"><button onClick={() => handleEdit(action)} className="text-slate-400 hover:text-blue-600 transition"><Edit size={16}/></button><button onClick={() => handleDelete(action.id)} className="text-slate-400 hover:text-red-500 transition"><Trash2 size={16}/></button></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logictree' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Logic Tree (Horizontal Scroll enabled) */}
            <div className="lg:col-span-8 bg-white p-4 md:p-8 rounded-lg shadow-sm border border-slate-200 overflow-x-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><Activity size={16}/> 원가 구조 및 수익성 분석</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                      {Object.keys(DRIVER_DATA).map(bu => (
                          <button key={bu} onClick={() => setSelectedBu(bu)} className={`px-2 py-1 text-xs font-bold rounded ${selectedBu === bu ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{bu}</button>
                      ))}
                  </div>
              </div>
              
              <div className="flex flex-col gap-8 min-w-[600px]">
                {/* Volume Section */}
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

                {/* Unit Economics Section */}
                <div className="flex items-center gap-6 relative">
                    <div className="w-24 text-right text-xs font-bold text-slate-400">단위 손익<br/>(Unit)</div>
                    <div className="flex-1 grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="flex-1"><DriverNode title="배치당 판가 (ASP)" value={driverState.revPerBatch} unit="B" icon={DollarSign} color="text-blue-500" type="input" onChange={(val) => handleDriverChange('revPerBatch', val)}/></div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1"><DriverNode title="배치당 변동비" value={driverState.vcPerBatch} unit="B" icon={Beaker} color="text-red-500" type="input" onChange={(val) => handleDriverChange('vcPerBatch', val)}/></div>
                        </div>
                    </div>
                </div>

                {/* Financial Result Section */}
                <div className="flex items-center gap-6 relative">
                    <div className="w-24 text-right text-xs font-bold text-slate-400">재무 성과<br/>(Financial)</div>
                    <div className="flex-1 flex gap-4">
                        <div className="flex-1 bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100 rounded-lg p-4 flex flex-col justify-center space-y-3 shadow-sm min-w-[200px]">
                            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">총 매출</span><span className="font-bold text-blue-600">₩ {totalRev.toFixed(2)}B</span></div>
                            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">(-) 총 변동비</span><span className="font-bold text-red-500">₩ {totalVc.toFixed(2)}B</span></div>
                            <div className="h-px bg-blue-200 w-full"></div>
                            <div className="flex justify-between items-center text-sm font-medium"><span className="text-blue-900">공헌이익 (CM)</span><span className="text-blue-900">₩ {contributionMargin.toFixed(2)}B</span></div>
                            <div className="flex justify-between items-center text-sm"><span className="text-slate-500">(-) 고정비</span><span className="font-bold text-slate-600">₩ {driverState.fixedCost.toFixed(2)}B</span></div>
                        </div>
                        <div className="flex items-center">
                            <ArrowRight className="text-blue-300 mr-4" size={24}/>
                            <div className={`w-40 p-5 rounded-lg shadow-lg text-center transform transition-all border ${totalOp >= 0 ? 'bg-blue-600 border-blue-500' : 'bg-red-500 border-red-400'}`}>
                                <p className="text-blue-200 text-xs font-bold uppercase mb-1">영업이익 (OP)</p>
                                <p className="text-3xl font-extrabold text-white">₩{totalOp.toFixed(2)}B</p>
                                <p className="text-blue-100 text-xs mt-2 flex justify-center items-center gap-1"><TrendingDown size={12}/> {opGrowth > 0 ? '+' : ''}{opGrowth.toFixed(1)}% vs Prev</p>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>

            {/* Simulation & Bridge (Sidebar) */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Zap size={18} className="text-amber-500"/> 시뮬레이션 (What-If)</h3>
                  <div className="space-y-6">
                      <div>
                          <div className="flex justify-between mb-2 text-sm"><span className="text-slate-600 font-medium">생산량 추가</span><span className="text-blue-600 font-bold">{simBatch > 0 ? '+' : ''}{simBatch} Batch</span></div>
                          <input type="range" min="-10" max="10" step="1" value={simBatch} onChange={(e) => setSimBatch(Number(e.target.value))} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"/>
                      </div>
                      <div>
                          <div className="flex justify-between mb-2 text-sm"><span className="text-slate-600 font-medium">수율 개선</span><span className="text-emerald-600 font-bold">{simYield > 0 ? '+' : ''}{simYield}%p</span></div>
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

      {/* Modal (Add/Edit) - Responsive */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">{editingId ? <Edit size={20} className="text-purple-600"/> : <Plus size={20} className="text-purple-600"/>} {editingId ? '과제 수정' : '신규 과제 등록'}</h2>
                <button onClick={() => setShowForm(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">원가 항목</label><select className="w-full border p-2 rounded-lg text-sm bg-slate-50" value={newAction.category} onChange={e=>setNewAction({...newAction, category:e.target.value})}>{COST_STRUCTURE.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">진행 상태</label><select className="w-full border p-2 rounded-lg text-sm" value={newAction.status} onChange={e=>setNewAction({...newAction, status:e.target.value})}><option value="검토">검토</option><option value="진행중">진행중</option><option value="완료">완료</option><option value="리스크">리스크</option></select></div>
              </div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">절감 아이템명</label><input className="w-full border p-2 rounded-lg text-sm" placeholder="예: 핵심 원료 A" value={newAction.item} onChange={e=>setNewAction({...newAction, item:e.target.value})} /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1">구체적 액션</label><input className="w-full border p-2 rounded-lg text-sm" placeholder="예: 2nd Vendor 도입" value={newAction.action} onChange={e=>setNewAction({...newAction, action:e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-slate-500 mb-1">연간 효과 (B)</label><input type="number" step="0.01" className="w-full border p-2 rounded-lg text-sm font-bold text-right" placeholder="0.00" value={newAction.annualEffect} onChange={e=>setNewAction({...newAction, annualEffect:Number(e.target.value)})} /></div>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">완료 예정월</label><input type="month" className="w-full border p-2 rounded-lg text-sm" value={newAction.completedMonth} onChange={e=>setNewAction({...newAction, completedMonth:e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-xs font-bold text-slate-500 mb-1">담당자</label><input className="w-full border p-2 rounded-lg text-sm" placeholder="이름 (예: 김철수)" value={newAction.owner} onChange={e=>setNewAction({...newAction, owner:e.target.value})} /></div>
                 <div><label className="block text-xs font-bold text-slate-500 mb-1">Risk / Trade-off</label><input className="w-full border p-2 rounded-lg text-sm" placeholder="예: 품질 승인 지연 가능성" value={newAction.risk} onChange={e=>setNewAction({...newAction, risk:e.target.value})} /></div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
                <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition">취소</button>
                <button onClick={handleSave} className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition shadow-md flex items-center justify-center gap-2"><Save size={16}/> 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chapter3_CostReduction;