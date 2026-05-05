import { useState, useEffect, useMemo } from 'react';
import { Currency, formatCurrency } from '../utils/currency';

const API_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:4000';

type HistorialRow = {
  liquidacion_id:    number;
  reserva_id:        number;
  fecha:             string;
  propiedad:         string;
  propietario:       string;
  huesped:           string;
  numero_reserva:    string | null;
  recibido_neto_banco: number | null;
};
type IngresoRow  = { liquidacion_id: number | null; subtotal: number | null; impuesto_cargo: number | null; };
type CompraRow   = { liquidacion_id: number | null; valor_bruto: number | null; otros_impuestos: number | null; };
type ComisionRow = { liquidacion_id: number; comision: number | null; iva_comision_19: number | null; retencion_fuente: number | null; };

const fmt = (v: number | null | undefined) =>
  formatCurrency(v, currency);

const fmtDate = (d: string) => {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

export default function LiquidacionContrato({
  onNavigate,
  liquidacionId,
  currency = 'COP',
}: {
  onNavigate: (view: string) => void;
  liquidacionId: number | null;
  currency?: Currency;
}) {
  const [historial,   setHistorial]   = useState<HistorialRow[]>([]);
  const [ingresos,    setIngresos]    = useState<IngresoRow[]>([]);
  const [compras,     setCompras]     = useState<CompraRow[]>([]);
  const [comisiones,  setComisiones]  = useState<ComisionRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selId,       setSelId]       = useState<number | null>(liquidacionId);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [saveMsg,     setSaveMsg]     = useState('');
  const [deleting,    setDeleting]    = useState(false);

  useEffect(() => { if (liquidacionId !== null) { setSelId(liquidacionId); setSaved(false); setSaveMsg(''); } }, [liquidacionId]);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/historial`).then(r => r.json()),
      fetch(`${API_URL}/ingresos-propietario`).then(r => r.json()),
      fetch(`${API_URL}/comisiones-zectorem`).then(r => r.json()),
    ]).then(([hist, ing, com]) => {
      const seen = new Set<number>();
      setHistorial((hist as HistorialRow[]).filter(h => {
        if (seen.has(h.liquidacion_id)) return false;
        seen.add(h.liquidacion_id); return true;
      }));
      setIngresos(Array.isArray(ing) ? ing as IngresoRow[] : []);
      setComisiones(Array.isArray(com) ? com as ComisionRow[] : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Refetch compras filtered server-side whenever the selected liquidacion changes
  useEffect(() => {
    if (!selId) { setCompras([]); return; }
    fetch(`${API_URL}/compras-propietario?liquidacionId=${selId}`)
      .then(r => r.json())
      .then(d => setCompras(Array.isArray(d) ? d as CompraRow[] : []))
      .catch(() => setCompras([]));
  }, [selId]);

  const hist    = useMemo(() => historial.find(h => h.liquidacion_id === selId) ?? null, [historial, selId]);
  const ingList = useMemo(() => ingresos.filter(i => i.liquidacion_id === selId),        [ingresos,  selId]);
  // compras already filtered server-side by selId — use directly
  const cmpList = compras;
  const com     = useMemo(() => comisiones.find(c => c.liquidacion_id === selId) ?? null, [comisiones, selId]);

  const ingresoReserva      = ingList.reduce((s, r) => s + (r.subtotal ?? 0), 0);
  const mayorIngreso        = ingList.reduce((s, r) => s + (r.impuesto_cargo ?? 0), 0);
  const menosComisionAirbnb = cmpList.reduce((s, r) => s + (r.valor_bruto ?? 0), 0);
  const otrosCobros         = cmpList.reduce((s, r) => s + (r.otros_impuestos ?? 0), 0);
  const recibidoBanco       = hist?.recibido_neto_banco ?? 0;
  const menosComision       = com?.comision ?? 0;
  const menosIvaComision    = com?.iva_comision_19 ?? 0;
  const retencionFuente     = com?.retencion_fuente ?? 0;

  const total          = ingresoReserva + mayorIngreso - menosComisionAirbnb - otrosCobros;
  const diferencia     = total - recibidoBanco;
  const totalAEntregar = recibidoBanco - menosComision - menosIvaComision - retencionFuente;

  const liqConDatos = useMemo(() => {
    const ids = new Set(ingresos.filter(i => i.liquidacion_id).map(i => i.liquidacion_id!));
    return historial.filter(h => ids.has(h.liquidacion_id));
  }, [historial, ingresos]);

  const handleSave = async () => {
    if (!selId || !hist) { setSaveMsg('Selecciona una liquidación.'); return; }
    setSaving(true); setSaveMsg('');
    try {
      const r = await fetch(`${API_URL}/contrato-propietario`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propietario: hist.propietario, propiedad: hist.propiedad,
          huesped: hist.huesped, numeroReserva: hist.numero_reserva,
          ingresoReserva, mayorIngreso, menosComisionAirbnb, otrosCobros,
          total, recibidoBanco, diferencia, menosComision,
          menosIvaComision, retencionFuente, totalAEntregar,
        }),
      });
      const json = await r.json() as { success?: boolean; error?: string };
      if (json.success) { setSaved(true); setSaveMsg('Guardado correctamente.'); }
      else setSaveMsg(`Error: ${json.error ?? 'desconocido'}`);
    } catch { setSaveMsg('No se pudo conectar al backend.'); }
    setSaving(false);
  };

  const handleDeleteReserva = async () => {
    if (!hist) return;
    const ok = window.confirm(
      `¿Confirmar eliminación de la reserva #${hist.reserva_id} (${hist.propiedad} — ${hist.huesped}) y todos sus datos asociados?\n\nEsta acción no se puede deshacer.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      const r = await fetch(`${API_URL}/reserva/${hist.reserva_id}`, { method: 'DELETE' });
      const json = await r.json() as { success?: boolean; error?: string };
      if (json.success) { alert('Reserva eliminada correctamente.'); onNavigate('form'); }
      else alert(`Error al eliminar: ${json.error ?? 'desconocido'}`);
    } catch { alert('No se pudo conectar al backend.'); }
    setDeleting(false);
  };

  // ── Document row ──
  const Row = ({
    label, sign = '', value, yellow = false, bold = false, negative = false,
  }: { label: string; sign?: string; value: number; yellow?: boolean; bold?: boolean; negative?: boolean }) => (
    <tr style={{ background: yellow ? '#fef9c3' : 'transparent', borderTop: yellow ? '2px solid #f59e0b' : undefined }}>
      <td style={{ padding: '0.5rem 1.25rem', fontWeight: bold ? 900 : 500, fontSize: '0.825rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: yellow ? '#92400e' : '#0f172a' }}>
        {label}
      </td>
      <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', fontSize: '0.825rem', color: '#64748b', width: '2.5rem' }}>
        {sign}
      </td>
      <td style={{ padding: '0.5rem 1.25rem', textAlign: 'right', fontWeight: bold ? 900 : 500, fontSize: '0.875rem', whiteSpace: 'nowrap', color: yellow ? '#92400e' : '#0f172a' }}>
        {value === 0 ? '-' : `${negative ? '-' : ''}${fmt(Math.abs(value))}`}
      </td>
    </tr>
  );

  const navTabs = (
    <nav className="main-nav" aria-label="Módulos">
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Liquidación Reserva', sub: 'Flujo completo Airbnb.',         view: 'form' },
          { label: 'Historial',           sub: 'Ver liquidaciones guardadas.',     view: 'historial' },
          { label: 'Comisión Zectorem',   sub: 'Liquidación de comisiones.',       view: 'comision' },
          { label: 'Liq. Propietario',    sub: 'Ingresos y compras del mandante.', view: 'propietario' },
          { label: 'Liq. Contrato',       sub: 'Liquidación contrato mandante.',   view: 'contrato' },
        ].map(t => (
          <button key={t.view} type="button"
            className={`nav-tab nav-tab-single ${t.view === 'contrato' ? 'is-active' : ''}`}
            style={{ flex: '1 1 110px' }}
            onClick={t.view !== 'contrato' ? () => onNavigate(t.view) : undefined}>
            <span className="nav-tab-title">{t.label}</span>
            <span className="nav-tab-text">{t.sub}</span>
          </button>
        ))}
      </div>
    </nav>
  );

  return (
    <div className="app-layout">
      <div className="app-shell">

        {/* HERO */}
        <header className="hero-panel">
          <div className="hero-orb hero-orb-left"  style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.22), transparent 65%)' }} />
          <div className="hero-orb hero-orb-right" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 65%)' }} />
          <div className="hero-content">
            <div className="hero-copy">
              <span className="hero-kicker" style={{ borderColor: 'rgba(52,211,153,0.3)', backgroundColor: 'rgba(52,211,153,0.12)', color: '#6ee7b7' }}>
                Liquidación Contrato
              </span>
              <h1>Liquidación Contrato Mandante</h1>
              <p>Resumen final: ingresos, deducciones Airbnb y comisión Zectorem.</p>
            </div>
            {navTabs}
          </div>
        </header>

        {/* Selector manual (solo cuando no viene del flujo automático) */}
        {!liquidacionId && (
          <div className="content-card">
            <div style={{ marginBottom: '0.75rem' }}>
              <span className="card-eyebrow">Selección</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '0.3rem' }}>Elegir liquidación</h2>
            </div>
            <select
              value={selId ?? ''}
              onChange={e => { setSelId(Number(e.target.value) || null); setSaved(false); setSaveMsg(''); }}
              style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', background: '#fff' }}>
              <option value="">— Selecciona una liquidación —</option>
              {liqConDatos.map(h => (
                <option key={h.liquidacion_id} value={h.liquidacion_id}>
                  {h.propiedad} — {h.huesped} — {h.numero_reserva ?? 'S/N'} ({fmtDate(h.fecha)})
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="content-card" style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>Cargando…</div>
        ) : !selId || !hist ? (
          <div className="content-card" style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem' }}>
            {liquidacionId
              ? 'No se encontraron datos para esta liquidación.'
              : 'Selecciona una liquidación para ver el contrato.'}
          </div>
        ) : (
          <div className="content-card">

            {/* ── ESTADO COMPRAS ── */}
            {cmpList.length === 0 ? (
              <div style={{ marginBottom: '1rem', padding: '0.875rem 1.25rem', borderRadius: '0.75rem', background: '#fef9c3', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#92400e' }}>
                  ⚠ No hay compras registradas para esta liquidación. Los campos "Menos Comisión Airbnb Mandante" y "Otros Cobros Plataforma" mostrarán 0,00.
                </span>
                <button type="button" onClick={() => onNavigate('propietario')}
                  style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #fcd34d', background: '#fff', color: '#92400e', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  Ir a Liq. Propietario →
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: '1rem', padding: '0.625rem 1.25rem', borderRadius: '0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>
                ✓ {cmpList.length} compra{cmpList.length !== 1 ? 's' : ''} encontrada{cmpList.length !== 1 ? 's' : ''} — Valor bruto total: {fmt(menosComisionAirbnb)} · Otros impuestos total: {fmt(otrosCobros)}
              </div>
            )}

            {/* ── DOCUMENTO ── */}
            <div style={{ maxWidth: '680px', margin: '0 auto', border: '1px solid #e2e8f0', borderRadius: '0.875rem', overflow: 'hidden', background: '#fff' }}>

              {/* Encabezado */}
              <div style={{ background: '#0f172a', color: '#fff', padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.35rem' }}>
                  {fmtDate(hist.fecha)} · {hist.propiedad} · Huésped: {hist.huesped}
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                  LIQUIDACIÓN CONTRATO A {hist.propietario.toUpperCase()} MANDANTE
                </div>
              </div>

              {/* Tabla documento */}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <Row label="Ingreso Reserva"                    sign="$"  value={ingresoReserva} />
                  <Row label="Mayor Ingreso Reserva - Extr"       sign=""   value={mayorIngreso} />
                  {/* Always show numeric value (even 0) so user sees the actual sum from compras */}
                  <tr style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 1.25rem', fontWeight: 500, fontSize: '0.825rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a' }}>Menos Comisión Airbnb Mandante</td>
                    <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', fontSize: '0.825rem', color: '#64748b', width: '2.5rem' }}>-$</td>
                    <td style={{ padding: '0.5rem 1.25rem', textAlign: 'right', fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap', color: '#0f172a' }}>
                      {menosComisionAirbnb !== 0 ? `-${fmt(menosComisionAirbnb)}` : fmt(0)}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.5rem 1.25rem', fontWeight: 500, fontSize: '0.825rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a' }}>Otros Cobros Plataforma</td>
                    <td style={{ padding: '0.5rem 0.5rem', textAlign: 'center', fontSize: '0.825rem', color: '#64748b', width: '2.5rem' }}>-</td>
                    <td style={{ padding: '0.5rem 1.25rem', textAlign: 'right', fontWeight: 500, fontSize: '0.875rem', whiteSpace: 'nowrap', color: '#0f172a' }}>
                      {otrosCobros !== 0 ? `-${fmt(otrosCobros)}` : fmt(0)}
                    </td>
                  </tr>

                  {/* TOTAL */}
                  <tr style={{ background: '#fef3c7', borderTop: '2px solid #f59e0b', borderBottom: '2px solid #f59e0b' }}>
                    <td colSpan={2} style={{ padding: '0.65rem 1.25rem', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#92400e' }}>
                      Total
                    </td>
                    <td style={{ padding: '0.65rem 1.25rem', textAlign: 'right', fontWeight: 900, fontSize: '0.9rem', color: '#92400e', whiteSpace: 'nowrap' }}>
                      {total === 0 ? '-' : fmt(total)}
                    </td>
                  </tr>

                  <Row label="Recibido Banco"  sign="" value={recibidoBanco} />
                  <Row label="Diferencia"      sign="" value={diferencia} />

                  {/* Separador */}
                  <tr><td colSpan={3} style={{ height: '1px', background: '#f1f5f9', padding: 0 }} /></tr>

                  <Row label="Menos Comisión"                           sign="$" value={menosComision} />
                  <Row label="Menos IVA Comisión"                       sign="$" value={menosIvaComision} />
                  <Row label="Retención en la Fuente a Favor Zectorem"  sign="$" value={retencionFuente} />

                  {/* TOTAL A ENTREGAR */}
                  <tr style={{ background: '#0f172a', borderTop: '3px solid #0f172a' }}>
                    <td colSpan={2} style={{ padding: '0.8rem 1.25rem', fontWeight: 900, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff' }}>
                      Total a Entregar
                    </td>
                    <td style={{ padding: '0.8rem 1.25rem', textAlign: 'right', fontWeight: 900, fontSize: '1rem', color: '#34d399', whiteSpace: 'nowrap' }}>
                      {fmt(totalAEntregar)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── ACCIONES ── */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
              {!saved ? (
                <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSave}>
                  {saving ? 'Guardando…' : 'Guardar liquidación contrato'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteReserva}
                  style={{
                    padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
                    border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626',
                    fontWeight: 700, cursor: deleting ? 'not-allowed' : 'pointer',
                    opacity: deleting ? 0.6 : 1, fontSize: '0.875rem',
                  }}>
                  {deleting ? 'Eliminando…' : 'Eliminar reserva de la base de datos'}
                </button>
              )}
              {saveMsg && (
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: saveMsg.startsWith('Error') || saveMsg.startsWith('No') ? '#dc2626' : '#059669' }}>
                  {saveMsg}
                </span>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
