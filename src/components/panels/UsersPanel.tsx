import React, { useState } from "react";
import {
  AdminUser,
  createSocOperator,
  impersonateUser,
} from "../../services/adminApi";

interface UsersPanelProps {
  users: AdminUser[];
  ownerId: string;
  getInitials: (name: string) => string;
  onUpdateStatus: (
    id: string,
    nextStatus: "PENDING_DOCS" | "ACTIVE" | "SUSPENDED"
  ) => Promise<void>;
  onSavePlan: (
    userId: string,
    draft: {
      planName: NonNullable<AdminUser["planName"]>;
      subscriptionStatus: NonNullable<AdminUser["subscriptionStatus"]>;
      maxVehicles: number;
      monthlyPriceUsd: number;
    }
  ) => Promise<boolean>;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

const WEB_APP_URL =
  (import.meta as unknown as { env?: { VITE_WEB_URL?: string } }).env
    ?.VITE_WEB_URL ?? "https://warden.exanton.com";

const OPERATOR_PERM_OPTIONS = [
  "soc:read",
  "incidents:manage",
  "docs:review",
  "relay:cut",
  "billing:manage",
  "users:impersonate",
];

export const UsersPanel: React.FC<UsersPanelProps> = ({
  users,
  ownerId,
  getInitials,
  onUpdateStatus,
  onSavePlan,
  onRefresh,
  onNotify,
  onError,
}) => {
  const [editingPlanUserId, setEditingPlanUserId] = useState<string | null>(
    null
  );
  const [planDraft, setPlanDraft] = useState<{
    planName: NonNullable<AdminUser["planName"]>;
    subscriptionStatus: NonNullable<AdminUser["subscriptionStatus"]>;
    maxVehicles: number;
    monthlyPriceUsd: number;
  }>({
    planName: "TRACKING",
    subscriptionStatus: "ACTIVE",
    maxVehicles: 3,
    monthlyPriceUsd: 15,
  });

  const [opName, setOpName] = useState("");
  const [opEmail, setOpEmail] = useState("");
  const [opPass, setOpPass] = useState("");
  const [opPerms, setOpPerms] = useState<string[]>([
    "soc:read",
    "incidents:manage",
    "docs:review",
  ]);

  const handleSave = async (userId: string) => {
    const ok = await onSavePlan(userId, planDraft);
    if (ok) setEditingPlanUserId(null);
  };

  const handleImpersonate = async (user: AdminUser) => {
    try {
      const res = await impersonateUser(user.id);
      const url = `${WEB_APP_URL.replace(
        /\/+$/,
        ""
      )}/?impersonate=${encodeURIComponent(res.token)}`;
      window.open(url, "_blank", "noopener");
      onNotify(`Sesión de soporte abierta para ${user.fullName}.`);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error impersonando cuenta");
    }
  };

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSocOperator({
        fullName: opName,
        email: opEmail,
        password: opPass,
        permissions: opPerms,
      });
      setOpName("");
      setOpEmail("");
      setOpPass("");
      onNotify("Operador SOC creado.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error creando operador");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="glass-card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Plan &amp; Cupo</th>
              <th>Estado / KYC</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="user-cell">
                    <span className="avatar-mini">
                      {getInitials(u.fullName)}
                    </span>
                    <div>
                      <strong>{u.fullName}</strong>
                      {u.companyName && <div className="sub">{u.companyName}</div>}
                    </div>
                  </div>
                </td>
                <td className="mono">{u.email}</td>
                <td className="mono">
                  {editingPlanUserId === u.id ? (
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                      <select
                        className="select-input"
                        style={{ padding: "3px 6px", fontSize: "11px" }}
                        value={planDraft.planName}
                        onChange={(e) =>
                          setPlanDraft((p) => ({
                            ...p,
                            planName: e.target.value as typeof p.planName,
                          }))
                        }
                      >
                        <option value="FREE">FREE</option>
                        <option value="TRACKING">TRACKING</option>
                        <option value="PLUS_SCORING">PLUS_SCORING</option>
                        <option value="FULL_STATUS">FULL_STATUS</option>
                        <option value="ENTERPRISE">ENTERPRISE</option>
                      </select>
                      <select
                        className="select-input"
                        style={{ padding: "3px 6px", fontSize: "11px" }}
                        value={planDraft.subscriptionStatus}
                        onChange={(e) =>
                          setPlanDraft((p) => ({
                            ...p,
                            subscriptionStatus: e.target
                              .value as typeof p.subscriptionStatus,
                          }))
                        }
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="PAST_DUE">PAST_DUE</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                      </select>
                      <input
                        type="number"
                        className="select-input"
                        style={{
                          width: "54px",
                          padding: "3px 6px",
                          fontSize: "11px",
                        }}
                        value={planDraft.maxVehicles}
                        onChange={(e) =>
                          setPlanDraft((p) => ({
                            ...p,
                            maxVehicles: Number(e.target.value) || 1,
                          }))
                        }
                        title="Máximo de vehículos"
                      />
                      <input
                        type="number"
                        className="select-input"
                        style={{
                          width: "60px",
                          padding: "3px 6px",
                          fontSize: "11px",
                        }}
                        value={planDraft.monthlyPriceUsd}
                        onChange={(e) =>
                          setPlanDraft((p) => ({
                            ...p,
                            monthlyPriceUsd: Number(e.target.value) || 0,
                          }))
                        }
                        title="USD/mes"
                      />
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => void handleSave(u.id)}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="btn btn-glass btn-sm"
                        onClick={() => setEditingPlanUserId(null)}
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <div>
                      <strong>{u.planName || "TRACKING"}</strong> (
                      {u.maxVehicles ?? 3} u.) &bull; ${u.monthlyPriceUsd ?? 15}
                      /mes
                      <div className="sub">
                        Sub: {u.subscriptionStatus || "ACTIVE"} &bull; {u.role}
                      </div>
                    </div>
                  )}
                </td>
                <td>
                  <span
                    className={`status-pill ${u.onboardingStatus.toLowerCase()}`}
                  >
                    {u.onboardingStatus}
                  </span>
                  {u.kycStatus && (
                    <div className="sub mono">KYC: {u.kycStatus}</div>
                  )}
                </td>
                <td>
                  {u.id === ownerId ? (
                    <span className="status-pill active">
                      Tu cuenta (Owner)
                    </span>
                  ) : (
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-glass btn-sm"
                        onClick={() => void handleImpersonate(u)}
                        title="Abrir Exanton Web como este usuario"
                      >
                        Ver como cliente
                      </button>
                      <button
                        type="button"
                        className="btn btn-glass btn-sm"
                        onClick={() => {
                          setEditingPlanUserId(u.id);
                          setPlanDraft({
                            planName: u.planName ?? "TRACKING",
                            subscriptionStatus: u.subscriptionStatus ?? "ACTIVE",
                            maxVehicles: u.maxVehicles ?? 3,
                            monthlyPriceUsd: u.monthlyPriceUsd ?? 15,
                          });
                        }}
                      >
                        Plan
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => void onUpdateStatus(u.id, "ACTIVE")}
                      >
                        Activar
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost-danger btn-sm"
                        onClick={() => void onUpdateStatus(u.id, "SUSPENDED")}
                      >
                        Suspender
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Operadores SOC RBAC */}
      <div className="glass-card">
        <h3>Crear Operador SOC (RBAC)</h3>
        <p className="sub" style={{ marginBottom: 12 }}>
          Creá cuentas de guardia nocturna con permisos granulares (sin corte de
          motor o facturación si no lo habilitás).
        </p>
        <form
          className="login-form"
          style={{ gap: 10 }}
          onSubmit={handleCreateOperator}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <input
              type="text"
              className="select-input"
              placeholder="Nombre completo"
              value={opName}
              onChange={(e) => setOpName(e.target.value)}
              required
            />
            <input
              type="email"
              className="select-input"
              placeholder="operador@exanton.com"
              value={opEmail}
              onChange={(e) => setOpEmail(e.target.value)}
              required
            />
            <input
              type="password"
              className="select-input"
              minLength={8}
              placeholder="Contraseña (mín. 8)"
              value={opPass}
              onChange={(e) => setOpPass(e.target.value)}
              required
            />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {OPERATOR_PERM_OPTIONS.map((perm) => {
              const active = opPerms.includes(perm);
              return (
                <button
                  key={perm}
                  type="button"
                  className={`btn btn-sm ${active ? "btn-primary" : "btn-glass"}`}
                  onClick={() =>
                    setOpPerms((prev) =>
                      active ? prev.filter((p) => p !== perm) : [...prev, perm]
                    )
                  }
                >
                  {perm}
                </button>
              );
            })}
          </div>
          <div>
            <button type="submit" className="btn btn-primary btn-sm">
              Crear Operador SOC
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
