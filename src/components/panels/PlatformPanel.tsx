import React, { useState } from "react";
import {
  PlanCatalogItem,
  PlatformBroadcastItem,
  createBroadcast,
  toggleBroadcast,
  updatePlanCatalog,
} from "../../services/adminApi";

interface PlatformPanelProps {
  plans: PlanCatalogItem[];
  broadcasts: PlatformBroadcastItem[];
  mrrUsd: number;
  activeAccountsCount: number;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export const PlatformPanel: React.FC<PlatformPanelProps> = ({
  plans,
  broadcasts,
  mrrUsd,
  activeAccountsCount,
  onRefresh,
  onNotify,
  onError,
}) => {
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    displayName: "",
    monthlyPriceUsd: 15,
    maxVehicles: 3,
    historyRetentionDays: 30,
  });

  const [bTitle, setBTitle] = useState("");
  const [bMessage, setBMessage] = useState("");
  const [bSeverity, setBSeverity] =
    useState<PlatformBroadcastItem["severity"]>("INFO");
  const [bTarget, setBTarget] = useState("ALL");

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBroadcast({
        title: bTitle,
        message: bMessage,
        severity: bSeverity,
        targetPlan: bTarget,
      });
      setBTitle("");
      setBMessage("");
      onNotify("Aviso publicado para Exanton Web.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error creando aviso");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Catálogo Global de Planes */}
      <div className="glass-card table-wrap">
        <div className="card-head">
          <h3>Catálogo Global de Planes &amp; SaaS</h3>
          <span className="status-pill active mono">
            MRR: ${mrrUsd.toLocaleString()} USD &bull; {activeAccountsCount} activas
          </span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Precio/mes</th>
              <th>Máx. Vehículos</th>
              <th>Retención</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p) => (
              <tr key={p.id}>
                <td className="mono">
                  <strong>{p.code}</strong>
                </td>
                <td>
                  {editingCode === p.code ? (
                    <input
                      type="text"
                      className="select-input"
                      value={draft.displayName}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, displayName: e.target.value }))
                      }
                    />
                  ) : (
                    p.displayName
                  )}
                </td>
                <td className="mono">
                  {editingCode === p.code ? (
                    <input
                      type="number"
                      className="select-input"
                      style={{ width: 80 }}
                      value={draft.monthlyPriceUsd}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          monthlyPriceUsd: Number(e.target.value) || 0,
                        }))
                      }
                    />
                  ) : (
                    `$${p.monthlyPriceUsd} USD`
                  )}
                </td>
                <td className="mono">
                  {editingCode === p.code ? (
                    <input
                      type="number"
                      className="select-input"
                      style={{ width: 70 }}
                      value={draft.maxVehicles}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          maxVehicles: Number(e.target.value) || 1,
                        }))
                      }
                    />
                  ) : (
                    p.maxVehicles
                  )}
                </td>
                <td className="mono">
                  {editingCode === p.code ? (
                    <input
                      type="number"
                      className="select-input"
                      style={{ width: 70 }}
                      value={draft.historyRetentionDays}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          historyRetentionDays: Number(e.target.value) || 7,
                        }))
                      }
                    />
                  ) : (
                    `${p.historyRetentionDays} días`
                  )}
                </td>
                <td>
                  {editingCode === p.code ? (
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                          try {
                            await updatePlanCatalog(p.code, draft);
                            setEditingCode(null);
                            onNotify(`Plan ${p.code} actualizado.`);
                            await onRefresh();
                          } catch (err) {
                            onError(
                              err instanceof Error
                                ? err.message
                                : "Error guardando plan"
                            );
                          }
                        }}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="btn btn-glass btn-sm"
                        onClick={() => setEditingCode(null)}
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-glass btn-sm"
                      onClick={() => {
                        setEditingCode(p.code);
                        setDraft({
                          displayName: p.displayName,
                          monthlyPriceUsd: p.monthlyPriceUsd,
                          maxVehicles: p.maxVehicles,
                          historyRetentionDays: p.historyRetentionDays,
                        });
                      }}
                    >
                      Editar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Broadcasts / Avisos en Plataforma */}
      <div className="dash-panels-2">
        <div className="glass-card">
          <h3>Publicar Aviso en Exanton Web</h3>
          <form className="login-form" onSubmit={handleCreateBroadcast}>
            <div className="field">
              <label>Título del aviso</label>
              <input
                type="text"
                placeholder="Ej. Mantenimiento programado 02:00 AM"
                value={bTitle}
                onChange={(e) => setBTitle(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Mensaje</label>
              <textarea
                className="select-input"
                rows={3}
                placeholder="Detalle visible para los clientes..."
                value={bMessage}
                onChange={(e) => setBMessage(e.target.value)}
                required
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                className="select-input"
                value={bSeverity}
                onChange={(e) =>
                  setBSeverity(
                    e.target.value as PlatformBroadcastItem["severity"]
                  )
                }
              >
                <option value="INFO">INFO</option>
                <option value="WARNING">WARNING</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
              <select
                className="select-input"
                value={bTarget}
                onChange={(e) => setBTarget(e.target.value)}
              >
                <option value="ALL">Todos los planes</option>
                <option value="FREE">FREE</option>
                <option value="TRACKING">TRACKING</option>
                <option value="PLUS_SCORING">PLUS_SCORING</option>
                <option value="FULL_STATUS">FULL_STATUS</option>
                <option value="ENTERPRISE">ENTERPRISE</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Publicar Aviso
            </button>
          </form>
        </div>

        <div className="glass-card">
          <h3>Historial de Avisos ({broadcasts.length})</h3>
          {broadcasts.length === 0 ? (
            <p className="muted">Sin avisos publicados.</p>
          ) : (
            <div className="list-col">
              {broadcasts.map((b) => (
                <div key={b.id} className="item-row">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span
                        className={`status-pill ${
                          b.severity === "CRITICAL"
                            ? "rejected"
                            : b.severity === "WARNING"
                            ? "pending"
                            : "active"
                        }`}
                      >
                        {b.severity}
                      </span>
                      <strong>{b.title}</strong>
                    </div>
                    <div className="sub">{b.message}</div>
                    <div className="sub mono">
                      Target: {b.targetPlan} &bull; {b.active ? "ACTIVO" : "PAUSADO"}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-glass btn-sm"
                    onClick={async () => {
                      try {
                        await toggleBroadcast(b.id);
                        await onRefresh();
                      } catch (err) {
                        onError(
                          err instanceof Error ? err.message : "Error actualizando"
                        );
                      }
                    }}
                  >
                    {b.active ? "Pausar" : "Activar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
