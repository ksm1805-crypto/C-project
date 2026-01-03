import React, { useState } from 'react';
import { supabase } from './supabaseClient';
import { Lock, User, Loader2, ArrowRight } from 'lucide-react';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Supabase는 이메일 형식이 필수이므로 내부적으로 사용할 가상 도메인 설정
  const FAKE_DOMAIN = 'itchem.com';

  const handleAuth = async (e) => {
    e.preventDefault();
    
    // 간단한 ID 유효성 검사 (공백 방지)
    if (loginId.includes(' ')) {
      alert("ID에는 공백을 포함할 수 없습니다.");
      return;
    }

    setLoading(true);

    try {
      // [핵심] 사용자가 입력한 ID 뒤에 가짜 도메인을 붙여 이메일 형식으로 변환
      // 예: admin -> admin@itchem.com
      const emailToUse = `${loginId}@${FAKE_DOMAIN}`;

      if (isSignUp) {
        // --- 회원가입 로직 ---
        const { data, error } = await supabase.auth.signUp({ 
          email: emailToUse, 
          password,
          options: {
            // 메타데이터에 실제 ID를 저장해두면 나중에 관리하기 편합니다.
            data: { username: loginId } 
          }
        });

        if (error) throw error;
        
        // Supabase 설정에서 '이메일 컨펌'을 껐다면 바로 로그인되지만, 
        // 켜져있다면 메일 확인이 필요할 수 있습니다.
        alert(`가입 성공! ID [${loginId}]로 로그인 되었습니다.`);
      } else {
        // --- 로그인 로직 ---
        const { error } = await supabase.auth.signInWithPassword({ 
          email: emailToUse, 
          password 
        });

        if (error) throw error;
        // 로그인 성공 시 별도 알림 없이 상위 컴포넌트(App.js)의 세션 감지 로직이 작동하여 화면 전환됨
      }
    } catch (error) {
      console.error(error);
      let msg = error.message;
      if (msg.includes("Invalid login credentials")) msg = "ID 또는 비밀번호가 일치하지 않습니다.";
      if (msg.includes("User already registered")) msg = "이미 사용 중인 ID입니다.";
      alert("로그인 실패: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        
        {/* 헤더 섹션 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            SUNCHEM <span className="text-indigo-600">Admin</span>
          </h1>
          <p className="text-slate-500 text-sm">Matcore system v1.0</p>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleAuth} className="space-y-6">
          
          {/* ID 입력 필드 */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              Access ID
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="text"
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                placeholder="ID를 입력하세요"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
              />
            </div>
          </div>

          {/* 비밀번호 입력 필드 */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="password"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-slate-800 placeholder-slate-400"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              isSignUp ? 'Sign Up (가입하기)' : 'Sign In (로그인)'
            )}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        {/* 하단 모드 전환 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400 mb-2">
            {isSignUp ? '이미 계정이 있으신가요?' : '계정이 없으신가요?'}
          </p>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setLoginId('');
              setPassword('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-bold underline decoration-2 underline-offset-4 transition-colors"
          >
            {isSignUp ? '로그인 화면으로 돌아가기' : '새 ID 만들기'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;