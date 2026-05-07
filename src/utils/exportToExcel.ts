import XLSX from 'xlsx-js-style';

const API_URL =
  (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL ??
  'http://localhost:4000';

// ── Tipos de los datos crudos que vienen de cada vista/tabla de Supabase ──
type HistorialRow = {
  liquidacion_id: number;
  fecha: string;
  propiedad: string | null;
  propietario: string | null;
  responsable_iva: boolean | null;
  huesped: string | null;
  nacionalidad: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  numero_reserva: string | null;
  huesped_pago: number | null;
  total_gastos: number | null;
  total_liquidado: number | null;
  confirmacion_total: number | null;
  recibido_neto_banco: number | null;
  otros_cobros: number | null;
};

type ComisionRow = {
  liquidacion_id: number;
  fecha: string;
  propiedad: string | null;
  propietario: string | null;
  huesped: string | null;
  numero_reserva: string | null;
  responsable_iva: boolean | null;
  confirmacion_total: number | null;
  estado: 'pendiente' | 'listo';
  base_comision: number | null;
  comision: number | null;
  iva_comision_19: number | null;
  porcentaje_retencion: number | null;
  retencion_fuente: number | null;
  total_comision: number | null;
};

type IngresoRow = {
  no_comprobante: string | null;
  fecha: string;
  tipo_documento: string | null;
  identificacion: string | null;
  nombre_cliente: string | null;
  item: number | null;
  subtotal: number | null;
  impuesto_cargo: number | null;
  total: number | null;
};

type CompraRow = {
  soporte: string | null;
  fecha: string;
  tercero: string | null;
  documento: string | null;
  item: string | null;
  valor_bruto: number | null;
  iva: number | null;
  otros_impuestos: number | null;
  valor_factura: number | null;
  valor_a_pagar: number | null;
};

export type ContratoExportData = {
  propietario: string;
  propiedad: string;
  huesped: string;
  fecha: string;
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

// ── Estilos reutilizables ──────────────────────────────
const CURRENCY_FMT = '"$"#,##0.00';
const THIN_BORDER = {
  top:    { style: 'thin', color: { rgb: 'CBD5E1' } },
  bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
  left:   { style: 'thin', color: { rgb: 'CBD5E1' } },
  right:  { style: 'thin', color: { rgb: 'CBD5E1' } },
};

const HEADER_STYLE = {
  font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
  fill:      { patternType: 'solid', fgColor: { rgb: '0F172A' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
  border:    THIN_BORDER,
};

const CELL_STYLE = {
  font:      { sz: 10, color: { rgb: '0F172A' } },
  alignment: { vertical: 'center', wrapText: true },
  border:    THIN_BORDER,
};

const CURRENCY_STYLE = {
  ...CELL_STYLE,
  alignment: { horizontal: 'right', vertical: 'center' },
  numFmt:    CURRENCY_FMT,
};

const fmtDate = (d: string | null | undefined) => {
  if (!d) return '';
  const iso = d.includes('T') ? d.split('T')[0] : d;
  const [y, m, day] = iso.split('-');
  return y && m && day ? `${day}/${m}/${y}` : d;
};

// Construye una hoja a partir de encabezados + filas. `currencyCols` indica
// los índices (0-based) de columnas que llevan formato monetario.
function buildSheet(
  headers: string[],
  rows: (string | number | boolean | null)[][],
  currencyCols: number[] = [],
): XLSX.WorkSheet {
  const aoa: (string | number | boolean | null)[][] = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Header styles
  headers.forEach((_, c) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[addr]) ws[addr].s = HEADER_STYLE;
  });

  // Body styles
  for (let r = 1; r <= rows.length; r++) {
    headers.forEach((_, c) => {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (!cell) return;
      if (currencyCols.includes(c) && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = CURRENCY_FMT;
        cell.s = CURRENCY_STYLE;
      } else {
        cell.s = CELL_STYLE;
      }
    });
  }

  // Auto-ish column widths
  ws['!cols'] = headers.map((h, c) => {
    const maxData = rows.reduce((m, row) => {
      const v = row[c];
      const s = v == null ? '' : typeof v === 'number' ? v.toFixed(2) : String(v);
      return Math.max(m, s.length);
    }, 0);
    const len = Math.max(h.length, maxData);
    return { wch: Math.min(38, Math.max(10, len + 2)) };
  });
  ws['!rows'] = [{ hpt: 26 }];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
}

// ── Hoja: Liquidación Contrato Mandante (estilo documento) ──
function buildContratoSheet(c: ContratoExportData): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {};
  const rows: (string | number | null)[][] = [];

  const meta = `${fmtDate(c.fecha)}  ·  ${c.propiedad}  ·  Huésped: ${c.huesped}`;
  const title = `LIQUIDACIÓN CONTRATO A ${(c.propietario || '').toUpperCase()} MANDANTE`;

  rows.push([meta, '', '']);            // 0
  rows.push([title, '', '']);           // 1
  rows.push(['', '', '']);              // 2 spacer
  rows.push(['Ingreso Reserva',                          '$',  c.ingreso_reserva]);        // 3
  rows.push(['Servicio exento de IVA art.481 (li) ET - Dec.297-2016', '', c.mayor_ingreso]); // 4
  rows.push(['Comisión Airbnb Mandante',                 '-$', -Math.abs(c.menos_comision_airbnb)]); // 5
  rows.push(['IVA Comisión Airbnb Mandante',             '-$', -Math.abs(c.iva_comision_airbnb)]);   // 6
  rows.push(['Otros Cobros Plataforma',                  '-',  -Math.abs(c.otros_cobros)]);// 7
  rows.push(['TOTAL',                                    '',   c.total]);                  // 8
  rows.push(['Recibido Banco',                           '',   c.recibido_banco]);         // 9
  rows.push(['Diferencia',                               '',   c.diferencia]);             // 10
  rows.push(['', '', '']);                                                                  // 11 spacer
  rows.push(['Comisión',                                 '$',  c.menos_comision]);         // 12
  rows.push(['IVA Comisión',                             '$',  c.menos_iva_comision]);     // 13
  rows.push(['Retención en la Fuente a Favor Zectorem',  '$',  c.retencion_fuente]);       // 14
  rows.push(['TOTAL A ENTREGAR',                         '',   c.total_a_entregar]);       // 15

  // Volcar al worksheet manualmente para controlar tipos
  rows.forEach((row, r) => {
    row.forEach((val, c2) => {
      const addr = XLSX.utils.encode_cell({ r, c: c2 });
      if (val == null || val === '') {
        ws[addr] = { v: '', t: 's' };
      } else if (typeof val === 'number') {
        ws[addr] = { v: val, t: 'n', z: CURRENCY_FMT };
      } else {
        ws[addr] = { v: val, t: 's' };
      }
    });
  });

  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: 2 } });
  ws['!cols'] = [{ wch: 46 }, { wch: 6 }, { wch: 22 }];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // meta
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // title
    { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } }, // TOTAL label
    { s: { r: 15, c: 0 }, e: { r: 15, c: 1 } }, // TOTAL A ENTREGAR label
  ];

  // Estilos
  const styleAt = (addr: string, s: Record<string, unknown>) => {
    if (!ws[addr]) ws[addr] = { v: '', t: 's' };
    ws[addr].s = s;
  };

  // Meta (gris claro sobre fondo oscuro)
  for (let c2 = 0; c2 <= 2; c2++) {
    styleAt(XLSX.utils.encode_cell({ r: 0, c: c2 }), {
      font:      { bold: true, sz: 9, color: { rgb: '94A3B8' } },
      fill:      { patternType: 'solid', fgColor: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
  }
  // Title
  for (let c2 = 0; c2 <= 2; c2++) {
    styleAt(XLSX.utils.encode_cell({ r: 1, c: c2 }), {
      font:      { bold: true, sz: 13, color: { rgb: 'FFFFFF' } },
      fill:      { patternType: 'solid', fgColor: { rgb: '0F172A' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    });
  }

  // Filas normales (label / sign / value)
  const normalRowIdx = [3, 4, 5, 6, 7, 9, 10, 12, 13, 14];
  normalRowIdx.forEach(r => {
    styleAt(XLSX.utils.encode_cell({ r, c: 0 }), {
      font:      { bold: false, sz: 10, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'left', vertical: 'center' },
      border:    THIN_BORDER,
    });
    styleAt(XLSX.utils.encode_cell({ r, c: 1 }), {
      font:      { sz: 10, color: { rgb: '64748B' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border:    THIN_BORDER,
    });
    styleAt(XLSX.utils.encode_cell({ r, c: 2 }), {
      font:      { sz: 10, color: { rgb: '0F172A' } },
      alignment: { horizontal: 'right', vertical: 'center' },
      border:    THIN_BORDER,
      numFmt:    CURRENCY_FMT,
    });
  });

  // TOTAL (amarillo) — fila 8
  for (let c2 = 0; c2 <= 2; c2++) {
    styleAt(XLSX.utils.encode_cell({ r: 8, c: c2 }), {
      font:      { bold: true, sz: 11, color: { rgb: '92400E' } },
      fill:      { patternType: 'solid', fgColor: { rgb: 'FEF3C7' } },
      alignment: { horizontal: c2 === 2 ? 'right' : 'left', vertical: 'center' },
      border: {
        top:    { style: 'medium', color: { rgb: 'F59E0B' } },
        bottom: { style: 'medium', color: { rgb: 'F59E0B' } },
        left:   { style: 'thin',   color: { rgb: 'F59E0B' } },
        right:  { style: 'thin',   color: { rgb: 'F59E0B' } },
      },
      numFmt:    c2 === 2 ? CURRENCY_FMT : undefined,
    });
  }

  // TOTAL A ENTREGAR (oscuro con verde) — fila 15
  for (let c2 = 0; c2 <= 2; c2++) {
    styleAt(XLSX.utils.encode_cell({ r: 15, c: c2 }), {
      font: {
        bold:  true,
        sz:    c2 === 2 ? 13 : 11,
        color: { rgb: c2 === 2 ? '34D399' : 'FFFFFF' },
      },
      fill:      { patternType: 'solid', fgColor: { rgb: '0F172A' } },
      alignment: { horizontal: c2 === 2 ? 'right' : 'left', vertical: 'center' },
      numFmt:    c2 === 2 ? CURRENCY_FMT : undefined,
    });
  }

  // Filas spacer
  [2, 11].forEach(r => {
    for (let c2 = 0; c2 <= 2; c2++) {
      styleAt(XLSX.utils.encode_cell({ r, c: c2 }), {
        fill: { patternType: 'solid', fgColor: { rgb: 'F8FAFC' } },
      });
    }
  });

  // Alturas
  ws['!rows'] = [
    { hpt: 22 }, // meta
    { hpt: 28 }, // título
    { hpt: 8 },  // spacer
    { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, // 3..7
    { hpt: 26 }, // total
    { hpt: 20 }, { hpt: 20 }, // 9,10
    { hpt: 8 },  // spacer
    { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, // 12..14
    { hpt: 30 }, // total a entregar
  ];

  return ws;
}

// ── Función principal ───────────────────────────────────
export const exportToExcel = async (contrato: ContratoExportData) => {
  // Cargamos todos los datos en paralelo
  const [historialRes, comisionesRes, ingresosRes, comprasRes] = await Promise.all([
    fetch(`${API_URL}/historial`).then(r => r.json()).catch(() => []),
    fetch(`${API_URL}/comisiones-zectorem`).then(r => r.json()).catch(() => []),
    fetch(`${API_URL}/ingresos-propietario`).then(r => r.json()).catch(() => []),
    fetch(`${API_URL}/compras-propietario`).then(r => r.json()).catch(() => []),
  ]);

  const historial: HistorialRow[]  = Array.isArray(historialRes)  ? historialRes  : [];
  const comisiones: ComisionRow[]  = Array.isArray(comisionesRes) ? comisionesRes : [];
  const ingresos: IngresoRow[]     = Array.isArray(ingresosRes)   ? ingresosRes   : [];
  const compras: CompraRow[]       = Array.isArray(comprasRes)    ? comprasRes    : [];

  // Dedupe historial por liquidacion_id (la vista puede repetir si hay varios cobros)
  const seenHist = new Set<number>();
  const histUnicos = historial.filter(h => {
    if (seenHist.has(h.liquidacion_id)) return false;
    seenHist.add(h.liquidacion_id);
    return true;
  });

  const wb = XLSX.utils.book_new();

  // 1. Historial Liquidaciones
  const histHeaders = [
    '#', 'Fecha', 'Propiedad', 'Propietario', 'Huésped',
    'Nacionalidad', 'Documento', 'N° Documento', 'Reserva N°',
    'IVA Responsable', 'Huésped paga', 'Total gastos', 'Total liquidado',
    'Confirmación total', 'Recibido neto', 'Otros cobros',
  ];
  const histRows = histUnicos.map((r, i) => [
    i + 1,
    fmtDate(r.fecha),
    r.propiedad ?? '',
    r.propietario ?? '',
    r.huesped ?? '',
    r.nacionalidad ?? '',
    r.tipo_documento ?? '',
    r.numero_documento ?? '',
    r.numero_reserva ?? '',
    r.responsable_iva ? 'Sí' : 'No',
    r.huesped_pago ?? 0,
    r.total_gastos ?? 0,
    r.total_liquidado ?? 0,
    r.confirmacion_total ?? 0,
    r.recibido_neto_banco ?? 0,
    r.otros_cobros ?? 0,
  ] as (string | number)[]);
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(histHeaders, histRows, [10, 11, 12, 13, 14, 15]),
    'Historial Liquidaciones',
  );

  // 2. Comisión Zectorem
  const comHeaders = [
    '#', 'Fecha', 'Propiedad', 'Propietario', 'Huésped',
    'Reserva N°', 'IVA Resp.', 'Confirm. Total', 'Estado',
    'Base Comisión', 'Comisión', 'IVA Com. 19%',
    'Retención %', 'Retención', 'Total Comisión',
  ];
  const comRows = comisiones.map((r, i) => [
    i + 1,
    fmtDate(r.fecha),
    r.propiedad ?? '',
    r.propietario ?? '',
    r.huesped ?? '',
    r.numero_reserva ?? '',
    r.responsable_iva ? 'Sí' : 'No',
    r.confirmacion_total ?? 0,
    r.estado === 'listo' ? 'Listo' : 'Pendiente',
    r.base_comision ?? 0,
    r.comision ?? 0,
    r.iva_comision_19 ?? 0,
    r.porcentaje_retencion != null ? `${r.porcentaje_retencion}%` : '',
    r.retencion_fuente ?? 0,
    r.total_comision ?? 0,
  ] as (string | number)[]);
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(comHeaders, comRows, [7, 9, 10, 11, 13, 14]),
    'Comisión Zectorem',
  );

  // 3. Ingresos Propietario
  const ingHeaders = [
    'No. Comprobante', 'Fecha elaboración', 'Tipo', 'Identificación',
    'Nombre cliente', 'Ítem', 'Subtotal', 'Impuesto cargo', 'Total',
  ];
  const ingRows = ingresos.map(r => [
    r.no_comprobante ?? '',
    fmtDate(r.fecha),
    r.tipo_documento ?? '',
    r.identificacion ?? '',
    r.nombre_cliente ?? '',
    r.item ?? '',
    r.subtotal ?? 0,
    r.impuesto_cargo ?? 0,
    r.total ?? 0,
  ] as (string | number)[]);
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(ingHeaders, ingRows, [6, 7, 8]),
    'Ingresos Propietario',
  );

  // 4. Compras Propietario
  const cmpHeaders = [
    'Soporte', 'Fecha', 'Tercero', 'Documento', 'Ítem',
    'Valor bruto', 'IVA', 'Otros impuestos', 'Valor factura', 'Valor a pagar',
  ];
  const cmpRows = compras.map(r => [
    r.soporte ?? '',
    fmtDate(r.fecha),
    r.tercero ?? '',
    r.documento ?? '',
    r.item ?? '',
    r.valor_bruto ?? 0,
    r.iva ?? 0,
    r.otros_impuestos ?? 0,
    r.valor_factura ?? 0,
    r.valor_a_pagar ?? 0,
  ] as (string | number)[]);
  XLSX.utils.book_append_sheet(
    wb,
    buildSheet(cmpHeaders, cmpRows, [5, 6, 7, 8, 9]),
    'Compras Propietario',
  );

  // 5. Liquidación Contrato Mandante (con estilos)
  XLSX.utils.book_append_sheet(wb, buildContratoSheet(contrato), 'Liq. Contrato');

  const safe = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_').trim() || 'contrato';
  const filename = `Liquidacion_${safe(contrato.propietario)}_${new Date()
    .toISOString()
    .split('T')[0]}.xlsx`;

  XLSX.writeFile(wb, filename);
};

// ── Tipos para export bulk (historial completo de contratos) ──
type ContratoSummary = {
  id: number;
  fecha: string | null;
  propietario: string | null;
  propiedad: string | null;
  huesped: string | null;
  numero_reserva: string | null;
  ingreso_reserva: number | null;
  mayor_ingreso: number | null;
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
  created_at: string | null;
};
type HistLiqContrato = {
  contrato_propietario_id: number;
  fecha: string | null;
  propiedad: string | null;
  propietario: string | null;
  responsable_iva: boolean | null;
  huesped: string | null;
  nacionalidad: string | null;
  tipo_documento: string | null;
  numero_documento: string | null;
  numero_reserva: string | null;
  huesped_pago: number | null;
  total_gastos: number | null;
  total_liquidado: number | null;
  confirmacion_total: number | null;
  recibido_neto_banco: number | null;
  otros_cobros: number | null;
};
type HistComContrato = {
  contrato_propietario_id: number;
  fecha: string | null;
  propiedad: string | null;
  propietario: string | null;
  huesped: string | null;
  numero_reserva: string | null;
  responsable_iva: boolean | null;
  no_comprobante: string | null;
  identificacion: string | null;
  confirmacion_total: number | null;
  base_comision: number | null;
  comision: number | null;
  iva_comision_19: number | null;
  porcentaje_retencion: number | null;
  retencion_fuente: number | null;
  total_comision: number | null;
};
type HistIngContrato = {
  contrato_propietario_id: number;
  fecha: string | null;
  no_comprobante: string | null;
  tipo_documento: string | null;
  identificacion: string | null;
  nombre_cliente: string | null;
  item: number | null;
  subtotal: number | null;
  impuesto_cargo: number | null;
  total: number | null;
};
type HistCmpContrato = {
  contrato_propietario_id: number;
  fecha: string | null;
  soporte: string | null;
  tercero: string | null;
  documento: string | null;
  item: string | null;
  valor_bruto: number | null;
  iva: number | null;
  otros_impuestos: number | null;
  valor_factura: number | null;
  valor_a_pagar: number | null;
};

export const exportAllHistorialToExcel = async () => {
  const res = await fetch(`${API_URL}/contratos-propietario/historial-bulk`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json() as {
    contratos: ContratoSummary[];
    liquidaciones: HistLiqContrato[];
    comisiones: HistComContrato[];
    ingresos: HistIngContrato[];
    compras: HistCmpContrato[];
  };

  const contratos     = Array.isArray(json.contratos)     ? json.contratos     : [];
  const liquidaciones = Array.isArray(json.liquidaciones) ? json.liquidaciones : [];
  const comisiones    = Array.isArray(json.comisiones)    ? json.comisiones    : [];
  const ingresos      = Array.isArray(json.ingresos)      ? json.ingresos      : [];
  const compras       = Array.isArray(json.compras)       ? json.compras       : [];

  const contratoLookup = new Map(contratos.map(c => [c.id, c]));
  const propLabel = (id: number | null | undefined) => {
    if (id == null) return '';
    const c = contratoLookup.get(id);
    return c ? `${c.propietario ?? ''} — ${c.huesped ?? ''}` : `#${id}`;
  };

  // Secciones en el mismo orden que los módulos:
  //   1) Liquidación Reserva (Historial Liquidaciones)
  //   2) Comisión Zectorem
  //   3) Liq. Propietario — Ingresos
  //   4) Liq. Propietario — Compras
  //   5) Liq. Contrato (Resumen)
  type Section = {
    title: string;
    headers: string[];
    rows: (string | number | null)[][];
    currencyCols: number[];
  };

  const sections: Section[] = [
    {
      title: '1. LIQUIDACIÓN RESERVA — Historial de liquidaciones',
      headers: [
        '#', 'Contrato', 'Fecha', 'Propiedad', 'Propietario', 'Huésped',
        'Nacionalidad', 'Documento', 'N° Documento', 'Reserva N°',
        'IVA Responsable', 'Huésped paga', 'Total gastos', 'Total liquidado',
        'Confirmación total', 'Recibido neto', 'Otros cobros',
      ],
      rows: liquidaciones.map((r, i) => [
        i + 1,
        propLabel(r.contrato_propietario_id),
        fmtDate(r.fecha),
        r.propiedad ?? '',
        r.propietario ?? '',
        r.huesped ?? '',
        r.nacionalidad ?? '',
        r.tipo_documento ?? '',
        r.numero_documento ?? '',
        r.numero_reserva ?? '',
        r.responsable_iva ? 'Sí' : 'No',
        r.huesped_pago ?? 0,
        r.total_gastos ?? 0,
        r.total_liquidado ?? 0,
        r.confirmacion_total ?? 0,
        r.recibido_neto_banco ?? 0,
        r.otros_cobros ?? 0,
      ]),
      currencyCols: [11, 12, 13, 14, 15, 16],
    },
    {
      title: '2. COMISIÓN ZECTOREM',
      headers: [
        '#', 'Contrato', 'Fecha', 'Propiedad', 'Propietario', 'Huésped',
        'Reserva N°', 'IVA Resp.', 'N° Comprobante', 'Identificación',
        'Confirm. Total',
        'Base Comisión', 'Comisión', 'IVA Com. 19%',
        'Retención %', 'Retención', 'Total Comisión',
      ],
      rows: comisiones.map((r, i) => [
        i + 1,
        propLabel(r.contrato_propietario_id),
        fmtDate(r.fecha),
        r.propiedad ?? '',
        r.propietario ?? '',
        r.huesped ?? '',
        r.numero_reserva ?? '',
        r.responsable_iva ? 'Sí' : 'No',
        r.no_comprobante ?? '',
        r.identificacion ?? '',
        r.confirmacion_total ?? 0,
        r.base_comision ?? 0,
        r.comision ?? 0,
        r.iva_comision_19 ?? 0,
        r.porcentaje_retencion != null ? `${r.porcentaje_retencion}%` : '',
        r.retencion_fuente ?? 0,
        r.total_comision ?? 0,
      ]),
      currencyCols: [10, 11, 12, 13, 15, 16],
    },
    {
      title: '3. LIQUIDACIÓN PROPIETARIO — Ingresos',
      headers: [
        '#', 'Contrato', 'No. Comprobante', 'Fecha', 'Tipo', 'Identificación',
        'Nombre cliente', 'Ítem', 'Subtotal', 'Impuesto cargo', 'Total',
      ],
      rows: ingresos.map((r, i) => [
        i + 1,
        propLabel(r.contrato_propietario_id),
        r.no_comprobante ?? '',
        fmtDate(r.fecha),
        r.tipo_documento ?? '',
        r.identificacion ?? '',
        r.nombre_cliente ?? '',
        r.item ?? '',
        r.subtotal ?? 0,
        r.impuesto_cargo ?? 0,
        r.total ?? 0,
      ]),
      currencyCols: [8, 9, 10],
    },
    {
      title: '4. LIQUIDACIÓN PROPIETARIO — Compras',
      headers: [
        '#', 'Contrato', 'Soporte', 'Fecha', 'Tercero', 'Documento', 'Ítem',
        'Valor bruto', 'IVA', 'Otros impuestos', 'Valor factura', 'Valor a pagar',
      ],
      rows: compras.map((r, i) => [
        i + 1,
        propLabel(r.contrato_propietario_id),
        r.soporte ?? '',
        fmtDate(r.fecha),
        r.tercero ?? '',
        r.documento ?? '',
        r.item ?? '',
        r.valor_bruto ?? 0,
        r.iva ?? 0,
        r.otros_impuestos ?? 0,
        r.valor_factura ?? 0,
        r.valor_a_pagar ?? 0,
      ]),
      currencyCols: [7, 8, 9, 10, 11],
    },
    {
      title: '5. LIQUIDACIÓN CONTRATO — Resumen (un cuadro por contrato)',
      headers: [
        '#', 'Fecha', 'Propietario', 'Propiedad', 'Huésped', 'Reserva N°',
        'Ingreso Reserva', 'Servicio exento IVA art.481', 'Comisión Airbnb Mandante',
        'IVA Comisión Airbnb Mandante', 'Otros Cobros Plataforma', 'Total',
        'Recibido Banco', 'Diferencia',
        'Comisión', 'IVA Comisión', 'Retención Fuente', 'Total a Entregar',
      ],
      rows: contratos.map((c, i) => [
        i + 1,
        fmtDate(c.fecha ?? c.created_at),
        c.propietario ?? '',
        c.propiedad ?? '',
        c.huesped ?? '',
        c.numero_reserva ?? '',
        c.ingreso_reserva ?? 0,
        c.mayor_ingreso ?? 0,
        c.menos_comision_airbnb ?? 0,
        c.iva_comision_airbnb ?? 0,
        c.otros_cobros ?? 0,
        c.total ?? 0,
        c.recibido_banco ?? 0,
        c.diferencia ?? 0,
        c.menos_comision ?? 0,
        c.menos_iva_comision ?? 0,
        c.retencion_fuente ?? 0,
        c.total_a_entregar ?? 0,
      ]),
      currencyCols: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
    },
  ];

  // Layout horizontal: cada sección ocupa su propio bloque de columnas
  // a la derecha del anterior, con una columna en blanco como separador.
  const SEP = 1; // columnas en blanco entre secciones
  const offsets: number[] = [];
  let runningCol = 0;
  sections.forEach((s, i) => {
    offsets[i] = runningCol;
    runningCol += s.headers.length + (i < sections.length - 1 ? SEP : 0);
  });
  const totalCols = runningCol;
  const maxDataRows = Math.max(1, ...sections.map(s => s.rows.length));

  // Construir AOA: 1 fila de encabezados + maxDataRows filas de datos
  const aoa: (string | number | null)[][] = [];

  const headerRow: (string | number | null)[] = Array(totalCols).fill('');
  sections.forEach((sec, i) => {
    sec.headers.forEach((h, c) => { headerRow[offsets[i] + c] = h; });
  });
  aoa.push(headerRow);

  for (let r = 0; r < maxDataRows; r++) {
    const dataRow: (string | number | null)[] = Array(totalCols).fill('');
    sections.forEach((sec, i) => {
      const row = sec.rows[r];
      if (!row) return;
      row.forEach((v, c) => { dataRow[offsets[i] + c] = v as string | number | null; });
    });
    aoa.push(dataRow);
  }

  // Mapa de columnas con formato moneda (offset por sección)
  const currencyColSet = new Set<number>();
  sections.forEach((sec, i) => {
    sec.currencyCols.forEach(c => currencyColSet.add(offsets[i] + c));
  });
  // Marcar columnas separadoras
  const separatorColSet = new Set<number>();
  sections.forEach((_, i) => {
    if (i < sections.length - 1) {
      const sepStart = offsets[i] + sections[i].headers.length;
      for (let k = 0; k < SEP; k++) separatorColSet.add(sepStart + k);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < totalCols; c++) {
      if (separatorColSet.has(c)) continue;
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: '', t: 's' };
      const cell = ws[addr];
      if (r === 0) {
        cell.s = HEADER_STYLE;
      } else if (currencyColSet.has(c) && typeof cell.v === 'number') {
        cell.t = 'n';
        cell.z = CURRENCY_FMT;
        cell.s = CURRENCY_STYLE;
      } else {
        cell.s = CELL_STYLE;
      }
    }
  }

  // Anchos: por columna basado en su contenido; separadores estrechos
  const colWidths: number[] = Array(totalCols).fill(10);
  for (let c = 0; c < totalCols; c++) {
    if (separatorColSet.has(c)) { colWidths[c] = 2; continue; }
    let max = 0;
    for (let r = 0; r < aoa.length; r++) {
      const v = aoa[r][c];
      const s = v == null ? '' : typeof v === 'number' ? v.toFixed(2) : String(v);
      if (s.length > max) max = s.length;
    }
    colWidths[c] = Math.min(38, Math.max(10, max + 2));
  }
  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  ws['!rows'] = aoa.map((_, r) => ({ hpt: r === 0 ? 24 : 18 }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historial Contratos');

  const filename = `Historial_Contratos_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
};

// ── Export del resumen agrupado por propiedad ───────────────────────────
export type ResumenContratoRow = {
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

export const exportResumenContratosToExcel = (
  rows: ResumenContratoRow[],
  grandTotal: ResumenContratoRow,
) => {
  const headers = [
    'Propiedad', 'Propietario', '# Contratos',
    'Ingreso reserva', 'Mayor ingreso',
    'Comisión Airbnb', 'IVA com. Airbnb', 'Otros cobros',
    'Total', 'Recibido banco', 'Diferencia',
    'Comisión', 'IVA comisión', 'Retención fuente', 'Total a entregar',
  ];
  const currencyCols = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const dataRows: (string | number | null)[][] = rows.map(r => [
    r.propiedad, r.propietario, r.count,
    r.ingreso_reserva, r.mayor_ingreso,
    r.menos_comision_airbnb, r.iva_comision_airbnb, r.otros_cobros,
    r.total, r.recibido_banco, r.diferencia,
    r.menos_comision, r.menos_iva_comision, r.retencion_fuente, r.total_a_entregar,
  ]);
  const totalRow: (string | number | null)[] = [
    'TOTAL ACUMULADO', '—', grandTotal.count,
    grandTotal.ingreso_reserva, grandTotal.mayor_ingreso,
    grandTotal.menos_comision_airbnb, grandTotal.iva_comision_airbnb, grandTotal.otros_cobros,
    grandTotal.total, grandTotal.recibido_banco, grandTotal.diferencia,
    grandTotal.menos_comision, grandTotal.menos_iva_comision, grandTotal.retencion_fuente, grandTotal.total_a_entregar,
  ];

  const ws = buildSheet(headers, [...dataRows, totalRow], currencyCols);

  // Resaltar la fila de total acumulado (última)
  const totalRowIdx = dataRows.length + 1;
  const TOTAL_ROW_STYLE = {
    font:      { bold: true, sz: 11, color: { rgb: '0F172A' } },
    fill:      { patternType: 'solid', fgColor: { rgb: 'F1F5F9' } },
    alignment: { vertical: 'center' },
    border: {
      top:    { style: 'medium', color: { rgb: '64748B' } },
      bottom: { style: 'thin',   color: { rgb: 'CBD5E1' } },
      left:   { style: 'thin',   color: { rgb: 'CBD5E1' } },
      right:  { style: 'thin',   color: { rgb: 'CBD5E1' } },
    },
  };
  const TOTAL_CURRENCY_STYLE = {
    ...TOTAL_ROW_STYLE,
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt:    CURRENCY_FMT,
  };
  headers.forEach((_, c) => {
    const addr = XLSX.utils.encode_cell({ r: totalRowIdx, c });
    if (!ws[addr]) return;
    ws[addr].s = currencyCols.includes(c) ? TOTAL_CURRENCY_STYLE : TOTAL_ROW_STYLE;
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resumen por Propiedad');

  const filename = `Resumen_Contratos_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
};
