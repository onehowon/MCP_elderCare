export type Risk = "low" | "mid" | "high";

const kwHigh = ["죽고 싶", "극단적 선택", "자살", "스스로 해치", "목숨을 끊"];
const kwMid  = ["너무 힘들", "살맛이", "의욕이 없", "잠이 안 오", "불안하", "배신감", "상처받았"];

export function detectRisk(utterance: string): { risk: Risk; signals: string[]; explanation: string } {
  const matchedHigh = kwHigh.filter(k => utterance.includes(k));
  const matchedMid  = kwMid.filter(k => utterance.includes(k));
  let risk: Risk = "low";
  if (matchedHigh.length) risk = "high";
  else if (matchedMid.length) risk = "mid";
  const signals = [...matchedHigh, ...matchedMid];
  const explanation =
    risk === "high" ? "고위험 키워드 매칭" :
    risk === "mid"  ? "중위험 키워드 매칭" : "뚜렷한 위험 신호 없음";
  return { risk, signals, explanation };
}
