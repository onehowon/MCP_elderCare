
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { detectRisk } from "./lib/risk.js";

const log = (...args: any[]) =>
  process.stderr.write(`[mcp] ${args.join(" ")}\n`);

const RiskArgs = z.object({ utterance: z.string().min(1) });
const RewriteArgs = z.object({
  user_utterance: z.string().min(1),
  draft: z.string().min(1),
  tone: z.enum(["warm", "calm", "supportive"]).default("warm"),
});
const NotifyArgs = z.object({
  consent: z.boolean(),
  summary: z.string().min(1),
  channel: z.enum(["email", "sms"]).default("sms"),
});
const FollowupArgs = z.object({
  datetime: z.string().min(1),
  note: z.string().min(1),
});

const server = new Server(
  { name: "eldercare-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "risk-detector",
      description: "발화 위험도(low/mid/high)를 키워드 및 부정문 보정으로 추정",
      inputSchema: {
        type: "object",
        properties: { utterance: { type: "string" } },
        required: ["utterance"],
      },
    },
    {
      name: "empathy-rewriter",
      description: "초안 답변을 공감형 톤(warm/calm/supportive)으로 리라이트",
      inputSchema: {
        type: "object",
        properties: {
          user_utterance: { type: "string" },
          draft: { type: "string" },
          tone: { type: "string", enum: ["warm", "calm", "supportive"] },
        },
        required: ["user_utterance", "draft"],
      },
    },
    {
      name: "notify-caregiver",
      description: "보호자/케어팀 알림(모의). consent=true 일 때만 성공",
      inputSchema: {
        type: "object",
        properties: {
          consent: { type: "boolean" },
          summary: { type: "string" },
          channel: { type: "string", enum: ["email", "sms"] },
        },
        required: ["consent", "summary"],
      },
    },
    {
      name: "schedule-followup",
      description: "팔로업 예약(모의). datetime(ISO8601), note 입력",
      inputSchema: {
        type: "object",
        properties: {
          datetime: { type: "string" },
          note: { type: "string" },
        },
        required: ["datetime", "note"],
      },
    },
  ],
}));

const ok = (data: any) => ({
  content: [{ type: "text", text: JSON.stringify({ schema_version:"1.0", data }) }],
});

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args } = req.params;
  log("tool:", name, "args:", JSON.stringify(args));

  if (name === "risk-detector") {
    const { utterance } = RiskArgs.parse(args);
    const res = detectRisk(utterance);
    return ok(res);
  }

  if (name === "empathy-rewriter") {
    const { user_utterance, draft, tone } = RewriteArgs.parse(args);
    const prefix =
      tone === "calm"
        ? "마음이 많이 무거우셨겠어요. "
        : tone === "supportive"
        ? "지금까지 정말 잘 버텨오셨어요. "
        : "말씀해 주셔서 고맙습니다. ";
    const reply =
      `${prefix}${draft} ` +
      `혹시 지금 바로 도움이 필요하시면 제가 함께 방법을 찾아보겠습니다.`;
    return ok({ reply, tone, user_utterance });
  }

  if (name === "notify-caregiver") {
    const { consent, summary, channel } = NotifyArgs.parse(args);
    if (!consent) {
      return ok({ delivered:false, id:"", error:"CONSENT_REQUIRED" });
    }
    const id = `mock-${Date.now()}`;
    log(`notify via ${channel}: ${summary} -> id=${id}`);
    return ok({ delivered:true, id, channel });
  }

  if (name === "schedule-followup") {
    const { datetime, note } = FollowupArgs.parse(args);
    const event_id = `mock-cal-${Date.now()}`;
    log(`schedule ${datetime} : ${note} -> ${event_id}`);
    return ok({ event_id, datetime, note });
  }

  return ok({ error:"UNKNOWN_TOOL" });
});

const transport = new StdioServerTransport();
await server.connect(transport);
log("MCP server started");
