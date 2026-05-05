import React, { useMemo, useState } from 'react';
import { Currency, formatCurrency as formatCurrencyGlobal } from '../utils/currency';

const API_URL = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ?? 'http://localhost:4000';

type IconProps = { className?: string };
type FieldShellProps = {
  label: string;
  icon: React.ComponentType<IconProps>;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  className?: string;
};
type ToggleShellProps = {
  label: string;
  checked: boolean;
  name: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
};

const iconClass = 'h-5 w-5';

function UserIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 21a8 8 0 1 0-16 0" /><circle cx="12" cy="8" r="4" />
    </svg>
  );
}
function HomeIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 11.5 12 4l9 7.5" /><path d="M5 10.5V20h14v-9.5" /><path d="M9.5 20v-6h5v6" />
    </svg>
  );
}
function PassportIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="3" width="14" height="18" rx="2" /><circle cx="12" cy="10" r="2.2" /><path d="M9 15h6" />
    </svg>
  );
}
function FlagIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 4v16" /><path d="M5 5c2.8-1.5 5.4-1.5 8.2 0 1.7.9 3.4 1.1 5.8.3v7.8c-2.4.8-4.1.6-5.8-.3-2.8-1.5-5.4-1.5-8.2 0" />
    </svg>
  );
}
function HashIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 4 7 20" /><path d="M17 4 15 20" /><path d="M4 9h16" /><path d="M3 15h16" />
    </svg>
  );
}
function MoneyIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3v18" /><path d="M17 7.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5S9.2 11 12 11s5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" />
    </svg>
  );
}
function ReceiptIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5V3Z" /><path d="M8 8h8" /><path d="M8 12h8" /><path d="M8 16h4" />
    </svg>
  );
}
function SparkIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2l1.9 5.2L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.8L12 2Z" /><path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1Z" />
    </svg>
  );
}
function CheckIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function SaveIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" />
    </svg>
  );
}
function BankIcon({ className = iconClass }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 21h18" /><path d="M3 10h18" /><path d="M5 6 12 3l7 3" /><path d="M6 10v11" /><path d="M10 10v11" /><path d="M14 10v11" /><path d="M18 10v11" />
    </svg>
  );
}

// ── Tipos para autocomplete ──────────────────────────────────
// propiedades_completo view: incluye datos del propietario
type PropiedadSuggestion = {
  id: number; nombre: string; propietario_doc: string; propietario_nombre: string | null; responsable_iva: boolean;
};
type PropietarioSuggestion = {
  documento: string; nombre: string; responsable_iva: boolean;
};
type HuespedSuggestion = {
  id: number; nombre: string; nacionalidad: string | null; tipo_documento: string | null;
  numero_documento: string | null; extranjero: boolean; residente: boolean;
};

// ── Componente AutoInput con dropdown de sugerencias ─────────
// `query` tracks only what the user has typed; external value changes (programmatic fills)
// do NOT update `query`, so they never trigger a fetch.
function AutoInput<T>({
  name, value, onChange, onSelect, fetchUrl, renderItem, placeholder, className,
}: {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelect: (item: T) => void;
  fetchUrl: (q: string) => string;
  renderItem: (item: T) => React.ReactNode;
  placeholder?: string;
  className?: string;
}) {
  const [suggestions, setSuggestions] = React.useState<T[]>([]);
  const [show, setShow] = React.useState(false);
  // Only updated when the user types — never when a selection fills the field externally
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (query.trim().length < 2) { setSuggestions([]); setShow(false); return; }
      try {
        const r = await fetch(fetchUrl(query.trim()));
        const d = await r.json() as T[];
        setSuggestions(Array.isArray(d) ? d : []);
        setShow(true);
      } catch { setSuggestions([]); }
    }, 280);
    return () => clearTimeout(t);
  }, [query]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e);
  };

  const handleSelect = (item: T) => {
    setQuery('');
    setSuggestions([]);
    setShow(false);
    onSelect(item);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        name={name} value={value} onChange={handleChange}
        placeholder={placeholder} className={className}
        autoComplete="off"
        onBlur={() => setTimeout(() => setShow(false), 150)}
        onFocus={() => suggestions.length > 0 && setShow(true)}
      />
      {show && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.625rem',
          boxShadow: '0 8px 28px rgba(15,23,42,0.13)', overflow: 'hidden',
          maxHeight: '220px', overflowY: 'auto',
        }}>
          {suggestions.map((item, i) => (
            <button key={i} type="button"
              onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '0.55rem 0.875rem', border: 'none', background: 'none',
                cursor: 'pointer', fontSize: '0.84rem',
                borderBottom: i < suggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#f0f9ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldShell({ label, icon: Icon, children, hint, error, className = '' }: FieldShellProps) {
  return (
    <div className={`field-shell ${error ? 'has-error' : ''} ${className}`.trim()}>
      <div className="field-head">
        <span className="field-icon"><Icon /></span>
        <div>
          <span className="field-label">{label}</span>
          {hint ? <p className="field-hint">{hint}</p> : null}
        </div>
      </div>
      {children}
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

function ToggleShell({ label, checked, name, onChange, className = '', disabled = false }: ToggleShellProps) {
  return (
    <label className={`toggle-shell ${className} ${disabled ? 'is-disabled' : ''}`.trim()}>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} disabled={disabled} />
      <span className="toggle-track">
        <span className={`toggle-thumb ${checked ? 'is-on' : ''}`} />
      </span>
      <span className="toggle-label">{label}</span>
    </label>
  );
}

const initialState = {
  documentoPropietario: '',
  nombrePropiedad: '',
  nombrePropietario: '',
  responsableIVA: false,
  nombreHuesped: '',
  nacionalidad: '',
  tipoDocumento: '',
  extranjero: false,
  residente: false,
  numeroReserva: '',
  reservaInicial: '',
  tarifaLimpieza: '',
  totalIngresoReserva: '',
  impuestoUso: '',
  huespedPago: '',
  tarifaHabitacion: '',
  ajustePrecioNoche: '',
  totalGastos: '',
  tarifaServicios: '',
  ivaComision: '',
  totalComisionIVA: '',
  impuestoUsoPropiedad: '',
  totalLiquidado: '',
  confirmacionTotal: '',
  comisionConIVA: false,
  recibidoNeto: '',
  menosComisionAnfitriones: '',
  otrosCobros: '',
  numeroDocumento: '',
};

const tiposDocumento = [
  { value: 'CC',   label: 'CC — Cédula de Ciudadanía' },
  { value: 'CE',   label: 'CE — Cédula de Extranjería' },
  { value: 'TI',   label: 'TI — Tarjeta de Identidad' },
  { value: 'NIT',  label: 'NIT — N° Identificación Tributaria' },
  { value: 'PP',   label: 'PP — Pasaporte' },
  { value: 'PEP',  label: 'PEP — Permiso Especial de Permanencia' },
  { value: 'PPT',  label: 'PPT — Permiso Protección Temporal' },
  { value: 'DNI',  label: 'DNI — Documento Nacional de Identidad' },
  { value: 'CI',   label: 'CI — Cédula de Identidad' },
  { value: 'RUT',  label: 'RUT — Rol Único Tributario (Chile)' },
  { value: 'RUC',  label: 'RUC — Reg. Único de Contribuyentes' },
  { value: 'CUIL', label: 'CUIL / CUIT (Argentina)' },
  { value: 'Otro', label: 'Otro' },
];

const progressSteps = [
  { title: 'Datos generales',  detail: 'Propiedad, huésped y documento' },
  { title: 'Liquidación Base', detail: 'Reserva inicial y cargo de limpieza' },
  { title: 'Gastos reserva',   detail: 'Habitación y ajustes por noche' },
  { title: 'Comisiones',       detail: 'Servicios, IVA y liquidación final' },
  { title: 'Cobros / Balance', detail: 'Recibido neto y cobros pendientes' },
  { title: 'Exportación',      detail: 'Resumen y archivo Excel' },
];

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function LiquidacionAirbnb({ onNavigate, currency = 'COP' }: { onNavigate: (view: string) => void; currency?: Currency }) {
  const [form, setForm] = useState(initialState);
  const [step, setStep] = useState(1);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const progress = useMemo(() => Math.min(100, Math.max(0, ((step - 1) / 5) * 100)), [step]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, type } = e.target;
    const value = (e.target as HTMLInputElement).value;
    const checked = (e.target as HTMLInputElement).checked;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
  };

  const formatCurrency = (value: string | number): string => {
    const num = parseFloat(String(value));
    if (isNaN(num)) return '';
    return formatCurrencyGlobal(num, currency);
  };

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = ['Backspace', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'];
    if (allowedKeys.includes(e.key)) return;
    if (!/^[0-9.,]$/.test(e.key)) e.preventDefault();
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const cleanValue = String(value).replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(cleanValue);
    if (value && !isNaN(num)) {
      setForm((prev) => ({ ...prev, [name]: String(parseFloat(num.toFixed(2))) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: '' }));
    }
    setFocusedField(null);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setFocusedField(e.target.name);
  };

  const getDisplayValue = (name: string) => {
    const raw = form[name as keyof typeof form] as string;
    if (focusedField === name) return raw ?? '';
    if (!raw) return '';
    return formatCurrency(raw);
  };

  const handlePasteNumeric = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    e.preventDefault();
    const pasted = e.clipboardData.getData('text') ?? '';
    const clean = pasted.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.-]/g, '');
    const num = parseFloat(clean);
    if (!isNaN(num)) {
      setForm((prev) => ({ ...prev, [target.name]: num.toFixed(2) }));
      setFocusedField(null);
      try { target.value = formatCurrency(num); } catch (_) { /* ignore */ }
    }
  };

  // Step 2 calculations
  React.useEffect(() => {
    if (form.reservaInicial || form.tarifaLimpieza) {
      const reservaInicial = parseFloat(form.reservaInicial) || 0;
      const tarifaLimpieza = parseFloat(form.tarifaLimpieza) || 0;
      const totalIngresoReserva = reservaInicial + tarifaLimpieza;
      const impuestoUso = totalIngresoReserva * 0.19;
      const huespedPago = totalIngresoReserva + impuestoUso;
      setForm((prev) => ({
        ...prev,
        totalIngresoReserva: totalIngresoReserva.toFixed(2),
        impuestoUso: impuestoUso.toFixed(2),
        huespedPago: huespedPago.toFixed(2),
      }));
    }
  }, [form.reservaInicial, form.tarifaLimpieza]);

  // Step 3 calculations
  React.useEffect(() => {
    if (form.tarifaHabitacion || form.ajustePrecioNoche) {
      const tarifaHabitacion = parseFloat(form.tarifaHabitacion) || 0;
      const tarifaLimpieza = parseFloat(form.tarifaLimpieza) || 0;
      const ajustePrecioNoche = parseFloat(form.ajustePrecioNoche) || 0;
      setForm((prev) => ({
        ...prev,
        totalGastos: (tarifaHabitacion + tarifaLimpieza - ajustePrecioNoche).toFixed(2),
      }));
    }
  }, [form.tarifaHabitacion, form.ajustePrecioNoche]);

  // Step 4 calculations
  React.useEffect(() => {
    if (step !== 4) return;
    const huespedPago = parseFloat(form.huespedPago) || 0;
    const totalGastos = parseFloat(form.totalGastos) || 0;
    const tarifaServicios = huespedPago * 0.155;
    let ivaComision = 0;
    let totalComisionIVA = tarifaServicios;
    if (form.comisionConIVA) {
      ivaComision = tarifaServicios * 0.19;
      totalComisionIVA += ivaComision;
    }
    const impuestoUsoPropiedad = totalGastos * 0.19;
    const totalLiquidado = totalGastos - tarifaServicios + impuestoUsoPropiedad;
    const confirmacionTotal = totalGastos + impuestoUsoPropiedad;
    setForm((prev) => ({
      ...prev,
      tarifaServicios: tarifaServicios.toFixed(2),
      ivaComision: ivaComision ? ivaComision.toFixed(2) : '',
      totalComisionIVA: totalComisionIVA.toFixed(2),
      impuestoUsoPropiedad: impuestoUsoPropiedad.toFixed(2),
      totalLiquidado: totalLiquidado.toFixed(2),
      confirmacionTotal: confirmacionTotal.toFixed(2),
    }));
  }, [form.huespedPago, form.totalGastos, form.comisionConIVA, step]);

  // Step 5 calculations — cobros
  React.useEffect(() => {
    const tarifaServicios = parseFloat(form.tarifaServicios) || 0;
    const totalLiquidado  = parseFloat(form.totalLiquidado)  || 0;
    const recibidoNeto    = parseFloat(form.recibidoNeto)    || 0;
    setForm((prev) => ({
      ...prev,
      menosComisionAnfitriones: tarifaServicios ? tarifaServicios.toFixed(2) : '',
      otrosCobros: form.recibidoNeto ? (totalLiquidado - recibidoNeto).toFixed(2) : '',
    }));
  }, [form.recibidoNeto, form.totalLiquidado, form.tarifaServicios]);

  const resetToNew = () => {
    setForm(initialState);
    setStep(1);
    setFocusedField(null);
    setSaveStatus('idle');
    setSaveMsg('');
    setErrors({});
  };

  const validateStep = (s: number): Record<string, string> => {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!form.nombrePropiedad.trim())  e.nombrePropiedad  = 'Campo requerido';
      if (!form.nombrePropietario.trim()) e.nombrePropietario = 'Campo requerido';
      if (!form.nombreHuesped.trim())    e.nombreHuesped    = 'Campo requerido';
      if (!form.nacionalidad.trim())     e.nacionalidad     = 'Campo requerido';
      if (!form.tipoDocumento)           e.tipoDocumento    = 'Selecciona un tipo de documento';
      if (!form.numeroDocumento.trim())  e.numeroDocumento  = 'Campo requerido';
      if (!form.numeroReserva.trim())    e.numeroReserva    = 'Campo requerido';
    }
    if (s === 2) {
      if (!form.reservaInicial)  e.reservaInicial  = 'Ingresa la reserva inicial';
      if (!form.tarifaLimpieza)  e.tarifaLimpieza  = 'Ingresa la tarifa de limpieza';
    }
    if (s === 3) {
      if (!form.tarifaHabitacion)    e.tarifaHabitacion    = 'Ingresa la tarifa de habitación';
      if (!form.ajustePrecioNoche)   e.ajustePrecioNoche   = 'Ingresa el ajuste de precio por noche';
    }
    if (s === 5) {
      if (!form.recibidoNeto) e.recibidoNeto = 'Ingresa el recibido neto en el banco';
    }
    return e;
  };

  const handleStep1Next = () => {
    const errs = validateStep(1);
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  };

  const calcularBase = () => {
    const errs = validateStep(2);
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(3);
  };

  const calcularGastos = () => {
    const errs = validateStep(3);
    setErrors(errs);
    if (Object.keys(errs).length === 0) setStep(4);
  };

  const calcularComisiones = () => {
    const huespedPago = parseFloat(form.huespedPago) || 0;
    const totalGastos = parseFloat(form.totalGastos) || 0;
    const tarifaServicios = huespedPago * 0.155;
    let ivaComision = 0;
    let totalComisionIVA = tarifaServicios;
    if (form.comisionConIVA) {
      ivaComision = tarifaServicios * 0.19;
      totalComisionIVA += ivaComision;
    }
    const impuestoUsoPropiedad = totalGastos * 0.19;
    const totalLiquidado = totalGastos - tarifaServicios + impuestoUsoPropiedad;
    const confirmacionTotal = totalGastos + impuestoUsoPropiedad;
    setForm((prev) => ({
      ...prev,
      tarifaServicios: tarifaServicios.toFixed(2),
      ivaComision: ivaComision ? ivaComision.toFixed(2) : '',
      totalComisionIVA: totalComisionIVA.toFixed(2),
      impuestoUsoPropiedad: impuestoUsoPropiedad.toFixed(2),
      totalLiquidado: totalLiquidado.toFixed(2),
      confirmacionTotal: confirmacionTotal.toFixed(2),
    }));
    setStep(5);
  };

  const guardarLiquidacion = async () => {
    const allErrs = { ...validateStep(1), ...validateStep(2), ...validateStep(3), ...validateStep(5) };
    if (Object.keys(allErrs).length > 0) {
      setErrors(allErrs);
      setSaveStatus('error');
      setSaveMsg('Completa todos los campos requeridos antes de guardar.');
      return;
    }
    setSaveStatus('saving');
    setSaveMsg('');
    try {
      const res = await fetch(`${API_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        setSaveStatus('saved');
        setSaveMsg('Liquidación guardada en Supabase correctamente.');
      } else {
        setSaveStatus('error');
        setSaveMsg(json.error ?? 'Error al guardar. Revisa la configuración de Supabase.');
      }
    } catch {
      setSaveStatus('error');
      setSaveMsg('No se pudo conectar al backend. Verifica que esté corriendo en el puerto 4000.');
    }
  };

  const exportarExcel = async () => {
    const allErrs = { ...validateStep(1), ...validateStep(2), ...validateStep(3), ...validateStep(5) };
    if (Object.keys(allErrs).length > 0) {
      setErrors(allErrs);
      setSaveStatus('error');
      setSaveMsg('Completa todos los campos requeridos antes de exportar.');
      return;
    }
    setSaveStatus('saving');
    setSaveMsg('');
    try {
      const res = await fetch(`${API_URL}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'liquidacion_airbnb.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      setSaveStatus('saved');
      setSaveMsg('Exportado y guardado en Supabase correctamente.');
    } catch {
      setSaveStatus('error');
      setSaveMsg('No se pudo conectar al backend. Verifica que esté corriendo en el puerto 4000.');
    }
  };

  const stepFill = `${progress}%`;
  const currentStepMeta = progressSteps[step - 1] ?? progressSteps[progressSteps.length - 1];

  const numericInput = (name: string, placeholder = '0,00') => ({
    name,
    value: getDisplayValue(name),
    onChange: handleChange,
    onBlur: handleInputBlur,
    onFocus: handleInputFocus,
    onKeyDown: handleNumericKeyDown,
    onPaste: handlePasteNumeric,
    inputMode: 'numeric' as const,
    pattern: '[0-9.,]*',
    placeholder,
    className: 'input',
  });

  const otrosCobrosNum = parseFloat(form.otrosCobros);

  return (
    <div className="app-layout">
      <div className="app-shell">

        {/* ── HERO ── */}
        <header className="hero-panel" style={{ minHeight: '340px' }}>
          <div className="hero-orb hero-orb-left" />
          <div className="hero-orb hero-orb-right" />
          <div className="hero-content">
            <div className="hero-copy">
              <span className="hero-kicker">
                <SparkIcon className="h-4 w-4" />
                Sistema de liquidación
              </span>
              <h1>Liquidación Airbnb</h1>
              <p>Organiza reservas, calcula la base, controla gastos y exporta el resultado en Excel. Los datos se guardan automáticamente en Supabase.</p>
            </div>
            <nav className="main-nav" aria-label="Módulos">
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="nav-tab is-active nav-tab-single" style={{ flex: '1 1 120px' }}>
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
                <button type="button" className="nav-tab nav-tab-single" style={{ flex: '1 1 100%' }} onClick={() => onNavigate('historial-contratos')}>
                  <span className="nav-tab-title">Historial Contratos</span>
                  <span className="nav-tab-text">Ver contratos guardados.</span>
                </button>
              </div>
            </nav>
          </div>
        </header>

        {/* ── WORKSPACE ── */}
        <main className="workspace-grid">

          {/* LEFT — main flow */}
          <section className="workspace-main">
            <div className="content-card content-card-hero">

              <div className="module-header">
                <div>
                  <span className="card-eyebrow">Liquidación de reservas</span>
                  <h2>Flujo de liquidación Airbnb</h2>
                  <p>Completa los 6 pasos para generar y exportar la liquidación.</p>
                </div>
                <div className="module-badge">Etapa {step} de 6</div>
              </div>

              {/* Progress */}
              <div className="progress-block">
                <div className="progress-topline">
                  <span className="progress-caption">Progreso general</span>
                  <span className="progress-percent">{Math.round(progress)}%</span>
                </div>
                <div className="progress-track" aria-label="Progreso de liquidación">
                  <div className="progress-fill" style={{ width: stepFill }} />
                </div>
                <div className="progress-steps">
                  {progressSteps.map((item, index) => {
                    const completed = index + 1 < step;
                    const active = index + 1 === step;
                    return (
                      <div key={item.title} className={`progress-step ${completed ? 'is-completed' : ''} ${active ? 'is-active' : ''}`}>
                        <span className="progress-step-dot">{index + 1}</span>
                        <div>
                          <strong>{item.title}</strong>
                          <p>{item.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── STEP 1 ── */}
              {step === 1 && (
                <div className="section-card">
                  <div className="section-card-header">
                    <div>
                      <span className="card-eyebrow">Paso 1</span>
                      <h3>Datos generales</h3>
                    </div>
                    <span className="section-chip">Propiedad y huésped</span>
                  </div>

                  <div className="form-grid form-grid-wide">
                    <FieldShell label="Documento del propietario" icon={PassportIcon} hint="Identificador único del propietario (CC, NIT, etc.)." error={errors.documentoPropietario}>
                      <AutoInput<PropietarioSuggestion>
                        name="documentoPropietario"
                        value={form.documentoPropietario}
                        onChange={handleChange}
                        fetchUrl={q => `${API_URL}/propietarios?q=${encodeURIComponent(q)}`}
                        onSelect={pr => setForm(prev => ({
                          ...prev,
                          documentoPropietario: pr.documento,
                          nombrePropietario: pr.nombre,
                          responsableIVA: pr.responsable_iva,
                        }))}
                        renderItem={pr => <span><strong>{pr.documento}</strong><span style={{ color: '#64748b' }}> — {pr.nombre}</span></span>}
                        placeholder="Ej. 12345678"
                        className="input"
                      />
                    </FieldShell>

                    <FieldShell label="Nombre de la propiedad" icon={HomeIcon} hint="Identifica la reserva o inmueble principal." error={errors.nombrePropiedad}>
                      <AutoInput<PropiedadSuggestion>
                        name="nombrePropiedad"
                        value={form.nombrePropiedad}
                        onChange={handleChange}
                        fetchUrl={q => `${API_URL}/propiedades?q=${encodeURIComponent(q)}`}
                        onSelect={p => setForm(prev => ({
                          ...prev,
                          nombrePropiedad: p.nombre,
                          documentoPropietario: p.propietario_doc,
                          nombrePropietario: p.propietario_nombre ?? prev.nombrePropietario,
                          responsableIVA: p.responsable_iva,
                        }))}
                        renderItem={p => <span><strong>{p.nombre}</strong>{p.propietario_nombre ? <span style={{ color: '#64748b' }}> — {p.propietario_nombre}</span> : null}</span>}
                        placeholder="Casa, apartamento o unidad"
                        className="input"
                      />
                    </FieldShell>

                    <FieldShell label="Nombre del propietario" icon={UserIcon} hint="Titular registrado para la liquidación." error={errors.nombrePropietario}>
                      <input name="nombrePropietario" value={form.nombrePropietario} onChange={handleChange} placeholder="Nombre completo" className="input" />
                    </FieldShell>

                    <ToggleShell label="Responsable de IVA" checked={form.responsableIVA} name="responsableIVA" onChange={handleChange} className="form-toggle-wide" />

                    <FieldShell label="Nombre del huésped" icon={UserIcon} hint="Persona que realizó la reserva." error={errors.nombreHuesped}>
                      <AutoInput<HuespedSuggestion>
                        name="nombreHuesped"
                        value={form.nombreHuesped}
                        onChange={handleChange}
                        fetchUrl={q => `${API_URL}/huespedes?q=${encodeURIComponent(q)}`}
                        onSelect={h => setForm(prev => ({
                          ...prev,
                          nombreHuesped: h.nombre,
                          nacionalidad: h.nacionalidad ?? prev.nacionalidad,
                          tipoDocumento: h.tipo_documento ?? prev.tipoDocumento,
                          numeroDocumento: h.numero_documento ?? prev.numeroDocumento,
                          extranjero: h.extranjero,
                          residente: h.residente,
                        }))}
                        renderItem={h => <span><strong>{h.nombre}</strong>{h.numero_documento ? <span style={{ color: '#64748b' }}> — {h.tipo_documento} {h.numero_documento}</span> : null}</span>}
                        placeholder="Nombre del huésped"
                        className="input"
                      />
                    </FieldShell>

                    <FieldShell label="Nacionalidad" icon={FlagIcon} hint="País o nacionalidad del huésped." error={errors.nacionalidad}>
                      <input name="nacionalidad" value={form.nacionalidad} onChange={handleChange} placeholder="Ej. Colombiana" className="input" />
                    </FieldShell>

                    <FieldShell label="Tipo de documento" icon={PassportIcon} hint="Identificador oficial del huésped." error={errors.tipoDocumento}>
                      <select name="tipoDocumento" value={form.tipoDocumento} onChange={handleChange} className="input">
                        <option value="">Selecciona una opción</option>
                        {tiposDocumento.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </FieldShell>

                    <FieldShell label="N° de documento" icon={PassportIcon} hint="Número del documento de identidad del huésped." error={errors.numeroDocumento}>
                      <input name="numeroDocumento" value={form.numeroDocumento} onChange={handleChange} placeholder="Ej. 1234567890" className="input" />
                    </FieldShell>

                    <ToggleShell label="Extranjero" checked={form.extranjero} name="extranjero" onChange={handleChange} />
                    <ToggleShell label="Residente" checked={form.residente} name="residente" onChange={handleChange} />

                    <FieldShell label="Número de reserva" icon={HashIcon} hint="Código de referencia de la plataforma." error={errors.numeroReserva}>
                      <input name="numeroReserva" value={form.numeroReserva} onChange={handleChange} placeholder="Ej. AIR-2026-0041" className="input" />
                    </FieldShell>
                  </div>

                  <div className="section-actions">
                    <button className="btn btn-primary" onClick={handleStep1Next}>Siguiente →</button>
                  </div>
                </div>
              )}

              {/* ── STEP 2 ── */}
              {step === 2 && (
                <div className="section-card">
                  <div className="section-card-header">
                    <div>
                      <span className="card-eyebrow">Paso 2</span>
                      <h3>Liquidación Base</h3>
                    </div>
                    <span className="section-chip">Reserva y limpieza</span>
                  </div>

                  <div className="form-grid">
                    <FieldShell label="Reserva inicial" icon={MoneyIcon} hint="Valor bruto de la reserva antes de ajustes." error={errors.reservaInicial}>
                      <input {...numericInput('reservaInicial')} />
                    </FieldShell>
                    <FieldShell label="Tarifa limpieza" icon={ReceiptIcon} hint="Cargo de limpieza asociado a la estadía." error={errors.tarifaLimpieza}>
                      <input {...numericInput('tarifaLimpieza')} />
                    </FieldShell>
                    <FieldShell label="Total ingreso reserva" icon={SparkIcon} hint="Reserva inicial + tarifa limpieza (calculado).">
                      <input name="totalIngresoReserva" value={formatCurrency(form.totalIngresoReserva)} readOnly placeholder="0,00" className="input input-readonly" />
                    </FieldShell>
                    <FieldShell label="Impuesto de uso 19%" icon={MoneyIcon} hint="Calculado automáticamente sobre el total.">
                      <input name="impuestoUso" value={formatCurrency(form.impuestoUso)} readOnly placeholder="0,00" className="input input-readonly" />
                    </FieldShell>
                    <FieldShell label="Huésped paga" icon={ReceiptIcon} hint="Total con impuesto de uso incluido.">
                      <input name="huespedPago" value={formatCurrency(form.huespedPago)} readOnly placeholder="0,00" className="input input-readonly" />
                    </FieldShell>
                  </div>

                  <div className="section-actions split-actions">
                    <button className="btn btn-secondary" onClick={() => setStep(1)}>← Atrás</button>
                    <button className="btn btn-primary" onClick={calcularBase}>Continuar →</button>
                  </div>
                </div>
              )}

              {/* ── STEP 3 ── */}
              {step === 3 && (
                <div className="section-card">
                  <div className="section-card-header">
                    <div>
                      <span className="card-eyebrow">Paso 3</span>
                      <h3>Gastos de reserva</h3>
                    </div>
                    <span className="section-chip">Costos y ajustes</span>
                  </div>

                  <div className="form-grid">
                    <FieldShell label="Tarifa habitación × noches" icon={MoneyIcon} hint="Valor acumulado de la habitación." error={errors.tarifaHabitacion}>
                      <input {...numericInput('tarifaHabitacion')} />
                    </FieldShell>
                    <FieldShell label="Tarifa limpieza" icon={ReceiptIcon} hint="Se mantiene como parte del total de gastos.">
                      <input name="tarifaLimpieza" value={formatCurrency(form.tarifaLimpieza)} readOnly placeholder="0,00" className="input input-readonly" />
                    </FieldShell>
                    <FieldShell label="Ajuste precio por noche" icon={SparkIcon} hint="Corrección adicional sobre la tarifa." error={errors.ajustePrecioNoche}>
                      <input {...numericInput('ajustePrecioNoche')} />
                    </FieldShell>
                    <FieldShell label="Total gastos" icon={MoneyIcon} hint="Habitación + limpieza − ajuste (calculado).">
                      <input name="totalGastos" value={formatCurrency(form.totalGastos)} readOnly placeholder="0,00" className="input input-readonly" />
                    </FieldShell>
                  </div>

                  <div className="section-actions split-actions">
                    <button className="btn btn-secondary" onClick={() => setStep(2)}>← Atrás</button>
                    <button className="btn btn-primary" onClick={calcularGastos}>Continuar →</button>
                  </div>
                </div>
              )}

              {/* ── STEP 4 ── */}
              {step === 4 && (
                <div className="section-card">
                  <div className="section-card-header">
                    <div>
                      <span className="card-eyebrow">Paso 4</span>
                      <h3>Comisiones y liquidación final</h3>
                    </div>
                    <span className="section-chip">Resultados</span>
                  </div>

                  <div className="form-grid">
                    <FieldShell label="Tarifa servicios 15,5%" icon={ReceiptIcon} hint="Comisión base sobre el pago del huésped (calculado).">
                      <input name="tarifaServicios" value={formatCurrency(form.tarifaServicios)} readOnly placeholder="0,00" className="input input-readonly" />
                    </FieldShell>

                    <ToggleShell label="Ingresar IVA sobre comisión" checked={form.comisionConIVA} name="comisionConIVA" onChange={handleChange} />

                    {form.comisionConIVA && (
                      <FieldShell label="IVA comisión (19%)" icon={MoneyIcon} hint="Se activa solo si la comisión lleva IVA.">
                        <input name="ivaComision" value={formatCurrency(form.ivaComision)} readOnly placeholder="0,00" className="input input-readonly" />
                      </FieldShell>
                    )}

                    <FieldShell label="Total comisión con IVA" icon={ReceiptIcon} hint="Comisión consolidada final.">
                      <input name="totalComisionIVA" value={formatCurrency(form.totalComisionIVA)} readOnly placeholder="0,00" className="input input-readonly" />
                    </FieldShell>

                    <FieldShell label="Impuesto uso propiedad" icon={MoneyIcon} hint="19% sobre el total de gastos de la reserva.">
                      <input name="impuestoUsoPropiedad" value={formatCurrency(form.impuestoUsoPropiedad)} readOnly placeholder="0,00" className="input input-readonly" />
                    </FieldShell>

                    <FieldShell label="Total liquidado" icon={SparkIcon} hint="Gastos − comisión + impuesto uso propiedad.">
                      <input name="totalLiquidado" value={formatCurrency(form.totalLiquidado)} readOnly placeholder="0,00" className="input input-readonly" />
                    </FieldShell>

                    <FieldShell label="Confirmación total reserva" icon={ReceiptIcon} hint="Control final: total gastos + impuesto uso.">
                      <input name="confirmacionTotal" value={formatCurrency(form.confirmacionTotal)} readOnly placeholder="0,00" className="input input-readonly" />
                    </FieldShell>
                  </div>

                  <div className="section-actions split-actions">
                    <button className="btn btn-secondary" onClick={() => setStep(3)}>← Atrás</button>
                    <button className="btn btn-primary" onClick={calcularComisiones}>Continuar →</button>
                  </div>
                </div>
              )}

              {/* ── STEP 5 — COBROS ── */}
              {step === 5 && (
                <div className="section-card">
                  <div className="section-card-header">
                    <div>
                      <span className="card-eyebrow">Paso 5</span>
                      <h3>Cobros y balance neto</h3>
                    </div>
                    <span className="section-chip">Recibido y pendiente</span>
                  </div>

                  <div className="form-grid">
                    <FieldShell label="Recibido neto en el banco" icon={BankIcon} hint="Valor efectivamente acreditado en la cuenta bancaria." error={errors.recibidoNeto}>
                      <input {...numericInput('recibidoNeto')} />
                    </FieldShell>

                    <FieldShell label="Menos comisión anfitriones (15,5%)" icon={ReceiptIcon} hint="Tarifa de servicios de la plataforma (se toma de paso 4).">
                      <input
                        name="menosComisionAnfitriones"
                        value={form.menosComisionAnfitriones ? formatCurrency(form.menosComisionAnfitriones) : ''}
                        readOnly
                        placeholder="0,00"
                        className="input input-readonly"
                      />
                    </FieldShell>

                    <FieldShell
                      label="Otros cobros por determinar"
                      icon={SparkIcon}
                      hint="Total liquidado − recibido neto (calculado automáticamente)."
                      className="form-toggle-wide"
                    >
                      <input
                        name="otrosCobros"
                        value={form.otrosCobros !== '' ? formatCurrency(form.otrosCobros) : ''}
                        readOnly
                        placeholder="Ingresa el recibido neto para calcular"
                        className="input input-readonly"
                        style={{
                          color: form.otrosCobros !== '' ? '#dc2626' : undefined,
                          fontWeight: form.otrosCobros !== '' ? '800' : undefined,
                          fontSize: form.otrosCobros !== '' ? '1.05rem' : undefined,
                        }}
                      />
                    </FieldShell>
                  </div>

                  <div className="section-actions split-actions">
                    <button className="btn btn-secondary" onClick={() => setStep(4)}>← Atrás</button>
                    <button className="btn btn-primary" onClick={() => {
                      const errs = validateStep(5);
                      setErrors(errs);
                      if (Object.keys(errs).length === 0) setStep(6);
                    }}>Ver resumen →</button>
                  </div>
                </div>
              )}

              {/* ── STEP 6 — EXPORTACIÓN ── */}
              {step === 6 && (
                <div className="section-card">
                  <div className="section-card-header">
                    <div>
                      <span className="card-eyebrow">Paso 6</span>
                      <h3>Resumen y exportación</h3>
                    </div>
                    <span className="section-chip">Liquidación completa</span>
                  </div>

                  {/* Save status banner */}
                  {saveStatus !== 'idle' && (
                    <div className={`save-banner ${saveStatus} mt-4`}>
                      {saveStatus === 'saving' && <span>Guardando…</span>}
                      {saveStatus === 'saved' && <><CheckIcon className="h-4 w-4" /><span>{saveMsg}</span></>}
                      {saveStatus === 'error' && <span>⚠ {saveMsg}</span>}
                    </div>
                  )}

                  {/* Summary cards */}
                  <div className="export-summary-grid">
                    <div className="export-card">
                      <div className="export-card-label">Propiedad</div>
                      <div className="export-card-value">{form.nombrePropiedad || '—'}</div>
                    </div>
                    <div className="export-card">
                      <div className="export-card-label">Propietario</div>
                      <div className="export-card-value">{form.nombrePropietario || '—'}</div>
                    </div>
                    <div className="export-card">
                      <div className="export-card-label">Huésped</div>
                      <div className="export-card-value">{form.nombreHuesped || '—'}</div>
                    </div>
                    <div className="export-card">
                      <div className="export-card-label">Reserva N°</div>
                      <div className="export-card-value">{form.numeroReserva || '—'}</div>
                    </div>

                    <div className="export-card-highlight">
                      <div className="export-card-label">Huésped paga</div>
                      <div className="export-card-value">{formatCurrency(form.huespedPago) || '—'}</div>
                    </div>
                    <div className="export-card-highlight">
                      <div className="export-card-label">Total gastos</div>
                      <div className="export-card-value">{formatCurrency(form.totalGastos) || '—'}</div>
                    </div>
                    <div className="export-card-highlight">
                      <div className="export-card-label">Total comisión con IVA</div>
                      <div className="export-card-value">{formatCurrency(form.totalComisionIVA) || '—'}</div>
                    </div>
                    <div className="export-card-highlight">
                      <div className="export-card-label">Impuesto uso propiedad</div>
                      <div className="export-card-value">{formatCurrency(form.impuestoUsoPropiedad) || '—'}</div>
                    </div>

                    <div className="export-card-green" style={{ gridColumn: '1 / -1' }}>
                      <div className="export-card-label">Total liquidado</div>
                      <div className="export-card-value" style={{ fontSize: '1.4rem' }}>{formatCurrency(form.totalLiquidado) || '—'}</div>
                    </div>

                    {form.recibidoNeto && (
                      <div className="export-card-highlight" style={{ gridColumn: '1 / -1' }}>
                        <div className="export-card-label">Recibido neto en el banco</div>
                        <div className="export-card-value">{formatCurrency(form.recibidoNeto)}</div>
                      </div>
                    )}

                    {form.otrosCobros !== '' && (
                      <div style={{ gridColumn: '1 / -1', borderRadius: '0.75rem', border: '1px solid #fecaca', backgroundColor: '#fef2f2', padding: '1rem' }}>
                        <div className="export-card-label" style={{ color: '#dc2626' }}>Otros cobros por determinar</div>
                        <div className="export-card-value" style={{ color: '#dc2626', fontSize: '1.4rem' }}>
                          {formatCurrency(form.otrosCobros)}
                        </div>
                      </div>
                    )}

                    <div className="export-card" style={{ gridColumn: '1 / -1' }}>
                      <div className="export-card-label">Confirmación total reserva</div>
                      <div className="export-card-value">{formatCurrency(form.confirmacionTotal) || '—'}</div>
                    </div>
                  </div>

                  <div className="section-actions split-actions">
                    <button className="btn btn-secondary" onClick={() => setStep(5)}>← Atrás</button>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-primary" onClick={guardarLiquidacion} disabled={saveStatus === 'saving'}>
                        <SaveIcon className="h-4 w-4" />
                        Guardar en Supabase
                      </button>
                      <button className="btn btn-success" onClick={exportarExcel} disabled={saveStatus === 'saving'}>
                        Exportar a Excel
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* RIGHT — summary sidebar */}
          <aside className="workspace-side">
            <div className="summary-panel">
              <div className="summary-panel-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="card-eyebrow" style={{ margin: 0 }}>Resumen rápido</span>
                  <span style={{
                    marginLeft: 'auto',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '1.75rem', height: '1.75rem', borderRadius: '50%',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: '#fff', fontSize: '0.7rem', fontWeight: 900,
                    boxShadow: '0 0 10px rgba(139,92,246,0.5)',
                  }}>{step}</span>
                </div>
                <h3>{currentStepMeta.title}</h3>
                <p>{currentStepMeta.detail}</p>
              </div>

              <div className="summary-list">
                <div className="summary-item">
                  <span>Propiedad</span>
                  <strong>{form.nombrePropiedad || '—'}</strong>
                </div>
                <div className="summary-item">
                  <span>Propietario</span>
                  <strong>{form.nombrePropietario || '—'}</strong>
                </div>
                <div className="summary-item">
                  <span>Huésped</span>
                  <strong>{form.nombreHuesped || '—'}</strong>
                </div>
                <div className="summary-item">
                  <span>Nacionalidad</span>
                  <strong>{form.nacionalidad || '—'}</strong>
                </div>
                <div className="summary-item">
                  <span>Documento</span>
                  <strong>{form.tipoDocumento || '—'}</strong>
                </div>
                <div className="summary-item">
                  <span>Reserva N°</span>
                  <strong>{form.numeroReserva || '—'}</strong>
                </div>
                <div className="summary-item">
                  <span>IVA responsable</span>
                  <strong>{form.responsableIVA ? 'Sí' : 'No'}</strong>
                </div>
                <div className="summary-item">
                  <span>Progreso</span>
                  <strong>{Math.round(progress)}%</strong>
                </div>
                <div className={`summary-item ${form.huespedPago ? 'highlight' : ''}`}>
                  <span>Huésped paga</span>
                  <strong>{form.huespedPago ? formatCurrency(form.huespedPago) : '—'}</strong>
                </div>
                <div className={`summary-item ${form.totalGastos ? 'highlight' : ''}`}>
                  <span>Total gastos</span>
                  <strong>{form.totalGastos ? formatCurrency(form.totalGastos) : '—'}</strong>
                </div>
                <div className={`summary-item ${form.totalLiquidado ? 'highlight-green' : ''}`}>
                  <span>Total liquidado</span>
                  <strong>{form.totalLiquidado ? formatCurrency(form.totalLiquidado) : '—'}</strong>
                </div>
                {form.recibidoNeto && (
                  <div className="summary-item highlight">
                    <span>Recibido neto</span>
                    <strong>{formatCurrency(form.recibidoNeto)}</strong>
                  </div>
                )}
                {form.otrosCobros !== '' && (
                  <div className="summary-item" style={{ borderColor: '#fecaca', backgroundColor: '#fef2f2' }}>
                    <span style={{ color: '#b91c1c' }}>Otros cobros</span>
                    <strong style={{ color: '#dc2626' }}>
                      {isNaN(otrosCobrosNum) ? '—' : formatCurrency(form.otrosCobros)}
                    </strong>
                  </div>
                )}
                <div className={`summary-item ${form.confirmacionTotal ? 'highlight' : ''}`}>
                  <span>Confirmación total</span>
                  <strong>{form.confirmacionTotal ? formatCurrency(form.confirmacionTotal) : '—'}</strong>
                </div>
              </div>

              <div className="summary-actions">
                <button className="btn btn-warning w-full" onClick={resetToNew}>Nueva liquidación</button>
                <button className="btn btn-secondary w-full" onClick={() => setStep(1)}>Volver al inicio</button>
                <button className="btn btn-primary w-full" onClick={exportarExcel}>Exportar Excel</button>
              </div>
            </div>
          </aside>

        </main>
      </div>
    </div>
  );
}

export default LiquidacionAirbnb;
