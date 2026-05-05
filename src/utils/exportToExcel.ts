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
  rows.push(['Mayor Ingreso Reserva - Extr',             '',   c.mayor_ingreso]);          // 4
  rows.push(['Menos Comisión Airbnb Mandante',           '-$', -Math.abs(c.menos_comision_airbnb)]); // 5
  rows.push(['Otros Cobros Plataforma',                  '-',  -Math.abs(c.otros_cobros)]);// 6
  rows.push(['TOTAL',                                    '',   c.total]);                  // 7
  rows.push(['Recibido Banco',                           '',   c.recibido_banco]);         // 8
  rows.push(['Diferencia',                               '',   c.diferencia]);             // 9
  rows.push(['', '', '']);                                                                  // 10 spacer
  rows.push(['Menos Comisión',                           '$',  c.menos_comision]);         // 11
  rows.push(['Menos IVA Comisión',                       '$',  c.menos_iva_comision]);     // 12
  rows.push(['Retención en la Fuente a Favor Zectorem',  '$',  c.retencion_fuente]);       // 13
  rows.push(['TOTAL A ENTREGAR',                         '',   c.total_a_entregar]);       // 14

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
    { s: { r: 7, c: 0 }, e: { r: 7, c: 1 } }, // TOTAL label
    { s: { r: 14, c: 0 }, e: { r: 14, c: 1 } }, // TOTAL A ENTREGAR label
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
  const normalRowIdx = [3, 4, 5, 6, 8, 9, 11, 12, 13];
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

  // TOTAL (amarillo) — fila 7
  for (let c2 = 0; c2 <= 2; c2++) {
    styleAt(XLSX.utils.encode_cell({ r: 7, c: c2 }), {
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

  // TOTAL A ENTREGAR (oscuro con verde) — fila 14
  for (let c2 = 0; c2 <= 2; c2++) {
    styleAt(XLSX.utils.encode_cell({ r: 14, c: c2 }), {
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
  [2, 10].forEach(r => {
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
    { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, // 3..6
    { hpt: 26 }, // total
    { hpt: 20 }, { hpt: 20 }, // 8,9
    { hpt: 8 },  // spacer
    { hpt: 20 }, { hpt: 20 }, { hpt: 20 }, // 11..13
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
