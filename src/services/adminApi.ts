function normalizeApiBase(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  if (!trimmed) return "/api";
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

const RAW_API_URL =
  (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env
    ?.VITE_API_URL ??
  `${window.location.protocol}//${window.location.hostname}:4000/api`;

const API_BASE = normalizeApiBase(RAW_API_URL);

const ADMIN_TOKEN_KEY = "nexloc_warden_admin_token";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  companyName: string | null;
  phone: string | null;
  role: "USER" | "ADMIN";
  permissions?: string[];
  onboardingStatus: "PENDING_DOCS" | "ACTIVE" | "SUSPENDED";
  kycStatus?: "UNVERIFIED" | "PENDING" | "APPROVED" | "DECLINED";
  planName?: "FREE" | "TRACKING" | "PLUS_SCORING" | "FULL_STATUS" | "ENTERPRISE";
  subscriptionStatus?: "ACTIVE" | "PAST_DUE" | "SUSPENDED";
  maxVehicles?: number;
  historyRetentionDays?: number;
  monthlyPriceUsd?: number;
  createdAt: string;
}

export interface AdminDocument {
  id: string;
  docType: string;
  originalName: string;
  sizeBytes: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  user?: {
    id: string;
    email: string;
    fullName: string;
    companyName: string | null;
    onboardingStatus: string;
  };
}

export interface LeadItem {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string;
  plan: string;
  vehiclesCount: number;
  notes: string | null;
  status?: "NEW" | "CONTACTED" | "DEMO" | "CONVERTED" | "DISCARDED";
  adminNotes?: string | null;
  convertedUserId?: string | null;
  createdAt: string;
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null): void {
  if (token) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith("/auth/")) {
      setAdminToken(null);
      window.dispatchEvent(new Event("warden:admin-unauthorized"));
      throw new Error("Tu sesión expiró. Volvé a iniciar sesión.");
    }
    throw new Error(data.error || `Error HTTP ${res.status}`);
  }
  return data as T;
}

export async function loginAdmin(email: string, password: string) {
  const res = await request<{ token: string; user: AdminUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (res.user.role !== "ADMIN") {
    throw new Error(
      "Acceso denegado: esta consola es exclusiva para SuperAdmin (Owner)."
    );
  }

  setAdminToken(res.token);
  return res.user;
}

export async function fetchAdminSession(): Promise<AdminUser | null> {
  const token = getAdminToken();
  if (!token) return null;
  try {
    const res = await request<{ user: AdminUser }>("/profile");
    if (res.user.role !== "ADMIN") {
      setAdminToken(null);
      return null;
    }
    return res.user;
  } catch {
    setAdminToken(null);
    return null;
  }
}

export async function fetchAdminDocuments(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<{ documents: AdminDocument[] }>(`/admin/documents${qs}`);
}

export async function reviewDocument(
  id: string,
  status: "APPROVED" | "REJECTED"
) {
  return request<{ document: AdminDocument }>(`/admin/documents/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function fetchAdminUsers() {
  return request<{ users: AdminUser[] }>("/admin/users");
}

export async function updateUserOnboardingStatus(
  id: string,
  onboardingStatus: "PENDING_DOCS" | "ACTIVE" | "SUSPENDED"
) {
  return request<{ user: AdminUser }>(`/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ onboardingStatus }),
  });
}

export async function fetchAdminLeads() {
  return request<{ leads: LeadItem[] }>("/admin/leads");
}

export interface AuditLogItem {
  id: string;
  actorUserId: string | null;
  actorScope: "WEB" | "MOBILE" | "ADMIN" | "SYSTEM";
  action: string;
  vehicleId: string | null;
  imei: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export async function fetchAdminAuditLogs() {
  return request<{ logs: AuditLogItem[] }>("/admin/audit");
}

export interface AdminVehicleItem {
  id: string;
  userId: string;
  imei: string;
  alias: string;
  plate: string;
  gpsModel: string;
  serviceTier: "TRACKING_ONLY" | "PLUS_SCORING" | "FULL_STATUS";
  relayState: "NORMAL" | "PENDING_CUT" | "CUT";
  lastLat: number | null;
  lastLon: number | null;
  lastSpeedKmh: number;
  lastCourse: number;
  accOn: boolean;
  driverScore: number;
  lastRawFrame?: string | null;
  online?: boolean;
}

export interface IncidentItem {
  id: string;
  vehicleId: string | null;
  userId: string | null;
  imei: string | null;
  type:
    | "ANCHOR_VIOLATION"
    | "VALET_VIOLATION"
    | "CURFEW_MOVEMENT"
    | "GEOFENCE_BREACH"
    | "BATTERY_CUT"
    | "SOS_PANIC"
    | "JAMMER_SUSPECTED"
    | "SPEEDING_CRITICAL";
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  title: string;
  description: string;
  lat: number | null;
  lon: number | null;
  operatorNotes: string | null;
  createdAt: string;
}

export interface HeatmapPoint {
  lat: number;
  lon: number;
  weight: number;
  label: string;
}

export async function fetchAdminVehicles() {
  return request<{ vehicles: AdminVehicleItem[] }>("/admin/vehicles");
}

export async function sendAdminVehicleCommand(
  id: string,
  command: "CUT_RELAY" | "RESTORE_RELAY" | "LOCATE" | "FIX030S" | "RESET" | "CUSTOM",
  rawCommand?: string
) {
  return request<{ sent: boolean; cobanCode: string; relayState: string }>(
    `/admin/vehicles/${id}/command`,
    {
      method: "POST",
      body: JSON.stringify({ command, rawCommand }),
    }
  );
}

export async function updateUserPlan(
  id: string,
  payload: {
    planName?: AdminUser["planName"];
    subscriptionStatus?: AdminUser["subscriptionStatus"];
    maxVehicles?: number;
    historyRetentionDays?: number;
    monthlyPriceUsd?: number;
  }
) {
  return request<{ user: AdminUser }>(`/admin/users/${id}/plan`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminIncidents(status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  return request<{ incidents: IncidentItem[] }>(`/admin/incidents${qs}`);
}

export async function updateAdminIncident(
  id: string,
  payload: { status?: IncidentItem["status"]; operatorNotes?: string }
) {
  return request<{ incident: IncidentItem }>(`/admin/incidents/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchAdminHeatmap(hours = 24) {
  return request<{ points: HeatmapPoint[] }>(`/admin/heatmap?hours=${hours}`);
}

export async function reverseGeocodeAdmin(lat: number, lon: number) {
  return request<{ address: string }>(
    `/geocode/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`
  );
}

export interface AdminStreamEvent {
  type: string;
  vehicleId?: string;
  imei?: string;
  timestamp?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

export function subscribeAdminStream(
  onEvent: (event: AdminStreamEvent) => void
): () => void {
  let closed = false;
  let controller: AbortController | null = null;
  let retryTimer: number | null = null;
  let retryDelayMs = 2000;

  const connect = async () => {
    if (closed) return;
    const token = getAdminToken();
    if (!token) return;

    controller = new AbortController();
    try {
      const res = await fetch(`${API_BASE}/admin/stream`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "text/event-stream",
        },
        signal: controller.signal,
      });
      if (res.status === 401) {
        setAdminToken(null);
        window.dispatchEvent(new Event("warden:admin-unauthorized"));
        closed = true;
        return;
      }
      if (!res.ok || !res.body) throw new Error(`SSE HTTP ${res.status}`);

      retryDelayMs = 2000;
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (!closed) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";
        for (const chunk of chunks) {
          const dataLines = chunk
            .split("\n")
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trim());
          if (dataLines.length === 0) continue;
          try {
            onEvent(JSON.parse(dataLines.join("\n")) as AdminStreamEvent);
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // reconnect
    }

    if (!closed) {
      retryTimer = window.setTimeout(() => void connect(), retryDelayMs);
      retryDelayMs = Math.min(retryDelayMs * 2, 15000);
    }
  };

  void connect();

  return () => {
    closed = true;
    if (retryTimer !== null) window.clearTimeout(retryTimer);
    controller?.abort();
  };
}

export interface AdminHealthStatus {
  database: "ok" | "error";
  redis: "connected" | "disabled" | "error";
  storage: "s3" | "local";
  gateway: { activeConnections: number; onlineImeis: string[]; tcpPort: number };
  silentVehiclesCount: number;
  silentVehicles: {
    id: string;
    imei: string;
    alias: string;
    plate: string;
    gpsModel: string;
    lastSeenAt: string | null;
  }[];
}

export async function fetchAdminHealth() {
  return request<AdminHealthStatus>("/admin/health");
}

export async function fetchDocumentFilePreview(docId: string): Promise<{
  url: string;
  mimeType: string;
  isBlob: boolean;
}> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}/admin/documents/${docId}/file`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("No se pudo cargar la vista previa.");
  const ct = res.headers.get("Content-Type") || "";
  if (ct.includes("application/json")) {
    const json = (await res.json()) as { url: string; mimeType: string };
    return { url: json.url, mimeType: json.mimeType, isBlob: false };
  }
  const blob = await res.blob();
  return {
    url: URL.createObjectURL(blob),
    mimeType: ct || blob.type,
    isBlob: true,
  };
}

export interface PoliceRecoveryKit {
  shareToken: string;
  expiresInHours: number;
  incident: IncidentItem;
  vehicle: AdminVehicleItem;
  owner: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    companyName: string | null;
  } | null;
  address: string | null;
  recentPositions: {
    id: string;
    lat: number;
    lon: number;
    speedKmh: number;
    recordedAt: string;
  }[];
}

export async function generatePoliceKit(incidentId: string) {
  return request<PoliceRecoveryKit>(`/admin/incidents/${incidentId}/police-kit`, {
    method: "POST",
  });
}

export async function impersonateUser(userId: string) {
  return request<{ token: string; user: AdminUser }>(
    `/admin/users/${userId}/impersonate`,
    { method: "POST" }
  );
}

export async function createSocOperator(payload: {
  email: string;
  password: string;
  fullName: string;
  permissions: string[];
}) {
  return request<{ operator: AdminUser }>("/admin/operators", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUserPermissions(
  userId: string,
  permissions: string[]
) {
  return request<{ user: AdminUser }>(`/admin/users/${userId}/permissions`, {
    method: "PATCH",
    body: JSON.stringify({ permissions }),
  });
}

export interface PlanCatalogItem {
  id: string;
  code: "FREE" | "TRACKING" | "PLUS_SCORING" | "FULL_STATUS" | "ENTERPRISE";
  displayName: string;
  monthlyPriceUsd: number;
  maxVehicles: number;
  historyRetentionDays: number;
  active: boolean;
}

export async function fetchPlanCatalog() {
  return request<{ plans: PlanCatalogItem[] }>("/admin/plans");
}

export async function updatePlanCatalog(
  code: PlanCatalogItem["code"],
  payload: Partial<Omit<PlanCatalogItem, "id" | "code">>
) {
  return request<{ plan: PlanCatalogItem }>(`/admin/plans/${code}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export interface HardwareDeviceItem {
  id: string;
  imei: string;
  iccid: string | null;
  simNumber: string | null;
  carrier: string | null;
  simStatus: "STOCK" | "ACTIVE" | "SUSPENDED";
  gpsModel: string;
  notes: string | null;
  createdAt: string;
}

export async function fetchHardwareDevices() {
  return request<{ items: HardwareDeviceItem[] }>("/admin/hardware");
}

export async function createHardwareDevice(payload: {
  imei: string;
  iccid?: string;
  simNumber?: string;
  carrier?: string;
  simStatus?: HardwareDeviceItem["simStatus"];
  gpsModel?: string;
}) {
  return request<{ item: HardwareDeviceItem }>("/admin/hardware", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function importHardwareDevices(
  items: Array<{
    imei: string;
    iccid?: string;
    simNumber?: string;
    carrier?: string;
    gpsModel?: string;
  }>
) {
  return request<{ created: number; skipped: number }>("/admin/hardware/import", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function sendBatchCommand(imeis: string[], command: string) {
  return request<{ sent: number; offline: number }>(
    "/admin/hardware/batch-command",
    {
      method: "POST",
      body: JSON.stringify({ imeis, command }),
    }
  );
}

export async function deleteHardwareDevice(id: string) {
  return request<{ deleted: boolean }>(`/admin/hardware/${id}`, {
    method: "DELETE",
  });
}

export async function linkGpsToUser(payload: {
  userId: string;
  imei: string;
  alias: string;
  plate: string;
  gpsModel?: string;
  serviceTier?: AdminVehicleItem["serviceTier"];
}) {
  return request<{ vehicle: AdminVehicleItem }>("/admin/vehicles/link", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function unlinkAdminVehicle(vehicleId: string) {
  return request<{ deleted: boolean }>(`/admin/vehicles/${vehicleId}`, {
    method: "DELETE",
  });
}

export async function updateLead(
  id: string,
  payload: { status?: LeadItem["status"]; adminNotes?: string }
) {
  return request<{ lead: LeadItem }>(`/admin/leads/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function convertLeadToUser(id: string) {
  return request<{
    lead: LeadItem;
    user: AdminUser;
    tempPassword: string | null;
    alreadyExisted: boolean;
  }>(`/admin/leads/${id}/convert`, { method: "POST" });
}

export interface PlatformBroadcastItem {
  id: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  targetPlan: string;
  active: boolean;
  createdAt: string;
}

export async function fetchBroadcasts() {
  return request<{ broadcasts: PlatformBroadcastItem[] }>("/admin/broadcasts");
}

export async function createBroadcast(payload: {
  title: string;
  message: string;
  severity: PlatformBroadcastItem["severity"];
  targetPlan: string;
}) {
  return request<{ broadcast: PlatformBroadcastItem }>("/admin/broadcasts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function toggleBroadcast(id: string) {
  return request<{ broadcast: PlatformBroadcastItem }>(
    `/admin/broadcasts/${id}/toggle`,
    { method: "PATCH" }
  );
}

export async function downloadAuditExport(
  format: "csv" | "json",
  from?: string,
  to?: string
) {
  const params = new URLSearchParams({ format });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}/admin/audit/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Error exportando auditoría.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `exanton-audit.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

