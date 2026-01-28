import { FiniquitoCalculation } from '../types';

// Declare the global variables that will be available from the CDN scripts
declare var jspdf: any;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(value);
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

export function generatePdf(data: FiniquitoCalculation): void {
  const { jsPDF } = jspdf;
  const doc = new jsPDF();
  const { employee, percepciones, deducciones, netTotal, calculationType } = data;

  const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
  let finalY = 0;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const title = `RECIBO DE ${calculationType.toUpperCase()}`;
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  // Employee Data
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha de Emisión: ${formatDate(new Date())}`, pageWidth - 20, 30, { align: 'right' });

  const employeeInfo = `
    Nombre del Empleado: ${employee.fullName}
    Puesto: ${employee.position}
    Fecha de Ingreso: ${formatDate(employee.hireDate)}
    Fecha de Baja: ${formatDate(employee.terminationDate)}
  `;
  doc.text(employeeInfo, 20, 40);

  // Percepciones Table
  const percepcionesBody: (string | number)[][] = [
    [`Sueldo (${percepciones.salaryDays} días)`, formatCurrency(percepciones.salaryAmount)],
  ];

  if (percepciones.additionalPerceptionAmount > 0) {
      percepcionesBody.push([`Percepción Adicional`, formatCurrency(percepciones.additionalPerceptionAmount)]);
  }
  if (percepciones.vacationAntAmount > 0) {
      percepcionesBody.push([`Vacaciones Pendientes (${percepciones.vacationAntDays})`, formatCurrency(percepciones.vacationAntAmount)]);
  }
  
  percepcionesBody.push([`Vacaciones (${percepciones.vacationDays.toFixed(2)} días)`, formatCurrency(percepciones.vacationAmount)]);
  percepcionesBody.push([`Prima Vacacional (25%)`, formatCurrency(percepciones.vacationPremiumAmount)]);
  percepcionesBody.push([`Aguinaldo (${percepciones.aguinaldoDays.toFixed(2)} días)`, formatCurrency(percepciones.aguinaldoAmount)]);
  
  if (data.indemnizacion) {
      percepcionesBody.push([`Indemnización (90 días)`, formatCurrency(data.indemnizacion.indemnizacion90dias)]);
      percepcionesBody.push([`20 días por año`, formatCurrency(data.indemnizacion.veinteDiasPorAnio)]);
      percepcionesBody.push([`Prima de Antigüedad`, formatCurrency(data.indemnizacion.primaAntiguedad)]);
      percepcionesBody.push([`Prima Ant. Proporcional`, formatCurrency(data.indemnizacion.primaAntiguedadProporcional)]);
      if (data.indemnizacion.horasExtrasDobles > 0) {
          percepcionesBody.push([`Horas Extras Dobles`, formatCurrency(data.indemnizacion.horasExtrasDobles)]);
      }
      if (data.indemnizacion.horasExtrasTriples > 0) {
          percepcionesBody.push([`Horas Extras Triples`, formatCurrency(data.indemnizacion.horasExtrasTriples)]);
      }
  }

  doc.autoTable({
    startY: 65,
    head: [['PERCEPCIONES', 'Importe']],
    body: percepcionesBody,
    foot: [['Total Percepciones', formatCurrency(percepciones.total + (data.indemnizacion?.total ?? 0))]],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74] },
    footStyles: { fontStyle: 'bold' },
    didDrawPage: (data) => {
        finalY = data.cursor?.y ?? 0;
    }
  });

  // Deducciones Table
  const deduccionesBody: (string | number)[][] = [];
  if (calculationType === 'liquidación') {
      deduccionesBody.push(['I.S.R. (Finiquito)', formatCurrency(deducciones.isrFiniquito)]);
      deduccionesBody.push(['I.S.R. (Liquidación)', formatCurrency(deducciones.isrLiquidacion)]);
  } else {
      deduccionesBody.push(['I.S.R.', formatCurrency(deducciones.isrFiniquito)]);
  }
  deduccionesBody.push(['I.M.S.S.', formatCurrency(deducciones.imss)]);
  
  doc.autoTable({
    startY: finalY + 5,
    head: [['DEDUCCIONES', 'Importe']],
    body: deduccionesBody,
    foot: [['Total Deducciones', formatCurrency(deducciones.total)]],
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38] },
    footStyles: { fontStyle: 'bold' },
    didDrawPage: (data) => {
        finalY = data.cursor?.y ?? 0;
    }
  });

  // Total
  finalY += 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL NETO A PAGAR:', 20, finalY);
  doc.text(formatCurrency(netTotal), pageWidth - 20, finalY, { align: 'right' });

  // Signature
  finalY = pageHeight - 40;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const legalText = `Recibí de conformidad la cantidad neta mencionada, no reservándome acción o derecho alguno en contra de la empresa.`;
  doc.text(legalText, 20, finalY);
  
  const signatureX = pageWidth / 2;
  doc.line(signatureX - 40, finalY + 20, signatureX + 40, finalY + 20);
  doc.text('Firma del Empleado', signatureX, finalY + 25, { align: 'center' });
  doc.text(employee.fullName, signatureX, finalY + 30, { align: 'center' });

  // Save the PDF
  const filename = `${calculationType}_${employee.fullName.replace(/\s/g, '_')}_${formatDate(employee.terminationDate)}.pdf`;
  doc.save(filename);
}