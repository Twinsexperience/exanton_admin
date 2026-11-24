import React, { useState } from "react";
import { AdminUser } from "../../services/adminApi";

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
}

export const UsersPanel: React.FC<UsersPanelProps> = ({
  users,
  ownerId,
  getInitials,
  onUpdateStatus,
  onSavePlan,
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

  const handleSave = async (userId: string) => {
    const ok = await onSavePlan(userId, planDraft);
    if (ok) setEditingPlanUserId(null);
  };

  return (
    <div className="glass-card table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Email</th>
            <th>Plan &amp; Cupo</th>
            <th>Estado</th>
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
              </td>
              <td>
                {u.id === ownerId ? (
                  <span className="status-pill active">
                    Tu cuenta (Protegida)
                  </span>
                ) : (
                  <div className="row-actions">
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
  );
};
