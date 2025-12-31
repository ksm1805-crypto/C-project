// src/services/marketData.js

const CACHE_KEY = "market_data_cache_v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분 캐시 유지

export async function getMarketData({ exRateKey, interestKey, oilKey } = {}) {
  // 1. 캐시 확인
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.data;
    }
  } catch {}

  // 2. 기본값 (Fallback)
  const fallback = {
    cnyRate: 185.5,    // 앱 통일 속성명
    interestRate: 3.5, 
    oilPrice: 75.0,     
    industryIndex: 100,
    fetchedAt: null,
    source: "fallback"
  };

  try {
    // 3. 병렬 API 호출
    const [fx, ir, oil] = await Promise.all([
      fetchFx(exRateKey),
      fetchInterest(interestKey),
      fetchOil(oilKey),
    ]);

    const data = {
      // exchangeRate를 cnyRate로 매핑하여 반환
      cnyRate: fx ?? fallback.cnyRate, 
      interestRate: ir ?? fallback.interestRate,
      oilPrice: oil ?? fallback.oilPrice,
      industryIndex: fallback.industryIndex,
      fetchedAt: new Date().toLocaleTimeString(),
      source: "live-api"
    };

    // 캐시 저장
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    return data;
  } catch (err) {
    console.error("Market Data Error:", err);
    return fallback;
  }
}

// 환율 API
async function fetchFx(key) {
  if (!key) return null;
  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/pair/CNY/KRW`);
    const json = await res.json();
    return json?.result === "success" ? json.conversion_rate : null;
  } catch { return null; }
}

// 금리 API (예시)
async function fetchInterest(key) {
  // 실제 API URL로 교체 필요
  return null; 
}

// 유가 API (예시)
async function fetchOil(key) {
  // 실제 API URL로 교체 필요
  return null; 
}