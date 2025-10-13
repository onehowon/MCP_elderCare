import fs from "fs";
import { parse } from "csv-parse/sync";

const DEFAULT_TURNS = 8;
const USER_PREFIX = "사람문장";
const BOT_PREFIX  = "시스템응답";

const inFile  = process.argv[2] ?? "data/table.tsv";
const outRisk = process.argv[3] ?? "data/risk_eval_ko.jsonl";
const outPairs= process.argv[4] ?? "data/empathy_pairs.jsonl";

function detectDelimiter(text: string): "," | "\t" {
  const first = text.split(/\r?\n/)[0] ?? "";
  const tabs = (first.match(/\t/g) || []).length;
  const commas = (first.match(/,/g) || []).length;
  return tabs > commas ? "\t" : ",";
}
function stripBOM(s: string) {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}
type Risk = "low"|"mid"|"high";
function autoRisk(utt: string): Risk {
  const high = ["죽고 싶", "극단적 선택", "자살", "스스로 해치", "목숨을 끊"];
  const mid  = ["너무 힘들", "살맛이", "의욕이 없", "잠이 안 오", "불안하", "배신감", "상처받았"];
  if (high.some(k => utt.includes(k))) return "high";
  if (mid.some(k => utt.includes(k)))  return "mid";
  return "low";
}

const emotionToRisk: Record<string, Risk> = {

  sadness: "mid", anger: "mid", fear: "mid", disgust: "mid", anxiety: "mid",
  depression: "mid", grief: "mid",

  suicidal: "high", "self-harm": "high", crisis: "high",

  joy: "low", happiness: "low", neutral: "low", surprise: "low", love: "low",
};

const textRaw = stripBOM(fs.readFileSync(inFile, "utf8"));
const delimiter = detectDelimiter(textRaw);
const rows = parse(textRaw, { columns: true, delimiter, skip_empty_lines: true }) as Record<string,string>[];

const riskOut  = fs.createWriteStream(outRisk);
const pairsOut = fs.createWriteStream(outPairs);


const cols = Object.keys(rows[0] || {});
const hasDialog = cols.some(c => c.startsWith(USER_PREFIX));
const hasSingle = (cols.includes("text") || cols.includes("utterance")) && (cols.includes("label") || cols.includes("emotion"));

if (!hasDialog && !hasSingle) {
  console.error(" 지원 포맷을 찾지 못했습니다. (대화형: 사람문장1.. / 단문형: text,label)");
  process.exit(1);
}

if (hasDialog) {
  for (const r of rows) {
    const id = (r["ID"] ?? r["id"] ?? "").toString().trim();
    const gender = (r["성별"] ?? r["gender"] ?? "").toString().trim();
    for (let n = 1; n <= DEFAULT_TURNS; n++) {
      const uKey = `${USER_PREFIX}${n}`;
      const bKey = `${BOT_PREFIX}${n}`;
      const user = (r[uKey] ?? "").toString().trim();
      const bot  = (r[bKey] ?? "").toString().trim();
      if (!user) continue;
      const label: Risk = autoRisk(user);
      riskOut.write(JSON.stringify({ id, gender, turn:n, utterance:user, label }) + "\n");
      if (bot) pairsOut.write(JSON.stringify({ id, gender, turn:n, user, system_reply:bot }) + "\n");
    }
  }
} else if (hasSingle) {

  for (let i=0;i<rows.length;i++) {
    const r = rows[i];
    const id = (r["ID"] ?? r["id"] ?? String(i)).toString().trim();
    const text = (r["text"] ?? r["utterance"] ?? "").toString().trim();
    const rawLabel = (r["label"] ?? r["emotion"] ?? "").toString().trim().toLowerCase();
    if (!text) continue;
    const mapped: Risk = emotionToRisk[rawLabel] ?? autoRisk(text);
    riskOut.write(JSON.stringify({ id, utterance: text, label: mapped, orig_label: rawLabel }) + "\n");
    // 단문형은 공감 페어가 없으니 pairs는 생략
  }
}

riskOut.end();
pairsOut.end();
console.log(` Wrote ${outRisk} / ${outPairs}  (rows=${rows.length}, delimiter=${JSON.stringify(delimiter)}, dialog=${hasDialog})`);
