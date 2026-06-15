/** React Query 缓存键 — 按业务域分组 */
export const queryKeys = {
  dimensionTree: ["dimension-tree"] as const,
  devices: {
    root: ["devices"] as const,
    list: (params: unknown) => ["devices", "list", params] as const,
    productOptions: ["devices", "product-options"] as const,
    gatewayOptions: ["devices", "gateway-options"] as const,
  },
  products: {
    root: ["products"] as const,
    list: (params: unknown) => ["products", "list", params] as const,
  },
  gateways: {
    root: ["gateways"] as const,
    list: (params: unknown) => ["gateways", "list", params] as const,
  },
  networkComponents: {
    root: ["network-components"] as const,
    list: (params: unknown) => ["network-components", "list", params] as const,
  },
  protocols: {
    root: ["protocols"] as const,
    list: (params: unknown) => ["protocols", "list", params] as const,
  },
  notifyConfigs: {
    root: ["notify-configs"] as const,
    list: (params: unknown) => ["notify-configs", "list", params] as const,
  },
  notifyTemplates: {
    root: ["notify-templates"] as const,
    list: (params: unknown) => ["notify-templates", "list", params] as const,
  },
  users: {
    root: ["users"] as const,
    list: (params: unknown) => ["users", "list", params] as const,
    roleOptions: ["users", "role-options"] as const,
  },
  roles: {
    root: ["roles"] as const,
    list: (params: unknown) => ["roles", "list", params] as const,
  },
  orgs: {
    root: ["orgs"] as const,
    tree: ["orgs", "tree"] as const,
    members: (orgId: string) => ["orgs", "members", orgId] as const,
  },
  audit: {
    root: ["audit"] as const,
    list: (params: unknown) => ["audit", "list", params] as const,
  },
} as const;
