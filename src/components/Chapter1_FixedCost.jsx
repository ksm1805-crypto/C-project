import React, { useState, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { Plus, X, AlertTriangle, Calendar, Edit, Trash2, Save, TrendingUp } from 'lucide-react';
import KPICard from './common/KPICard';

const COST_TYPES = {
  CONTROLLABLE: { id: 'controllable', label: '통제 가능', color: '#3B82F6', desc: '외주, 계약, 소모품' },
  SEMI_FIXED: { id: 'semi', label: '준고정', color: '#F59E0B', desc: '인건비, 유틸리티' },
  UNCONTROLLABLE: { id: 'fixed', label: '통제 불가', color: '#6B7280', desc: '감가상각, 임대료' },
};

// 세부 항목 데이터
const INITIAL_DETAIL_COSTS = [
  { id: 1, type: 'controllable', name: 'NMR 외부 분석', price: 0.05, qty: 1, total: 0.05, memo: '내재화 검토 필요', savingsPlan: '-', contribution: 'QA 필수', duration: '12' },
  { id: 2, type: 'controllable', name: 'HPLC 소모품', price: 0.15, qty: 1, total: 0.15, memo: '재생 컬럼 테스트', savingsPlan: '재생 컬럼', contribution: 'R&D', duration: '1' },
  { id: 3, type: 'semi', name: '합성팀 인건비', price: 0.85, qty: 1, total: 0.85, memo: '고정급', savingsPlan: '-', contribution: '-', duration: '-' },
  { id: 4, type: 'fixed', name: '공장 임대료', price: 0.42, qty: 1, total: 0.42, memo: '본사 배분', savingsPlan: '-', contribution: '-', duration: '-' },
];

// [수정됨] historyData prop 추가
const Chapter1_FixedCost = ({ pnlData, historyData }) => {
  const [costs, setCosts] = useState(INITIAL_DETAIL_COSTS);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('current'); 
  
  // 편집 모드 상태
  const [editingId, setEditingId] = useState(null); 
  const [newCost, setNewCost] = useState({ 
    type: 'controllable', name: '', price: 0, qty: 1, savingsPlan: '', contribution: '', duration: '' 
  });

  // [연동 Logic] Chapter 0의 데이터(pnlData)에서 총 매출과 총 고정비를 가져옴
  const globalFinancials = useMemo(() => {
    const totalRev = pnlData.reduce((acc, cur) => acc + cur.rev, 0);
    const totalFixed = pnlData.reduce((acc, cur) => acc + cur.fixed, 0);
    const ratio = totalRev > 0 ? (totalFixed / totalRev) * 100 : 0;
    return { totalRev, totalFixed, ratio };
  }, [pnlData]);

  // 세부 항목 합계
  const detailSummary = useMemo(() => {
    const total = costs.reduce((acc, curr) => acc + curr.total, 0);
    const byType = Object.values(COST_TYPES).map(type => ({
      name: type.label,
      value: costs.filter(c => c.type === type.id).reduce((acc, c) => acc + c.total, 0),
      color: type.color
    }));
    return { total, byType };
  }, [costs]);

  // --- [CRUD Handlers] ---
  const openAddModal = () => {
    setNewCost({ type: 'controllable', name: '', price: 0, qty: 1, savingsPlan: '', contribution: '', duration: '' });
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setNewCost({ ...item });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      setCosts(costs.filter(c => c.id !== id));
    }
  };

  const handleSave = () => {
    if (!newCost.name || !newCost.price) return alert("항목명과 단가를 입력해주세요.");
    
    // Rule 2 Check
    if (newCost.type === 'controllable' && (!newCost.savingsPlan || !newCost.contribution)) {
      return alert("[Rule 2] 통제 가능 비용은 '대체 절감안'과 '기여도'를 반드시 입력해야 합니다.");
    }

    const calculatedTotal = newCost.price * newCost.qty;

    if (editingId) {
      setCosts(costs.map(c => c.id === editingId ? { ...newCost, total: calculatedTotal } : c));
    } else {
      setCosts([...costs, { ...newCost, id: Date.now(), total: calculatedTotal }]);
    }
    
    setShowModal(false);
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
        <KPICard title="총 고정비 (From Ch.0)" value={`₩ ${globalFinancials.totalFixed.toFixed(2)}B`} sub="Executive Data 연동됨" />
        <KPICard title="고정비율 (From Ch.0)" value={`${globalFinancials.ratio.toFixed(1)}%`} sub="목표 25% 이내" alert={globalFinancials.ratio > 25} />
        <KPICard title="세부 항목 합계" value={`₩ ${detailSummary.total.toFixed(2)}B`} sub="상세 리스트 기준" alert={Math.abs(globalFinancials.totalFixed - detailSummary.total) > 0.1} />
        <KPICard title="통제 가능 비중" value={`${((detailSummary.byType.find(t=>t.name==='통제 가능')?.value || 0) / detailSummary.total * 100).toFixed(0)}%`} sub="절감 Target Area" />
      </div>

      {/* View Switcher */}
      <div className="flex gap-2 border-b border-slate-200 mb-4">
        <button 
          onClick={() => setViewMode('current')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'current' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          당월 상세 분석
        </button>
        <button 
          onClick={() => setViewMode('monthly')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${viewMode === 'monthly' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          월별 추이 (Monthly Trend)
        </button>
      </div>

      {viewMode === 'current' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] border border-slate-100">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">비용 구조 분석</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={detailSummary.byType} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {detailSummary.byType.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `₩${value.toFixed(2)}B`} />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Detailed Table (CRUD 적용) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">세부 항목 관리 (P x Q)</h3>
              <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-sm text-sm flex items-center gap-1 transition">
                <Plus size={16} /> 신규 등록
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">구분</th>
                    <th className="py-2 px-3">항목명</th>
                    <th className="py-2 px-3 text-right">단가(B)</th>
                    <th className="py-2 px-3 text-right">수량</th>
                    <th className="py-2 px-3 text-right">합계(B)</th>
                    <th className="py-2 px-3 text-slate-400">비고/절감안</th>
                    <th className="py-2 px-3 text-center">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {costs.map((cost) => (
                    <tr key={cost.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-sm text-xs font-bold ${getLabelColor(cost.type)}`}>
                          {COST_TYPES[Object.keys(COST_TYPES).find(k => COST_TYPES[k].id === cost.type)].label}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">{cost.name}</td>
                      <td className="py-3 px-3 text-right text-slate-600">{cost.price.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right text-slate-600">{cost.qty}</td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900">{cost.total.toFixed(2)}</td>
                      <td className="py-3 px-3 text-xs text-slate-500 truncate max-w-[120px]" title={cost.savingsPlan}>
                        {cost.savingsPlan !== '-' ? cost.savingsPlan : cost.memo}
                      </td>
                      <td className="py-3 px-3 flex justify-center gap-2">
                        <button onClick={() => openEditModal(cost)} className="text-slate-400 hover:text-blue-600 transition">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(cost.id)} className="text-slate-400 hover:text-red-500 transition">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        // [수정됨] Monthly View Chart (기능 복구)
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.07)] border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
            <TrendingUp className="text-indigo-500"/> 월별 고정비 & 비율 추이 (Monthly Trend)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={historyData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: '12px', fill: '#64748b' }} />
                <YAxis yAxisId="left" label={{ value: '고정비 (B)', angle: -90, position: 'insideLeft', fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="right" orientation="right" label={{ value: '비율 (%)', angle: 90, position: 'insideRight', fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  formatter={(value, name) => [
                    name === '고정비율(%)' ? `${value}%` : `₩ ${value}B`, 
                    name
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="fixed" name="고정비 Total" fill="#cbd5e1" barSize={40} radius={[4,4,0,0]} />
                <Line yAxisId="right" type="monotone" dataKey="ratio" name="고정비율(%)" stroke="#4f46e5" strokeWidth={3} dot={{r:4}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Modal: Add & Edit (Integrated) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 animate-fade-in-up border border-slate-200">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                {editingId ? <Edit size={20} className="text-blue-600"/> : <Plus size={20} className="text-blue-600"/>}
                {editingId ? '항목 수정' : '신규 고정비 등록'} <span className="text-xs font-normal text-slate-500">(단위: B)</span>
              </h2>
              <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">비용 구분</label>
                  <select 
                    className="w-full border border-slate-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newCost.type}
                    onChange={(e) => setNewCost({...newCost, type: e.target.value})}
                  >
                    {Object.values(COST_TYPES).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">항목명</label>
                  <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="예: 외부 용역비"
                    value={newCost.name} onChange={(e) => setNewCost({...newCost, name: e.target.value})} />
                </div>
              </div>

              {/* P x Q Section */}
              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-4 rounded border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">단가 (Price, B)</label>
                  <input type="number" step="0.01" className="w-full border border-blue-200 rounded p-2 text-sm text-right font-bold text-blue-900" 
                    value={newCost.price} onChange={(e) => setNewCost({...newCost, price: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">물량 (Quantity)</label>
                  <input type="number" className="w-full border border-blue-200 rounded p-2 text-sm text-right font-bold text-blue-900" 
                    value={newCost.qty} onChange={(e) => setNewCost({...newCost, qty: Number(e.target.value)})} />
                </div>
                <div className="col-span-2 text-right text-sm font-bold text-blue-800 border-t border-blue-200 pt-2 mt-1">
                  예상 합계: ₩ {(newCost.price * newCost.qty).toFixed(2)} B
                </div>
              </div>

              {/* Rule 2 Check Fields */}
              {newCost.type === 'controllable' && (
                <div className="border-t pt-4 mt-2">
                  <p className="text-xs font-bold text-red-500 mb-3 flex items-center gap-1">
                    <AlertTriangle size={14}/> 필수 승인 요건 (Rule 2: Gatekeeping)
                  </p>
                  <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">① 대체 절감안 (필수)</label>
                        <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="예: 3개월 후 내재화"
                        value={newCost.savingsPlan} onChange={(e) => setNewCost({...newCost, savingsPlan: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">② 매출 기여도</label>
                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="예: 신제품 QA"
                            value={newCost.contribution} onChange={(e) => setNewCost({...newCost, contribution: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-500 mb-1">③ 기간 (개월)</label>
                            <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" placeholder="예: 6개월"
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
                className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-300 transition text-sm font-medium"
              >
                취소
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold transition shadow-sm text-sm flex items-center justify-center gap-2"
              >
                <Save size={16}/> {editingId ? '수정 완료' : '등록 하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chapter1_FixedCost;