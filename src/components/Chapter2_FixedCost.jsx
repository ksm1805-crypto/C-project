import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Area 
} from 'recharts';
import { Plus, X, AlertTriangle, Calendar, Edit, Trash2, Save, TrendingUp, Loader2, Filter, DollarSign, ArrowRight } from 'lucide-react';
import KPICard from './common/KPICard';

const COST_TYPES = {
  CONTROLLABLE: { id: 'controllable', label: '통제 가능', color: '#3B82F6', desc: '외주, 계약, 소모품' },
  SEMI_FIXED: { id: 'semi', label: '준고정', color: '#F59E0B', desc: '인건비, 유틸리티' },
  UNCONTROLLABLE: { id: 'fixed', label: '통제 불가', color: '#9CA3AF', desc: '감가상각, 임대료' },
};

// --- [Utility] 데이터 단위 보정 ---
const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// [Core Fix] 값이 너무 크면(예: 1000 이상) 원 단위로 간주하고 10억으로 나눔
const autoScale = (val) => {
  const n = safeNum(val);
  // 1000B(1조) 이상일 확률은 낮으므로, 1000 이상이면 원 단위 데이터로 판단
  if (Math.abs(n) >= 1000) {
    return n / 1_000_000_000;
  }
  return n;
};

const Chapter2_FixedCost = ({ pnlData, historyData }) => {
  const [selectedMonth, setSelectedMonth] = useState('2024-12');
  const [costs, setCosts] = useState([]);
  const [allCosts, setAllCosts] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('current'); 
  const [editingId, setEditingId] = useState(null); 
  
  // [State] 입력 폼 상태
  const [newCost, setNewCost] = useState({ 
    type: 'controllable', name: '', price: 0, beforePrice: 0, qty: 1, savingsPlan: '', contribution: '', duration: '', memo: ''
  });

  // --- [Logic] Available Months ---
  const availableMonths = useMemo(() => {
    const months = new Set(historyData?.map(h => h.month) || []);
    // 현재 작업 중인 월이 없으면 추가
    if (selectedMonth) months.add(selectedMonth);
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [historyData, selectedMonth]);

  // --- [Logic] Trend Data: Cumulative Savings (P x Q 반영) ---
  const trendData = useMemo(() => {
    if (!allCosts || allCosts.length === 0) return [];

    const monthlyGroups = allCosts.reduce((acc, cur) => {
      if (!acc[cur.month]) {
        acc[cur.month] = { month: cur.month, monthlySavings: 0 };
      }
      
      const before = autoScale(cur.before_price);
      const current = autoScale(cur.price);
      const qty = safeNum(cur.qty) || 0; 
      
      if (cur.type === 'controllable' && before !== 0) {
        const saving = (before - current) * qty;
        acc[cur.month].monthlySavings += saving;
      }
      
      return acc;
    }, {});

    const sortedMonths = Object.values(monthlyGroups).sort((a, b) => a.month.localeCompare(b.month));

    let cumulative = 0;
    return sortedMonths.map(item => {
      cumulative += item.monthlySavings;
      return {
        month: item.month,
        monthlySavings: Number(item.monthlySavings.toFixed(2)),
        accSavings: Number(cumulative.toFixed(2))
      };
    });
  }, [allCosts]);

  // --- [Supabase Logic] Fetch ---
  useEffect(() => {
    if (selectedMonth) {
        fetchCostsAndSync();
        fetchAllCostsForTrend();
    }
  }, [selectedMonth, historyData]); 

  // 1. 현재 선택된 월 데이터 조회
  const fetchCostsAndSync = async () => {
    try {
      setLoading(true);
      const { data: existingData, error } = await supabase
        .from('fixed_cost_details')
        .select('*')
        .eq('month', selectedMonth)
        .order('id', { ascending: true });

      if (error) throw error;

      // [Fix] 불러온 데이터 단위 보정 (원 -> B)
      const scaledData = (existingData || []).map(item => ({
          ...item,
          price: autoScale(item.price),
          beforePrice: autoScale(item.before_price), // DB컬럼명 매핑
          total: autoScale(item.total),
          savingsPlan: item.savings_plan
      }));

      // Auto-Sync Logic (아카이브에서 데이터 가져오기)
      if (scaledData.length === 0 && historyData) {
        const archive = historyData.find(h => h.month === selectedMonth);
        if (archive && archive.cost_details) {
          const newItems = archive.cost_details.map(c => {
            let type = 'controllable';
            if (c.category.includes('인건비')) type = 'semi';
            if (c.category.includes('감가상각')) type = 'fixed';
            
            // 아카이브 데이터도 클 수 있으므로 보정
            const val = autoScale(c.value);
            
            return {
              month: selectedMonth,
              type: type,
              name: c.category + ' (From Archive)',
              price: val,
              before_price: val,
              qty: 1,
              total: val,
              memo: '자동 연동됨',
              savings_plan: '-', contribution: '-', duration: '-'
            };
          });
          
          if (newItems.length > 0) {
              const { data: insertedData } = await supabase.from('fixed_cost_details').insert(newItems).select();
              if (insertedData) {
                 const formatted = insertedData.map(item => ({ 
                     ...item, 
                     price: autoScale(item.price),
                     beforePrice: autoScale(item.before_price),
                     total: autoScale(item.total),
                     savingsPlan: item.savings_plan 
                 }));
                 setCosts(formatted);
                 setLoading(false);
                 return; 
              }
          }
        }
      }
      setCosts(scaledData);
    } catch (error) { 
        console.error(error); 
    } finally { 
        setLoading(false); 
    }
  };

  // 2. 전체 데이터 조회 (트렌드용)
  const fetchAllCostsForTrend = async () => {
    const { data } = await supabase.from('fixed_cost_details').select('*');
    if (data) setAllCosts(data);
  };

  // --- [KPI Logic] ---
  const globalFinancials = useMemo(() => {
    const archive = historyData ? historyData.find(h => h.month === selectedMonth) : null;
    // [Fix] 아카이브 데이터도 보정
    return { 
        totalFixed: archive ? autoScale(archive.fixed) : 0, 
        ratio: archive ? archive.ratio : 0 
    };
  }, [historyData, selectedMonth]);

  const detailSummary = useMemo(() => {
    const total = costs.reduce((acc, curr) => acc + (curr.total || 0), 0);
    const byType = Object.values(COST_TYPES).map(type => ({
      name: type.label,
      value: costs.filter(c => c.type === type.id).reduce((acc, c) => acc + (c.total || 0), 0),
      color: type.color,
      id: type.id
    }));
    
    // 이달의 총 절감액 (P x Q)
    const monthlySavings = costs.reduce((acc, cur) => {
        const before = cur.beforePrice || cur.price;
        const current = cur.price;
        const qty = cur.qty || 0;

        if (cur.type === 'controllable' && before !== current) {
            return acc + ((before - current) * qty);
        }
        return acc;
    }, 0);

    return { total, byType, monthlySavings };
  }, [costs]);

  // --- [Handlers] ---
  const openAddModal = () => { 
    setNewCost({ type: 'controllable', name: '', price: 0, beforePrice: 0, qty: 1, savingsPlan: '', contribution: '', duration: '', memo: '' }); 
    setEditingId(null); 
    setShowModal(true); 
  };
  
  const openEditModal = (item) => { 
    setNewCost({ ...item, beforePrice: item.beforePrice || item.price }); 
    setEditingId(item.id); 
    setShowModal(true); 
  };
  
  const handleDelete = async (id) => { 
    if (window.confirm("정말 삭제하시겠습니까?")) { 
      await supabase.from('fixed_cost_details').delete().eq('id', id); 
      setCosts(prev => prev.filter(c => c.id !== id)); 
      fetchAllCostsForTrend(); 
    } 
  };
  
  const handleSave = async () => {
    if (!newCost.name) return alert("항목명을 입력해주세요.");
    
    const price = Number(newCost.price) || 0;
    const qty = Number(newCost.qty) || 0;
    const calculatedTotal = price * qty;
    
    let finalBeforePrice = Number(newCost.beforePrice);
    if (!finalBeforePrice && finalBeforePrice !== 0) {
        finalBeforePrice = price;
    }
    if (newCost.type !== 'controllable') {
        finalBeforePrice = price;
    }

    const dbPayload = {
      month: selectedMonth, 
      type: newCost.type, 
      name: newCost.name, 
      price: price, 
      before_price: finalBeforePrice,
      qty: qty, 
      total: calculatedTotal, 
      memo: newCost.memo, 
      savings_plan: newCost.savingsPlan, 
      contribution: newCost.contribution, 
      duration: newCost.duration
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('fixed_cost_details').update(dbPayload).eq('id', editingId);
        if (error) throw error;
        setCosts(prev => prev.map(c => c.id === editingId ? { ...c, ...newCost, price, qty, total: calculatedTotal, beforePrice: finalBeforePrice } : c));
      } else {
        const { data, error } = await supabase.from('fixed_cost_details').insert([dbPayload]).select();
        if (error) throw error;
        if (data) {
            const added = data[0];
            setCosts(prev => [...prev, { 
                ...added, 
                price: autoScale(added.price),
                beforePrice: autoScale(added.before_price),
                total: autoScale(added.total),
                savingsPlan: added.savings_plan 
            }]);
        }
      }
      
      await fetchAllCostsForTrend();
      setShowModal(false);

    } catch (error) {
      console.error("Save failed:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  const getLabelColor = (typeId) => {
    if (typeId === 'controllable') return 'bg-blue-100 text-blue-700';
    if (typeId === 'semi') return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-600';
  };

  const modalSavings = ((Number(newCost.beforePrice || newCost.price) - Number(newCost.price)) * Number(newCost.qty || 0));

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
           <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
             <Calendar className="text-indigo-600"/> 월별 고정비 관리
           </h2>
           <p className="text-sm text-slate-500 mt-1">월별 상세 실적 집계 및 예산 통제 (단위: B KRW)</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm self-end sm:self-auto">
           <Filter size={14} className="text-slate-400"/>
           <span className="text-xs text-slate-500 font-bold">조회 월:</span>
           <select className="text-sm font-bold text-indigo-600 bg-transparent outline-none cursor-pointer" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
           </select>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title={`경영 목표 (${selectedMonth})`} value={`₩ ${globalFinancials.totalFixed.toFixed(2)}B`} sub="Ch.0 아카이브 연동" />
        <KPICard title="상세 실적 합계" value={`₩ ${detailSummary.total.toFixed(2)}B`} sub="현재 리스트 합계" alert={Math.abs(globalFinancials.totalFixed - detailSummary.total) > 0.05} />
        <KPICard title="차이 (Gap)" value={`₩ ${(globalFinancials.totalFixed - detailSummary.total).toFixed(2)}B`} sub={globalFinancials.totalFixed >= detailSummary.total ? "예산 내 운영 중" : "초과 발생"} alert={globalFinancials.totalFixed < detailSummary.total} />
        
        {/* Savings Card */}
        <div className="bg-white rounded-lg p-5 lg:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all group h-full flex flex-col justify-between">
           <div className="flex justify-between items-start mb-2">
              <div className="space-y-1">
                 <p className="text-sm font-semibold text-slate-500 tracking-tight leading-tight">이달의 통제 효과</p>
                 <h3 className={`text-2xl lg:text-3xl font-bold tracking-tighter leading-none ${detailSummary.monthlySavings >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {detailSummary.monthlySavings >= 0 ? '+' : ''} ₩ {detailSummary.monthlySavings.toFixed(2)}B
                 </h3>
              </div>
              <div className={`p-2 rounded-md ${detailSummary.monthlySavings >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                 <DollarSign size={20} strokeWidth={2} />
              </div>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">(Before - After) × Qty 합계</span>
           </div>
        </div>
      </div>

      {/* 3. View Switcher */}
      <div className="flex gap-2 border-b border-slate-200 mb-4 overflow-x-auto">
        <button onClick={() => setViewMode('current')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${viewMode === 'current' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>월 상세 내역 (Detail)</button>
        <button onClick={() => setViewMode('monthly')} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${viewMode === 'monthly' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>전사 누적 추이 (Trend)</button>
      </div>

      {viewMode === 'current' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Section */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wide">비용 구조 ({selectedMonth})</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={detailSummary.byType} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                    {detailSummary.byType.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value) => `₩${value.toFixed(2)}B`} />
                  <Legend verticalAlign="bottom" wrapperStyle={{fontSize:'12px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* List Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                세부 항목 (P x Q){loading && <Loader2 className="animate-spin text-indigo-500" size={14}/>}
              </h3>
              <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition shadow-sm">
                <Plus size={16} /> 항목 추가
              </button>
            </div>
            
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <div className="min-w-[700px] px-4 md:px-0">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">구분</th>
                      <th className="py-2 px-3">항목명</th>
                      <th className="py-2 px-3 text-right">단가(B) Before/After</th>
                      <th className="py-2 px-3 text-right">수량</th>
                      <th className="py-2 px-3 text-right">합계(B)</th>
                      <th className="py-2 px-3 text-slate-400">비고/절감안</th>
                      <th className="py-2 px-3 text-center">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {costs.length === 0 ? <tr><td colSpan="7" className="text-center py-8 text-slate-400">{loading ? '로딩 중...' : '데이터 없음'}</td></tr> : costs.map((cost) => (
                      <tr key={cost.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getLabelColor(cost.type)}`}>{COST_TYPES[Object.keys(COST_TYPES).find(k => COST_TYPES[k].id === cost.type)]?.label || cost.type}</span></td>
                        <td className="py-3 px-3 font-medium text-slate-800">{cost.name} {cost.name.includes('Archive') && <span className="text-[10px] text-indigo-400 font-normal">Auto</span>}</td>
                        <td className="py-3 px-3 text-right">
                          {cost.type === 'controllable' && cost.beforePrice > cost.price ? (
                              <div className="flex flex-col items-end">
                                  <span className="text-xs text-slate-400 line-through">{cost.beforePrice.toFixed(2)}</span>
                                  <span className="text-emerald-600 font-bold">{cost.price.toFixed(2)}</span>
                              </div>
                          ) : (
                              <span className="text-slate-600">{cost.price.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-600">{cost.qty}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">{cost.total.toFixed(2)}</td>
                        <td className="py-3 px-3 text-xs text-slate-500 truncate max-w-[120px]" title={cost.savingsPlan && cost.savingsPlan !== '-' ? `절감안: ${cost.savingsPlan}` : cost.memo}>
                          {cost.type === 'controllable' && cost.savingsPlan && cost.savingsPlan !== '-' ? <span className="text-blue-600 font-bold">{cost.savingsPlan}</span> : cost.memo}
                        </td>
                        <td className="py-3 px-3 flex justify-center gap-2"><button onClick={() => openEditModal(cost)} className="text-slate-400 hover:text-blue-600"><Edit size={16} /></button><button onClick={() => handleDelete(cost.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Trend Chart
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
            <TrendingUp className="text-emerald-600"/> 전사 누적 절감 효과 추이 (Cumulative Savings Impact)
          </h3>
          <div className="h-64 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <defs>
                    <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                </defs>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: '11px', fill: '#64748b' }} />
                <YAxis yAxisId="left" label={{ value: '월간 절감 (B)', angle: -90, position: 'insideLeft', fontSize:10, fill:'#94a3b8' }} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="right" orientation="right" label={{ value: '누적 효과 (B)', angle: 90, position: 'insideRight', fontSize:10, fill:'#10B981' }} axisLine={false} tickLine={false}/>
                <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    formatter={(val, name) => [`+ ₩ ${Number(val).toFixed(2)}B`, name === 'accSavings' ? '누적 절감액' : '월간 절감액']}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="monthlySavings" name="월간 절감 (Monthly)" fill="#cbd5e1" barSize={30} radius={[4,4,0,0]} />
                <Area yAxisId="right" type="monotone" dataKey="accSavings" name="누적 효과 (Cumulative)" stroke="#10B981" fill="url(#colorSavings)" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg p-6 animate-fade-in-up border border-slate-200 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">{editingId ? '항목 수정' : '신규 고정비 등록'}</h2>
              <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">비용 구분</label>
                  <select className="w-full border border-slate-300 rounded p-2 text-sm" value={newCost.type} onChange={(e) => setNewCost({...newCost, type: e.target.value})}>
                    {Object.values(COST_TYPES).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">항목명</label>
                  <input type="text" className="w-full border border-slate-300 rounded p-2 text-sm" value={newCost.name} onChange={(e) => setNewCost({...newCost, name: e.target.value})} />
                </div>
              </div>

              {/* Price Calculation Box */}
              <div className="bg-slate-50 p-4 rounded border border-slate-200 relative">
                {newCost.type === 'controllable' && (
                    <div className="absolute top-2 right-2 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        절감: + ₩ {modalSavings.toFixed(2)} B
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4 mb-3">
                    {newCost.type === 'controllable' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">통제 전 단가 (Before)</label>
                            <input type="number" step="0.01" className="w-full border border-slate-300 rounded p-2 text-sm text-right text-slate-500 bg-white" value={newCost.beforePrice} onChange={(e) => setNewCost({...newCost, beforePrice: Number(e.target.value)})} />
                        </div>
                    )}
                    <div className={newCost.type !== 'controllable' ? 'col-span-2' : ''}>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{newCost.type === 'controllable' ? '통제 후 단가 (After)' : '단가 (Price) [B 단위]'}</label>
                      <input type="number" step="0.01" className="w-full border border-slate-300 rounded p-2 text-sm text-right font-bold text-slate-900" value={newCost.price} onChange={(e) => setNewCost({...newCost, price: Number(e.target.value)})} />
                    </div>
                </div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                    <div className="flex items-center gap-2">
                        <label className="block text-xs font-bold text-slate-700">물량 (Qty)</label>
                        <input type="number" className="w-16 border border-slate-300 rounded p-1 text-sm text-right font-bold" value={newCost.qty} onChange={(e) => setNewCost({...newCost, qty: Number(e.target.value)})} />
                    </div>
                    <div className="text-right text-sm font-bold text-slate-800">
                        합계 (Total): ₩ {(newCost.price * newCost.qty).toFixed(2)} B
                    </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">비고 (Memo)</label>
                <textarea className="w-full border border-slate-300 rounded p-2 text-sm resize-none h-16" placeholder="특이사항 입력" value={newCost.memo} onChange={(e) => setNewCost({...newCost, memo: e.target.value})} />
              </div>

              {newCost.type === 'controllable' && (
                <div className="bg-red-50 p-4 rounded border border-red-100 mt-2">
                  <p className="text-xs font-bold text-red-500 mb-3 flex items-center gap-1"><AlertTriangle size={14}/> 필수 승인 요건 (Gatekeeping)</p>
                  <div className="space-y-3">
                    <div><label className="block text-xs text-slate-500 mb-1">① 대체 절감안</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm bg-white" placeholder="예: 3개월 후 내재화" value={newCost.savingsPlan} onChange={(e) => setNewCost({...newCost, savingsPlan: e.target.value})} /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs text-slate-500 mb-1">② 매출 기여도</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm bg-white" placeholder="예: 신제품 QA" value={newCost.contribution} onChange={(e) => setNewCost({...newCost, contribution: e.target.value})} /></div>
                        <div><label className="block text-xs text-slate-500 mb-1">③ 기간 (개월)</label><input type="text" className="w-full border border-slate-300 rounded p-2 text-sm bg-white" placeholder="예: 6개월" value={newCost.duration} onChange={(e) => setNewCost({...newCost, duration: e.target.value})} /></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-300 font-bold">취소</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold">저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chapter2_FixedCost;