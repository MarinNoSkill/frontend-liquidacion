import { useState, useEffect, useMemo } from 'react';
import { Currency, formatCurrency } from '../utils/currency';
import { exportAllHistorialToExcel, exportResumenContratosToExcel } from '../utils/exportToExcel';

const API_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:4000';

type ContratoRecord = {
  id: number;
  liquidacion_id: number;
  propietario: string;
  propiedad: string;
  huesped: string;
  numero_reserva: string | null;
  ingreso_reserva: number | null;
  mayor_ingreso: number | null;
  iva_reserva: number | null;
  menos_comision_airbnb: number | null;
  iva_comision_airbnb: number | null;
  otros_cobros: number | null;
  total: number | null;
  recibido_banco: number | null;
  diferencia: number | null;
  menos_comision: number | null;
  menos_iva_comision: number | null;
  retencion_fuente: number | null;
  total_a_entregar: number | null;
  created_at: string;
};

export default function HistorialContratos({
  onNavigate,
  onLoadContrato,
  currency = 'COP',
}: {
  onNavigate: (view: string) => void;
  onLoadContrato?: (contrato: ContratoRecord) => void;
  currency?: Currency;
}) {
  const fmt = (v: number | null | undefined) => formatCurrency(v, currency);
  const [contratos, setContratos] = useState<ContratoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProps, setSelectedProps] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState('');
  const [viewMode, setViewMode] = useState<'detalle' | 'resumen'>('detalle');

  useEffect(() => {
    fetch(`${API_URL}/contratos-propietario`)
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json() as Promise<ContratoRecord[]>;
      })
      .then(data => { setContratos(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message || 'Error al cargar'); setLoading(false); });
  }, []);

  const propiedadesDisponibles = useMemo(() => {
    const set = new Set<string>();
    for (const c of contratos) set.add(c.propiedad || '—');
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [contratos]);

  const filtered = useMemo(() => contratos.filter(c => {
    if (selectedProps.length === 0) return true;
    return selectedProps.includes(c.propiedad || '—');
  }), [contratos, selectedProps]);

  const togglePropiedad = (p: string) => {
    setSelectedProps(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  type ResumenRow = {
    propiedad: string;
    propietario: string;
    count: number;
    ingreso_reserva: number;
    mayor_ingreso: number;
    menos_comision_airbnb: number;
    iva_comision_airbnb: number;
    otros_cobros: number;
    total: number;
    recibido_banco: number;
    diferencia: number;
    menos_comision: number;
    menos_iva_comision: number;
    retencion_fuente: number;
    total_a_entregar: number;
  };

  const resumen = useMemo<ResumenRow[]>(() => {
    const groups = new Map<string, ResumenRow>();
    for (const c of filtered) {
      const key = c.propiedad || '—';
      const existing = groups.get(key) ?? {
        propiedad: key,
        propietario: c.propietario || '—',
        count: 0,
        ingreso_reserva: 0,
        mayor_ingreso: 0,
        menos_comision_airbnb: 0,
        iva_comision_airbnb: 0,
        otros_cobros: 0,
        total: 0,
        recibido_banco: 0,
        diferencia: 0,
        menos_comision: 0,
        menos_iva_comision: 0,
        retencion_fuente: 0,
        total_a_entregar: 0,
      };
      existing.count += 1;
      existing.ingreso_reserva       += c.ingreso_reserva       ?? 0;
      existing.mayor_ingreso         += c.mayor_ingreso         ?? 0;
      existing.menos_comision_airbnb += c.menos_comision_airbnb ?? 0;
      existing.iva_comision_airbnb   += c.iva_comision_airbnb   ?? 0;
      existing.otros_cobros          += c.otros_cobros          ?? 0;
      existing.total                 += c.total                 ?? 0;
      existing.recibido_banco        += c.recibido_banco        ?? 0;
      existing.diferencia            += c.diferencia            ?? 0;
      existing.menos_comision        += c.menos_comision        ?? 0;
      existing.menos_iva_comision    += c.menos_iva_comision    ?? 0;
      existing.retencion_fuente      += c.retencion_fuente      ?? 0;
      existing.total_a_entregar      += c.total_a_entregar      ?? 0;
      groups.set(key, existing);
    }
    return Array.from(groups.values()).sort((a, b) => a.propiedad.localeCompare(b.propiedad));
  }, [filtered]);

  const grandTotal = useMemo<ResumenRow>(() => resumen.reduce<ResumenRow>((acc, r) => ({
    propiedad: 'Total acumulado',
    propietario: '—',
    count:                   acc.count                   + r.count,
    ingreso_reserva:         acc.ingreso_reserva         + r.ingreso_reserva,
    mayor_ingreso:           acc.mayor_ingreso           + r.mayor_ingreso,
    menos_comision_airbnb:   acc.menos_comision_airbnb   + r.menos_comision_airbnb,
    iva_comision_airbnb:     acc.iva_comision_airbnb     + r.iva_comision_airbnb,
    otros_cobros:            acc.otros_cobros            + r.otros_cobros,
    total:                   acc.total                   + r.total,
    recibido_banco:          acc.recibido_banco          + r.recibido_banco,
    diferencia:              acc.diferencia              + r.diferencia,
    menos_comision:          acc.menos_comision          + r.menos_comision,
    menos_iva_comision:      acc.menos_iva_comision      + r.menos_iva_comision,
    retencion_fuente:        acc.retencion_fuente        + r.retencion_fuente,
    total_a_entregar:        acc.total_a_entregar        + r.total_a_entregar,
  }), {
    propiedad: 'Total acumulado', propietario: '—', count: 0,
    ingreso_reserva: 0, mayor_ingreso: 0, menos_comision_airbnb: 0, iva_comision_airbnb: 0,
    otros_cobros: 0, total: 0, recibido_banco: 0, diferencia: 0,
    menos_comision: 0, menos_iva_comision: 0, retencion_fuente: 0, total_a_entregar: 0,
  }), [resumen]);

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este contrato? Esta acción no se puede deshacer.')) return;
    try {
      const res = await fetch(`${API_URL}/contrato-propietario-borrar/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setContratos(prev => prev.filter(c => c.id !== id));
      } else {
        alert('Error al eliminar el contrato');
      }
    } catch {
      alert('No se pudo conectar al backend');
    }
  };

  const handleExportAll = async () => {
    setExporting(true); setExportMsg('');
    try {
      await exportAllHistorialToExcel();
      setExportMsg('Excel descargado correctamente.');
    } catch (e) {
      setExportMsg(`Error al exportar: ${e instanceof Error ? e.message : 'desconocido'}`);
    } finally {
      setExporting(false);
    }
  };

  const handleExportResumen = () => {
    setExportMsg('');
    try {
      if (resumen.length === 0) {
        setExportMsg('No hay datos para exportar.');
        return;
      }
      exportResumenContratosToExcel(resumen, grandTotal);
      setExportMsg('Resumen descargado correctamente.');
    } catch (e) {
      setExportMsg(`Error al exportar: ${e instanceof Error ? e.message : 'desconocido'}`);
    }
  };

  const handleView = (contrato: ContratoRecord) => {
    if (onLoadContrato) {
      onLoadContrato(contrato);
    } else {
      onNavigate('contrato');
    }
  };

  return (
    <div className="app-layout">
      <div className="app-shell">
        {/* ── HERO ── */}
        <header className="hero-panel" style={{ minHeight: '340px' }}>
          <div className="hero-orb hero-orb-left" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.25), transparent 65%)' }} />
          <div className="hero-orb hero-orb-right" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.20), transparent 65%)' }} />
          <div className="hero-content">
            <div className="hero-copy">
              <span className="hero-kicker" style={{ borderColor: 'rgba(74,222,128,0.3)', backgroundColor: 'rgba(74,222,128,0.12)', color: '#86efac' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Historial
              </span>
              <h1>Historial de Liquidaciones Contrato</h1>
              <p>Resumen de todas las liquidaciones de contrato guardadas.</p>
            </div>
            <nav className="main-nav" aria-label="Módulos">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 120px' }} onClick={() => onNavigate('form')}>
                  <span className="nav-tab-title">Liquidación Reserva</span>
                  <span className="nav-tab-text">Flujo completo de liquidación Airbnb.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 120px' }} onClick={() => onNavigate('historial')}>
                  <span className="nav-tab-title">Historial</span>
                  <span className="nav-tab-text">Ver todas las liquidaciones guardadas.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 120px' }} onClick={() => onNavigate('comision')}>
                  <span className="nav-tab-title">Comisión Zectorem</span>
                  <span className="nav-tab-text">Liquidación de comisiones Zectorem.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 120px' }} onClick={() => onNavigate('propietario')}>
                  <span className="nav-tab-title">Liq. Propietario</span>
                  <span className="nav-tab-text">Ingresos y compras del mandante.</span>
                </button>
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 120px' }} onClick={() => onNavigate('contrato')}>
                  <span className="nav-tab-title">Liq. Contrato</span>
                  <span className="nav-tab-text">Liquidación contrato mandante.</span>
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="button" className="nav-tab is-active nav-tab-single" style={{ flex: '1 1 100%' }}>
                  <span className="nav-tab-title">Historial Contratos</span>
                  <span className="nav-tab-text">Ver contratos guardados.</span>
                </button>
              </div>
            </nav>
          </div>
        </header>

        {/* ── FILTROS ── */}
        <div className="content-card">
          <div className="module-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <span className="card-eyebrow">Búsqueda</span>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>Filtrar contratos</h2>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {exportMsg && (
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: exportMsg.startsWith('Error') ? '#dc2626' : '#059669' }}>
                  {exportMsg}
                </span>
              )}
              <button
                type="button"
                onClick={handleExportAll}
                disabled={exporting || contratos.length === 0}
                style={{
                  padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
                  border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d',
                  fontWeight: 700, fontSize: '0.875rem',
                  cursor: exporting || contratos.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: exporting || contratos.length === 0 ? 0.6 : 1,
                }}
              >
                {exporting ? 'Generando…' : 'Descargar Excel (todos)'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode(v => v === 'resumen' ? 'detalle' : 'resumen')}
                disabled={contratos.length === 0}
                style={{
                  padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
                  border: '1px solid #bfdbfe',
                  background: viewMode === 'resumen' ? '#1d4ed8' : '#eff6ff',
                  color: viewMode === 'resumen' ? '#fff' : '#1d4ed8',
                  fontWeight: 700, fontSize: '0.875rem',
                  cursor: contratos.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: contratos.length === 0 ? 0.6 : 1,
                }}
              >
                {viewMode === 'resumen' ? 'Ver detalle' : 'Resumen'}
              </button>
              {viewMode === 'resumen' && (
                <button
                  type="button"
                  onClick={handleExportResumen}
                  disabled={resumen.length === 0}
                  style={{
                    padding: '0.625rem 1.25rem', borderRadius: '0.625rem',
                    border: '1px solid #ddd6fe', background: '#f5f3ff', color: '#6d28d9',
                    fontWeight: 700, fontSize: '0.875rem',
                    cursor: resumen.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: resumen.length === 0 ? 0.6 : 1,
                  }}
                >
                  Descargar Excel (resumen)
                </button>
              )}
            </div>
          </div>
          <div className="hist-filter-bar" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <label className="field-label" style={{ margin: 0 }}>
                Filtrar por propiedad
                {selectedProps.length > 0 && (
                  <span style={{ marginLeft: '0.5rem', color: '#1d4ed8', fontWeight: 700 }}>
                    ({selectedProps.length} seleccionada{selectedProps.length !== 1 ? 's' : ''})
                  </span>
                )}
                {selectedProps.length === 0 && (
                  <span style={{ marginLeft: '0.5rem', color: '#64748b', fontWeight: 500 }}>
                    (todas)
                  </span>
                )}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedProps(propiedadesDisponibles.slice())}
                  disabled={propiedadesDisponibles.length === 0}
                  style={{
                    padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1', background: '#fff', color: '#475569',
                    fontWeight: 600, fontSize: '0.75rem',
                    cursor: propiedadesDisponibles.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: propiedadesDisponibles.length === 0 ? 0.6 : 1,
                  }}
                >
                  Seleccionar todas
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProps([])}
                  disabled={selectedProps.length === 0}
                  style={{
                    padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
                    border: '1px solid #cbd5e1', background: '#fff', color: '#475569',
                    fontWeight: 600, fontSize: '0.75rem',
                    cursor: selectedProps.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: selectedProps.length === 0 ? 0.6 : 1,
                  }}
                >
                  Limpiar
                </button>
              </div>
            </div>
            {propiedadesDisponibles.length === 0 ? (
              <p style={{ color: '#94a3b8', fontSize: '0.8125rem', fontStyle: 'italic', margin: 0 }}>No hay propiedades disponibles.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {propiedadesDisponibles.map(p => {
                  const active = selectedProps.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePropiedad(p)}
                      title={active ? 'Clic para quitar del filtro' : 'Clic para añadir al filtro'}
                      style={{
                        padding: '0.4rem 0.85rem', borderRadius: '999px',
                        border: active ? '1px solid #1d4ed8' : '1px solid #e2e8f0',
                        background: active ? '#1d4ed8' : '#f8fafc',
                        color: active ? '#fff' : '#334155',
                        fontWeight: 600, fontSize: '0.8125rem',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {active ? '✓ ' : ''}{p}
                    </button>
                  );
                })}
              </div>
            )}
            <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
              Sin selección = se muestran todas las propiedades.
            </p>
          </div>
          <p style={{ marginTop: '0.875rem', fontSize: '0.8125rem', color: '#64748b', fontWeight: 600 }}>
            {loading
              ? 'Cargando…'
              : viewMode === 'resumen'
                ? `${resumen.length} propiedad${resumen.length !== 1 ? 'es' : ''} agrupada${resumen.length !== 1 ? 's' : ''} (${filtered.length} contrato${filtered.length !== 1 ? 's' : ''})`
                : `${filtered.length} resultado${filtered.length !== 1 ? 's' : ''} de ${contratos.length} en total`}
          </p>
        </div>

        {/* ── TABLA ── */}
        <div className="content-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Cargando historial…</div>
          ) : error ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#dc2626' }}>⚠ {error} — verifica que el backend esté corriendo.</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              {contratos.length === 0 ? 'No hay liquidaciones de contrato guardadas aún.' : 'Sin resultados para los filtros aplicados.'}
            </div>
          ) : viewMode === 'resumen' ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>Propiedad</th>
                    <th>Propietario</th>
                    <th style={{ textAlign: 'center' }}># Contratos</th>
                    <th>Ingreso reserva</th>
                    <th>Mayor ingreso</th>
                    <th>Comisión Airbnb</th>
                    <th>IVA com. Airbnb</th>
                    <th>Otros cobros</th>
                    <th>Total</th>
                    <th>Recibido banco</th>
                    <th>Diferencia</th>
                    <th>Comisión</th>
                    <th>IVA comisión</th>
                    <th>Retención fuente</th>
                    <th>Total a entregar</th>
                  </tr>
                </thead>
                <tbody>
                  {resumen.map(r => (
                    <tr key={r.propiedad}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{r.propiedad}</td>
                      <td style={{ fontWeight: 600 }}>{r.propietario}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#1d4ed8' }}>{r.count}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.ingreso_reserva)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.mayor_ingreso)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: '#dc2626' }}>{fmt(r.menos_comision_airbnb)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: '#dc2626' }}>{fmt(r.iva_comision_airbnb)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.otros_cobros)}</td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{fmt(r.total)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.recibido_banco)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.diferencia)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: '#dc2626' }}>{fmt(r.menos_comision)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: '#dc2626' }}>{fmt(r.menos_iva_comision)}</td>
                      <td style={{ whiteSpace: 'nowrap', color: '#dc2626' }}>{fmt(r.retencion_fuente)}</td>
                      <td style={{ whiteSpace: 'nowrap', fontWeight: 700, color: '#10b981' }}>{fmt(r.total_a_entregar)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f1f5f9', borderTop: '2px solid #cbd5e1' }}>
                    <td style={{ fontWeight: 900, color: '#0f172a' }}>TOTAL ACUMULADO</td>
                    <td style={{ color: '#64748b' }}>—</td>
                    <td style={{ textAlign: 'center', fontWeight: 900, color: '#1d4ed8' }}>{grandTotal.count}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 800 }}>{fmt(grandTotal.ingreso_reserva)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 800 }}>{fmt(grandTotal.mayor_ingreso)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 800, color: '#dc2626' }}>{fmt(grandTotal.menos_comision_airbnb)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 800, color: '#dc2626' }}>{fmt(grandTotal.iva_comision_airbnb)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 800 }}>{fmt(grandTotal.otros_cobros)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 900 }}>{fmt(grandTotal.total)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 800 }}>{fmt(grandTotal.recibido_banco)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 800 }}>{fmt(grandTotal.diferencia)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 800, color: '#dc2626' }}>{fmt(grandTotal.menos_comision)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 800, color: '#dc2626' }}>{fmt(grandTotal.menos_iva_comision)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 800, color: '#dc2626' }}>{fmt(grandTotal.retencion_fuente)}</td>
                    <td style={{ whiteSpace: 'nowrap', fontWeight: 900, color: '#10b981' }}>{fmt(grandTotal.total_a_entregar)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="hist-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Propietario</th>
                    <th>Propiedad</th>
                    <th>Huésped</th>
                    <th>Reserva N°</th>
                    <th>Total a Entregar</th>
                    <th>Fecha</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id}>
                      <td style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{c.id}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{c.propietario || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{c.propiedad || '—'}</td>
                      <td>{c.huesped || '—'}</td>
                      <td style={{ color: '#475569' }}>{c.numero_reserva || '—'}</td>
                      <td style={{ fontWeight: 700, color: '#10b981', whiteSpace: 'nowrap' }}>{fmt(c.total_a_entregar)}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(c.created_at).toLocaleDateString('es-CO')}</td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => handleView(c)}
                          style={{
                            padding: '0.4rem 0.875rem',
                            marginRight: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: '#0284c7',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                          }}
                        >
                          Ver
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          style={{
                            padding: '0.4rem 0.875rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '0.375rem',
                            cursor: 'pointer',
                          }}
                        >
                          Borrar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
