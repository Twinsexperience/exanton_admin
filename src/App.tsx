import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminFleetMap } from "./components/AdminFleetMap";
import { AdminLogin } from "./components/AdminLogin";
import { SocCommand, SocDockPanel } from "./components/SocDockPanel";
import { AuditPanel } from "./components/panels/AuditPanel";
import { DocumentsPanel } from "./components/panels/DocumentsPanel";
import { HardwarePanel } from "./components/panels/HardwarePanel";
import { IncidentsPanel } from "./components/panels/IncidentsPanel";
import { LeadsPanel } from "./components/panels/LeadsPanel";
import { MetricsPanel } from "./components/panels/MetricsPanel";
import { PlatformPanel } from "./components/panels/PlatformPanel";
import { UsersPanel } from "./components/panels/UsersPanel";
import {
  IconDashboard,
  IconDocuments,
  IconLeads,
  IconLogout,
  IconMap,
  IconRefresh,
  IconSearch,
  IconShield,
  IconUsers,
} from "./components/Icons";
import {
  AdminDocument,
  AdminHealthStatus,
  AdminUser,
  AdminVehicleItem,
  AuditLogItem,
  HardwareDeviceItem,
  HeatmapPoint,
  IncidentItem,
  LeadItem,
  PlanCatalogItem,
  PlatformBroadcastItem,
  fetchAdminAuditLogs,
  fetchAdminDocuments,
  fetchAdminHealth,
  fetchAdminHeatmap,
  fetchAdminIncidents,
  fetchAdminLeads,
  fetchAdminSession,
  fetchAdminUsers,
  fetchAdminVehicles,
  fetchBroadcasts,
  fetchHardwareDevices,
  fetchPlanCatalog,
  reverseGeocodeAdmin,
  reviewDocument,
  sendAdminVehicleCommand,
  setAdminToken,
  subscribeAdminStream,
  updateAdminIncident,
  updateUserOnboardingStatus,
  updateUserPlan,
} from "./services/adminApi";

type AdminTab =
  | "soc"
  | "incidents"
  | "metrics"
  | "hardware"
  | "documents"
  | "users"
  | "leads"
  | "platform"
  | "audit";

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function playCriticalAlertBeep(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.14);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.34);
  } catch {
    // AudioContext may be blocked before user interaction
  }
}

export const App: React.FC = () => {
  const [owner, setOwner] = useState<AdminUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [tab, setTab] = useState<AdminTab>("soc");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");

  const [docs, setDocs] = useState<AdminDocument[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [vehicles, setVehicles] = useState<AdminVehicleItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const [health, setHealth] = useState<AdminHealthStatus | null>(null);
  const [hardwareItems, setHardwareItems] = useState<HardwareDeviceItem[]>([]);
  const [planCatalog, setPlanCatalog] = useState<PlanCatalogItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<PlatformBroadcastItem[]>([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [focusTrigger, setFocusTrigger] = useState<number>(0);
  const lastGeocodeKeyRef = useRef<string>("");

  const [feedback, setFeedback] = useState<string | null>(null);
  const [dataErr, setDataErr] = useState<string | null>(null);

  useEffect(() => {
    void fetchAdminSession()
      .then((u) => setOwner(u))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setAdminToken(null);
      setOwner(null);
      setSessionError("Tu sesión expiró. Volvé a iniciar sesión.");
    };
    window.addEventListener("warden:admin-unauthorized", onUnauthorized);
    return () =>
      window.removeEventListener("warden:admin-unauthorized", onUnauthorized);
  }, []);

  const loadAll = useCallback(async () => {
    if (!owner) return;
    try {
      setDataErr(null);
      const [
        docsRes,
        usersRes,
        leadsRes,
        auditRes,
        vehRes,
        incRes,
        heatRes,
        healthRes,
        hwRes,
        plansRes,
        bcRes,
      ] = await Promise.all([
        fetchAdminDocuments(statusFilter === "ALL" ? undefined : statusFilter),
        fetchAdminUsers(),
        fetchAdminLeads(),
        fetchAdminAuditLogs(),
        fetchAdminVehicles().catch(() => ({ vehicles: [] })),
        fetchAdminIncidents().catch(() => ({ incidents: [] })),
        showHeatmap
          ? fetchAdminHeatmap(24).catch(() => ({ points: [] }))
          : Promise.resolve({ points: [] }),
        fetchAdminHealth().catch(() => null),
        fetchHardwareDevices().catch(() => ({ items: [] })),
        fetchPlanCatalog().catch(() => ({ plans: [] })),
        fetchBroadcasts().catch(() => ({ broadcasts: [] })),
      ]);
      setDocs(docsRes.documents);
      setUsers(usersRes.users);
      setLeads(leadsRes.leads);
      setAuditLogs(auditRes.logs);
      setVehicles(vehRes.vehicles);
      setIncidents(incRes.incidents);
      if (showHeatmap) setHeatmapPoints(heatRes.points);
      if (healthRes) setHealth(healthRes);
      setHardwareItems(hwRes.items);
      setPlanCatalog(plansRes.plans);
      setBroadcasts(bcRes.broadcasts);
      setSelectedVehicleId((prev) =>
        prev && vehRes.vehicles.some((v) => v.id === prev)
          ? prev
          : vehRes.vehicles[0]?.id ?? ""
      );
      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch (err) {
      setDataErr(err instanceof Error ? err.message : "Error cargando datos");
    }
  }, [owner, statusFilter, showHeatmap]);

  useEffect(() => {
    void loadAll();
    if (!owner) return;
    const interval = window.setInterval(() => {
      void loadAll();
    }, 10000);
    return () => window.clearInterval(interval);
  }, [loadAll, owner]);

  // Stream SSE en tiempo real + alerta sonora en eventos críticos
  useEffect(() => {
    if (!owner) return;
    const unsubscribe = subscribeAdminStream((msg) => {
      if (msg.type === "position" && msg.vehicleId && msg.data) {
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === msg.vehicleId
              ? {
                  ...v,
                  online: true,
                  lastLat: msg.data.lat,
                  lastLon: msg.data.lon,
                  lastSpeedKmh: msg.data.speedKmh,
                  lastCourse: msg.data.course,
                  accOn: msg.data.accOn,
                  relayState: msg.data.relayState ?? v.relayState,
                  driverScore: msg.data.driverScore ?? v.driverScore,
                }
              : v
          )
        );
      } else if (msg.type === "relay_update" && msg.vehicleId && msg.data) {
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === msg.vehicleId
              ? { ...v, relayState: msg.data.relayState }
              : v
          )
        );
      } else if (msg.type === "device_online" && msg.vehicleId) {
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === msg.vehicleId ? { ...v, online: true } : v
          )
        );
      } else if (msg.type === "device_offline" && msg.vehicleId) {
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === msg.vehicleId ? { ...v, online: false } : v
          )
        );
      } else if (
        msg.type === "alarm_sos" ||
        msg.type === "towing_alert" ||
        msg.type === "jammer_suspected"
      ) {
        playCriticalAlertBeep();
        setDataErr(
          `ALERTA CRÍTICA (${msg.type.toUpperCase()}) • Unidad ${
            msg.data?.alias ?? msg.imei ?? ""
          }`
        );
        void loadAll();
      }
    });
    return unsubscribe;
  }, [owner, loadAll]);

  const handleLogout = () => {
    setAdminToken(null);
    setOwner(null);
    setSessionError(null);
  };

  const notify = (msg: string) => {
    setDataErr(null);
    setFeedback(msg);
    window.setTimeout(() => setFeedback(null), 3500);
  };

  const showError = (msg: string) => {
    setFeedback(null);
    setDataErr(msg);
  };

  const handleReviewDoc = async (
    id: string,
    decision: "APPROVED" | "REJECTED"
  ) => {
    try {
      await reviewDocument(id, decision);
      notify(`Documento marcado como ${decision}.`);
      await loadAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error actualizando");
    }
  };

  const handleUserStatus = async (
    id: string,
    nextStatus: "PENDING_DOCS" | "ACTIVE" | "SUSPENDED"
  ) => {
    try {
      await updateUserOnboardingStatus(id, nextStatus);
      notify(`Estado de cuenta actualizado a ${nextStatus}.`);
      await loadAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error actualizando");
    }
  };

  const handleSocCommand = async (
    cmd: SocCommand,
    rawCommand?: string
  ): Promise<boolean> => {
    if (!selectedVehicleId) return false;
    try {
      await sendAdminVehicleCommand(selectedVehicleId, cmd, rawCommand);
      notify(`Comando ${rawCommand || cmd} enviado al rastreador.`);
      await loadAll();
      return true;
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Error enviando comando"
      );
      return false;
    }
  };

  const handleIncidentUpdate = async (
    id: string,
    status: IncidentItem["status"],
    operatorNotes?: string
  ) => {
    try {
      await updateAdminIncident(id, { status, operatorNotes });
      notify(`Incidente actualizado a ${status}.`);
      await loadAll();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Error actualizando incidente"
      );
    }
  };

  const handleSavePlan = async (
    userId: string,
    draft: {
      planName: NonNullable<AdminUser["planName"]>;
      subscriptionStatus: NonNullable<AdminUser["subscriptionStatus"]>;
      maxVehicles: number;
      monthlyPriceUsd: number;
    }
  ): Promise<boolean> => {
    try {
      await updateUserPlan(userId, draft);
      notify("Plan y suscripción actualizados.");
      await loadAll();
      return true;
    } catch (err) {
      showError(err instanceof Error ? err.message : "Error guardando plan");
      return false;
    }
  };

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.onboardingStatus === "ACTIVE").length;
  const pendingUsers = users.filter(
    (u) => u.onboardingStatus === "PENDING_DOCS"
  ).length;
  const suspendedUsers = users.filter(
    (u) => u.onboardingStatus === "SUSPENDED"
  ).length;

  const pendingDocsCount = docs.filter((d) => d.status === "PENDING").length;
  const onlineVehiclesCount = vehicles.filter((v) => v.online).length;
  const openIncidentsCount = incidents.filter(
    (i) => i.status !== "RESOLVED"
  ).length;
  const mrrUsd = users
    .filter((u) => u.role === "USER" && u.subscriptionStatus !== "SUSPENDED")
    .reduce((acc, u) => acc + (u.monthlyPriceUsd ?? 15), 0);

  const totalLeadUnits = leads.reduce(
    (acc, l) => acc + (l.vehiclesCount || 0),
    0
  );
  const cutEvents = auditLogs.filter((l) =>
    ["CUT_RELAY", "RELAY_ACK_J"].includes(l.action)
  ).length;
  const sosEvents = auditLogs.filter((l) =>
    ["ALARM_SOS", "ANCHOR_TOWING_ALERT"].includes(l.action)
  ).length;
  const docEvents = auditLogs.filter((l) =>
    ["DOCUMENT_APPROVED", "DOCUMENT_REJECTED", "DIDIT_KYC_APPROVED"].includes(
      l.action
    )
  ).length;

  const q = searchQuery.trim().toLowerCase();

  const filteredVehicles = useMemo(
    () =>
      vehicles.filter(
        (v) =>
          !q ||
          v.alias.toLowerCase().includes(q) ||
          v.plate.toLowerCase().includes(q) ||
          v.imei.toLowerCase().includes(q)
      ),
    [vehicles, q]
  );

  const filteredDocs = useMemo(
    () =>
      docs.filter(
        (d) =>
          !q ||
          d.originalName.toLowerCase().includes(q) ||
          d.docType.toLowerCase().includes(q) ||
          (d.user?.email ?? "").toLowerCase().includes(q) ||
          (d.user?.fullName ?? "").toLowerCase().includes(q)
      ),
    [docs, q]
  );

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          !q ||
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.companyName ?? "").toLowerCase().includes(q)
      ),
    [users, q]
  );

  const filteredLeads = useMemo(
    () =>
      leads.filter(
        (l) =>
          !q ||
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          (l.company ?? "").toLowerCase().includes(q) ||
          l.plan.toLowerCase().includes(q)
      ),
    [leads, q]
  );

  const filteredAudit = useMemo(
    () =>
      auditLogs.filter(
        (a) =>
          !q ||
          a.action.toLowerCase().includes(q) ||
          (a.imei ?? "").toLowerCase().includes(q) ||
          a.actorScope.toLowerCase().includes(q)
      ),
    [auditLogs, q]
  );

  const selectedVehicle =
    vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  const selVid = selectedVehicle?.id ?? "";
  const selLat = selectedVehicle?.lastLat ?? null;
  const selLon = selectedVehicle?.lastLon ?? null;

  useEffect(() => {
    if (!selVid || selLat === null || selLon === null) {
      setSelectedAddress("");
      lastGeocodeKeyRef.current = "";
      return;
    }
    const key = `${selVid}:${selLat.toFixed(4)},${selLon.toFixed(4)}`;
    if (key === lastGeocodeKeyRef.current) return;

    const timer = window.setTimeout(() => {
      lastGeocodeKeyRef.current = key;
      void reverseGeocodeAdmin(selLat, selLon)
        .then((res) => setSelectedAddress(res.address))
        .catch(() => {});
    }, 500);

    return () => window.clearTimeout(timer);
  }, [selVid, selLat, selLon]);

  const selectTab = (next: AdminTab) => {
    setTab(next);
    setSidebarOpen(false);
  };

  if (checkingSession) {
    return (
      <div className="center-screen">
        <p className="muted">Iniciando Centro de Comando SOC...</p>
      </div>
    );
  }

  if (!owner) {
    return (
      <AdminLogin
        initialError={sessionError}
        onSuccess={(logged) => {
          setSessionError(null);
          setOwner(logged);
        }}
      />
    );
  }

  return (
    <div className="soc-viewport">
      <AdminFleetMap
        vehicles={vehicles}
        selectedId={selectedVehicleId}
        onSelectVehicle={(id) => {
          setSelectedVehicleId(id);
          setDockOpen(true);
        }}
        focusTrigger={focusTrigger}
        heatmapPoints={heatmapPoints}
        showHeatmap={showHeatmap}
      />

      {!dockOpen && (
        <button
          type="button"
          className="btn btn-glass btn-sm soc-restore-ui-btn"
          onClick={() => setDockOpen(true)}
        >
          Mostrar Interfaz
        </button>
      )}

      {dockOpen && (
        <header className="soc-hud-top">
          <div className="hud-left">
            <button
              type="button"
              className="hamburger-btn"
              onClick={() => setSidebarOpen((v) => !v)}
              aria-label="Menú"
            >
              &#9776;
            </button>

            <div className="hud-brand">
              <div className="logo-frame small">
                <img src="/logo-warden.png" alt="Exanton Warden" />
              </div>
              <div>
                <strong>WARDEN SOC</strong>
                <span className="hud-live mono">
                  <span className="live-dot" /> SSE LIVE &bull;{" "}
                  {lastSyncedAt || "--:--"}
                </span>
              </div>
            </div>
          </div>

          <div className="hud-kpis">
            <button
              type="button"
              className="hud-kpi"
              onClick={() => selectTab("soc")}
            >
              <span className="hud-kpi-lbl">EN LÍNEA</span>
              <strong className="mono">
                {onlineVehiclesCount}/{vehicles.length}
              </strong>
            </button>
            <button
              type="button"
              className="hud-kpi"
              onClick={() => selectTab("users")}
            >
              <span className="hud-kpi-lbl">CUENTAS</span>
              <strong className="mono">{totalUsers}</strong>
            </button>
            <button
              type="button"
              className="hud-kpi"
              onClick={() => selectTab("documents")}
            >
              <span className="hud-kpi-lbl">DOCS PEND.</span>
              <strong
                className="mono"
                style={{ color: pendingDocsCount > 0 ? "#ff6b7f" : undefined }}
              >
                {pendingDocsCount}
              </strong>
            </button>
            <button
              type="button"
              className="hud-kpi"
              onClick={() => selectTab("incidents")}
            >
              <span className="hud-kpi-lbl">INCIDENTES</span>
              <strong
                className="mono"
                style={{ color: openIncidentsCount > 0 ? "#ff6b7f" : undefined }}
              >
                {openIncidentsCount}
              </strong>
            </button>
            <button
              type="button"
              className="hud-kpi"
              onClick={() => selectTab("hardware")}
            >
              <span className="hud-kpi-lbl">SILENCIOSOS</span>
              <strong
                className="mono"
                style={{
                  color:
                    (health?.silentVehiclesCount ?? 0) > 0
                      ? "#fbbf24"
                      : undefined,
                }}
              >
                {health?.silentVehiclesCount ?? 0}
              </strong>
            </button>
          </div>

          <div className="hud-right">
            <div className="search-box">
              <IconSearch />
              <input
                type="search"
                placeholder="Buscar unidad, email, IMEI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className={`btn btn-sm hud-heat-btn ${
                showHeatmap ? "btn-primary" : "btn-glass"
              }`}
              onClick={() => setShowHeatmap((v) => !v)}
              title="Alternar mapa de calor de incidentes"
            >
              Mapa de Calor
            </button>
            <button
              type="button"
              className="btn btn-glass btn-sm"
              onClick={() => void loadAll()}
              title="Actualizar ahora"
            >
              <IconRefresh size={14} />
            </button>
            <button
              type="button"
              className="btn btn-glass btn-sm"
              onClick={() => setDockOpen(false)}
            >
              Ocultar Interfaz
            </button>
          </div>
        </header>
      )}

      {dockOpen && (
        <aside className={`soc-rail ${sidebarOpen ? "open" : ""}`}>
          <nav className="rail-nav">
            <button
              type="button"
              className={`rail-btn ${tab === "soc" ? "active" : ""}`}
              onClick={() => selectTab("soc")}
            >
              <IconMap />
              <span>Mapa SOC</span>
            </button>
            <button
              type="button"
              className={`rail-btn ${tab === "incidents" ? "active" : ""}`}
              onClick={() => selectTab("incidents")}
            >
              <IconShield />
              <span>Alertas</span>
              {openIncidentsCount > 0 && (
                <span className="rail-badge">{openIncidentsCount}</span>
              )}
            </button>
            <button
              type="button"
              className={`rail-btn ${tab === "metrics" ? "active" : ""}`}
              onClick={() => selectTab("metrics")}
            >
              <IconDashboard />
              <span>Métricas</span>
            </button>
            <button
              type="button"
              className={`rail-btn ${tab === "hardware" ? "active" : ""}`}
              onClick={() => selectTab("hardware")}
            >
              <IconMap />
              <span>Hardware</span>
            </button>
            <button
              type="button"
              className={`rail-btn ${tab === "documents" ? "active" : ""}`}
              onClick={() => selectTab("documents")}
            >
              <IconDocuments />
              <span>Docs</span>
              {pendingDocsCount > 0 && (
                <span className="rail-badge">{pendingDocsCount}</span>
              )}
            </button>
            <button
              type="button"
              className={`rail-btn ${tab === "users" ? "active" : ""}`}
              onClick={() => selectTab("users")}
            >
              <IconUsers />
              <span>Cuentas</span>
            </button>
            <button
              type="button"
              className={`rail-btn ${tab === "leads" ? "active" : ""}`}
              onClick={() => selectTab("leads")}
            >
              <IconLeads />
              <span>Leads</span>
            </button>
            <button
              type="button"
              className={`rail-btn ${tab === "platform" ? "active" : ""}`}
              onClick={() => selectTab("platform")}
            >
              <IconDashboard />
              <span>SaaS</span>
            </button>
            <button
              type="button"
              className={`rail-btn ${tab === "audit" ? "active" : ""}`}
              onClick={() => selectTab("audit")}
            >
              <IconShield />
              <span>Auditoría</span>
            </button>
          </nav>

          <div className="rail-footer">
            <div className="avatar-circle" title={owner.email}>
              {getInitials(owner.fullName)}
            </div>
            <button
              type="button"
              className="rail-logout"
              onClick={handleLogout}
              title="Cerrar Sesión"
            >
              <IconLogout size={16} />
            </button>
          </div>
        </aside>
      )}

      {(feedback || dataErr) && (
        <div className="soc-toast-stack">
          {feedback && <div className="alert-success">{feedback}</div>}
          {dataErr && <div className="alert-error">{dataErr}</div>}
        </div>
      )}

      {tab === "soc" && dockOpen && (
        <SocDockPanel
          vehicles={filteredVehicles}
          onlineCount={onlineVehiclesCount}
          selectedVehicleId={selectedVehicleId}
          selectedVehicle={selectedVehicle}
          selectedAddress={selectedAddress}
          showHeatmap={showHeatmap}
          auditLogs={auditLogs}
          onToggleHeatmap={() => setShowHeatmap((v) => !v)}
          onSelectVehicle={(id) => {
            setSelectedVehicleId(id);
            setFocusTrigger((n) => n + 1);
          }}
          onSendCommand={handleSocCommand}
          onOpenAudit={() => selectTab("audit")}
        />
      )}

      {dockOpen && tab !== "soc" && (
        <div className="soc-overlay-panel">
          <div className="overlay-header">
            <div>
              <span className="breadcrumb mono">
                SOC OVERLAY / {tab.toUpperCase()}
              </span>
              <h2>
                {tab === "incidents"
                  ? `Cola de Incidentes SOC (${openIncidentsCount} activos)`
                  : tab === "metrics"
                  ? `Métricas Ejecutivas • MRR $${mrrUsd.toLocaleString()} USD`
                  : tab === "hardware"
                  ? `Inventario GPS / SIM & Gateway (${hardwareItems.length})`
                  : tab === "documents"
                  ? `Revisión de Documentos (${filteredDocs.length})`
                  : tab === "users"
                  ? `Cuentas, Roles & Operadores (${filteredUsers.length})`
                  : tab === "leads"
                  ? `CRM Leads Comerciales (${filteredLeads.length} • ${totalLeadUnits} unidades)`
                  : tab === "platform"
                  ? `Planes Globales SaaS & Broadcasts`
                  : `Auditoría Global Inmutable (${filteredAudit.length})`}
              </h2>
            </div>
            <button
              type="button"
              className="btn btn-glass btn-sm"
              onClick={() => selectTab("soc")}
            >
              Volver al Mapa
            </button>
          </div>

          <div className="overlay-body">
            {tab === "incidents" && (
              <IncidentsPanel
                incidents={incidents}
                onLocateVehicle={(vehicleId) => {
                  setSelectedVehicleId(vehicleId);
                  setFocusTrigger((n) => n + 1);
                  selectTab("soc");
                }}
                onUpdateIncident={handleIncidentUpdate}
                onNotify={notify}
                onError={showError}
              />
            )}

            {tab === "metrics" && (
              <MetricsPanel
                totalUsers={totalUsers}
                activeUsers={activeUsers}
                pendingUsers={pendingUsers}
                suspendedUsers={suspendedUsers}
                cutEvents={cutEvents}
                sosEvents={sosEvents}
                docEvents={docEvents}
                totalAuditLogs={auditLogs.length}
              />
            )}

            {tab === "hardware" && (
              <HardwarePanel
                items={hardwareItems}
                users={users}
                vehicles={vehicles}
                health={health}
                onRefresh={loadAll}
                onNotify={notify}
                onError={showError}
              />
            )}

            {tab === "documents" && (
              <DocumentsPanel
                documents={filteredDocs}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onReview={handleReviewDoc}
                onError={showError}
              />
            )}

            {tab === "users" && (
              <UsersPanel
                users={filteredUsers}
                ownerId={owner.id}
                getInitials={getInitials}
                onUpdateStatus={handleUserStatus}
                onSavePlan={handleSavePlan}
                onRefresh={loadAll}
                onNotify={notify}
                onError={showError}
              />
            )}

            {tab === "leads" && (
              <LeadsPanel
                leads={filteredLeads}
                onRefresh={loadAll}
                onNotify={notify}
                onError={showError}
              />
            )}

            {tab === "platform" && (
              <PlatformPanel
                plans={planCatalog}
                broadcasts={broadcasts}
                mrrUsd={mrrUsd}
                activeAccountsCount={activeUsers}
                onRefresh={loadAll}
                onNotify={notify}
                onError={showError}
              />
            )}

            {tab === "audit" && (
              <AuditPanel logs={filteredAudit} onError={showError} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
