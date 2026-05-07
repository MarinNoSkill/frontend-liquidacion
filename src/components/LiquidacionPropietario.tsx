import { useState, useEffect, useMemo } from 'react';
import { Currency, formatCurrency } from '../utils/currency';

const API_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:4000';

// ── Tipos ────────────────────────────────────────────────────
type HistorialItem = {
  liquidacion_id:    number;
  fecha:             string;
  propiedad:         string;
  huesped:           string;
  numero_reserva:    string | null;
  tipo_documento:    string | null;
  numero_documento:  string | null;
  responsable_iva:   boolean;
  residente:         boolean;
  total_gastos:      number | null;
  confirmacion_total: number | null;
  tarifa_servicios:  number | null;
  recibido_neto_banco: number | null;
  total_comision_iva: number | null;
  otros_cobros:      number | null;
};

type IngresoRow = {
  id:             number;
  fecha:          string;
  no_comprobante: string | null;
  liquidacion_id: number | null;
  identificacion: string | null;
  nombre_cliente: string | null;
  tipo_documento: string | null;
  item:           number | null;
  subtotal:       number | null;
  impuesto_cargo: number | null;
  total:          number | null;
};

type CompraRow = {
  id:             number;
  fecha:          string;
  liquidacion_id: number | null;
  soporte:        string | null;
  tercero:        string | null;
  documento:      string | null;
  item:           string | null;
  valor_bruto:    number | null;
  iva:            number | null;
  otros_impuestos: number | null;
  valor_factura:  number | null;
  valor_a_pagar:  number | null;
};

// ── Helpers ──────────────────────────────────────────────────
const fmtDate = (d: string | null | undefined) => {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" style={{ width: '1rem', height: '1rem' }}>
      <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem',
  border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem',
  outline: 'none', boxSizing: 'border-box',
};
const readonlyStyle: React.CSSProperties = {
  ...inputStyle, background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed',
};
const fieldWrap = (label: string, children: React.ReactNode) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
    <label style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b' }}>
      {label}
    </label>
    {children}
  </div>
);

// ── Componente ───────────────────────────────────────────────
export default function LiquidacionPropietario({ onNavigate, currency = 'COP' }: { onNavigate: (view: string) => void; currency?: Currency }) {
  const fmt = (v: number | null | undefined) => formatCurrency(v, currency);

  const [subForm, setSubForm] = useState<'ingresos' | 'compras'>('ingresos');

  // Historial compartido para ambos formularios
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  // ── Estado ingresos ──
  const [ingresos, setIngresos]       = useState<IngresoRow[]>([]);
  const [ingLoading, setIngLoading]   = useState(true);
  const [addIngOpen, setAddIngOpen]   = useState(false);
  const [ingLiqId, setIngLiqId]       = useState('');
  const [ingNoComp, setIngNoComp]     = useState('');
  const [ingSaving, setIngSaving]     = useState(false);
  const [ingMsg, setIngMsg]           = useState('');
  const [ingDeleting, setIngDeleting] = useState<number | null>(null);

  // ── Estado compras ──
  type CmpDraft = { soporte: string; tercero: string; documento: string; itemText: string; valorBruto: string; ivaChecked: boolean; ivaIncluido: boolean; otrosImp: string; valorFact: string; };
  const emptyCmp = (): CmpDraft => ({ soporte: '', tercero: '', documento: '', itemText: '', valorBruto: '', ivaChecked: false, ivaIncluido: false, otrosImp: '', valorFact: '' });

  const [compras, setCompras]         = useState<CompraRow[]>([]);
  const [cmpLoading, setCmpLoading]   = useState(true);
  const [addCmpOpen, setAddCmpOpen]   = useState(false);
  const [cmpLiqId, setCmpLiqId]       = useState('');
  const [cmpItems, setCmpItems]       = useState<CmpDraft[]>([emptyCmp()]);
  const [cmpSaving, setCmpSaving]     = useState(false);
  const [cmpMsg, setCmpMsg]           = useState('');
  const [cmpDeleting, setCmpDeleting] = useState<number | null>(null);
  const [cmpAssigning, setCmpAssigning] = useState<number | null>(null);
  const [cmpAssignLiq, setCmpAssignLiq] = useState('');

  // ── Carga inicial ──
  useEffect(() => {
    fetch(`${API_URL}/historial`)
      .then(r => r.json() as Promise<HistorialItem[]>)
      .then(data => {
        const seen = new Set<number>();
        setHistorial(data.filter(h => { if (seen.has(h.liquidacion_id)) return false; seen.add(h.liquidacion_id); return true; }));
        setHistLoading(false);
      })
      .catch(() => setHistLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/ingresos-propietario`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<IngresoRow[]>; })
      .then(d => { setIngresos(Array.isArray(d) ? d : []); setIngLoading(false); })
      .catch(() => { setIngresos([]); setIngLoading(false); });
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/compras-propietario`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<CompraRow[]>; })
      .then(d => { setCompras(Array.isArray(d) ? d : []); setCmpLoading(false); })
      .catch(() => { setCompras([]); setCmpLoading(false); });
  }, []);

  // ── Cálculos ingreso ──
  const ingSel = useMemo(() => historial.find(h => h.liquidacion_id === Number(ingLiqId)) ?? null, [historial, ingLiqId]);
  // residente + responsable_iva → subtotal = total_gastos, impuesto = 19%
  // cualquier otro caso       → subtotal = confirmacion_total, impuesto = 0
  const ingAplicaIVA = (ingSel?.residente && ingSel?.responsable_iva) ?? false;
  const ingSubtotal  = ingAplicaIVA ? (ingSel?.total_gastos ?? 0) : (ingSel?.confirmacion_total ?? 0);
  const ingImpuesto  = ingAplicaIVA ? ingSubtotal * 0.19 : 0;
  const ingTotal    = ingSubtotal + ingImpuesto;
  // Ítem = cuántas veces aparece ese huésped en la tabla actual + 1 (el nuevo que se va a agregar)
  const ingItem     = ingSel ? ingresos.filter(r => r.nombre_cliente === ingSel.huesped).length + 1 : 0;

  // ── Helpers por ítem de compra ──
  const cmpSelFor = (liqId: string) => historial.find(h => h.liquidacion_id === Number(liqId)) ?? null;
  const updateCmpItem = (idx: number, field: string, val: string | boolean) =>
    setCmpItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  // Pre-fill item 0 when the selected liquidacion changes.
  // Valor bruto = Total comisión IVA / 1.19 (base sin IVA).
  useEffect(() => {
    if (!cmpLiqId) return;
    const sel = cmpSelFor(cmpLiqId);
    if (!sel) return;
    const baseSinIva = sel.total_comision_iva != null
      ? (sel.total_comision_iva / 1.19).toFixed(2)
      : '';
    setCmpItems(prev => prev.map((it, i) =>
      i === 0 ? { ...it, valorBruto: baseSinIva, otrosImp: String(sel.otros_cobros ?? '') } : it
    ));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cmpLiqId]);

  // ── Totales ingresos ──
  const totSubtotal = ingresos.reduce((s, r) => s + (r.subtotal ?? 0), 0);
  const totImpuesto = ingresos.reduce((s, r) => s + (r.impuesto_cargo ?? 0), 0);
  const totTotalIng = ingresos.reduce((s, r) => s + (r.total ?? 0), 0);

  // ── Totales compras ──
  const totValorBruto  = compras.reduce((s, r) => s + (r.valor_bruto ?? 0), 0);
  const totIva         = compras.reduce((s, r) => s + (r.iva ?? 0), 0);
  const totOtrosImp    = compras.reduce((s, r) => s + (r.otros_impuestos ?? 0), 0);
  const totValorFact   = compras.reduce((s, r) => s + (r.valor_factura ?? 0), 0);
  const totValorAPagar = compras.reduce((s, r) => s + (r.valor_a_pagar ?? 0), 0);

  // ── Guardar ingreso ──
  const handleSaveIngreso = async () => {
    if (!ingSel)            { setIngMsg('Selecciona una liquidación.'); return; }
    if (!ingNoComp.trim())  { setIngMsg('Ingresa el N° de comprobante.'); return; }
    setIngSaving(true); setIngMsg('');
    try {
      const r = await fetch(`${API_URL}/ingresos-propietario`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noComprobante: ingNoComp.trim(),
          liquidacionId: ingSel.liquidacion_id,
          identificacion: ingSel.numero_documento,
          nombreCliente:  ingSel.huesped,
          tipoDocumento:  ingSel.tipo_documento,
          item:           ingItem,
          subtotal:       ingSubtotal,
          impuestoCargo:  ingImpuesto,
          total:          ingTotal,
        }),
      });
      const json = await r.json() as { success?: boolean; data?: IngresoRow; error?: string };
      if (json.success && json.data) {
        const liqIdGuardado = ingSel!.liquidacion_id;
        setIngresos(prev => [json.data!, ...prev]);
        setIngLiqId(''); setIngNoComp(''); setAddIngOpen(false);
        setCmpLiqId(String(liqIdGuardado));
        setSubForm('compras');
        setAddCmpOpen(true);
      } else {
        setIngMsg(`Error: ${json.error ?? 'desconocido'}`);
      }
    } catch { setIngMsg('No se pudo conectar al backend.'); }
    setIngSaving(false);
  };

  // ── Eliminar ingreso ──
  const handleDeleteIngreso = async (id: number) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    setIngDeleting(id);
    try {
      const r = await fetch(`${API_URL}/ingresos-propietario/${id}`, { method: 'DELETE' });
      const json = await r.json() as { success?: boolean };
      if (json.success) setIngresos(prev => prev.filter(x => x.id !== id));
    } catch { /* ignore */ }
    setIngDeleting(null);
  };

  // ── Guardar compra(s) ──
  const handleSaveCompra = async () => {
    if (!cmpLiqId) { setCmpMsg('Selecciona una liquidación.'); return; }
    const sel = cmpSelFor(cmpLiqId);
    if (!sel) { setCmpMsg('Liquidación no encontrada.'); return; }
    setCmpSaving(true); setCmpMsg('');
    const saved: CompraRow[] = [];
    let hasError = '';
    for (const [, item] of cmpItems.entries()) {
      const valBruto   = parseFloat(item.valorBruto) || 0;
      const otrosImp   = parseFloat(item.otrosImp)   || 0;
      const ivaNum     = (item.ivaChecked && !item.ivaIncluido) ? valBruto * 0.19 : 0;
      const valFactNum = parseFloat(item.valorFact) || 0;
      const valAPagar  = valBruto + ivaNum + otrosImp + valFactNum;
      try {
        const r = await fetch(`${API_URL}/compras-propietario`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            liquidacionId:  sel.liquidacion_id,
            soporte:        item.soporte.trim() || null,
            tercero:        item.tercero.trim() || null,
            documento:      item.documento.trim() || null,
            item:           item.itemText.trim() || null,
            valorBruto:     valBruto,
            iva:            ivaNum,
            otrosImpuestos: otrosImp,
            valorFactura:   valFactNum,
            valorAPagar:    valAPagar,
          }),
        });
        const json = await r.json() as { success?: boolean; data?: CompraRow; error?: string };
        if (json.success && json.data) { saved.push(json.data); }
        else { hasError = json.error ?? 'desconocido'; }
      } catch { hasError = 'No se pudo conectar al backend.'; }
    }
    if (saved.length > 0) setCompras(prev => [...saved.reverse(), ...prev]);
    if (hasError) { setCmpMsg(`Error en uno o más ítems: ${hasError}`); }
    else {
      const liqFinal = sel.liquidacion_id;
      setCmpItems([emptyCmp()]); setCmpLiqId(''); setAddCmpOpen(false);
      onNavigate(`contrato:${liqFinal}`);
    }
    setCmpSaving(false);
  };

  // ── Eliminar compra ──
  const handleDeleteCompra = async (id: number) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    setCmpDeleting(id);
    try {
      const r = await fetch(`${API_URL}/compras-propietario/${id}`, { method: 'DELETE' });
      const json = await r.json() as { success?: boolean };
      if (json.success) setCompras(prev => prev.filter(x => x.id !== id));
    } catch { /* ignore */ }
    setCmpDeleting(null);
  };

  // ── Asignar liquidación a compra sin liquidacion_id ──
  const handleAssignCompra = async (id: number) => {
    if (!cmpAssignLiq) return;
    try {
      const r = await fetch(`${API_URL}/compras-propietario/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liquidacionId: Number(cmpAssignLiq) }),
      });
      const json = await r.json() as { success?: boolean };
      if (json.success) {
        setCompras(prev => prev.map(x => x.id === id ? { ...x, liquidacion_id: Number(cmpAssignLiq) } : x));
        setCmpAssigning(null); setCmpAssignLiq('');
      }
    } catch { /* ignore */ }
  };

  // ── NAV TABS ──
  const navTabs = (
    <nav className="main-nav" aria-label="Módulos">
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        {[
          { label: 'Liquidación Reserva', sub: 'Flujo completo Airbnb.',               view: 'form' },
          { label: 'Historial',           sub: 'Ver liquidaciones guardadas.',           view: 'historial' },
          { label: 'Comisión Zectorem',   sub: 'Liquidación de comisiones.',             view: 'comision' },
          { label: 'Liq. Propietario',    sub: 'Ingresos y compras del mandante.',       view: 'propietario' },
          { label: 'Liq. Contrato',       sub: 'Liquidación contrato mandante.',          view: 'contrato' },
        ].map(t => (
          <button key={t.view} type="button"
            className={`nav-tab nav-tab-single ${t.view === 'propietario' ? 'is-active' : ''}`}
            style={{ flex: '1 1 120px' }}
            onClick={t.view !== 'propietario' ? () => onNavigate(t.view) : undefined}
          >
            <span className="nav-tab-title">{t.label}</span>
            <span className="nav-tab-text">{t.sub}</span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        <button type="button"
          className="nav-tab nav-tab-single"
          style={{ flex: '1 1 100%' }}
          onClick={() => onNavigate('historial-contratos')}
        >
          <span className="nav-tab-title">Historial Contratos</span>
          <span className="nav-tab-text">Ver contratos guardados.</span>
        </button>
      </div>
    </nav>
  );

  // ── Selector de liquidación ──
  const liqSelector = (value: string, onChange: (v: string) => void, label: string) => (
    fieldWrap(label,
      <select value={value} onChange={e => onChange(e.target.value)} style={inputStyle}>
        <option value="">— Selecciona una liquidación —</option>
        {historial.map(h => (
          <option key={h.liquidacion_id} value={h.liquidacion_id}>
            {h.propiedad} — {h.huesped} — {h.numero_reserva ?? 'S/N'} ({fmtDate(h.fecha)})
          </option>
        ))}
      </select>
    )
  );

  // ── Botón eliminar ──
  const deleteBtn = (id: number, isDeleting: boolean, handler: (id: number) => void) => (
    <td style={{ textAlign: 'center', padding: '0.4rem' }}>
      <button type="button" disabled={isDeleting} onClick={() => handler(id)}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '1.9rem', height: '1.9rem', borderRadius: '0.4rem',
          border: '1px solid #fecaca', backgroundColor: '#fef2f2', color: '#dc2626',
          cursor: isDeleting ? 'not-allowed' : 'pointer', opacity: isDeleting ? 0.5 : 1,
        }}>
        {isDeleting ? '…' : <TrashIcon />}
      </button>
    </td>
  );

  // ── Fila totales ──
  const totalRowStyle: React.CSSProperties = { background: '#0f172a', color: '#fff', fontWeight: 900 };
  const totalCellStyle: React.CSSProperties = { padding: '0.65rem 0.875rem', whiteSpace: 'nowrap' };

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="app-layout">
      <div className="app-shell">

        {/* HERO */}
        <header className="hero-panel" style={{ minHeight: '340px' }}>
          <div className="hero-orb hero-orb-left"  style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.22), transparent 65%)' }} />
          <div className="hero-orb hero-orb-right" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18), transparent 65%)' }} />
          <div className="hero-content">
            <div className="hero-copy">
              <span className="hero-kicker" style={{ borderColor: 'rgba(251,191,36,0.3)', backgroundColor: 'rgba(251,191,36,0.12)', color: '#fcd34d' }}>
                Liquidación Propietario
              </span>
              <h1>Liquidación Propietario</h1>
              <p>Registra los ingresos devengados y las compras o servicios adquiridos en nombre del mandante.</p>
            </div>
            {navTabs}
          </div>
        </header>

        {/* TABS SUB-FORMULARIO */}
        <div className="content-card">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button type="button"
              onClick={() => setSubForm('ingresos')}
              style={{
                flex: '1 1 260px', padding: '0.875rem 1rem', borderRadius: '0.875rem', textAlign: 'left',
                border: `2px solid ${subForm === 'ingresos' ? '#f59e0b' : '#e2e8f0'}`,
                background: subForm === 'ingresos' ? '#fffbeb' : '#f8fafc',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{ fontWeight: 800, color: subForm === 'ingresos' ? '#b45309' : '#0f172a', fontSize: '0.9rem' }}>
                Ingresos devengados en nombre del mandante
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                Comprobantes de ingreso por reservas
              </div>
            </button>
            <button type="button"
              onClick={() => setSubForm('compras')}
              style={{
                flex: '1 1 260px', padding: '0.875rem 1rem', borderRadius: '0.875rem', textAlign: 'left',
                border: `2px solid ${subForm === 'compras' ? '#6366f1' : '#e2e8f0'}`,
                background: subForm === 'compras' ? '#eef2ff' : '#f8fafc',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
              <div style={{ fontWeight: 800, color: subForm === 'compras' ? '#4338ca' : '#0f172a', fontSize: '0.9rem' }}>
                Compras o Servicios adquiridos en nombre del mandante
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
                Egresos y servicios del mandante
              </div>
            </button>
          </div>
        </div>

        {/* ═══ FORMULARIO INGRESOS ═══ */}
        {subForm === 'ingresos' && (
          <>
            {/* Panel agregar */}
            {addIngOpen && (
              <div className="content-card" style={{ border: '2px solid #fcd34d' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="card-eyebrow" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                    Nuevo registro — Ingresos
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginTop: '0.5rem' }}>
                    Agregar ingreso devengado
                  </h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
                  {liqSelector(ingLiqId, setIngLiqId, 'Seleccionar liquidación')}
                  {fieldWrap('N° Comprobante',
                    <input type="text" value={ingNoComp} onChange={e => setIngNoComp(e.target.value)}
                      placeholder="Ej: FV-2-412" style={inputStyle} />
                  )}
                  {fieldWrap('Identificación (N° Doc.)',
                    <input type="text" value={ingSel?.numero_documento ?? ''} readOnly style={readonlyStyle} />
                  )}
                  {fieldWrap('Nombre cliente (Huésped)',
                    <input type="text" value={ingSel?.huesped ?? ''} readOnly style={readonlyStyle} />
                  )}
                  {fieldWrap('Tipo documento',
                    <input type="text" value={ingSel?.tipo_documento ?? ''} readOnly style={readonlyStyle} />
                  )}
                  {fieldWrap('Ítem (N° reservas del huésped)',
                    <input type="text" value={ingSel ? String(ingItem) : ''} readOnly style={readonlyStyle} />
                  )}
                  {fieldWrap(ingAplicaIVA ? 'Subtotal (Total gastos)' : 'Subtotal (Confirmación total)',
                    <input type="text" value={ingSel ? fmt(ingSubtotal) : ''} readOnly style={readonlyStyle} />
                  )}
                  {fieldWrap('Impuesto cargo',
                    <input type="text" value={ingSel ? fmt(ingImpuesto) : ''} readOnly style={readonlyStyle} />
                  )}
                  {fieldWrap('Total',
                    <input type="text" value={ingSel ? fmt(ingTotal) : ''} readOnly
                      style={{ ...readonlyStyle, fontWeight: 800, color: '#0f172a' }} />
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" disabled={ingSaving} onClick={handleSaveIngreso}>
                    {ingSaving ? 'Guardando…' : 'Agregar registro'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setAddIngOpen(false); setIngMsg(''); setIngLiqId(''); setIngNoComp(''); }}>
                    Cancelar
                  </button>
                  {ingMsg && <span style={{ fontSize: '0.875rem', fontWeight: 700, color: ingMsg.startsWith('Error') || ingMsg.startsWith('No') || ingMsg.startsWith('Selecciona') || ingMsg.startsWith('Ingresa') ? '#dc2626' : '#059669' }}>{ingMsg}</span>}
                </div>
              </div>
            )}

            {/* Tabla ingresos */}
            <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <span className="card-eyebrow" style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>
                    Ingresos devengados en nombre del mandante
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '0.4rem' }}>
                    {ingresos.length} registro{ingresos.length !== 1 ? 's' : ''}
                  </h2>
                </div>
                {!addIngOpen && (
                  <button type="button" className="btn btn-primary" onClick={() => { setAddIngOpen(true); setIngMsg(''); }}>
                    + Agregar registro
                  </button>
                )}
              </div>

              {ingLoading || histLoading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>Cargando…</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="hist-table">
                    <thead>
                      <tr>
                        <th>No. Comprobante</th>
                        <th>Fecha elaboración</th>
                        <th>Tipo</th>
                        <th>Identificación</th>
                        <th>Nombre cliente</th>
                        <th>Ítem</th>
                        <th>Subtotal</th>
                        <th>Impuesto cargo</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingresos.length === 0 ? (
                        <tr><td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Sin registros aún.</td></tr>
                      ) : ingresos.map(r => {
                        // Ítem dinámico: total de registros en la tabla para ese nombre_cliente
                        const dynItem = ingresos.filter(x => x.nombre_cliente === r.nombre_cliente).length;
                        return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700 }}>{r.no_comprobante || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.fecha)}</td>
                          <td>{r.tipo_documento || '—'}</td>
                          <td>{r.identificacion || '—'}</td>
                          <td style={{ minWidth: '110px', fontWeight: 600 }}>{r.nombre_cliente || '—'}</td>
                          <td style={{ textAlign: 'center' }}>{dynItem}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.subtotal)}</td>
                          <td style={{ whiteSpace: 'nowrap', color: r.impuesto_cargo ? '#c2410c' : '#94a3b8' }}>{fmt(r.impuesto_cargo)}</td>
                          <td style={{ fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>{fmt(r.total)}</td>
                          {deleteBtn(r.id, ingDeleting === r.id, handleDeleteIngreso)}
                        </tr>
                        );
                      })}
                    </tbody>
                    {ingresos.length > 0 && (
                      <tfoot>
                        <tr style={totalRowStyle}>
                          <td colSpan={6} style={{ ...totalCellStyle, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>TOTALES</td>
                          <td style={totalCellStyle}>{fmt(totSubtotal)}</td>
                          <td style={totalCellStyle}>{fmt(totImpuesto)}</td>
                          <td style={totalCellStyle}>{fmt(totTotalIng)}</td>
                          <td style={totalCellStyle}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ FORMULARIO COMPRAS ═══ */}
        {subForm === 'compras' && (
          <>
            {/* Panel agregar */}
            {addCmpOpen && (
              <div className="content-card" style={{ border: '2px solid #a5b4fc' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span className="card-eyebrow" style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                    Nuevo registro — Compras / Servicios
                  </span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginTop: '0.5rem' }}>
                    Agregar compra o servicio
                  </h3>
                </div>
                {/* Selector único de liquidación */}
                <div style={{ marginBottom: '1rem' }}>
                  {liqSelector(cmpLiqId, setCmpLiqId, 'Seleccionar liquidación (aplica a todos los ítems)')}
                </div>
                {(() => {
                  const totalGeneral = cmpItems.reduce((s, it) => {
                    const vb = parseFloat(it.valorBruto) || 0;
                    const oi = parseFloat(it.otrosImp)   || 0;
                    const iv = (it.ivaChecked && !it.ivaIncluido) ? vb * 0.19 : 0;
                    return s + vb + iv + oi + (parseFloat(it.valorFact) || 0);
                  }, 0);
                  return (
                    <>
                      {cmpItems.map((item, idx) => {
                        const isFirst    = idx === 0;
                        const valBruto   = parseFloat(item.valorBruto) || 0;
                        const otrosImp   = parseFloat(item.otrosImp)   || 0;
                        const ivaNum     = (item.ivaChecked && !item.ivaIncluido) ? valBruto * 0.19 : 0;
                        const valFactNum = parseFloat(item.valorFact) || 0;
                        const valAPagar  = valBruto + ivaNum + otrosImp + valFactNum;
                        return (
                          <div key={idx} style={{ border: `1px solid ${isFirst ? '#c7d2fe' : '#e0e7ff'}`, borderRadius: '0.75rem', padding: '1rem', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Ítem {idx + 1}{isFirst ? ' — auto-completado (editable)' : ''}
                              </span>
                              {cmpItems.length > 1 && (
                                <button type="button" onClick={() => setCmpItems(prev => prev.filter((_, i) => i !== idx))}
                                  style={{ marginLeft: 'auto', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', borderRadius: '0.375rem', padding: '0.15rem 0.5rem', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                                  ✕ Quitar
                                </button>
                              )}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.875rem' }}>
                              {fieldWrap('Soporte',
                                <input type="text" value={item.soporte} onChange={e => updateCmpItem(idx, 'soporte', e.target.value)} placeholder="N° soporte" style={inputStyle} />
                              )}
                              {fieldWrap('Tercero',
                                <input type="text" value={item.tercero} onChange={e => updateCmpItem(idx, 'tercero', e.target.value)} placeholder="Nombre tercero" style={inputStyle} />
                              )}
                              {fieldWrap('Documento',
                                <input type="text" value={item.documento} onChange={e => updateCmpItem(idx, 'documento', e.target.value)} placeholder="N° documento" style={inputStyle} />
                              )}
                              {fieldWrap('Ítem / Descripción',
                                <input type="text" value={item.itemText} onChange={e => updateCmpItem(idx, 'itemText', e.target.value)} placeholder="Descripción del ítem" style={inputStyle} />
                              )}
                              {fieldWrap(isFirst ? 'Valor bruto (Base = Total comisión IVA ÷ 1.19 — editable)' : 'Valor bruto',
                                <input type="number" value={item.valorBruto} onChange={e => updateCmpItem(idx, 'valorBruto', e.target.value)} placeholder="0.00" style={inputStyle} />
                              )}
                              {fieldWrap('Valor con IVA incluido',
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', minHeight: '2.25rem' }} title="Si se marca, el valor bruto YA incluye el 19% de IVA y no se suma de nuevo en el total.">
                                  <input type="checkbox" checked={item.ivaIncluido} onChange={e => updateCmpItem(idx, 'ivaIncluido', e.target.checked)}
                                    style={{ width: '1rem', height: '1rem', accentColor: '#0284c7', cursor: 'pointer', flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.875rem', fontWeight: item.ivaIncluido ? 700 : 400, color: item.ivaIncluido ? '#0284c7' : '#64748b' }}>
                                    {item.ivaIncluido ? 'IVA ya incluido en el bruto' : 'No (IVA aparte si aplica)'}
                                  </span>
                                </label>
                              )}
                              {fieldWrap('IVA (19% sobre valor bruto)',
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', background: item.ivaIncluido ? '#f1f5f9' : '#fff', cursor: item.ivaIncluido ? 'not-allowed' : 'pointer', minHeight: '2.25rem', opacity: item.ivaIncluido ? 0.6 : 1 }} title={item.ivaIncluido ? 'No aplica: el IVA ya está dentro del valor bruto.' : ''}>
                                  <input type="checkbox" checked={item.ivaChecked && !item.ivaIncluido} disabled={item.ivaIncluido} onChange={e => updateCmpItem(idx, 'ivaChecked', e.target.checked)}
                                    style={{ width: '1rem', height: '1rem', accentColor: '#7c3aed', cursor: item.ivaIncluido ? 'not-allowed' : 'pointer', flexShrink: 0 }} />
                                  <span style={{ fontSize: '0.875rem', fontWeight: (item.ivaChecked && !item.ivaIncluido) ? 700 : 400, color: (item.ivaChecked && !item.ivaIncluido) ? '#7c3aed' : '#64748b' }}>
                                    {item.ivaIncluido ? 'No aplica (ya incluido)' : (item.ivaChecked ? `19% = ${fmt(valBruto * 0.19)}` : 'No aplica')}
                                  </span>
                                </label>
                              )}
                              {fieldWrap(isFirst ? 'Otros impuestos (Otros cobros — editable)' : 'Otros impuestos',
                                <input type="number" value={item.otrosImp} onChange={e => updateCmpItem(idx, 'otrosImp', e.target.value)} placeholder="0.00" style={inputStyle} />
                              )}
                              {fieldWrap('Valor factura',
                                <input type="number" value={item.valorFact} onChange={e => updateCmpItem(idx, 'valorFact', e.target.value)} placeholder="0.00" style={inputStyle} />
                              )}
                              {fieldWrap('Valor a pagar',
                                <input type="text" value={fmt(valAPagar)} readOnly
                                  style={{ ...readonlyStyle, fontWeight: 800, color: '#0f172a' }} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => setCmpItems(prev => [...prev, emptyCmp()])}
                          style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #c7d2fe', background: '#eef2ff', color: '#4338ca', cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem' }}>
                          + Añadir otro
                        </button>
                        {cmpItems.length > 1 && (
                          <span style={{ fontSize: '0.875rem', fontWeight: 900, color: '#0f172a' }}>
                            Total general: <span style={{ color: '#0284c7' }}>{fmt(totalGeneral)}</span>
                          </span>
                        )}
                      </div>
                    </>
                  );
                })()}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-primary" disabled={cmpSaving} onClick={handleSaveCompra}>
                    {cmpSaving ? 'Guardando…' : 'Guardar todos'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => { setAddCmpOpen(false); setCmpMsg(''); setCmpItems([emptyCmp()]); setCmpLiqId(''); }}>
                    Cancelar
                  </button>
                  {cmpMsg && <span style={{ fontSize: '0.875rem', fontWeight: 700, color: cmpMsg.startsWith('Error') || cmpMsg.startsWith('No') || cmpMsg.startsWith('Selecciona') || cmpMsg.startsWith('Liquidación') ? '#dc2626' : '#059669' }}>{cmpMsg}</span>}
                </div>
              </div>
            )}

            {/* Tabla compras */}
            <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <span className="card-eyebrow" style={{ background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
                    Compras o Servicios adquiridos en nombre del mandante
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginTop: '0.4rem' }}>
                    {compras.length} registro{compras.length !== 1 ? 's' : ''}
                  </h2>
                </div>
                {!addCmpOpen && (
                  <button type="button" className="btn btn-primary" onClick={() => { setAddCmpOpen(true); setCmpMsg(''); }}>
                    + Agregar registro
                  </button>
                )}
              </div>

              {cmpLoading || histLoading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>Cargando…</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="hist-table">
                    <thead>
                      <tr>
                        <th>Soporte</th>
                        <th>Fecha</th>
                        <th>Tercero</th>
                        <th>Documento</th>
                        <th>Ítem</th>
                        <th>Valor bruto</th>
                        <th>IVA</th>
                        <th>Otros impuestos</th>
                        <th>Valor factura</th>
                        <th>Valor a pagar</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {compras.length === 0 ? (
                        <tr><td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Sin registros aún.</td></tr>
                      ) : compras.map(r => (
                        <tr key={r.id} style={r.liquidacion_id == null ? { background: '#fffbeb' } : undefined}>
                          <td style={{ fontWeight: 600 }}>{r.soporte || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(r.fecha)}</td>
                          <td>{r.tercero || '—'}</td>
                          <td>{r.documento || '—'}</td>
                          <td>{r.item || '—'}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.valor_bruto)}</td>
                          <td style={{ whiteSpace: 'nowrap', color: '#7c3aed' }}>{fmt(r.iva)}</td>
                          <td style={{ whiteSpace: 'nowrap', color: '#c2410c' }}>{fmt(r.otros_impuestos)}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.valor_factura)}</td>
                          <td style={{ fontWeight: 900, color: '#0f172a', whiteSpace: 'nowrap' }}>{fmt(r.valor_a_pagar)}</td>
                          <td style={{ padding: '0.4rem', minWidth: '220px' }}>
                            {r.liquidacion_id == null ? (
                              cmpAssigning === r.id ? (
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                  <select value={cmpAssignLiq} onChange={e => setCmpAssignLiq(e.target.value)}
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.4rem', borderRadius: '0.375rem', border: '1px solid #fcd34d', flex: 1 }}>
                                    <option value="">— Liquidación —</option>
                                    {historial.map(h => (
                                      <option key={h.liquidacion_id} value={h.liquidacion_id}>
                                        {h.propiedad} — {h.numero_reserva ?? 'S/N'}
                                      </option>
                                    ))}
                                  </select>
                                  <button type="button" onClick={() => handleAssignCompra(r.id)}
                                    style={{ padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid #6ee7b7', background: '#f0fdf4', color: '#166534', cursor: 'pointer', fontWeight: 700, fontSize: '0.7rem' }}>
                                    OK
                                  </button>
                                  <button type="button" onClick={() => { setCmpAssigning(null); setCmpAssignLiq(''); }}
                                    style={{ padding: '0.25rem 0.4rem', borderRadius: '0.375rem', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '0.7rem' }}>
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button type="button"
                                  onClick={() => { setCmpAssigning(r.id); setCmpAssignLiq(''); }}
                                  style={{ padding: '0.25rem 0.625rem', borderRadius: '0.375rem', border: '1px solid #fcd34d', background: '#fef9c3', color: '#92400e', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}>
                                  ⚠ Asignar liquidación
                                </button>
                              )
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                                {deleteBtn(r.id, cmpDeleting === r.id, handleDeleteCompra)}
                              </div>
                            )}
                            {r.liquidacion_id != null && null /* delete btn already rendered above */}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {compras.length > 0 && (
                      <tfoot>
                        <tr style={totalRowStyle}>
                          <td colSpan={5} style={{ ...totalCellStyle, fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>TOTALES</td>
                          <td style={totalCellStyle}>{fmt(totValorBruto)}</td>
                          <td style={totalCellStyle}>{fmt(totIva)}</td>
                          <td style={totalCellStyle}>{fmt(totOtrosImp)}</td>
                          <td style={totalCellStyle}>{fmt(totValorFact)}</td>
                          <td style={totalCellStyle}>{fmt(totValorAPagar)}</td>
                          <td style={totalCellStyle}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
