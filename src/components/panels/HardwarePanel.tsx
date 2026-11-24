import React, { useState } from "react";
import {
  AdminHealthStatus,
  AdminUser,
  AdminVehicleItem,
  HardwareDeviceItem,
  createHardwareDevice,
  deleteHardwareDevice,
  importHardwareDevices,
  linkGpsToUser,
  sendBatchCommand,
  unlinkAdminVehicle,
} from "../../services/adminApi";

interface HardwarePanelProps {
  items: HardwareDeviceItem[];
  users: AdminUser[];
  vehicles: AdminVehicleItem[];
  health: AdminHealthStatus | null;
  onRefresh: () => Promise<void>;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

export const HardwarePanel: React.FC<HardwarePanelProps> = ({
  items,
  users,
  vehicles,
  health,
  onRefresh,
  onNotify,
  onError,
}) => {
  const [imei, setImei] = useState("");
  const [iccid, setIccid] = useState("");
  const [simNumber, setSimNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [gpsModel, setGpsModel] = useState("COBAN_TK103");
  const [bulkText, setBulkText] = useState("");
  const [batchCmd, setBatchCmd] = useState("B");
  const [selectedImeis, setSelectedImeis] = useState<string[]>([]);

  // Vincular GPS a Cliente / Vehículo
  const [linkUserId, setLinkUserId] = useState(users[0]?.id ?? "");
  const [linkImei, setLinkImei] = useState("");
  const [linkAlias, setLinkAlias] = useState("");
  const [linkPlate, setLinkPlate] = useState("");
  const [linkModel, setLinkModel] = useState("COBAN_TK103");
  const [linkTier, setLinkTier] =
    useState<AdminVehicleItem["serviceTier"]>("PLUS_SCORING");
  const [linking, setLinking] = useState(false);

  const handleLinkGps = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUserId = linkUserId || users[0]?.id;
    if (!targetUserId) {
      onError("Seleccioná un cliente para vincular el GPS.");
      return;
    }
    setLinking(true);
    try {
      await linkGpsToUser({
        userId: targetUserId,
        imei: linkImei.trim(),
        alias: linkAlias.trim(),
        plate: linkPlate.trim(),
        gpsModel: linkModel,
        serviceTier: linkTier,
      });
      setLinkImei("");
      setLinkAlias("");
      setLinkPlate("");
      onNotify("GPS vinculado al cliente exitosamente.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error vinculando GPS");
    } finally {
      setLinking(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createHardwareDevice({
        imei: imei.trim(),
        iccid: iccid.trim() || undefined,
        simNumber: simNumber.trim() || undefined,
        carrier: carrier.trim() || undefined,
        gpsModel,
      });
      setImei("");
      setIccid("");
      setSimNumber("");
      setCarrier("");
      onNotify("Equipo GPS / SIM agregado al inventario.");
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error agregando equipo");
    }
  };

  const handleBulkImport = async () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const parsed = lines.map((line) => {
      const [rowImei, rowIccid, rowSim, rowCarrier, rowModel] = line
        .split(",")
        .map((c) => c.trim());
      return {
        imei: rowImei,
        iccid: rowIccid || undefined,
        simNumber: rowSim || undefined,
        carrier: rowCarrier || undefined,
        gpsModel: rowModel || "COBAN_TK103",
      };
    });

    try {
      const res = await importHardwareDevices(parsed);
      setBulkText("");
      onNotify(
        `Importación masiva: ${res.created} creados, ${res.skipped} omitidos.`
      );
      await onRefresh();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error importando CSV");
    }
  };

  const handleBatchCommand = async () => {
    if (selectedImeis.length === 0 || !batchCmd.trim()) return;
    try {
      const res = await sendBatchCommand(selectedImeis, batchCmd.trim());
      onNotify(
        `Comando "${batchCmd}" enviado: ${res.sent} online, ${res.offline} offline.`
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error enviando lote");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Salud de Infraestructura y Gateway TCP */}
      {health && (
        <div className="glass-card">
          <div className="card-head">
            <h3>Salud de Infraestructura &amp; Gateway TCP</h3>
            <span className="status-pill active">
              Puerto TCP: {health.gateway.tcpPort}
            </span>
          </div>
          <div className="dock-telemetry mono" style={{ flexWrap: "wrap", gap: 12 }}>
            <span>
              PostgreSQL:{" "}
              <strong style={{ color: health.database === "ok" ? "#34d399" : "#ff6b7f" }}>
                {health.database.toUpperCase()}
              </strong>
            </span>
            <span>
              Redis:{" "}
              <strong
                style={{
                  color:
                    health.redis === "connected"
                      ? "#34d399"
                      : health.redis === "disabled"
                      ? "#fbbf24"
                      : "#ff6b7f",
                }}
              >
                {health.redis.toUpperCase()}
              </strong>
            </span>
            <span>Storage: {health.storage.toUpperCase()}</span>
            <span>Sockets TCP Activos: {health.gateway.activeConnections}</span>
            <span
              style={{
                color: health.silentVehiclesCount > 0 ? "#fbbf24" : "#34d399",
              }}
            >
              Equipos Silenciosos (&gt;24h): {health.silentVehiclesCount}
            </span>
          </div>

          {health.silentVehicles.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="sub" style={{ marginBottom: 6 }}>
                Unidades sin reporte reciente:
              </div>
              <div className="list-col">
                {health.silentVehicles.slice(0, 6).map((sv) => (
                  <div key={sv.id} className="item-row" style={{ padding: "8px 10px" }}>
                    <span className="mono">
                      <strong>{sv.alias}</strong> ({sv.plate}) &bull; IMEI {sv.imei}
                    </span>
                    <span className="sub mono">
                      Último reporte:{" "}
                      {sv.lastSeenAt
                        ? new Date(sv.lastSeenAt).toLocaleString()
                        : "Nunca"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass-card" id="link-gps-card">
        <h3>Vincular GPS a Cliente / Vehículo</h3>
        <p className="sub" style={{ marginBottom: 12 }}>
          Asigná un rastreador del inventario (o un IMEI nuevo) directamente a
          la cuenta de un cliente.
        </p>
        <form
          className="login-form"
          style={{ gap: 10 }}
          onSubmit={handleLinkGps}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 10,
            }}
          >
            <div className="field">
              <label>Cliente</label>
              <select
                className="select-input"
                value={linkUserId || users[0]?.id || ""}
                onChange={(e) => setLinkUserId(e.target.value)}
                required
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Desde Inventario (opcional)</label>
              <select
                className="select-input"
                value=""
                onChange={(e) => {
                  const found = items.find((it) => it.imei === e.target.value);
                  if (found) {
                    setLinkImei(found.imei);
                    setLinkModel(found.gpsModel);
                  }
                }}
              >
                <option value="">-- Elegir GPS en STOCK --</option>
                {items
                  .filter((it) => it.simStatus === "STOCK")
                  .map((it) => (
                    <option key={it.id} value={it.imei}>
                      {it.imei} ({it.gpsModel})
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>IMEI (15 dígitos)</label>
              <input
                type="text"
                maxLength={15}
                pattern="\d{15}"
                placeholder="860123456789012"
                value={linkImei}
                onChange={(e) => setLinkImei(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Alias de la Unidad</label>
              <input
                type="text"
                placeholder="Ej. Hilux Reparto #01"
                value={linkAlias}
                onChange={(e) => setLinkAlias(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Tablilla / Patente</label>
              <input
                type="text"
                placeholder="Ej. JKL-402"
                value={linkPlate}
                onChange={(e) => setLinkPlate(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Modelo GPS</label>
              <select
                className="select-input"
                value={linkModel}
                onChange={(e) => setLinkModel(e.target.value)}
              >
                <option value="COBAN_TK103">Coban TK103</option>
                <option value="COBAN_TK303">Coban TK303</option>
                <option value="CONCOX_GT06">Concox GT06</option>
                <option value="TELTONIKA_FMC130">Teltonika FMC130</option>
                <option value="OBD_PRO">OBD-II Pro</option>
              </select>
            </div>
            <div className="field">
              <label>Paquete de Servicio</label>
              <select
                className="select-input"
                value={linkTier}
                onChange={(e) =>
                  setLinkTier(
                    e.target.value as AdminVehicleItem["serviceTier"]
                  )
                }
              >
                <option value="TRACKING_ONLY">Solo Rastreo</option>
                <option value="PLUS_SCORING">Plus (Scoring + Geocercas)</option>
                <option value="FULL_STATUS">Full Status (OBD-II)</option>
              </select>
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={linking || users.length === 0}
            >
              {linking ? "Vinculando..." : "Vincular GPS al Cliente"}
            </button>
          </div>
        </form>
      </div>

      <div className="dash-panels-2">
        <div className="glass-card">
          <h3>Alta de Equipo GPS &amp; SIM M2M</h3>
          <form className="login-form" onSubmit={handleAdd}>
            <div className="field">
              <label>IMEI (15 dígitos)</label>
              <input
                type="text"
                maxLength={15}
                pattern="\d{15}"
                placeholder="860123456789012"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>ICCID SIM (opcional)</label>
              <input
                type="text"
                placeholder="8954..."
                value={iccid}
                onChange={(e) => setIccid(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Número SIM / Operadora</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="+1 787..."
                  value={simNumber}
                  onChange={(e) => setSimNumber(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Claro / T-Mobile"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label>Modelo GPS</label>
              <select
                className="select-input"
                value={gpsModel}
                onChange={(e) => setGpsModel(e.target.value)}
              >
                <option value="COBAN_TK103">Coban TK103</option>
                <option value="COBAN_TK303">Coban TK303</option>
                <option value="CONCOX_GT06">Concox GT06</option>
                <option value="TELTONIKA_FMC130">Teltonika FMC130</option>
                <option value="OBD_PRO">OBD-II Pro</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              Registrar en Inventario
            </button>
          </form>
        </div>

        <div className="glass-card">
          <h3>Importación Masiva (CSV) &amp; Comandos por Lote</h3>
          <p className="sub" style={{ marginBottom: 8 }}>
            Formato por línea: <span className="mono">imei,iccid,telefono,operadora,modelo</span>
          </p>
          <textarea
            className="select-input"
            rows={4}
            style={{ width: "100%", fontFamily: "monospace", fontSize: 12 }}
            placeholder="860123456789012,895400001,+17875550001,Claro,COBAN_TK103"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-glass btn-sm"
            style={{ marginTop: 8 }}
            onClick={() => void handleBulkImport()}
          >
            Importar Lote
          </button>

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border-glass)" }}>
            <div className="sub" style={{ marginBottom: 6 }}>
              Enviar comando TCP a {selectedImeis.length} equipos seleccionados:
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                className="select-input"
                value={batchCmd}
                onChange={(e) => setBatchCmd(e.target.value)}
                placeholder="B / A / RESET"
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={selectedImeis.length === 0}
                onClick={() => void handleBatchCommand()}
              >
                Ejecutar Lote
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Inventario */}
      <div className="glass-card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sel</th>
              <th>IMEI</th>
              <th>Modelo</th>
              <th>SIM / ICCID</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const checked = selectedImeis.includes(item.imei);
              return (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedImeis((prev) =>
                          checked
                            ? prev.filter((x) => x !== item.imei)
                            : [...prev, item.imei]
                        )
                      }
                    />
                  </td>
                  <td className="mono">{item.imei}</td>
                  <td className="mono">{item.gpsModel}</td>
                  <td className="mono">
                    {item.simNumber || "-"} {item.carrier ? `(${item.carrier})` : ""}
                    {item.iccid && <div className="sub">{item.iccid}</div>}
                  </td>
                  <td>
                    <span className="status-pill active">{item.simStatus}</span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {item.simStatus === "STOCK" && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setLinkImei(item.imei);
                            setLinkModel(item.gpsModel);
                            document
                              .getElementById("link-gps-card")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
                        >
                          Vincular
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost-danger btn-sm"
                        onClick={async () => {
                          try {
                            await deleteHardwareDevice(item.id);
                            onNotify("Equipo eliminado del inventario.");
                            await onRefresh();
                          } catch (err) {
                            onError(
                              err instanceof Error
                                ? err.message
                                : "Error eliminando"
                            );
                          }
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Unidades Vinculadas */}
      <div className="glass-card table-wrap">
        <div className="card-head">
          <h3>Unidades GPS Vinculadas ({vehicles.length})</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Unidad / Tablilla</th>
              <th>IMEI</th>
              <th>Cliente</th>
              <th>Modelo / Paquete</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const owner = users.find((u) => u.id === v.userId);
              return (
                <tr key={v.id}>
                  <td>
                    <strong>{v.alias}</strong> ({v.plate})
                  </td>
                  <td className="mono">{v.imei}</td>
                  <td className="mono">
                    {owner ? `${owner.fullName} (${owner.email})` : v.userId}
                  </td>
                  <td className="mono">
                    {v.gpsModel} &bull; {v.serviceTier}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost-danger btn-sm"
                      onClick={async () => {
                        try {
                          await unlinkAdminVehicle(v.id);
                          onNotify(`Unidad ${v.alias} desvinculada.`);
                          await onRefresh();
                        } catch (err) {
                          onError(
                            err instanceof Error
                              ? err.message
                              : "Error desvinculando"
                          );
                        }
                      }}
                    >
                      Desvincular
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
