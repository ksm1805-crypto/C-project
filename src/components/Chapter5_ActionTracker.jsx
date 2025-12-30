import React, { useState, useMemo } from 'react';
import { 
  Plus, Trash2, CheckCircle, Calendar,
  AlertTriangle, Activity, Users, DollarSign, TrendingDown
} from 'lucide-react';

const SECTIONS = [
  { id: 'fixed', title: '고정비 통제 (Fixed Cost)', color: 'bg-orange-500', icon: <DollarSign size={18} />, desc: '판관비, 감가상각, 기타 고정비 이슈' },
  { id: 'cost', title: '원가절감 (Cost Reduction)', color: 'bg-emerald-500', icon: <TrendingDown size={18} />, desc: '원재료 이원화, 공정 개선, 수율 향상' },
  { id: 'prod', title: '생산/납기 (Prod & Delivery)', color: 'bg-blue-600', icon: <Activity size={18} />, desc: '가동률, OTD(납기준수), 품질 이슈' },
  { id: 'hr', title: '인력/조직 (HR & Org)', color: 'bg-slate-700', icon: <Users size={18} />, desc: '채용, 핵심인재 관리, R&R 조정' }
];

const Chapter5_ActionTracker = ({ pnlData, prodStats, crActions, depts }) => {
  // [State] 월 선택
  const [selectedMonth, setSelectedMonth] = useState('2024-12');
  
  // [State] 시스템 이슈 관리 (완료된 ID 목록, 숨김 처리된 ID 목록)
  const [resolvedSysIds, setResolvedSysIds] = useState([]); // 체크박스 완료 처리된 시스템 이슈
  const [hiddenSysIds, setHiddenSysIds] = useState([]);     // 휴지통으로 숨긴 시스템 이슈

  // [State] 수기 데이터 (카테고리 필드 포함)
  const [manualActions, setManualActions] = useState([
    { id: 101, category: 'fixed', month: '2024-12', text: '법인카드 한도 10% 축소 검토', owner: '김재무', due: '2024-12-20', isDone: false },
    { id: 102, category: 'prod', month: '2024-12', text: '3호기 긴급 정비 일정 수립', owner: '박공장', due: '2024-12-25', isDone: true },
  ]);

  // 신규 입력 State
  const [newItem, setNewItem] = useState({ 
    category: 'fixed', text: '', owner: '', due: '' 
  });

  // --- [Logic] 시스템 자동 감지 + 수기 데이터 통합 및 정렬 ---
  const categorizedItems = useMemo(() => {
    let items = [];

    // 1. [Auto] P&L 기반 고정비 이슈 감지
    if (pnlData) {
      const totalRev = pnlData.reduce((acc, cur) => acc + cur.rev, 0);
      const totalFixed = pnlData.reduce((acc, cur) => acc + cur.fixed, 0);
      const ratio = totalRev > 0 ? (totalFixed / totalRev) * 100 : 0;
      
      if (ratio > 25) { 
        const sysId = 'sys-fixed-1';
        items.push({
          id: sysId, category: 'fixed', isSystem: true,
          text: `고정비 비중 ${ratio.toFixed(1)}%로 목표(25%) 초과`,
          owner: 'System', due: selectedMonth, 
          isDone: resolvedSysIds.includes(sysId), // 완료 여부 확인
          risk: 'High'
        });
      }
    }

    // 2. [Auto] 원가절감 리스크 감지
    if (crActions) {
      crActions.forEach(a => {
        if (a.status === '리스크' || a.status === '지연') {
          const sysId = `sys-cr-${a.id}`;
          items.push({
            id: sysId, category: 'cost', isSystem: true,
            text: `${a.item}: ${a.action} (${a.status})`,
            owner: 'System', due: selectedMonth, 
            isDone: resolvedSysIds.includes(sysId), // 완료 여부 확인
            risk: 'High'
          });
        }
      });
    }

    // 3. [Auto] 생산/납기 이슈 감지
    if (prodStats && prodStats.length > 0) {
      const latest = prodStats[prodStats.length - 1]; 
      if (latest.late > 0) {
        const sysId = `sys-prod-${latest.month}`;
        items.push({
          id: sysId, category: 'prod', isSystem: true,
          text: `${latest.month} 납기 지연 ${latest.late}건 발생`,
          owner: '생산팀', due: latest.month, 
          isDone: resolvedSysIds.includes(sysId), // 완료 여부 확인
          risk: 'Medium'
        });
      }
    }

    // 4. [Auto] 인력 이슈 감지
    if (depts) {
      depts.forEach(dept => {
        dept.members.forEach(m => {
          if (m.status === '지연' || m.status === '리스크') {
            const sysId = `sys-hr-${m.id}`;
            items.push({
              id: sysId, category: 'hr', isSystem: true,
              text: `[${dept.name}] ${m.name}: ${m.task} 지연`,
              owner: 'HR', due: selectedMonth, 
              isDone: resolvedSysIds.includes(sysId), // 완료 여부 확인
              risk: 'Medium'
            });
          }
        });
      });
    }

    // 5. [Manual] 수기 입력 데이터 병합
    const currentMonthManuals = manualActions.filter(m => m.month === selectedMonth);
    items = [...items, ...currentMonthManuals];

    // [Filter] 사용자가 숨김(Trash) 처리한 시스템 이슈 제외
    items = items.filter(item => !hiddenSysIds.includes(item.id));

    // 6. 4개 섹션으로 분류
    const grouped = { fixed: [], cost: [], prod: [], hr: [] };
    items.forEach(item => {
      if (grouped[item.category]) {
        grouped[item.category].push(item);
      }
    });

    return grouped;
  }, [pnlData, prodStats, crActions, depts, manualActions, selectedMonth, hiddenSysIds, resolvedSysIds]);

  // --- Handlers ---
  const handleAddItem = () => {
    if (!newItem.text) return;
    const newAction = {
      ...newItem,
      id: Date.now(),
      month: selectedMonth,
      isDone: false
    };
    setManualActions(prev => [...prev, newAction]);
    setNewItem({ ...newItem, text: '', owner: '' }); 
  };

  // 삭제(숨김) 핸들러
  const handleDelete = (id, isSystem) => {
    if (window.confirm(isSystem ? '이 시스템 항목을 목록에서 숨기시겠습니까?' : '이 항목을 삭제하시겠습니까?')) {
      if (isSystem) {
        setHiddenSysIds(prev => [...prev, id]);
      } else {
        setManualActions(prev => prev.filter(item => item.id !== id));
      }
    }
  };

  // [수정됨] 완료(체크) 토글 핸들러 - 시스템/수기 모두 지원
  const toggleDone = (id, isSystem) => {
    if (isSystem) {
      // 시스템 항목: resolvedSysIds 배열에 추가/삭제
      setResolvedSysIds(prev => 
        prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
      );
    } else {
      // 수기 항목: manualActions 상태 업데이트
      setManualActions(prev => prev.map(item => 
        item.id === id ? { ...item, isDone: !item.isDone } : item
      ));
    }
  };

  // 총 진행률 계산
  const totalItems = Object.values(categorizedItems).flat();
  const doneCount = totalItems.filter(i => i.isDone).length;
  const progress = totalItems.length > 0 ? Math.round((doneCount / totalItems.length) * 100) : 0;

  return (
    <div className="space-y-6 h-full flex flex-col pb-10">
      
      {/* 1. Header & Controls */}
      <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 flex flex-col xl:flex-row justify-between items-center gap-4">
        <div>
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <Activity className="text-blue-600"/> Monthly Action Plan Matrix
           </h2>
           <p className="text-sm text-slate-500 mt-1">4대 핵심 영역별 이슈 및 액션 아이템 통합 관리</p>
        </div>
        
        {/* Input Form */}
        <div className="flex-1 w-full xl:w-auto bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-2">
            <select 
              className="px-2 py-2 rounded border border-slate-200 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            >
              <option value="fixed">고정비</option>
              <option value="cost">원가절감</option>
              <option value="prod">생산/납기</option>
              <option value="hr">인력/조직</option>
            </select>
            <input 
              className="flex-1 px-3 py-2 rounded border border-slate-200 text-sm outline-none focus:border-blue-500"
              placeholder="새로운 액션 아이템 입력..."
              value={newItem.text}
              onChange={(e) => setNewItem({ ...newItem, text: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <div className="flex gap-2">
              <input 
                className="w-24 px-2 py-2 rounded border border-slate-200 text-sm outline-none focus:border-blue-500"
                placeholder="담당자"
                value={newItem.owner}
                onChange={(e) => setNewItem({ ...newItem, owner: e.target.value })}
              />
              <input 
                type="date"
                className="w-32 px-2 py-2 rounded border border-slate-200 text-sm outline-none focus:border-blue-500 text-slate-500"
                value={newItem.due}
                onChange={(e) => setNewItem({ ...newItem, due: e.target.value })}
              />
              <button onClick={handleAddItem} className="bg-slate-800 text-white px-4 rounded hover:bg-slate-700 transition flex items-center justify-center">
                <Plus size={18}/>
              </button>
            </div>
        </div>
      </div>

      {/* 2. Month & Progress Indicator */}
      <div className="flex justify-between items-end px-1">
        <div className="flex items-center gap-2 text-slate-600 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
           <Calendar size={14}/>
           <span className="text-sm font-bold">{selectedMonth} 월 이슈 현황</span>
        </div>
        <div className="text-right">
           <div className="text-xs text-slate-500 mb-1">Total Completion Rate</div>
           <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="text-sm font-bold text-blue-600">{progress}%</span>
           </div>
        </div>
      </div>

      {/* 3. The 2x2 Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[600px]">
        {SECTIONS.map((section) => {
          const items = categorizedItems[section.id];
          
          return (
            <div key={section.id} className="flex flex-col rounded-lg shadow-sm overflow-hidden border border-slate-200 bg-white h-full">
              {/* Header */}
              <div className={`${section.color} px-5 py-3 flex justify-between items-center`}>
                <div className="flex items-center gap-2 text-white">
                  {section.icon}
                  <h3 className="font-bold text-base tracking-tight">{section.title}</h3>
                </div>
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {items.length} 건
                </span>
              </div>
              
              {/* Content List */}
              <div className="p-4 flex-1 overflow-y-auto bg-slate-50/30">
                 {items.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 gap-2">
                     <CheckCircle size={32}/>
                     <span className="text-sm">No Active Issues</span>
                   </div>
                 ) : (
                   <ul className="space-y-3">
                     {items.map((item) => (
                       <li key={item.id} className={`group relative bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all
                         ${item.isDone ? 'border-slate-100 opacity-60' : 'border-slate-200'}
                         ${item.risk === 'High' && !item.isDone ? 'border-l-4 border-l-red-500' : ''}
                       `}>
                         
                         {/* Row 1: Title & Check */}
                         <div className="flex justify-between items-start mb-1">
                           <div className="flex items-start gap-2 pr-6">
                              
                              {/* [수정됨] 체크박스: 시스템/수기 구분 없이 모두 렌더링 */}
                              <button 
                                onClick={() => toggleDone(item.id, item.isSystem)} 
                                className={`mt-0.5 min-w-[16px] h-4 rounded border flex items-center justify-center transition
                                  ${item.isDone ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 hover:border-blue-500'}`}
                              >
                                {item.isDone && <CheckCircle size={12}/>}
                              </button>
                              
                              <span className={`text-sm font-medium leading-snug ${item.isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                {item.text}
                              </span>
                           </div>
                           
                           {/* Trash Button */}
                           <button 
                             onClick={() => handleDelete(item.id, item.isSystem)} 
                             className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition absolute top-3 right-3"
                             title={item.isSystem ? "목록에서 숨기기" : "삭제"}
                           >
                             <Trash2 size={14}/>
                           </button>
                         </div>

                         {/* Row 2: Metadata */}
                         <div className="flex items-center gap-3 pl-6 mt-2 text-xs text-slate-400">
                            <span className="flex items-center gap-1 font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                               {item.owner}
                            </span>
                            <span>Due: {item.due || 'TBD'}</span>
                            {/* 시스템 항목 표시 */}
                            {item.isSystem && (
                                <span className="flex items-center gap-1 text-amber-600 font-bold ml-auto text-[10px] bg-amber-50 px-1 rounded">
                                    <AlertTriangle size={10}/> AUTO
                                </span>
                            )}
                         </div>
                       </li>
                     ))}
                   </ul>
                 )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default Chapter5_ActionTracker;