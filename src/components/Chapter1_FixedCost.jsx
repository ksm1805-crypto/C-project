import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Plus, Activity } from 'lucide-react';
import KPICard from './common/KPICard';

const COST_TYPES = {
  CONTROLLABLE: { id: 'controllable', label: '통제 가능', color: '#3B82F6' },
  SEMI_FIXED: { id: 'semi', label: '준고정', color: '#F59E0B' },
  UNCONTROLLABLE: { id: 'fixed', label: '통제 불가', color: '#6B7280' },
};

const INITIAL_COSTS = [
  { id: 1, type: 'controllable', name: 'NMR 외부 분석', price: 50000, qty: 30, total: 1500000, memo: '내재화 검토 필요' },
  { id: 2, type: 'controllable', name: 'HPLC 소모품', price: 300000, qty: 5, total: 1500000, memo: '재생 컬럼 테스트' },
  { id: 3, type: 'semi', name: '합성팀 인건비', price: 45000000, qty: 1, total: 45000000, memo: '고정급' },
  { id: 4, type: 'fixed', name: '공장 임대료', price: 10000000, qty: 1, total: 10000000, memo: '본사 배분' },
];

const Chapter1_FixedCost = () => {
  const [costs, setCosts] = useState(INITIAL_COSTS);
  const [revenue] = useState(200000000);
  const [costCap] = useState(55000000);
  const [ratioCap] = useState(30);
  const [showModal, setShowModal] = useState(false);
  const [newCost, setNewCost] = useState({ type: 'controllable', name: '', price: 0, qty: 1, savingsPlan: '', contribution: '', duration: '' });

  const summary = useMemo(() => {
    const total = costs.reduce((acc, curr) => acc + curr.total, 0);
    const ratio = (total / revenue) * 100;
    const byType = Object.values(COST_TYPES).map(type => ({
      name: type.label,
      value: costs.filter(c => c.type === type.id).reduce((acc, c) => acc + c.total, 0),
      color: type.color
    }));
    return { total, ratio, byType };
  }, [costs, revenue]);

  const handleAddCost = () => {
    if (!newCost.name || !newCost.price) return alert("기본 정보를 입력해주세요.");
    setCosts([...costs, { ...newCost, id: Date.now(), total: newCost.price * newCost.qty }]);
    setShowModal(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="총 고정비" value={`₩${summary.total.toLocaleString()}`} sub={`Cap: ₩${costCap.toLocaleString()}`} alert={summary.total > costCap} />
        <KPICard title="매출 대비 비율" value={`${summary.ratio.toFixed(1)}%`} sub={`Limit: ${ratioCap}%`} alert={summary.ratio > ratioCap} />
        <KPICard title="통제 가능 비용" value={`₩${summary.byType.find(t=>t.name==='통제 가능')?.value.toLocaleString()}`} sub="절감 1순위" />
        <KPICard title="잔여 예산" value={`₩${(costCap - summary.total).toLocaleString()}`} sub={summary.total > costCap ? "초과" : "양호"} alert={summary.total > costCap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 col-span-1">
          <h3 className="font-bold text-gray-700 mb-4">비용 구조 (Pie)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={summary.byType} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {summary.byType.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `₩${v.toLocaleString()}`} />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700">상세 분석 (Rule 3: P x Q)</h3>
            <button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-blue-700 transition">
              <Plus size={16} /> 신규 등록
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                <tr><th className="py-2 px-3">구분</th><th className="py-2 px-3">항목</th><th className="py-2 px-3 text-right">단가(P)</th><th className="py-2 px-3 text-right">물량(Q)</th><th className="py-2 px-3 text-right">합계</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costs.map(c => (
                  <tr key={c.id}>
                    <td className="py-2 px-3"><span className="bg-gray-100 px-2 py-1 rounded text-xs">{c.type}</span></td>
                    <td className="py-2 px-3">{c.name}</td>
                    <td className="py-2 px-3 text-right">₩{c.price.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{c.qty.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold">₩{c.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
       {/* Modal Code would go here (Simplified for brevity, copy from original if needed) */}
       {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg">
             <h2>신규 등록 (Demo)</h2>
             <button onClick={()=>setShowModal(false)} className="mt-4 bg-gray-200 px-4 py-2 rounded">닫기</button>
          </div>
        </div>
       )}
    </div>
  );
};

export default Chapter1_FixedCost;