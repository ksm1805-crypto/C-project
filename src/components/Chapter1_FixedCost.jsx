import React, { useState, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import { Plus, X, AlertTriangle } from 'lucide-react';
import KPICard from './common/KPICard';

const COST_TYPES = {
  CONTROLLABLE: { id: 'controllable', label: '통제 가능', color: '#3B82F6', desc: '외주, 계약, 소모품' },
  SEMI_FIXED: { id: 'semi', label: '준고정', color: '#F59E0B', desc: '인건비, 유틸리티' },
  UNCONTROLLABLE: { id: 'fixed', label: '통제 불가', color: '#6B7280', desc: '감가상각, 임대료' },
};

const INITIAL_COSTS = [
  { id: 1, type: 'controllable', name: 'NMR 외부 분석', price: 50000, qty: 30, total: 1500000, memo: '내재화 검토 필요', savingsPlan: '-', contribution: 'QA 필수', duration: '12' },
  { id: 2, type: 'controllable', name: 'HPLC 소모품', price: 300000, qty: 5, total: 1500000, memo: '재생 컬럼 테스트', savingsPlan: '재생 컬럼', contribution: 'R&D', duration: '1' },
  { id: 3, type: 'semi', name: '합성팀 인건비', price: 45000000, qty: 1, total: 45000000, memo: '고정급', savingsPlan: '-', contribution: '-', duration: '-' },
  { id: 4, type: 'fixed', name: '공장 임대료', price: 10000000, qty: 1, total: 10000000, memo: '본사 배분', savingsPlan: '-', contribution: '-', duration: '-' },
];

const Chapter1_FixedCost = () => {
  const [costs, setCosts] = useState(INITIAL_COSTS);
  const [revenue] = useState(200000000);
  const [costCap] = useState(55000000);
  const [ratioCap] = useState(30);
  
  const [showModal, setShowModal] = useState(false);
  const [newCost, setNewCost] = useState({
    type: 'controllable', name: '', price: 0, qty: 1, savingsPlan: '', contribution: '', duration: ''
  });

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
    // 유효성 검사
    if (!newCost.name || !newCost.price) return alert("항목명과 단가를 입력해주세요.");
    
    // Rule 2: 통제 가능 비용은 Gatekeeping (3종 세트 필수)
    if (newCost.type === 'controllable' && (!newCost.savingsPlan || !newCost.contribution)) {
      return alert("[Rule 2 위반] 통제 가능 비용은 '대체 절감안'과 '기여도'를 반드시 입력해야 승인됩니다.");
    }

    const newItem = {
      ...newCost,
      id: Date.now(),
      total: newCost.price * newCost.qty
    };
    setCosts([...costs, newItem]);
    setShowModal(false);
    setNewCost({ type: 'controllable', name: '', price: 0, qty: 1, savingsPlan: '', contribution: '', duration: '' });
  };

  const getLabelColor = (typeId) => {
    if (typeId === 'controllable') return 'bg-blue-100 text-blue-700';
    if (typeId === 'semi') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="총 고정비 (Monthly)" value={`₩${summary.total.toLocaleString()}`} sub={`Cap: ₩${costCap.toLocaleString()}`} alert={summary.total > costCap} />
        <KPICard title="매출 대비 비율" value={`${summary.ratio.toFixed(1)}%`} sub={`Limit: ${ratioCap}%`} alert={summary.ratio > ratioCap} />
        <KPICard title="통제 가능 비용" value={`₩${summary.byType.find(t=>t.name==='통제 가능')?.value.toLocaleString()}`} sub="절감 1순위" />
        <KPICard title="잔여 예산" value={`₩${(costCap - summary.total).toLocaleString()}`} sub={summary.total > costCap ? "예산 초과!" : "안정권"} alert={summary.total > costCap} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="bg-white p-5 rounded-sm shadow-sm border border-gray-200 col-span-1">
          <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">비용 구조 분석</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={summary.byType} cx="50%" cy="50%" innerRadius={60} outerRadius={80} 
                  paddingAngle={2} dataKey="value"
                >
                  {summary.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₩${value.toLocaleString()}`} />
                <Legend verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white p-5 rounded-sm shadow-sm border border-gray-200 col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">상세 분석 (Rule 3: P x Q)</h3>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-sm text-sm flex items-center gap-1 transition"
            >
              <Plus size={16} /> 신규 등록
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="py-2 px-3">구분</th>
                  <th className="py-2 px-3">항목명</th>
                  <th className="py-2 px-3 text-right">단가(P)</th>
                  <th className="py-2 px-3 text-right">물량(Q)</th>
                  <th className="py-2 px-3 text-right">합계</th>
                  <th className="py-2 px-3 text-gray-400">비고/절감안</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costs.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-sm text-xs font-bold ${getLabelColor(cost.type)}`}>
                        {COST_TYPES[Object.keys(COST_TYPES).find(k => COST_TYPES[k].id === cost.type)].label}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-800">{cost.name}</td>
                    <td className="py-3 px-3 text-right text-gray-600">₩{cost.price.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right text-gray-600">{cost.qty.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">₩{cost.total.toLocaleString()}</td>
                    <td className="py-3 px-3 text-xs text-gray-500 truncate max-w-[150px]">
                      {cost.memo || cost.savingsPlan}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Rule 2 (신규 비용 등록) - 복구 완료 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-lg font-bold text-gray-800">신규 고정비 등록 승인</h2>
              <button onClick={() => setShowModal(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">비용 구분</label>
                  <select 
                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newCost.type}
                    onChange={(e) => setNewCost({...newCost, type: e.target.value})}
                  >
                    {Object.values(COST_TYPES).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">항목명</label>
                  <input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="예: 외부 용역비"
                    value={newCost.name} onChange={(e) => setNewCost({...newCost, name: e.target.value})} />
                </div>
              </div>

              {/* Rule 3: P x Q 입력 강제 */}
              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">단가 (Price)</label>
                  <input type="number" className="w-full border border-blue-200 rounded p-2 text-sm text-right font-bold text-blue-900" 
                    value={newCost.price} onChange={(e) => setNewCost({...newCost, price: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">물량 (Quantity)</label>
                  <input type="number" className="w-full border border-blue-200 rounded p-2 text-sm text-right font-bold text-blue-900" 
                    value={newCost.qty} onChange={(e) => setNewCost({...newCost, qty: Number(e.target.value)})} />
                </div>
                <div className="col-span-2 text-right text-sm font-bold text-blue-800 border-t border-blue-200 pt-2 mt-1">
                  예상 월 합계: ₩{(newCost.price * newCost.qty).toLocaleString()}
                </div>
              </div>

              {/* Rule 2: 3종 세트 입력 (통제 가능 비용일 때 필수) */}
              {newCost.type === 'controllable' && (
                <div className="border-t pt-4 mt-2">
                  <p className="text-xs font-bold text-red-500 mb-3 flex items-center gap-1">
                    <AlertTriangle size={14}/> 필수 승인 요건 (Rule 2: Gatekeeping)
                  </p>
                  <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">① 대체 절감안 (필수)</label>
                        <input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="예: 3개월 후 내재화"
                        value={newCost.savingsPlan} onChange={(e) => setNewCost({...newCost, savingsPlan: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">② 매출 기여도</label>
                            <input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="예: 신제품 QA"
                            value={newCost.contribution} onChange={(e) => setNewCost({...newCost, contribution: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">③ 기간 (개월)</label>
                            <input type="text" className="w-full border border-gray-300 rounded p-2 text-sm" placeholder="예: 6개월"
                            value={newCost.duration} onChange={(e) => setNewCost({...newCost, duration: e.target.value})} />
                        </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 text-gray-600 hover:bg-gray-100 rounded border border-gray-300 transition text-sm font-medium"
              >
                취소
              </button>
              <button 
                onClick={handleAddCost}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold transition shadow-sm text-sm"
              >
                승인 요청 및 등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chapter1_FixedCost;