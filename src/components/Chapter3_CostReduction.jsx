import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { Target, Plus, AlertTriangle, CheckSquare, TrendingDown, Edit, Save, Calculator, ArrowRight, Trash2, X } from 'lucide-react';
import KPICard from './common/KPICard';

// 원가 구조 카테고리
const COST_STRUCTURE = [
  { id: 'raw', name: '원재료', driver: '단가 / 대체 / 수율', color: '#3B82F6' },
  { id: 'util', name: '용매·유틸', driver: '회수율 / 소비량', color: '#10B981' },
  { id: 'out', name: '외주비', driver: '내재화 / 단가', color: '#F59E0B' },
  { id: 'fail', name: '품질실패', driver: '재작업 / 재시험', color: '#EF4444' },
];

// [수정] INITIAL_ACTIONS 삭제, props로 actions, setActions 수신
const Chapter3_CostReduction = ({ actions, setActions }) => {
  // [수정] const [actions, setActions] = useState(INITIAL_ACTIONS); 삭제됨
  const [targets, setTargets] = useState({ annual: 1.5 }); 
  
  // 시뮬레이션용 베이스 데이터
  const [simulationBase, setSimulationBase] = useState({ revenue: 6.2, cost: 5.5 });

  // 모달 & 편집 상태
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newAction, setNewAction] = useState({ 
    category: 'raw', item: '', action: '', annualEffect: 0, status: '검토', risk: '', completedMonth: '' 
  });

  // --- [Logic 1] 목표 및 예상 효과 계산 ---
  const summary = useMemo(() => {
    // actions가 undefined일 경우 방어
    const safeActions = actions || [];
    const byStatus = safeActions.reduce((acc, cur) => {
      const key = cur.status === '완료' ? 'completed' 
                : cur.status === '진행중' ? 'inProgress' 
                : 'risk'; 
      acc[key] += cur.annualEffect;
      return acc;
    }, { completed: 0, inProgress: 0, risk: 0 });

    const totalEstimated = byStatus.completed + byStatus.inProgress + byStatus.risk;
    const gap = targets.annual - totalEstimated;
    const achievementRate = targets.annual > 0 ? (totalEstimated / targets.annual) * 100 : 0;

    // 차트 데이터 (Target vs Forecast)
    const chartData = [
      {
        name: '절감 목표', target: targets.annual, completed: 0, inProgress: 0, risk: 0, gap: 0
      },
      {
        name: '예상 효과', target: 0,
        completed: byStatus.completed, inProgress: byStatus.inProgress, risk: byStatus.risk,
        gap: gap > 0 ? gap : 0 
      }
    ];

    return { totalEstimated, byStatus, gap, achievementRate, chartData };
  }, [actions, targets]);

  // --- [Logic 2] 영업이익 시뮬레이션 계산 ---
  const simulation = useMemo(() => {
    const currentOP = simulationBase.revenue - simulationBase.cost;
    const currentOPRatio = simulationBase.revenue > 0 ? (currentOP / simulationBase.revenue) * 100 : 0;
    
    // 절감 효과 반영 (비용 감소 = 이익 증가)
    const projectedCost = simulationBase.cost - summary.totalEstimated;
    const projectedOP = simulationBase.revenue - projectedCost;
    const projectedOPRatio = simulationBase.revenue > 0 ? (projectedOP / simulationBase.revenue) * 100 : 0;

    return { currentOP, currentOPRatio, projectedOP, projectedOPRatio, improvement: projectedOP - currentOP };
  }, [simulationBase, summary.totalEstimated]);

  // --- [Handlers] ---
  const handleAdd = () => {
    setNewAction({ category: 'raw', item: '', action: '', annualEffect: 0, status: '검토', risk: '', completedMonth: '' });
    setEditingId(null);
    setShowForm(true);
  };

  const handleEdit = (item) => {
    setNewAction({ ...item });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if(window.confirm('삭제하시겠습니까?')) {
      // [수정] 부모 상태 업데이트
      setActions(actions.filter(a => a.id !== id));
    }
  };

  const handleSave = () => {
    if (!newAction.item || !newAction.annualEffect) return alert('항목명과 금액은 필수입니다.');
    
    if (editingId) {
      // [수정] 부모 상태 업데이트
      setActions(actions.map(a => a.id === editingId ? { ...newAction } : a));
    } else {
      // [수정] 부모 상태 업데이트
      setActions([...actions, { ...newAction, id: Date.now() }]);
    }
    setShowForm(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header & Base Input */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingDown className="text-purple-600"/> 원가절감 관리
          </h2>
          <p className="text-sm text-slate-500">액션 아이템 관리 및 손익 개선 시뮬레이션</p>
        </div>
        
        {/* 시뮬레이션 기준값 입력 */}
        <div className="flex gap-3 bg-purple-50 p-2.5 rounded-xl border border-purple-100 items-center">
          <Calculator size={16} className="text-purple-600"/>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-purple-700">기준 매출(B)</label>
            <input type="number" className="w-16 bg-white border border-purple-200 rounded px-1 text-sm font-bold text-right outline-none focus:ring-1 focus:ring-purple-500"
              value={simulationBase.revenue} onChange={e => setSimulationBase({...simulationBase, revenue: Number(e.target.value)})} />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-purple-700">기준 비용(B)</label>
            <input type="number" className="w-16 bg-white border border-purple-200 rounded px-1 text-sm font-bold text-right outline-none focus:ring-1 focus:ring-purple-500"
              value={simulationBase.cost} onChange={e => setSimulationBase({...simulationBase, cost: Number(e.target.value)})} />
          </div>
        </div>
      </div>

      {/* 2. KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <KPICard title="연간 절감 목표" value={`₩ ${targets.annual.toFixed(2)}B`} sub="전사 목표" />
        <KPICard title="현재 예상 효과" value={`₩ ${summary.totalEstimated.toFixed(2)}B`} sub={`달성률 ${summary.achievementRate.toFixed(1)}%`} alert={summary.totalEstimated < targets.annual} />
        <KPICard title="확보된 절감액" value={`₩ ${summary.byStatus.completed.toFixed(2)}B`} sub="완료된 실적" alert={false} />
        <KPICard title="추가 발굴 필요 (Gap)" value={`₩ ${summary.gap > 0 ? summary.gap.toFixed(2) : 0}B`} sub={summary.gap > 0 ? "Goal 미달" : "Goal 달성"} alert={summary.gap > 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Charts & Simulation Area */}
        <div className="col-span-1 space-y-6">
          {/* Target vs Forecast Chart */}
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

          {/* OP Simulation Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-2xl shadow-sm border border-indigo-100">
            <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
              <Calculator size={18} className="text-indigo-600"/> 영업이익(OP) 시뮬레이션
            </h3>
            <div className="flex items-center justify-between">
              {/* Before */}
              <div className="text-center">
                <p className="text-xs text-slate-500 font-bold mb-1">현재 예상 OP</p>
                <p className="text-lg font-bold text-slate-700">₩ {simulation.currentOP.toFixed(2)}B</p>
                <p className="text-xs text-slate-400">({simulation.currentOPRatio.toFixed(1)}%)</p>
              </div>
              
              <div className="flex flex-col items-center">
                <ArrowRight className="text-indigo-400 mb-1"/>
                <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                  + ₩{simulation.improvement.toFixed(2)}B
                </span>
              </div>

              {/* After */}
              <div className="text-center">
                <p className="text-xs text-indigo-600 font-bold mb-1">절감 반영 OP</p>
                <p className="text-xl font-extrabold text-indigo-700">₩ {simulation.projectedOP.toFixed(2)}B</p>
                <p className="text-xs text-indigo-400 font-bold">({simulation.projectedOPRatio.toFixed(1)}%)</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 text-center">
              * 현재 발굴된 모든 절감 과제가 성공했을 때의 재무적 효과입니다.
            </p>
          </div>
        </div>

        {/* 4. Action Tracker Table (Editable) */}
        <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              <CheckSquare size={18} className="text-blue-600"/> 절감 액션 트래커
            </h3>
            <button onClick={handleAdd} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 hover:bg-purple-700 transition shadow-sm">
              <Plus size={16} /> 신규 과제
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-y border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-16">구분</th>
                  <th className="py-3 px-3">항목 / 액션</th>
                  <th className="py-3 px-3 text-right">연간효과</th>
                  <th className="py-3 px-3 text-center">완료월</th>
                  <th className="py-3 px-3 text-center">상태</th>
                  <th className="py-3 px-3 text-red-500">Risk</th>
                  <th className="py-3 px-3 text-center">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(actions || []).map(action => (
                  <tr key={action.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200">
                        {COST_STRUCTURE.find(c => c.id === action.category)?.name}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-800">{action.item}</div>
                      <div className="text-xs text-indigo-500">{action.action}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-800">₩ {action.annualEffect.toFixed(2)}B</td>
                    <td className="py-3 px-3 text-center text-slate-600 font-medium">
                      {action.completedMonth || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-[11px] px-2 py-1 rounded-full font-bold ${
                        action.status==='완료' ? 'bg-green-100 text-green-700' :
                        action.status==='진행중' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {action.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-red-500 font-medium">{action.risk || '-'}</td>
                    <td className="py-3 px-3 flex justify-center gap-2">
                       <button onClick={() => handleEdit(action)} className="text-slate-400 hover:text-blue-600 transition">
                         <Edit size={16}/>
                       </button>
                       <button onClick={() => handleDelete(action.id)} className="text-slate-400 hover:text-red-500 transition">
                         <Trash2 size={16}/>
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 입력/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200">
            {/* ... 모달 내용은 기존과 동일하므로 생략하지 않고 그대로 유지 ... */}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                {editingId ? <Edit size={20} className="text-purple-600"/> : <Plus size={20} className="text-purple-600"/>} 
                {editingId ? '과제 수정' : '신규 과제 등록'}
              </h2>
              <button onClick={() => setShowForm(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">원가 항목</label>
                  <select className="w-full border p-2 rounded-lg text-sm bg-slate-50" value={newAction.category} onChange={e=>setNewAction({...newAction, category:e.target.value})}>
                    {COST_STRUCTURE.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">진행 상태</label>
                  <select className="w-full border p-2 rounded-lg text-sm" value={newAction.status} onChange={e=>setNewAction({...newAction, status:e.target.value})}>
                    <option value="검토">검토 (Idea)</option>
                    <option value="진행중">진행중 (On-going)</option>
                    <option value="완료">완료 (Completed)</option>
                    <option value="리스크">리스크 (Risk)</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">절감 아이템명</label>
                <input className="w-full border p-2 rounded-lg text-sm" placeholder="예: 핵심 원료 A" value={newAction.item} onChange={e=>setNewAction({...newAction, item:e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">구체적 액션</label>
                <input className="w-full border p-2 rounded-lg text-sm" placeholder="예: 2nd Vendor 도입" value={newAction.action} onChange={e=>setNewAction({...newAction, action:e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">연간 효과 (B)</label>
                   <input type="number" step="0.01" className="w-full border p-2 rounded-lg text-sm font-bold text-right" placeholder="0.00" value={newAction.annualEffect} onChange={e=>setNewAction({...newAction, annualEffect:Number(e.target.value)})} />
                </div>
                <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1">완료 예정월</label>
                   <input type="month" className="w-full border p-2 rounded-lg text-sm" value={newAction.completedMonth} onChange={e=>setNewAction({...newAction, completedMonth:e.target.value})} />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Risk / Trade-off</label>
                <input className="w-full border p-2 rounded-lg text-sm" placeholder="예: 품질 승인 지연 가능성" value={newAction.risk} onChange={e=>setNewAction({...newAction, risk:e.target.value})} />
              </div>
            </div>
            
            <div className="mt-6 flex gap-3">
              <button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition">취소</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition shadow-md flex items-center justify-center gap-2">
                <Save size={16}/> 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chapter3_CostReduction;