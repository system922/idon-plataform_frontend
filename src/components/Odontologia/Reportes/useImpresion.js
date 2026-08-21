// components/Odontologia/Reportes/useImpresion.js
import { useRef } from 'react';

export function useImpresion() {
  const printRef = useRef(null);

  const imprimir = (titulo = 'Reporte Odontológico') => {
    if (!printRef.current) return;

    const contenido = printRef.current.innerHTML;
    
    const ventana = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
    if (!ventana) {
      alert('Por favor, permite las ventanas emergentes para imprimir');
      return;
    }

    ventana.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${titulo}</title>
          <style>
            /* Estilos base para impresión */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: 'Times New Roman', Times, serif;
              background: #ffffff;
              color: #1a1a1a;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            /* Asegurar que los colores se impriman */
            .pi-logo-placeholder,
            .pi-paciente-info,
            .pi-tabla th,
            .pi-tabla-striped tbody tr:nth-child(even) {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            @page {
              size: A4;
              margin: 15mm 20mm;
            }

            @media print {
              body {
                padding: 0;
              }
              
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${contenido}
          <script>
            window.onload = function() {
              // Imprimir automáticamente al cargar
              window.print();
            };
          <\/script>
        </body>
      </html>
    `);

    ventana.document.close();
  };

  return { printRef, imprimir };
}