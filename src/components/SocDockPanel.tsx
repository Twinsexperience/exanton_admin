import React, { useState } from "react";
import { AdminVehicleItem, AuditLogItem } from "../services/adminApi";
import { ConfirmModal } from "./ConfirmModal";

export type SocCommand =
  | "CUT_RELAY"
  | "RESTORE_RELAY"
  | "LOCATE"
  | "FIX030S"
  | "RESET"
  | "CUSTOM";

interface SocDockPanelProps {
  vehicles: AdminVehicleItem[];
  onlineCount: number;
  selectedVehicleId: string;
  selectedVehicle: AdminVehicleItem | null;
  selectedAddress: string;
  showHeatmap: boolean;
  auditLogs: AuditLogItem[];
  onToggleHeatmap: () => void;
  onSelectVehicle: (id: string) => void;
  onSendCommand: (cmd: SocCommand, rawCommand?: string) => Promise<boolean>;
  onOpenAudit: () => void;
}

export const SocDockPanel: React.FC<SocDockPanelProps> = ({
  vehicles,
  onlineCount,
  selectedVehicleId,
  selectedVehicle,
  selectedAddress,
  showHeatmap,
  auditLogs,
  onToggleHeatmap,
  onSelectVehicle,
  onSendCommand,
  onOpenAudit,
}) => {
  const [rawCobanCmd, setRawCobanCmd] = useState("");
  const [confirmCutOpen, setConfirmCutOpen] = useState(false);
  const [sendingCut, setSendingCut] = useState(false);

  const handleCustomSend = async () => {
    const trimmed = rawCobanCmd.trim();
    if (!trimmed) return;
    const ok = await onSendCommand("CUSTOM", trimmed);
    if (ok) setRawCobanCmd("");
  };

  return (
    <>
      <aside className="soc-dock-right">
        <div className="dock-section">
          <div className="dock-head">
            <h3>Flota Global ({vehicles.length})</h3>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                className={`btn btn-sm ${
                  showHeatmap ? "btn-primary" : "btn-glass"
                }`}
                style={{ padding: "3px 8px", fontSize: "10.5px" }}
                onClick={onToggleHeatmap}
              >
                {showHeatmap ? "Calor: ON" : "Mapa Calor"}
              </button>
              <span className="mono muted">{onlineCount} ON</span>
            </div>
          </div>

          {vehicles.length === 0 ? (
            <p className="muted">Sin unidades conectadas todavía.</p>
          ) : (
            <div className="dock-list">
              {vehicles.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`dock-unit ${
                    v.id === selectedVehicleId ? "active" : ""
                  }`}
                  onClick={() => onSelectVehicle(v.id)}
                >
                  <div className="dock-unit-top">
                    <strong>{v.alias}</strong>
                    <span
                      className={`status-pill ${
                        v.online ? "active" : "suspended"
                      }`}
                    >
                      {v.online ? "ONLINE" : "OFF"}
                    </span>
                  </div>
                  <div className="dock-unit-sub mono">
                    {v.plate} &bull; {Math.round(v.lastSpeedKmh)} km/h &bull;{" "}
                    {v.relayState}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedVehicle && (
          <div className="dock-section">
            <div className="dock-head">
              <h3>Control: {selectedVehicle.alias}</h3>
              <span className="mono muted">
                Score {selectedVehicle.driverScore}/100
              </span>
            </div>
            <div className="dock-telemetry mono">
              <span>IMEI: {selectedVehicle.imei}</span>
              <span>Relé: {selectedVehicle.relayState}</span>
            </div>
            {selectedAddress && (
              <div className="sub" style={{ marginBottom: 8, color: "#cbd5e1" }}>
                📍 {selectedAddress}
              </div>
            )}
            <div className="dock-actions">
              <button
                type="button"
                className="btn btn-ghost-danger btn-sm"
                onClick={() => setConfirmCutOpen(true)}
              >
                Corte (J)
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void onSendCommand("RESTORE_RELAY")}
              >
                Restaurar (K)
              </button>
              <button
                type="button"
                className="btn btn-glass btn-sm"
                onClick={() => void onSendCommand("LOCATE")}
              >
                Ubicar (A)
              </button>
              <button
                type="button"
                className="btn btn-glass btn-sm"
                onClick={() => void onSendCommand("FIX030S")}
              >
                Fix 30s
              </button>
              <button
                type="button"
                className="btn btn-glass btn-sm"
                onClick={() => void onSendCommand("RESET")}
              >
                Reset
              </button>
            </div>
            {selectedVehicle.lastRawFrame && (
              <div
                className="mono muted"
                style={{
                  fontSize: "10px",
                  marginTop: "8px",
                  padding: "6px 8px",
                  background: "rgba(5,6,10,0.65)",
                  borderRadius: "6px",
                  wordBreak: "break-all",
                }}
              >
                RAW: {selectedVehicle.lastRawFrame}
              </div>
            )}
            <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
              <input
                type="text"
                className="select-input"
                style={{ flex: 1, padding: "5px 8px", fontSize: "11px" }}
                placeholder="Comando Coban (ej. B, RESET)"
                value={rawCobanCmd}
                onChange={(e) => setRawCobanCmd(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-glass btn-sm"
                disabled={!rawCobanCmd.trim()}
                onClick={() => void handleCustomSend()}
              >
                Enviar
              </button>
            </div>
          </div>
        )}

        <div className="dock-section">
          <div className="dock-head">
            <h3>Últimas Acciones</h3>
            <button type="button" className="link-btn" onClick={onOpenAudit}>
              Ver todo
            </button>
          </div>
          <div className="dock-audit-list">
            {auditLogs.slice(0, 4).map((l) => (
              <div key={l.id} className="dock-audit-row">
                <strong className="mono">{l.action}</strong>
                <span className="mono muted">
                  {l.actorScope} &bull;{" "}
                  {new Date(l.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <ConfirmModal
        open={confirmCutOpen}
        title="Confirmar corte de motor (SuperAdmin)"
        message={
          selectedVehicle
            ? `¿Confirmás enviar CORTE DE MOTOR (J) a "${selectedVehicle.alias}" (${selectedVehicle.plate})?`
            : ""
        }
        confirmLabel="Enviar Corte (J)"
        danger
        busy={sendingCut}
        onConfirm={async () => {
          setSendingCut(true);
          try {
            await onSendCommand("CUT_RELAY");
          } finally {
            setSendingCut(false);
            setConfirmCutOpen(false);
          }
        }}
        onCancel={() => setConfirmCutOpen(false)}
      />
    </>
  );
};
