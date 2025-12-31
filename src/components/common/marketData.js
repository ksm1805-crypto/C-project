// src/services/marketData.js
const CACHE_KEY = "market_data_cache_v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30분

export async function getMarketData({ exRateKey, interestKey, oilKey }) {
  // 1) cache
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;
  } catch {}

  // 2) fetch in parallel (각 API URL은 네가 가진 API 스펙에 맞춰 넣기)
  const fallback = {
    exchangeRate: 185.5,   // KRW/CNY
    interestRate: 3.5,     // %
    oilPrice: 75,          // USD/bbl
    fetchedAt: null,
  };

  try {
    const [fx, ir, oil] = await Promise.all([
      fetchFx(exRateKey),
      fetchInterest(interestKey),
      fetchOil(oilKey),
    ]);

    const data = {
      exchangeRate: fx ?? fallback.exchangeRate,
      interestRate: ir ?? fallback.interestRate,
      oilPrice: oil ?? fallback.oilPrice,
      fetchedAt: new Date().toISOString(),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
    return data;
  } catch {
    return fallback;
  }
}

async function fetchFx(exRateKey) {
  if (!exRateKey) return null;
  // 예시: exchangerate-api (너가 이미 쓰는 스타일)
  const res = await fetch(`https://v6.exchangerate-api.com/v6/${exRateKey}/pair/CNY/KRW`);
  const json = await res.json();
  if (json?.result === "success") return json.conversion_rate;
  return null;
}

async function fetchInterest(interestKey) {
  if (!interestKey) return null;
  // TODO: 네 금리 API 스펙에 맞춰 구현
  // return parsedPercentNumber;
  return null;
}

async function fetchOil(oilKey) {
  if (!oilKey) return null;
  // TODO: 네 유가 API 스펙에 맞춰 구현
  // return parsedUsdPerBbl;
  return null;
}
