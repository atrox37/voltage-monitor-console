import type {
  DeviceProtocolPageDto,
  DeviceProtocolPo,
  GatewayDto,
  NetworkConfigPo,
  NetworkVO,
} from "@/types";
import { toDbId } from "@/lib/query-terms";

export type CompType = "MQTT_CLIENT";

export type RecruitRow = {
  id: string;
  name: string;
  topic: string;
  payload: string;
  targets: { gateway: boolean; direct: boolean };
};

export type MqttClientConfiguration = {
  type?: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  sslEnabled?: boolean;
  sslCa?: string;
  sslCert?: string;
  sslKey?: string;
  topics?: string[];
  boards?: Array<{
    id?: string;
    name?: string;
    topic?: string;
    data?: string;
    cluster?: string[];
  }>;
};

export type NetworkCompForm = {
  id: string;
  name: string;
  type: CompType;
  orgId: string;
  updateTime: string;
  enabled: boolean;
  ip: string;
  port: number;
  username: string;
  password: string;
  ssl: boolean;
  caCert: string;
  sslCert: string;
  sslKey: string;
  topics: string[];
  recruits: RecruitRow[];
};

export type NetworkListRow = {
  id: string;
  name: string;
  type: string;
  org: string;
  updateTime: string;
  enabled: boolean;
  connectStatus?: string;
  raw: NetworkVO;
};

export type GatewayListRow = {
  id: string;
  name: string;
  networkComponent: string;
  networkComponentType: string;
  networkId: string;
  protocol: string;
  protocolId: string;
  org: string;
  enabled: boolean;
  updateTime: string;
  raw: GatewayDto;
};

export type ProtocolListRow = {
  id: string;
  name: string;
  support: string[];
  gatewayCount: number;
  org: string;
  description: string;
  updateTime: string;
  raw: DeviceProtocolPageDto;
};

export function blankNetworkForm(type: CompType, orgId = ""): NetworkCompForm {
  return {
    id: "",
    name: "",
    type,
    orgId,
    enabled: false,
    updateTime: "",
    ip: "",
    port: 1883,
    username: "",
    password: "",
    ssl: false,
    caCert: "",
    sslCert: "",
    sslKey: "",
    topics: [],
    recruits: [],
  };
}

/** 从网络分页行解析 NetworkConfigPo（兼容 t1 嵌套或扁平结构） */
export function networkPoFromPageRow(row: NetworkVO): NetworkConfigPo | undefined {
  const t1 = row.t1 as { networkConfigPo?: NetworkConfigPo } & Partial<NetworkConfigPo>;
  if (t1?.networkConfigPo?.id != null) return t1.networkConfigPo;
  if (t1?.id != null && t1.name != null) return t1 as NetworkConfigPo;
  return undefined;
}

export function mapNetworkVoToRow(vo: NetworkVO): NetworkListRow {
  const po = networkPoFromPageRow(vo);
  if (!po) {
    return {
      id: "",
      name: "",
      type: "",
      org: "—",
      updateTime: "—",
      enabled: false,
      raw: vo,
    };
  }
  return {
    id: String(po.id ?? ""),
    name: po.name ?? "",
    type: String(po.type ?? ""),
    org: vo.t1.sysDimensionPo?.name ?? "—",
    updateTime: po.updateTime ?? "—",
    enabled: po.state === 1,
    connectStatus: vo.t2,
    raw: vo,
  };
}

export function mapNetworkVoToForm(vo: NetworkVO): NetworkCompForm {
  const po = networkPoFromPageRow(vo) ?? ({} as NetworkConfigPo);
  const cfg = (po.configuration ?? {}) as MqttClientConfiguration;
  return {
    id: String(po.id ?? ""),
    name: po.name ?? "",
    type: (po.type as CompType) ?? "MQTT_CLIENT",
    orgId: String(po.orgId ?? ""),
    updateTime: po.updateTime ?? "",
    enabled: po.state === 1,
    ip: cfg.host ?? "",
    port: cfg.port ?? 1883,
    username: cfg.username ?? "",
    password: cfg.password ?? "",
    ssl: cfg.sslEnabled ?? false,
    caCert: cfg.sslCa ?? "",
    sslCert: cfg.sslCert ?? "",
    sslKey: cfg.sslKey ?? "",
    topics: cfg.topics ?? [],
    recruits: (cfg.boards ?? []).map((b) => ({
      id: String(b.id ?? Date.now()),
      name: b.name ?? "",
      topic: b.topic ?? "",
      payload: b.data ?? "",
      targets: {
        gateway: b.cluster?.includes("gateway") ?? false,
        direct: b.cluster?.includes("device") ?? false,
      },
    })),
  };
}

export function mapNetworkFormToPo(form: NetworkCompForm): Partial<NetworkConfigPo> {
  return {
    id: form.id ? toDbId(form.id) : undefined,
    name: form.name,
    state: form.enabled ? 1 : 0,
    type: form.type,
    orgId: form.orgId ? toDbId(form.orgId) : undefined,
    configuration: {
      type: form.type,
      host: form.ip,
      port: form.port,
      username: form.username,
      password: form.password,
      sslEnabled: form.ssl,
      sslCa: form.caCert,
      sslCert: form.sslCert,
      sslKey: form.sslKey,
      topics: form.topics,
      boards: form.recruits.map((r) => ({
        id: r.id,
        name: r.name,
        topic: r.topic,
        data: r.payload,
        cluster: [
          ...(r.targets.gateway ? ["gateway"] : []),
          ...(r.targets.direct ? ["device"] : []),
        ],
      })),
    },
  };
}

/** 从网关分页行解析 NetworkConfigPo（兼容 t1 联表别名或扁平 networkConfigPo） */
export function networkPoFromGatewayDto(dto: GatewayDto): NetworkConfigPo | undefined {
  if (dto.networkConfigPo?.id != null || dto.networkConfigPo?.name != null) {
    return dto.networkConfigPo;
  }
  const t1 = (dto as { t1?: NetworkConfigPo & { networkConfigPo?: NetworkConfigPo } }).t1;
  if (t1?.networkConfigPo?.id != null || t1?.networkConfigPo?.name != null) {
    return t1.networkConfigPo;
  }
  if (t1?.id != null || t1?.name != null) return t1;
  return undefined;
}

/** 从网关分页行解析 DeviceProtocolPo（兼容 t2 联表别名或扁平 protocolPo） */
export function protocolPoFromGatewayDto(
  dto: GatewayDto,
): DeviceProtocolPageDto | DeviceProtocolPo | undefined {
  if (dto.protocolPo?.id != null || dto.protocolPo?.name != null) {
    return dto.protocolPo;
  }
  const t2 = (dto as { t2?: DeviceProtocolPo }).t2;
  if (t2?.id != null || t2?.name != null) return t2;
  return undefined;
}

export function mapGatewayDtoToRow(dto: GatewayDto): GatewayListRow {
  const po = dto.gatewayPo;
  const network = networkPoFromGatewayDto(dto);
  const protocol = protocolPoFromGatewayDto(dto);
  return {
    id: String(po.id ?? ""),
    name: po.name ?? "",
    networkComponent: network?.name ?? "—",
    networkComponentType: String(network?.type ?? ""),
    networkId: String(po.networkId ?? network?.id ?? ""),
    protocol: protocol?.name ?? "—",
    protocolId: String(po.protocolId ?? protocol?.id ?? ""),
    org: dto.sysDimensionPo?.name ?? "—",
    enabled: po.state === 1,
    updateTime: po.updateTime ?? "—",
    raw: dto,
  };
}

export function mapProtocolDtoToRow(dto: DeviceProtocolPageDto): ProtocolListRow {
  return {
    id: String(dto.id ?? ""),
    name: dto.name ?? "",
    support: dto.support ?? [],
    gatewayCount: dto.gatewayTotal ?? 0,
    org: dto.sysDimensionName ?? "—",
    description: dto.description ?? "",
    updateTime: dto.updateTime ?? "—",
    raw: dto,
  };
}

export function mapProtocolFormToPo(form: {
  id: string;
  name: string;
  description: string;
  provider: string;
  location: string;
  storage: "S3" | "Minio";
  support: string[];
}): Partial<DeviceProtocolPo> {
  return {
    id: form.id ? toDbId(form.id) : undefined,
    name: form.name,
    state: 1,
    type: "jar",
    description: form.description,
    support: form.support,
    configuration: {
      provider: form.provider,
      location: form.location,
      type: form.storage.toLowerCase(),
    },
  };
}

export function mapProtocolDtoToForm(dto: DeviceProtocolPageDto) {
  const cfg = dto.configuration ?? {};
  const storageRaw = (cfg.type ?? "minio").toLowerCase();
  return {
    id: String(dto.id ?? ""),
    name: dto.name ?? "",
    description: dto.description ?? "",
    provider: cfg.provider ?? "",
    location: cfg.location ?? "",
    storage: (storageRaw === "s3" ? "S3" : "Minio") as "S3" | "Minio",
    support: dto.support ?? [],
  };
}

export function protocolTestType(support: string[] | undefined): "mqtt" | "kafka" {
  if (support?.length === 1 && support[0] === "KAFKA") return "kafka";
  return "mqtt";
}
