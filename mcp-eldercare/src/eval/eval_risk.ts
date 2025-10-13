import fs from "fs";
import readline from "readline";

type Label = "low"|"mid"|"high";
type Row = { utterance:string; label:Label };

function detect(utt:string): Label {
  const high = ["죽고 싶","극단적 선택","자살","스스로 해치","목숨을 끊"];
  const mid  = ["너무 힘들","살맛이","의욕이 없","잠이 안 오","불안하","배신감","상처받았"];
  if (high.some(k=>utt.includes(k))) return "high";
  if (mid.some(k=>utt.includes(k))) return "mid";
  return "low";
}

const file = process.argv[2] ?? "data/risk_eval_ko.jsonl";
const labels: Label[] = ["low","mid","high"];
const cm: Record<Label, Record<Label, number>> = { low:{low:0,mid:0,high:0}, mid:{low:0,mid:0,high:0}, high:{low:0,mid:0,high:0} };

(async () => {
  const rl = readline.createInterface({ input: fs.createReadStream(file) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const row: Row = JSON.parse(line);
    const p = detect(row.utterance);
    cm[row.label][p]++;
  }
  const metrics = labels.map(g=>{
    const tp = cm[g][g];
    const fp = labels.reduce((s,l)=>s+(l===g?0:cm[l][g]),0);
    const fn = labels.reduce((s,l)=>s+(l===g?0:cm[g][l]),0);
    const prec = tp? tp/(tp+fp):0, rec = tp? tp/(tp+fn):0, f1 = (prec+rec)? 2*prec*rec/(prec+rec):0;
    return {label:g, precision:+prec.toFixed(3), recall:+rec.toFixed(3), f1:+f1.toFixed(3)};
  });
  console.log("Confusion:", cm);
  console.table(metrics);
})();
