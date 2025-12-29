import React, { useState } from 'react';
import { ClipboardList, Plus, Trash2, AlertTriangle } from 'lucide-react';

// 초기 샘플 데이터 (4개 영역)
const INITIAL_ACTIONS = [
  { id: 1, section: 'fixed', text: 'NMR 분석 내재화 (월 40건)', owner: '김연구', due: '2024-03', status: '진행' },
  { id: 2, section: 'cost', text: '핵심 원료 A - 2nd Vendor 승인', owner: '이구매', due: '2024-04', status: '지연' },
  { id: 3, section: 'prod', text: 'OLED 정제 공정 수율 +2% 개선', owner: '박생산', due: '2024-02', status: '완료' },
  { id: 4, section: 'hr', text: 'QA 필수 인력 1명 채용 (Gate 통과)', owner: '최인사', due: '2024-03', status: '진행' },
];

const SECTIONS = {
  fixed: { title: '고정비 통제', color: 'border-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-800' },
  cost: { title: '원가절감', color: 'border-green-400', bg: 'bg-green-50', text: 'text-green-800' },
  prod: { title: '생산/납기', color: 'border-blue-400', bg: 'bg-blue-50', text: 'text-blue-800' },
  hr: { title: '인력/조직', color: 'border-slate-400', bg: 'bg-slate-50', text: 'text-slate-800' },
};

const Chapter5_ActionTracker = () => {
  const [actions, setActions] = useState(INITIAL_ACTIONS);
  const [newItem, setNewItem] = useState({ section: 'fixed', text: '', owner: '', due: '' });

  const handleAdd = () => {
    if (!newItem.text) return;
    setActions([...actions, { ...newItem, id: Date.now(), status: '진행' }]);
    setNewItem({ ...newItem, text: '', owner: '', due: '' }); // section 유지
  };

  const handleDelete = (id) => {
    setActions(actions.filter(a => a.id !== id));
  };

  // 쿼드런트(4분면) 렌더링 헬퍼
  const renderQuadrant = (key) => {
    const config = SECTIONS[key];
    const sectionItems = actions.filter(a => a.section === key);

    return (
      <div className={`border-t-4 shadow-sm rounded-lg bg-white h-full flex flex-col ${config.color}`}>
        {/* Header */}
        <div className={`px-4 py-3 font-bold flex justify-between items-center ${config.bg} ${config.text}`}>
          <span>{config.title}</span>
          <span className="text-xs bg-white/50 px-2 py-0.5 rounded-full">{sectionItems.length}건</span>
        </div>
        
        {/* List */}
        <div className="p-4 flex-1 overflow-y-auto min-h-[180px]">
          <ul className="space-y-3">
            {sectionItems.map(item => (
              <li key={item.id} className="group flex justify-between items-start text-sm border-b pb-2 last:border-0 hover:bg-gray-50 p-1 rounded transition">
                <div>
                  <div className="font-medium text-gray-800 flex items-center gap-2">
                     {item.text}
                     {item.status === '지연' && <AlertTriangle size={12} className="text-red-500"/>}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.owner} | {item.due} | <span className={`font-semibold ${item.status==='완료'?'text-blue-600':item.status==='지연'?'text-red-600':'text-gray-600'}`}>{item.status}</span>
                  </div>
                </div>
                <button onClick={() => handleDelete(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {sectionItems.length === 0 && <li className="text-gray-400 text-xs text-center py-4">- 등록된 액션이 없습니다 -</li>}
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
      {/* 1. 입력 Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-2 items-center">
        <h3 className="font-bold text-gray-700 mr-2 flex items-center gap-2">
          <ClipboardList className="text-gray-600"/> Quick Add
        </h3>
        <select 
          className="border rounded px-2 py-1.5 text-sm bg-gray-50"
          value={newItem.section}
          onChange={(e) => setNewItem({...newItem, section: e.target.value})}
        >
          {Object.entries(SECTIONS).map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}
        </select>
        <input 
          className="border rounded px-2 py-1.5 text-sm flex-1 min-w-[200px]" 
          placeholder="액션 내용 입력..." 
          value={newItem.text}
          onChange={(e) => setNewItem({...newItem, text: e.target.value})}
        />
        <input 
          className="border rounded px-2 py-1.5 text-sm w-24" 
          placeholder="담당자" 
          value={newItem.owner}
          onChange={(e) => setNewItem({...newItem, owner: e.target.value})}
        />
        <input 
          className="border rounded px-2 py-1.5 text-sm w-28" 
          placeholder="기한(YY-MM)" 
          value={newItem.due}
          onChange={(e) => setNewItem({...newItem, due: e.target.value})}
        />
        <button 
          onClick={handleAdd}
          className="bg-gray-800 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-900 flex items-center gap-1"
        >
          <Plus size={16}/> 등록
        </button>
      </div>

      {/* 2. 2x2 Grid Layout (Quadrants) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
        {renderQuadrant('fixed')}
        {renderQuadrant('cost')}
        {renderQuadrant('prod')}
        {renderQuadrant('hr')}
      </div>
      
      <div className="text-right text-xs text-gray-400">
        * 월간 회의 시 본 화면을 띄워놓고 각 영역별 이슈를 점검하십시오.
      </div>
    </div>
  );
};

export default Chapter5_ActionTracker;