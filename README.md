# MCP_elderCare
## AI 기반 고령층 상담 및 위험도 평가 시스템(MCP Prototype)

---

##  개요
이 프로젝트는 **MCP (Model Context Protocol)** 구조를 기반으로,  
고령층 사용자의 대화 데이터를 분석해 **정서·위험도 평가 및 공감형 응답 생성**을 수행하는 AI 상담 시스템 프로토타입입니다.  

MCP는 감정 인식 → 위험 탐지 → 맥락 관리 → 응답 생성 → 검증의 5단계로 구성되며,  
`TypeScript + MCP Inspector` 환경에서 구동됩니다.

---

## 환경 설정
### Node.js 설치
> Node.js **v18 이상** 필수  
[https://nodejs.org](https://nodejs.org) 에서 LTS 버전 설치 후 확인:
```bash
node -v
npm -v
```

## 저장소 클론 및 이동
```
git clone https://github.com/yourusername/mcp-eldercare.git
cd mcp-eldercare
```

## 패키지 설치
```
npm install
npm i -D tsx typescript @types/node
npm i csv-parse
```

## 데이터 준비
- data/table_template.csv

## 데이터 변환
```
npx tsx src/tools/convert_dataset.ts data/table_template.tsv data/risk_eval_ko.jsonl data/empathy_pairs.jsonl
```

## 위험도 평가 실행
```
npx tsx src/eval/eval_risk.ts data/risk_eval_ko.jsonl
```

## MCP 서버 실행
```
npx tsx src/server.ts
```

## MCP Web UI(Insepctor) 실행
```
npx @modelcontextprotocol/inspector "npx tsx src/server.ts"
```
