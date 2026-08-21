// src/components/ReportExcelGenerator.jsx
import React, { useState } from 'react';
import { FiDownload, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import ExcelJS from 'exceljs';
import { fetchWithAuth } from '../config/api';
import { useSession } from '../context/SessionContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtCurrency = (n) => `$${Number(n || 0).toFixed(2)}`;

const fmtDate = (date) => {
  if (!date) return '';

  const d = new Date(date);

  return d.toLocaleDateString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// ─── Estilos ──────────────────────────────────────────────────────────────────

const COLORS = {
  headerBg: '1E2840',
  sectionBg: '2563EB',
  colHeaderBg: 'DBEAFE',
  totalsBg: '1E40AF',
  rowAlt: 'F0F7FF',
  white: 'FFFFFF',
  black: '000000',
  border: 'D1D5DB',
  primary: '1F52A4',
  primaryLight: '4285F4',
  textMuted: '6B7280',
};

const border = {
  top: {
    style: 'thin',
    color: { argb: COLORS.border },
  },
  bottom: {
    style: 'thin',
    color: { argb: COLORS.border },
  },
  left: {
    style: 'thin',
    color: { argb: COLORS.border },
  },
  right: {
    style: 'thin',
    color: { argb: COLORS.border },
  },
};

const borderMedium = {
  top: {
    style: 'medium',
    color: { argb: COLORS.border },
  },
  bottom: {
    style: 'medium',
    color: { argb: COLORS.border },
  },
  left: {
    style: 'thin',
    color: { argb: COLORS.border },
  },
  right: {
    style: 'thin',
    color: { argb: COLORS.border },
  },
};

// ─── Aplicar estilos ──────────────────────────────────────────────────────────

const applyStyle = (cell, style) => {
  cell.style = style;
};

const styleHeader = (cell, text) => {
  cell.value = text;

  applyStyle(cell, {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg },
    },

    font: {
      bold: true,
      size: 14,
      color: { argb: COLORS.white },
      name: 'Calibri',
    },

    alignment: {
      vertical: 'middle',
      horizontal: 'center',
    },
  });
};

const styleSubHeader = (cell, text) => {
  cell.value = text;

  applyStyle(cell, {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.sectionBg },
    },

    font: {
      bold: true,
      size: 10,
      color: { argb: COLORS.white },
      name: 'Calibri',
    },

    alignment: {
      vertical: 'middle',
      horizontal: 'left',
    },

    border,
  });
};

const styleColHeader = (cell, text) => {
  cell.value = text;

  applyStyle(cell, {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.primaryLight },
    },

    font: {
      bold: true,
      size: 9,
      color: { argb: COLORS.white },
      name: 'Calibri',
    },

    alignment: {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    },

    border,
  });
};

const styleData = (
  cell,
  value,
  align = 'left',
  altRow = false,
  numFmt = null
) => {
  cell.value = value;

  const style = {
    fill: altRow
      ? {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.rowAlt },
        }
      : {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: COLORS.white },
        },

    font: {
      size: 9,
      name: 'Calibri',
      color: { argb: COLORS.black },
    },

    alignment: {
      vertical: 'middle',
      horizontal: align,
    },

    border,
  };

  if (numFmt) {
    style.numFmt = numFmt;
  }

  applyStyle(cell, style);
};

const styleTotals = (
  cell,
  value,
  align = 'center',
  numFmt = null
) => {
  cell.value = value;

  const style = {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.totalsBg },
    },

    font: {
      bold: true,
      size: 9,
      color: { argb: COLORS.white },
      name: 'Calibri',
    },

    alignment: {
      vertical: 'middle',
      horizontal: align,
    },

    border: borderMedium,
  };

  if (numFmt) {
    style.numFmt = numFmt;
  }

  applyStyle(cell, style);
};

// ─── Generador de Excel ──────────────────────────────────────────────────────

export class ExcelGenerator {
  constructor(config = {}) {
    this.config = {
      creator: 'IDON Gestión',
      ...config,
    };

    this.wb = new ExcelJS.Workbook();

    this.wb.creator = this.config.creator;
    this.wb.created = new Date();

    this.settings = {};
    this.user = null;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Inicializar
  // ───────────────────────────────────────────────────────────────────────────

  async initialize() {
    try {
      const res = await fetchWithAuth('/settings');
      const data = await res.json();

      this.settings = data?.data || data || {};
    } catch (error) {
      console.warn('Error cargando settings:', error);
    }

    return this;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Usuario
  // ───────────────────────────────────────────────────────────────────────────

  setUser(user) {
    this.user = user;
    return this;
  }

  getNombreUsuario() {
    if (!this.user) {
      return 'Usuario no identificado';
    }

    const nombre =
      this.user.firstName ||
      this.user.first_name ||
      this.user.nombre ||
      this.user.name ||
      '';

    const apellido =
      this.user.lastName ||
      this.user.last_name ||
      this.user.apellido ||
      '';

    const username =
      this.user.username ||
      this.user.user ||
      '';

    const email =
      this.user.email ||
      this.user.correo ||
      '';

    if (nombre && apellido) {
      return `${nombre} ${apellido}`.trim();
    }

    if (nombre) {
      return nombre;
    }

    if (username) {
      return username;
    }

    if (email) {
      return email.split('@')[0];
    }

    return 'Usuario';
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Obtener todas las columnas del reporte
  //
  // IMPORTANTE:
  // No depende de nombres específicos.
  // Solo usa la posición de la columna y su width.
  // ───────────────────────────────────────────────────────────────────────────

  getReportColumns(data) {
    const result = [];

    // 1. Columnas principales enviadas directamente
    if (Array.isArray(data.columns)) {
      data.columns.forEach((column, index) => {
        result[index] = {
          ...column,
          width:
            typeof column.width === 'number'
              ? column.width
              : 10,
        };
      });
    }

    // 2. Columnas de cada sección
    if (Array.isArray(data.sections)) {
      data.sections.forEach((section) => {
        if (!Array.isArray(section.columns)) {
          return;
        }

        section.columns.forEach((column, index) => {
          const current = result[index];

          // Si no existe todavía
          if (!current) {
            result[index] = {
              ...column,
              width:
                typeof column.width === 'number'
                  ? column.width
                  : 10,
            };

            return;
          }

          // Si esta sección necesita una columna más ancha,
          // usamos el mayor width.
          if (
            typeof column.width === 'number' &&
            column.width > (current.width || 10)
          ) {
            result[index] = {
              ...current,
              width: column.width,
            };
          }
        });
      });
    }

    // Si por alguna razón no hay columnas
    if (!result.length) {
      return [
        { key: 'a', width: 10 },
        { key: 'b', width: 10 },
        { key: 'c', width: 10 },
        { key: 'd', width: 10 },
        { key: 'e', width: 10 },
      ];
    }

    return result;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Crear hoja
  //
  // AQUÍ se respetan los widths enviados por cada reporte.
  // ───────────────────────────────────────────────────────────────────────────

  createSheet(name, columns) {
    const ws = this.wb.addWorksheet(name || 'Reporte', {
      views: [
        {
          showGridLines: false,
        },
      ],

      pageSetup: {
        paperSize: 9,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,

        horizontalDpi: 300,
        verticalDpi: 300,

        margins: {
          left: 0.25,
          right: 0.25,
          top: 0.5,
          bottom: 0.5,
          header: 0.2,
          footer: 0.2,
        },
      },
    });

    /*
     * IMPORTANTE:
     *
     * ExcelJS utiliza el width de cada columna.
     *
     * NO hacemos ningún cálculo basado en:
     * - label
     * - key
     * - contenido
     * - nombre del producto
     *
     * El reporte manda el width y nosotros lo respetamos.
     */

    ws.columns = columns.map((col) => ({
      key: col.key,
      width:
        typeof col.width === 'number'
          ? col.width
          : 10,
    }));

    return ws;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Header
  // ───────────────────────────────────────────────────────────────────────────

  addHeader(
    ws,
    title,
    subtitle,
    period,
    options = {}
  ) {
    const startRow = options.startRow || 1;

    let row = startRow;

    const colCount =
      ws.columns.length || 5;

    const userName =
      this.getNombreUsuario();

    // Título
    ws.mergeCells(
      `A${row}:${this.getColLetter(colCount)}${row}`
    );

    styleHeader(
      ws.getCell(`A${row}`),
      title
    );

    ws.getRow(row).height = 28;

    row++;

    // Subtítulo
    if (subtitle) {
      ws.getRow(row).height = 18;

      ws.mergeCells(
        `A${row}:${this.getColLetter(colCount)}${row}`
      );

      const cell = ws.getCell(`A${row}`);

      cell.value = subtitle;

      applyStyle(cell, {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '374151' },
        },

        font: {
          size: 9,
          color: { argb: 'BFDBFE' },
          name: 'Calibri',
        },

        alignment: {
          vertical: 'middle',
          horizontal: 'center',
        },
      });

      row++;
    }

    // Periodo
    if (period) {
      ws.getRow(row).height = 16;

      ws.mergeCells(
        `A${row}:${this.getColLetter(colCount)}${row}`
      );

      const cell = ws.getCell(`A${row}`);

      cell.value = `Período: ${period}`;

      applyStyle(cell, {
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4A5568' },
        },

        font: {
          size: 8,
          color: { argb: 'CBD5E0' },
          name: 'Calibri',
        },

        alignment: {
          vertical: 'middle',
          horizontal: 'center',
        },
      });

      row++;
    }

    // Usuario / fecha
    const dateStr =
      new Date().toLocaleString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

    ws.getRow(row).height = 16;

    ws.mergeCells(
      `A${row}:${this.getColLetter(colCount)}${row}`
    );

    const cell = ws.getCell(`A${row}`);

    cell.value =
      `Generado por: ${userName} - ${dateStr}`;

    applyStyle(cell, {
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4A5568' },
      },

      font: {
        size: 8,
        color: { argb: 'CBD5E0' },
        name: 'Calibri',
        italic: true,
      },

      alignment: {
        vertical: 'middle',
        horizontal: 'center',
      },
    });

    row++;

    ws.getRow(row).height = 4;

    row++;

    return row;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // KPIs
  // ───────────────────────────────────────────────────────────────────────────

  addKpis(
    ws,
    kpis,
    startRow = 1
  ) {
    let row = startRow;

    const colCount =
      ws.columns.length || 5;

    if (!kpis || !kpis.length) {
      return row;
    }

    ws.mergeCells(
      `A${row}:${this.getColLetter(colCount)}${row}`
    );

    styleSubHeader(
      ws.getCell(`A${row}`),
      '  RESUMEN EJECUTIVO'
    );

    ws.getRow(row).height = 18;

    row++;

    const itemsPerRow = 2;

    const colWidth =
      Math.floor(colCount / itemsPerRow);

    kpis.forEach((kpi, index) => {
      const col =
        (index % itemsPerRow) *
          colWidth +
        1;

      const colEnd =
        Math.min(
          col + colWidth - 1,
          colCount
        );

      ws.mergeCells(
        `${this.getColLetter(col)}${row}:${this.getColLetter(colEnd)}${row}`
      );

      const value =
        kpi.formatter
          ? kpi.formatter(kpi.value)
          : fmtCurrency(kpi.value);

      const cell =
        ws.getCell(
          `${this.getColLetter(col)}${row}`
        );

      const isBold =
        kpi.bold || false;

      cell.value =
        `${kpi.label}: ${value}`;

      applyStyle(cell, {
        font: {
          bold: isBold,
          size: 9,
          name: 'Calibri',
          color: {
            argb: isBold
              ? COLORS.primary
              : COLORS.black,
          },
        },

        alignment: {
          vertical: 'middle',
          horizontal: 'left',
        },

        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb:
              index % 2 === 0
                ? COLORS.white
                : COLORS.rowAlt,
          },
        },

        border,
      });

      if (
        (index + 1) %
          itemsPerRow ===
        0
      ) {
        row++;
      }
    });

    if (
      kpis.length % itemsPerRow !==
      0
    ) {
      row++;
    }

    ws.getRow(row).height = 6;

    row++;

    return row;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Tabla
  // ───────────────────────────────────────────────────────────────────────────
  addTable(ws, title, columns, rows, options = {}) {
    let row = options.startRow || 1;
    const colCount = columns.length;

    if (!rows || !rows.length) { /*...*/ }

    ws.mergeCells(`A${row}:${this.getColLetter(colCount)}${row}`);
    styleSubHeader(ws.getCell(`A${row}`), `  ${title}`);
    ws.getRow(row).height = 18;
    row++;

    // Encabezados
    let colIdx = 1;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (col.mergeWithNext && i + 1 < columns.length) {
        ws.mergeCells(row, colIdx, row, colIdx + 1);
        styleColHeader(ws.getCell(row, colIdx), col.label);
        i++;
        colIdx += 2;
      } else {
        styleColHeader(ws.getCell(row, colIdx), col.label);
        colIdx++;
      }
    }
    ws.getRow(row).height = 16;
    row++;

    let totals = {};
    columns.forEach(col => { if (col.total) totals[col.key] = 0; });

    // Filas de datos
    rows.forEach((dataRow, idx) => {
      const altRow = idx % 2 === 1;
      ws.getRow(row).height = 15;

      colIdx = 1;
      for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        let value = dataRow[col.key] ?? '';
        const align = col.align || 'left';
        const numFmt = col.numFmt || null;

        if (col.mergeWithNext && i + 1 < columns.length) {
          ws.mergeCells(row, colIdx, row, colIdx + 1);
          styleData(ws.getCell(row, colIdx), value, align, altRow, numFmt);
          i++;
          colIdx += 2;
        } else {
          styleData(ws.getCell(row, colIdx), value, align, altRow, numFmt);
          colIdx++;
        }

        if (col.total && typeof dataRow[col.key] === 'number') {
          totals[col.key] = (totals[col.key] || 0) + dataRow[col.key];
        }
      }
      row++;
    });

    // Fila de totales
    ws.getRow(row).height = 18;
    colIdx = 1;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      if (colIdx === 1) {
        styleTotals(ws.getCell(row, colIdx), 'TOTALES', 'left');
        colIdx++;
      } else if (col.mergeWithNext && i + 1 < columns.length) {
        ws.mergeCells(row, colIdx, row, colIdx + 1);
        const numFmt = col.numFmt || '"$"#,##0.00';
        styleTotals(ws.getCell(row, colIdx), totals[col.key] || 0, 'right', numFmt);
        i++;
        colIdx += 2;
      } else if (col.total && totals[col.key] !== undefined) {
        const numFmt = col.numFmt || '"$"#,##0.00';
        styleTotals(ws.getCell(row, colIdx), totals[col.key], 'right', numFmt);
        colIdx++;
      } else {
        const cell = ws.getCell(row, colIdx);
        applyStyle(cell, {
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.totalsBg } },
          font: { bold: true, size: 9, color: { argb: COLORS.white }, name: 'Calibri' },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: borderMedium,
        });
        colIdx++;
      }
    }
    row++;
    row++;
    return row;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Observaciones
  // ───────────────────────────────────────────────────────────────────────────

  addObservations(
    ws,
    observations,
    startRow = 1
  ) {
    if (
      !observations ||
      !observations.length
    ) {
      return startRow;
    }

    let row = startRow;

    const colCount =
      ws.columns.length || 5;

    ws.mergeCells(
      `A${row}:${this.getColLetter(colCount)}${row}`
    );

    styleSubHeader(
      ws.getCell(`A${row}`),
      '  OBSERVACIONES'
    );

    ws.getRow(row).height = 18;

    row++;

    observations.forEach(
      (obs, index) => {
        ws.mergeCells(
          `A${row}:${this.getColLetter(colCount)}${row}`
        );

        const cell =
          ws.getCell(`A${row}`);

        cell.value =
          `${index + 1}. ${obs}`;

        applyStyle(cell, {
          font: {
            size: 8,
            name: 'Calibri',
            color: {
              argb: '4B5563',
            },
          },

          alignment: {
            vertical: 'middle',
            horizontal: 'left',
            wrapText: true,
          },

          border,
        });

        ws.getRow(row).height = 16;

        row++;
      }
    );

    row++;

    return row;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Firmas
  // ───────────────────────────────────────────────────────────────────────────

  addSignatures(
    ws,
    signatures,
    startRow = 1
  ) {
    if (
      !signatures ||
      !signatures.length
    ) {
      return startRow;
    }

    let row = startRow;

    const colCount =
      ws.columns.length || 5;

    ws.mergeCells(
      `A${row}:${this.getColLetter(colCount)}${row}`
    );

    styleSubHeader(
      ws.getCell(`A${row}`),
      '  FIRMAS DE RESPONSABILIDAD'
    );

    ws.getRow(row).height = 18;

    row++;

    const cols =
      Math.min(
        signatures.length,
        3
      );

    const colWidth =
      Math.floor(
        colCount / cols
      );

    signatures.forEach(
      (sig, index) => {
        const col =
          index * colWidth + 1;

        const colEnd =
          Math.min(
            col + colWidth - 1,
            colCount
          );

        const signRow =
          row + 8;

        ws.mergeCells(
          `${this.getColLetter(col)}${row}:${this.getColLetter(colEnd)}${signRow}`
        );

        const cell =
          ws.getCell(
            `${this.getColLetter(col)}${row}`
          );

        cell.value =
          `Firma: ${sig.name}`;

        applyStyle(cell, {
          font: {
            size: 9,
            bold: true,
            name: 'Calibri',
          },

          alignment: {
            vertical: 'center',
            horizontal: 'center',
          },

          border: {
            bottom: {
              style: 'medium',
              color: {
                argb: COLORS.border,
              },
            },
          },
        });

        const infoCell =
          ws.getCell(
            `${this.getColLetter(col)}${signRow - 2}`
          );

        infoCell.value =
          `${sig.name} - ${sig.role}`;

        applyStyle(infoCell, {
          font: {
            size: 8,
            name: 'Calibri',
            color: {
              argb: '4B5563',
            },
          },

          alignment: {
            vertical: 'middle',
            horizontal: 'center',
          },
        });

        if (sig.date) {
          const dateCell =
            ws.getCell(
              `${this.getColLetter(col)}${signRow}`
            );

          dateCell.value =
            `Fecha: ${fmtDate(sig.date)}`;

          applyStyle(dateCell, {
            font: {
              size: 7,
              name: 'Calibri',
              color: {
                argb: '9CA3AF',
              },
            },

            alignment: {
              vertical: 'middle',
              horizontal: 'center',
            },
          });
        }
      }
    );

    row += 12;

    return row;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // AUTO FIT OPCIONAL
  //
  // IMPORTANTE:
  // Este método YA NO se ejecuta automáticamente.
  //
  // Si un reporte quiere auto-fit:
  //
  // autoFitColumns(ws)
  //
  // Pero si el reporte manda width, NO debe llamarse.
  // ───────────────────────────────────────────────────────────────────────────

  autoFitColumns(
    ws,
    options = {}
  ) {
    const {
      minWidth = 4,
      maxWidth = 40,
      padding = 1,
    } = options;

    ws.columns.forEach(
      (column) => {
        let maxLength = 0;

        column.eachCell(
          {
            includeEmpty: true,
          },
          (cell) => {
            let text = '';

            if (
              cell.value !== null &&
              cell.value !== undefined
            ) {
              if (
                typeof cell.value ===
                  'object' &&
                cell.value.richText
              ) {
                text =
                  cell.value.richText
                    .map(
                      (item) =>
                        item.text || ''
                    )
                    .join('');
              } else {
                text =
                  String(cell.value);
              }
            }

            maxLength =
              Math.max(
                maxLength,
                text.length
              );
          }
        );

        let width =
          maxLength + padding;

        width =
          Math.max(
            width,
            minWidth
          );

        width =
          Math.min(
            width,
            maxWidth
          );

        column.width = width;
      }
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Aplicar widths enviados por el reporte
  //
  // Este método permite restaurar explícitamente los widths después
  // de cualquier operación que pudiera modificarlos.
  // ───────────────────────────────────────────────────────────────────────────

  applyColumnWidths(
    ws,
    columns
  ) {
    if (!Array.isArray(columns)) {
      return;
    }

    columns.forEach(
      (column, index) => {
        if (
          typeof column.width ===
          'number'
        ) {
          ws.getColumn(
            index + 1
          ).width =
            column.width;
        }
      }
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Columna Excel
  // ───────────────────────────────────────────────────────────────────────────

  getColLetter(index) {
    let letter = '';

    while (index > 0) {
      const remainder =
        (index - 1) % 26;

      letter =
        String.fromCharCode(
          65 + remainder
        ) + letter;

      index =
        Math.floor(
          (index - 1) / 26
        );
    }

    return letter;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Guardar
  // ───────────────────────────────────────────────────────────────────────────

  async save(filename) {
    const buffer =
      await this.wb.xlsx.writeBuffer();

    const blob =
      new Blob([buffer], {
        type:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    const url =
      URL.createObjectURL(blob);

    const a =
      document.createElement('a');

    a.href = url;

    a.download =
      filename || 'reporte.xlsx';

    a.click();

    URL.revokeObjectURL(url);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // GENERATE
  // ───────────────────────────────────────────────────────────────────────────

  static async generate(
    data,
    user = null
  ) {
    const generator =
      new ExcelGenerator(data);

    await generator.initialize();

    if (user) {
      generator.setUser(user);
    }

    /*
     * IMPORTANTE:
     *
     * Aquí obtenemos las columnas que realmente
     * utiliza el reporte.
     *
     * No importa si son:
     *
     * Producto
     * Cliente
     * Fecha
     * Cantidad
     * Estado
     * etc.
     *
     * El generador solo mira:
     *
     * column.width
     */

    const columns =
      generator.getReportColumns(
        data
      );

    const ws =
      generator.createSheet(
        data.sheetName ||
          'Reporte',
        columns
      );

    let row = 1;

    // Header
    row =
      generator.addHeader(
        ws,
        data.title,
        data.subtitle,
        data.period,
        {
          startRow: row,
        }
      );

    // KPIs
    if (
      data.kpis?.length
    ) {
      row =
        generator.addKpis(
          ws,
          data.kpis,
          row
        );
    }

    // Secciones
    if (
      Array.isArray(
        data.sections
      )
    ) {
      for (
        const section of
          data.sections
      ) {
        row =
          generator.addTable(
            ws,
            section.title,
            section.columns,
            section.rows,
            {
              startRow: row,
              showTotals:
                section.showTotals !==
                false,
            }
          );
      }
    }

    // Observaciones
    if (
      data.observations?.length
    ) {
      row =
        generator.addObservations(
          ws,
          data.observations,
          row
        );
    }

    // Firmas
    if (
      data.signatures?.length
    ) {
      row =
        generator.addSignatures(
          ws,
          data.signatures,
          row
        );
    }

    /*
     * NO HACEMOS:
     *
     * generator.autoFitColumns(ws);
     *
     * porque eso destruiría los widths
     * enviados por cada reporte.
     */

    /*
     * Reaplicamos explícitamente los widths
     * enviados por el reporte.
     *
     * Esto garantiza que ExcelJS termine
     * con los valores configurados.
     */

    generator.applyColumnWidths(
      ws,
      columns
    );

    const filename =
      data.filename ||
      'reporte.xlsx';

    await generator.save(
      filename.endsWith('.xlsx')
        ? filename
        : `${filename}.xlsx`
    );
  }
}

// ─── Componente Botón Excel ───────────────────────────────────────────────────

export default function ReportExcelButton({
  config,
  className,
  onSuccess,
  onError,
  children = 'Excel',
  icon = true,
}) {
  const { user } =
    useSession();

  const [generating, setGenerating] =
    useState(false);

  const [error, setError] =
    useState('');

  const [success, setSuccess] =
    useState('');

  const handleGenerate =
    async () => {
      if (!config) {
        setError(
          'No hay datos para generar el Excel'
        );

        return;
      }

      setGenerating(true);
      setError('');
      setSuccess('');

      try {
        await ExcelGenerator.generate(
          config,
          user
        );

        setSuccess(
          'Excel generado correctamente'
        );

        if (onSuccess) {
          onSuccess();
        }

        setTimeout(
          () => setSuccess(''),
          3000
        );
      } catch (err) {
        console.error(
          'Error generando Excel:',
          err
        );

        setError(
          err.message ||
            'Error al generar el Excel'
        );

        if (onError) {
          onError(err);
        }
      } finally {
        setGenerating(false);
      }
    };

  return (
    <div
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <button
        type="button"
        onClick={handleGenerate}
        disabled={
          generating || !config
        }
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,

          padding: '9px 18px',

          background:
            generating || !config
              ? 'rgba(22, 163, 74, 0.35)'
              : 'linear-gradient(135deg,#16A34A,#15803D)',

          color: '#fff',

          border: 'none',

          borderRadius: 8,

          cursor:
            generating || !config
              ? 'not-allowed'
              : 'pointer',

          fontWeight: 700,

          fontSize: 13,

          transition:
            'all 0.3s ease',

          opacity:
            generating ? 0.7 : 1,

          boxShadow:
            generating || !config
              ? 'none'
              : '0 4px 14px rgba(22, 163, 74, 0.35)',
        }}
      >
        {icon && (
          <FiDownload size={15} />
        )}

        {generating
          ? 'Generando Excel...'
          : children}
      </button>

      {error && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: '#ef4444',
          }}
        >
          <FiAlertCircle size={12} />

          {error}
        </span>
      )}

      {success && (
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            color: '#10b981',
          }}
        >
          <FiCheckCircle size={12} />

          {success}
        </span>
      )}
    </div>
  );
}