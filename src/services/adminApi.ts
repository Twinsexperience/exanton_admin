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
  onboardingStatus: "PENDING_DOCS" | "ACTIVE" | "SUSPENDED";
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

