import React, { useState, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { AlertTriangle, CheckCircle, TrendingUp, DollarSign, Plus, X, Activity } from 'lucide-react';

// --- 1. 초기 설정 및 상수 정의 ---

const COST_TYPES = {
  CONTROLLABLE: { id: 'controllable', label: '통제 가능', color: '#3B82F6', desc: '외주, 계약, 소모품' },
  SEMI_FIXED: { id: 'semi', label: '준고정', color: '#F59E0B', desc: '인건비, 유틸리티' },
  UNCONTROLLABLE: { id: 'fixed', label: '통제 불가', color: '#6B7280', desc: '감가상각, 임대료' },
};

// 샘플 데이터
const INITIAL_DATA = [
  { id: 1, type: 'controllable', name: 'NMR 외부 분석', price: 50000, qty: 30, total: 1500000, 
    memo: '내재화 검토 필요', savingsPlan: '-', contribution: 'QA 필수', duration: '12' },
  { id: 2, type: 'controllable', name: 'HPLC 소모품(컬럼)', price: 300000, qty: 5, total: 1500000, 
    memo: '', savingsPlan: '재생 컬럼 테스트', contribution: 'R&D', duration: '1' },
  { id: 3, type: 'semi', name: '합성팀 인건비(고정)', price: 45000000, qty: 1, total: 45000000, 
    memo: '직/간접 포함', savingsPlan: '-', contribution: '-', duration: '-' },
  { id: 4, type: 'fixed', name: '공장 임대료', price: 10000000, qty: 1, total: 10000000, 
    memo: '본사 배분', savingsPlan: '불가', contribution: '-', duration: '-' },
];

const FixedCostDashboard = () => {
  // --- State ---
  const [costs, setCosts] = useState(INITIAL_DATA);
  const [revenue, setRevenue] = useState(200000000); // 월 매출 (2억)
  const [costCap, setCostCap] = useState(55000000);  // 월 고정비 Cap (5.5천)
  const [ratioCap, setRatioCap] = useState(30);      // 고정비율 상한 (30%)
  
  const [showModal, setShowModal] = useState(false);
  const [newCost, setNewCost] = useState({
    type: 'controllable', name: '', price: 0, qty: 1, savingsPlan: '', contribution: '', duration: ''
  });

  // --- Calculations (실시간 분석) ---
  const summary = useMemo(() => {
    const total = costs.reduce((acc, curr) => acc + curr.total, 0);
    const ratio = (total / revenue) * 100;
    
    // 카테고리별 합계
    const byType = Object.values(COST_TYPES).map(type => ({
      name: type.label,
      value: costs.filter(c => c.type === type.id).reduce((acc, c) => acc + c.total, 0),
      color: type.color
    }));

    return { total, ratio, byType };
  }, [costs, revenue]);

  // --- Handlers ---
  const handleAddCost = () => {
    // 유효성 검사 (Rule 2: 신규 등록 필수 3요소)
    if (!newCost.name || !newCost.price) return alert("기본 정보를 입력해주세요.");
    if (newCost.type === 'controllable' && (!newCost.savingsPlan || !newCost.contribution)) {
      return alert("[Rule 2 위반] 신규/변동성 비용은 '대체 절감안'과 '기여도'를 반드시 입력해야 합니다.");
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

  // --- UI Components ---

  // 1. KPI Cards (Rule 1: Cap & Ratio Check)
  const KPICard = ({ title, value, subValue, alert }) => (
    <div className={`p-4 rounded-xl border-l-4 shadow-sm bg-white ${alert ? 'border-red-500' : 'border-blue-500'}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className={`text-2xl font-bold mt-1 ${alert ? 'text-red-600' : 'text-gray-800'}`}>{value}</h3>
        </div>
        {alert ? <AlertTriangle className="text-red-500" /> : <CheckCircle className="text-blue-500" />}
      </div>
      <p className="text-xs text-gray-400 mt-2">{subValue}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="text-blue-600" /> OLED 사업부 고정비 통합 관리
          </h1>
          <p className="text-gray-500 text-sm mt-1">Chapter 1. Fixed Cost Control & Analysis</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm text-sm">
            <span className="text-gray-500">월 매출 기준: </span>
            <strong className="text-gray-800">₩{revenue.toLocaleString()}</strong>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
          >
            <Plus size={18} /> 신규 비용 등록
          </button>
        </div>
      </div>

      {/* KPI Section (Rule 1 적용) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard 
          title="총 고정비 (Monthly)" 
          value={`₩${summary.total.toLocaleString()}`} 
          subValue={`목표 Cap: ₩${costCap.toLocaleString()}`}
          alert={summary.total > costCap}
        />
        <KPICard 
          title="매출액 대비 고정비율" 
          value={`${summary.ratio.toFixed(1)}%`} 
          subValue={`Limit: ${ratioCap}%`}
          alert={summary.ratio > ratioCap}
        />
        <KPICard 
          title="통제 가능 비용 합계" 
          value={`₩${summary.byType.find(t=>t.name==='통제 가능')?.value.toLocaleString()}`} 
          subValue="절감 타겟 1순위"
          alert={false}
        />
        <KPICard 
          title="잔여 예산 (Cap 기준)" 
          value={`₩${(costCap - summary.total).toLocaleString()}`} 
          subValue={summary.total > costCap ? "예산 초과!" : "안정권"}
          alert={summary.total > costCap}
        />
      </div>

      {/* Charts & Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm col-span-1">
          <h3 className="text-lg font-bold text-gray-700 mb-4">비용 구조 분석</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={summary.byType} cx="50%" cy="50%" innerRadius={60} outerRadius={80} 
                  paddingAngle={5} dataKey="value"
                >
                  {summary.byType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₩${value.toLocaleString()}`} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rule 3 Table: P x Q Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-sm col-span-2 overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-700">상세 비용 분석 (P × Q)</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Rule 3 적용됨</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b">
                <tr>
                  <th className="py-3 px-4">구분</th>
                  <th className="py-3 px-4">항목명</th>
                  <th className="py-3 px-4 text-right">단가(P)</th>
                  <th className="py-3 px-4 text-right">물량(Q)</th>
                  <th className="py-3 px-4 text-right">합계</th>
                  <th className="py-3 px-4">Action Plan / 비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {costs.map((cost) => (
                  <tr key={cost.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold
                        ${cost.type === 'controllable' ? 'bg-blue-100 text-blue-700' : 
                          cost.type === 'semi' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                        {COST_TYPES[Object.keys(COST_TYPES).find(k => COST_TYPES[k].id === cost.type)].label}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">{cost.name}</td>
                    <td className="py-3 px-4 text-right text-gray-600">₩{cost.price.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{cost.qty.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-800">₩{cost.total.toLocaleString()}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {cost.memo || cost.savingsPlan}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal: Rule 2 (신규 비용 등록) */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">신규 고정비 등록 승인</h2>
              <button onClick={() => setShowModal(false)}><X className="text-gray-400 hover:text-gray-600" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">비용 구분</label>
                  <select 
                    className="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newCost.type}
                    onChange={(e) => setNewCost({...newCost, type: e.target.value})}
                  >
                    {Object.values(COST_TYPES).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">항목명</label>
                  <input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="예: 외부 용역비"
                    value={newCost.name} onChange={(e) => setNewCost({...newCost, name: e.target.value})} />
                </div>
              </div>

              {/* Rule 3: P x Q 입력 강제 */}
              <div className="grid grid-cols-2 gap-4 bg-blue-50 p-3 rounded-lg">
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">단가 (Price)</label>
                  <input type="number" className="w-full border rounded-lg p-2 text-sm text-right" 
                    value={newCost.price} onChange={(e) => setNewCost({...newCost, price: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-700 mb-1">물량 (Quantity)</label>
                  <input type="number" className="w-full border rounded-lg p-2 text-sm text-right" 
                    value={newCost.qty} onChange={(e) => setNewCost({...newCost, qty: Number(e.target.value)})} />
                </div>
                <div className="col-span-2 text-right text-sm font-bold text-blue-800">
                  예상 월 합계: ₩{(newCost.price * newCost.qty).toLocaleString()}
                </div>
              </div>

              {/* Rule 2: 3종 세트 입력 (통제 가능 비용일 때 필수) */}
              {newCost.type === 'controllable' && (
                <div className="border-t pt-4 mt-2">
                  <p className="text-xs font-bold text-red-500 mb-2 flex items-center gap-1">
                    <AlertTriangle size={12}/> 필수 승인 요건 (Rule 2)
                  </p>
                  <div className="space-y-3">
                    <input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="① 대체 절감안 (필수)"
                      value={newCost.savingsPlan} onChange={(e) => setNewCost({...newCost, savingsPlan: e.target.value})} />
                    <input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="② 매출/GM 기여도 (필수)"
                      value={newCost.contribution} onChange={(e) => setNewCost({...newCost, contribution: e.target.value})} />
                    <input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="③ 발생 기간 (개월)"
                      value={newCost.duration} onChange={(e) => setNewCost({...newCost, duration: e.target.value})} />
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
              >
                취소
              </button>
              <button 
                onClick={handleAddCost}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-md"
              >
                승인 및 등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedCostDashboard;