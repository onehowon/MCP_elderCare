
export type Risk = "low" | "mid" | "high";

const kwHigh = ["죽고 싶", "극단적 선택", "자살", "스스로 해치", "목숨을 끊"];
const kwMid  = ["너무 힘들", "살맛이", "의욕이 없", "잠이 안 오", "불안하", "배신감", "상처받았"];
const negations = ["않", "아니", "싫지", "싶지는 않", "그렇지는 않"];

function normalize(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function hasNegationAround(text: string, keyword: string, window = 6) {
  const idx = text.indexOf(keyword);
  if (idx < 0) return false;
  const left = Math.max(0, idx - window);
  const right = Math.min(text.length, idx + keyword.length + window);
  const span = text.slice(left, right);
  return negations.some(n => span.includes(n));
}

export function detectRisk(utterance: string): { risk: Risk; signals: string[]; explanation: string } {
  const u = normalize(utterance);
  const matchedHigh = kwHigh.filter(k => u.includes(k));
  const matchedMid  = kwMid.filter(k => u.includes(k));

  let risk: Risk = "low";
  if (matchedHigh.length) risk = "high";
  else if (matchedMid.length) risk = "mid";

  if (risk === "high" && matchedHigh.some(k => hasNegationAround(u, k))) risk = "mid";
  if (risk === "mid"  && matchedMid.some(k => hasNegationAround(u, k)))  risk = "low";

  const signals = [...matchedHigh, ...matchedMid];
  const explanation =
    risk === "high" ? "고위험 키워드 매칭" :
    risk === "mid"  ? "중위험 키워드 매칭/부정 보정" : "뚜렷한 위험 신호 없음";
  return { risk, signals, explanation };
}
