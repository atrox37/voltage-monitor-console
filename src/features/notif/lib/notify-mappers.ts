import type {
  NotifyConfigPageDto,
  NotifyConfigPo,
  NotifyTemplatePageDto,
  NotifyTemplatePo,
  NotifyTemplateSendTestRequest,
} from "@/types";
import { toDbId } from "@/lib/query-terms";

export type NotifyChannelCode = "email" | "aws-email" | string;

/** 通知配置渠道（暂仅 AWS 邮件；support 接口已停用） */
export const NOTIFY_CONFIG_CHANNELS: { code: NotifyChannelCode; name: string }[] = [
  { code: "aws-email", name: "AWS邮件" },
];

export type ConfigListRow = {
  id: string;
  name: string;
  code: NotifyChannelCode;
  creator: string;
  org: string;
  createTime: string;
  updateTime: string;
  raw: NotifyConfigPageDto;
};

export type EmailConfigForm = {
  id: string;
  name: string;
  code: NotifyChannelCode;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpSecret: string;
  sendEmail: string;
};

export type TemplateListRow = {
  id: string;
  name: string;
  configId: string;
  configName: string;
  configCode: NotifyChannelCode;
  creator: string;
  org: string;
  createTime: string;
  updateTime: string;
  raw: NotifyTemplatePageDto;
};

export type TemplateForm = {
  id: string;
  name: string;
  configId: string;
  configCode: NotifyChannelCode;
  contentTitle: string;
  contentBody: string;
  variables: Record<string, string>;
  msgType: number;
};

type EmailLikeConfig = {
  host?: string;
  port?: number;
  pass?: string;
  from?: string;
  smtpUsername?: string;
  smtpPassword?: string;
  type?: string;
};

export function codeLabel(code: string): string {
  const local = NOTIFY_CONFIG_CHANNELS.find((s) => s.code === code);
  return local?.name ?? code;
}

export function mapConfigDtoToRow(dto: NotifyConfigPageDto): ConfigListRow {
  const po = dto.configPo;
  return {
    id: String(po.id ?? ""),
    name: po.name ?? "",
    code: String(po.code ?? ""),
    creator: dto.userPo?.username ?? "—",
    org: dto.dimensionPo?.name ?? "—",
    createTime: po.createTime ?? "—",
    updateTime: po.updateTime ?? "—",
    raw: dto,
  };
}

export function mapConfigPoToForm(po: NotifyConfigPo): EmailConfigForm {
  const cfg = (po.config ?? {}) as EmailLikeConfig;
  const isAws = po.code === "aws-email";
  return {
    id: String(po.id ?? ""),
    name: po.name ?? "",
    code: String(po.code ?? "email"),
    smtpHost: cfg.host ?? "",
    smtpPort: cfg.port ?? 465,
    smtpUser: isAws ? (cfg.smtpUsername ?? "") : "",
    smtpSecret: isAws ? (cfg.smtpPassword ?? "") : (cfg.pass ?? ""),
    sendEmail: cfg.from ?? "",
  };
}

export function blankConfigForm(code: NotifyChannelCode): EmailConfigForm {
  return {
    id: "",
    name: "",
    code,
    smtpHost: "",
    smtpPort: 465,
    smtpUser: "",
    smtpSecret: "",
    sendEmail: "",
  };
}

export function mapConfigFormToPo(form: EmailConfigForm): Partial<NotifyConfigPo> {
  const isAws = form.code === "aws-email";
  const config: EmailLikeConfig = isAws
    ? {
        type: "aws-email",
        host: form.smtpHost,
        smtpUsername: form.smtpUser,
        smtpPassword: form.smtpSecret,
        from: form.sendEmail,
      }
    : {
        type: "email",
        host: form.smtpHost,
        port: form.smtpPort,
        pass: form.smtpSecret,
        from: form.sendEmail,
      };

  return {
    id: form.id ? toDbId(form.id) : undefined,
    name: form.name,
    code: form.code as NotifyConfigPo["code"],
    config,
  };
}

export function mapTemplateDtoToRow(dto: NotifyTemplatePageDto): TemplateListRow {
  const tp = dto.templatePo;
  return {
    id: String(tp.id ?? ""),
    name: tp.name ?? "",
    configId: String(tp.configId ?? dto.configPo?.id ?? ""),
    configName: dto.configPo?.name ?? "—",
    configCode: String(dto.configPo?.code ?? ""),
    creator: dto.sysUserPo?.username ?? "—",
    org: dto.sysDimensionPo?.name ?? "—",
    createTime: tp.createTime ?? "—",
    updateTime: tp.updateTime ?? "—",
    raw: dto,
  };
}

function parseMsgContent(raw: NotifyTemplatePo["msgContent"]) {
  if (!raw) return { title: "", content: "", type: "" };

  let obj: Record<string, unknown>;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return { title: "", content: "", type: "" };
    try {
      obj = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return { title: "", content: trimmed, type: "" };
    }
  } else {
    obj = raw as Record<string, unknown>;
  }

  const type = String(obj.type ?? "");
  let title = String(obj.title ?? obj.subject ?? "");
  let content = String(obj.content ?? obj.body ?? obj.message ?? "");

  if (!title && !content) {
    const skip = new Set(["type", "variables", "msgType"]);
    const textEntries = Object.entries(obj).filter(
      ([k, v]) => !skip.has(k) && (typeof v === "string" || typeof v === "number"),
    );
    if (textEntries.length >= 2) {
      title = String(textEntries[0][1]);
      content = String(textEntries[1][1]);
    } else if (textEntries.length === 1) {
      content = String(textEntries[0][1]);
    }
  }

  return { title, content, type };
}

function normalizeVariables(raw: NotifyTemplatePo["variables"]): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      return normalizeVariables(JSON.parse(raw) as NotifyTemplatePo["variables"]);
    } catch {
      return {};
    }
  }
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.map((k) => [String(k), ""]));
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = v == null ? "" : String(v);
  }
  return out;
}

export function mapTemplateDtoToForm(dto: NotifyTemplatePageDto): TemplateForm {
  const tp = dto.templatePo;
  const content = parseMsgContent(tp.msgContent);
  return {
    id: String(tp.id ?? ""),
    name: tp.name ?? "",
    configId: String(tp.configId ?? dto.configPo?.id ?? ""),
    configCode: String(dto.configPo?.code ?? content.type ?? ""),
    contentTitle: content.title ?? "",
    contentBody: content.content ?? "",
    variables: normalizeVariables(tp.variables),
    msgType: typeof tp.msgType === "number" ? tp.msgType : Number(tp.msgType) || 1,
  };
}

export function blankTemplateForm(
  name: string,
  configId: string,
  configCode: NotifyChannelCode,
): TemplateEditorForm {
  return {
    id: "",
    name,
    configId,
    configCode,
    contentTitle: name,
    contentBody: "{$content}",
    variables: { content: "none" },
    points: {},
    msgType: 1,
  };
}

export function mapTemplateFormToPo(form: TemplateForm): Partial<NotifyTemplatePo> {
  return {
    id: form.id ? toDbId(form.id) : undefined,
    name: form.name,
    configId: toDbId(form.configId),
    msgType: String(form.msgType),
    msgContent: {
      type: form.configCode,
      title: form.contentTitle,
      content: form.contentBody,
    },
    variables: form.variables,
  };
}

export function mergeTemplateVariableMaps(
  variables: Record<string, string>,
  points: Record<string, string>,
): Record<string, string> {
  return { ...variables, ...points };
}

export function splitTemplateVariables(
  title: string,
  content: string,
  all: Record<string, string>,
): { variables: Record<string, string>; points: Record<string, string> } {
  const varNames = new Set<string>();
  const ptNames = new Set<string>();
  const re = /\{([#$])([A-Za-z0-9_]+)\}/g;
  for (const text of [title, content]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      (m[1] === "$" ? varNames : ptNames).add(m[2]);
    }
  }
  const variables: Record<string, string> = {};
  const points: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) {
    if (ptNames.has(k)) points[k] = v;
    else variables[k] = v;
  }
  for (const k of varNames) {
    if (!(k in variables)) variables[k] = all[k] ?? "";
  }
  for (const k of ptNames) {
    if (!(k in points)) points[k] = all[k] ?? "";
  }
  return { variables, points };
}

export type TemplateEditorForm = TemplateForm & { points: Record<string, string> };

export function mapTemplateDtoToEditorForm(dto: NotifyTemplatePageDto): TemplateEditorForm {
  const base = mapTemplateDtoToForm(dto);
  const split = splitTemplateVariables(base.contentTitle, base.contentBody, base.variables);
  return { ...base, variables: split.variables, points: split.points };
}

export function mapTemplateEditorFormToPo(form: TemplateEditorForm): Partial<NotifyTemplatePo> {
  return mapTemplateFormToPo({
    ...form,
    variables: mergeTemplateVariableMaps(form.variables, form.points),
  });
}

export function buildTemplateTestPayload(
  form: TemplateEditorForm,
  userId: string | number,
): NotifyTemplateSendTestRequest {
  const variables = mergeTemplateVariableMaps(form.variables, form.points);
  return {
    userId: toDbId(userId),
    configPo: { id: toDbId(form.configId), name: "" },
    templatePo: {
      type: form.configCode,
      name: form.name,
      msgType: String(form.msgType),
      msgContent: {
        type: form.configCode,
        title: form.contentTitle,
        content: form.contentBody,
      },
      variables,
    } as unknown as NotifyTemplatePo,
  };
}
