
import React, { useState } from 'react';
import { FiniquitoCalculation, IndemnizacionDetails, Percepciones, IndemnizacionSettings } from '../types';
import { VACATION_PREMIUM_RATE, AGUINALDO_DAYS, IMSS_RATES_EMPLOYEE } from '../constants';
import { generatePdf } from '../services/pdfService';

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

const CalculationTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs sm:max-w-md p-3 bg-slate-800 text-white text-xs rounded-md shadow-lg z-10 opacity-100 transition-opacity duration-200 pointer-events-none"
      role="tooltip"
    >
      <div className="font-mono text-left whitespace-pre-wrap">{children}</div>
      <svg className="absolute text-slate-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255">
        <polygon className="fill-current" points="0,0 127.5,127.5 255,0"/>
      </svg>
    </div>
);

const DetailRow: React.FC<{ 
    label: React.ReactNode; 
    value: string | number; 
    isCurrency?: boolean; 
    isBold?: boolean;
    calculation?: React.ReactNode;
}> = ({ label, value, isCurrency = true, isBold = false, calculation }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const hasCalculation = calculation != null;

    return (
        <div className={`flex justify-between items-center py-2 ${isBold ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
            <span>{label}</span>
            <div 
                className="relative"
                onMouseEnter={hasCalculation ? () => setShowTooltip(true) : undefined}
                onMouseLeave={hasCalculation ? () => setShowTooltip(false) : undefined}
            >
                <span className={`${isBold ? 'text-lg' : ''} ${isCurrency ? 'text-right' : ''} ${hasCalculation ? 'cursor-help border-b border-dotted border-slate-500' : ''}`}>
                    {isCurrency ? formatCurrency(typeof value === 'number' ? value : 0) : value}
                </span>
                {hasCalculation && showTooltip && <CalculationTooltip>{calculation}</CalculationTooltip>}
            </div>
        </div>
    );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-lg font-semibold text-gray-700 border-b-2 border-gray-300 pb-2 mb-2 mt-4">{title}</h3>
);

interface FiniquitoDetailProps {
  data: FiniquitoCalculation;
  indemnizacionSettings?: IndemnizacionSettings;
  onSettingsChange?: (settings: IndemnizacionSettings) => void;
  indemnizacionOverrides: {
    indemnizacion90dias: string;
    veinteDiasPorAnio: string;
    primaAntiguedad: string;
    primaAntiguedadProporcional: string;
  };
  onIndemnizacionOverrideChange: (key: keyof IndemnizacionDetails, value: string) => void;
}

const SeveranceTooltip: React.FC<{indemnizacion: IndemnizacionDetails}> = ({indemnizacion}) => (
<>
{`${formatCurrency(indemnizacion.indemnizacion90dias)} (90 días)
+ ${formatCurrency(indemnizacion.veinteDiasPorAnio)} (20 días/año)
+ ${formatCurrency(indemnizacion.primaAntiguedad)} (Prima Ant.)
+ ${formatCurrency(indemnizacion.primaAntiguedadProporcional)} (Prima Ant. Prop.)`}
</>
);

const TaxBreakdown: React.FC<{ taxable: number, exempt: number }> = ({ taxable, exempt }) => (
    <div className="border-t border-slate-700 mt-1 pt-1 text-slate-400">
        {`Gravado: ${formatCurrency(taxable)}\nExento: ${formatCurrency(exempt)}`}
    </div>
);

export const FiniquitoDetail: React.FC<FiniquitoDetailProps> = ({ data, indemnizacionSettings, onSettingsChange, indemnizacionOverrides, onIndemnizacionOverrideChange }) => {
  const { employee, percepciones, deducciones, netTotal, sdi, indemnizacion, calculationType } = data;
  const [showNetoTooltip, setShowNetoTooltip] = useState(false);
  const [showSdiTooltip, setShowSdiTooltip] = useState(false);
  const [activeIndemnizacionTooltip, setActiveIndemnizacionTooltip] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<keyof IndemnizacionDetails | null>(null);

  const formatNumberWithCommas = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(num)) return typeof value === 'string' ? value : '0.00';
    return new Intl.NumberFormat('es-MX', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(num);
  };

  const handleGeneratePdf = () => {
    generatePdf(data);
  };

  const handleSettingChange = (key: keyof IndemnizacionSettings) => {
      if (onSettingsChange && indemnizacionSettings) {
          onSettingsChange({
              ...indemnizacionSettings,
              [key]: !indemnizacionSettings[key]
          });
      }
  };

  const sdiTooltip = `  ${formatCurrency(employee.dailySalary)} (Salario Diario)
+ ${formatCurrency(data.dailyAguinaldo)} (Parte Diaria Aguinaldo)
+ ${formatCurrency(data.dailyVacationPremium)} (Parte Diaria Prima Vac.)`;

  const isrOrdinaryTooltip = deducciones.isrDetails ? (
      <div className="bg-slate-700 p-3 rounded w-80 text-xs font-mono text-slate-200">
          <p className="text-center text-slate-300 text-sm mb-2 font-bold">Detalle de Cálculo ISR</p>
          
          <div className="space-y-1">
            <div className="flex justify-between">
                <span>Ingreso Gravable:</span>
                <span>{formatCurrency(deducciones.isrDetails.totalMonthlyTaxableIncome)}</span>
            </div>
             <div className="flex justify-between">
                <span>(-) Límite Inferior:</span>
                <span>{formatCurrency(deducciones.isrDetails.lowerLimit)}</span>
            </div>
            <div className="border-t border-slate-600 my-1"></div>
            <div className="flex justify-between">
                <span>(=) Excedente Límite Inferior:</span>
                <span>{formatCurrency(deducciones.isrDetails.surplus)}</span>
            </div>
             <div className="flex justify-between">
                <span>(*) % S/Excedente:</span>
                <span>{(deducciones.isrDetails.percentage * 100).toFixed(2)}%</span>
            </div>
            <div className="border-t border-slate-600 my-1"></div>
            <div className="flex justify-between">
                <span>(=) Impuesto Marginal:</span>
                <span>{formatCurrency(deducciones.isrDetails.marginalTax)}</span>
            </div>
            <div className="flex justify-between">
                <span>(+) Cuota Fija:</span>
                <span>{formatCurrency(deducciones.isrDetails.fixedQuota)}</span>
            </div>
            <div className="border-t border-slate-600 my-1"></div>
            <div className="flex justify-between font-bold">
                <span>(=) ISR Determinado:</span>
                <span>{formatCurrency(deducciones.isrDetails.totalMonthlyIsrBeforeSubsidy)}</span>
            </div>
            <div className="flex justify-between">
                <span>(-) Subsidio P/Empleo:</span>
                <span>{formatCurrency(deducciones.isrDetails.subsidy)}</span>
            </div>
             <div className="border-t border-slate-600 my-1"></div>
            <div className="flex justify-between font-bold">
                <span>(=) ISR a Cargo (del Mes):</span>
                <span>{formatCurrency(deducciones.isrDetails.totalMonthlyIsr)}</span>
            </div>

            {deducciones.isrDetails.previousPeriodIsr > 0 && (
            <>
                <div className="flex justify-between">
                    <span>(-) ISR ret. (Qna. Ant.):</span>
                    <span>{formatCurrency(deducciones.isrDetails.previousPeriodIsr)}</span>
                </div>
                <div className="border-t border-slate-600 my-1"></div>
            </>
            )}

            <div className="flex justify-between font-bold text-base mt-2 bg-slate-800 p-1 rounded">
                <span>(=) ISR a Retener:</span>
                <span className="text-teal-300">{formatCurrency(deducciones.isrDetails.isrToWithholdOrdinary)}</span>
            </div>
          </div>
          <p className="text-center text-slate-400 text-[10px] mt-2">
            Ingreso Gravable = {formatCurrency(deducciones.isrDetails.periodTaxableIncome)} (Finiquito)
            {deducciones.isrDetails.previousPeriodTaxableIncome > 0 && ` + ${formatCurrency(deducciones.isrDetails.previousPeriodTaxableIncome)} (Qna. Ant.)`}
          </p>
      </div>
  ) : `Cálculo no disponible.`;

  const isrSeveranceTooltip = deducciones.isrDetails?.severanceTaxable !== undefined ? (
     <div className="bg-slate-700 p-2 rounded mt-2 w-80">
        <p className="text-center text-slate-300 text-xs mb-1 font-bold">ISR sobre Indemnización</p>
        <div className="flex justify-between"><span>Total Indemnización:</span> <span>{formatCurrency(deducciones.isrDetails.severanceTotalIncome ?? 0)}</span></div>
        <div className="flex justify-between"><span>(-) Exención (90 UMA/año):</span> <span>{formatCurrency(deducciones.isrDetails.severanceExempt ?? 0)}</span></div>
        <div className="border-t border-slate-600 my-1"></div>
        <div className="flex justify-between font-bold"><span>(=) Base Gravable:</span> <span>{formatCurrency(deducciones.isrDetails.severanceTaxable)}</span></div>
        <div className="mt-1">
            <div className="flex justify-between">
                <span>(*) Tasa Efectiva Últ. Sueldo:</span> 
                <span>{((deducciones.isrDetails.lastMonthEffectiveRate ?? 0) * 100).toFixed(4)}%</span>
            </div>
            <div className="pl-4 text-slate-400 text-[10px] whitespace-pre-wrap text-right">
                {`(${formatCurrency(deducciones.isrDetails.isrForLastMonthlyOrdinaryIncome ?? 0)} / ${formatCurrency(deducciones.isrDetails.lastMonthlyOrdinaryIncome ?? 0)})`}
            </div>
        </div>
        <div className="border-t border-slate-600 my-1"></div>
        <div className="flex justify-between font-bold"><span>(=) ISR a Retener (Indemniz.):</span> <span>{formatCurrency(deducciones.isrDetails.isrOnSeverance ?? 0)}</span></div>
     </div>
  ) : `No aplica.`;

  const imssCalculationTooltip = deducciones.imssDetails ? (
    <div className="space-y-1 text-xs w-72 text-left font-mono">
        <p className="font-bold text-center mb-2">Detalle de Cálculo IMSS</p>
        <div className="flex justify-between"><span>SBC:</span> <span>{formatCurrency(deducciones.imssDetails.sbc)}</span></div>
        <div className="flex justify-between"><span>Días Cotizados:</span> <span>{deducciones.imssDetails.salaryDays}</span></div>
        <div className="border-t border-slate-600 my-2"></div>
        
        <p className="font-semibold text-slate-300">Enf. y Mat. (Excedente)</p>
        <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(deducciones.imssDetails.illnessAndMaternity)}</span></div>
        <div className="border-t border-slate-700 my-1"></div>

        <p className="font-semibold text-slate-300">Prestaciones en Dinero</p>
        <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(deducciones.imssDetails.prestacionesEnDinero)}</span></div>
        <div className="border-t border-slate-700 my-1"></div>

        <p className="font-semibold text-slate-300">Gastos Médicos Pensionados</p>
        <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(deducciones.imssDetails.gastosMedicosPensionados)}</span></div>
        <div className="border-t border-slate-700 my-1"></div>

        <p className="font-semibold text-slate-300">Invalidez y Vida</p>
        <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(deducciones.imssDetails.disabilityAndLife)}</span></div>
        <div className="border-t border-slate-700 my-1"></div>

        <p className="font-semibold text-slate-300">Cesantía y Vejez</p>
        <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(deducciones.imssDetails.unemploymentAndOldAge)}</span></div>

        <div className="border-t-2 border-slate-400 my-2"></div>
        <p className="text-center">Total IMSS: <strong className="text-base">{formatCurrency(deducciones.imss)}</strong></p>
    </div>
  ) : `Cálculo no disponible`;
  
  const totalPercepcionesTooltip = `${formatCurrency(percepciones.salaryAmount)} (Sueldo)
${percepciones.additionalPerceptionAmount > 0 ? `+ ${formatCurrency(percepciones.additionalPerceptionAmount)} (Adicional)\n` : ''}${percepciones.overtimeAmount > 0 ? `+ ${formatCurrency(percepciones.overtimeAmount)} (Hrs. Extra)\n` : ''}${percepciones.vacationAntAmount > 0 ? `+ ${formatCurrency(percepciones.vacationAntAmount)} (Vac. Pendientes)\n` : ''}+ ${formatCurrency(percepciones.vacationAmount)} (Vacaciones)
+ ${formatCurrency(percepciones.vacationPremiumAmount)} (Prima Vac.)
+ ${formatCurrency(percepciones.aguinaldoAmount)} (Aguinaldo)`;
    
  const totalDeductionsTooltip = `${formatCurrency(deducciones.isrFiniquito)} (ISR Finiquito)
${deducciones.isrLiquidacion > 0 ? `+ ${formatCurrency(deducciones.isrLiquidacion)} (ISR Liquidación)\n` : ''}+ ${formatCurrency(deducciones.imss)} (IMSS)`;

  const indemnizacionFields: {
      id: keyof IndemnizacionDetails;
      settingKey: keyof IndemnizacionSettings;
      label: (years: number) => string;
      calculation: (calcData: FiniquitoCalculation) => string;
  }[] = [
      { id: 'indemnizacion90dias', settingKey: 'include90Days', label: () => 'Indemnización (90 días)', calculation: (d) => `90 días * ${formatCurrency(d.sdi)} (SDI)` },
      { id: 'veinteDiasPorAnio', settingKey: 'include20Days', label: (y) => `20 días por año (${y} años)`, calculation: (d) => `20 días * ${d.seniorityYears} años * ${formatCurrency(d.sdi)} (SDI)` },
      { id: 'primaAntiguedad', settingKey: 'includeSeniorityPremium', label: (y) => `Prima de Antigüedad (${y} años)`, calculation: (d) => `12 días * ${d.seniorityYears} años * ${formatCurrency(d.indemnizacion!.primaAntiguedadSalaryBase)} (Salario Topado)` },
      { id: 'primaAntiguedadProporcional', settingKey: 'includeProportionalSeniorityPremium', label: () => 'Prima Ant. Proporcional', calculation: (d) => `(12 días / 365) * ${d.percepciones.daysWorkedInYear} días (del año) * ${formatCurrency(d.indemnizacion!.primaAntiguedadSalaryBase)} (Salario Topado)` },
  ];

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto my-4 border border-gray-200">
      <header className="flex justify-between items-center mb-6 pb-4 border-b-2 border-gray-800">
        <h1 className="text-3xl font-bold text-gray-800 uppercase">{calculationType}</h1>
        <button
            onClick={handleGeneratePdf}
            className="bg-red-600 text-white font-bold py-2 px-4 rounded-md hover:bg-red-700 transition-colors duration-200 flex items-center gap-2"
        >
            <i className="fa-solid fa-file-pdf"></i>
            Generar PDF
        </button>
      </header>

      <section className="mb-6">
        <h2 className="text-xl font-bold text-gray-700 mb-3 bg-gray-100 p-2 rounded">DATOS GENERALES</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 text-sm text-gray-700">
          <div><strong>Nombre:</strong> {employee.fullName}</div>
          <div><strong>RFC:</strong> {employee.rfc}</div>
          <div><strong>Antigüedad:</strong> {data.seniorityYears} años</div>
          <div><strong>Número de Empleado:</strong> {employee.id}</div>
          <div><strong>Fecha de Ingreso:</strong> {formatDate(employee.hireDate)}</div>
          <div><strong>Fecha de Baja:</strong> {formatDate(employee.terminationDate)}</div>
          <div><strong>Puesto:</strong> {employee.position}</div>
          <div><strong>Ubicación:</strong> {employee.location}</div>
          <div>
            <strong>SD:</strong> {formatCurrency(employee.dailySalary)}
            <div 
              className="relative inline-block ml-4"
              onMouseEnter={() => setShowSdiTooltip(true)}
              onMouseLeave={() => setShowSdiTooltip(false)}
            >
              <strong>SDI:</strong>
              <span className="cursor-help border-b border-dotted border-slate-500 ml-1">
                  {formatCurrency(sdi)}
              </span>
              {showSdiTooltip && <CalculationTooltip>{sdiTooltip}</CalculationTooltip>}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
        <div>
          <SectionHeader title="PERCEPCIONES (FINIQUITO)" />
          <div className="space-y-1 text-sm">
            <DetailRow 
                label={`Días de Sueldo (${percepciones.salaryDays})`} 
                value={percepciones.salaryAmount} 
                calculation={<>{`${percepciones.salaryDays} días * ${formatCurrency(employee.dailySalary)} (SD)`}<TaxBreakdown taxable={percepciones.salaryTaxable} exempt={percepciones.salaryExempt} /></>} 
            />
            {percepciones.additionalPerceptionAmount > 0 && (
                <DetailRow 
                    label={`Percepción Adicional`} 
                    value={percepciones.additionalPerceptionAmount} 
                    calculation={<>{`Monto adicional 100% gravable para ISR.`}<TaxBreakdown taxable={percepciones.additionalPerceptionAmount} exempt={0} /></>} 
                />
            )}
            {percepciones.overtimeAmount > 0 && (
                <DetailRow 
                    label={`Horas Extras`} 
                    value={percepciones.overtimeAmount} 
                    calculation={<>{`Monto total de horas extras pagadas.`}<TaxBreakdown taxable={percepciones.overtimeTaxable} exempt={percepciones.overtimeExempt} /></>} 
                />
            )}
             {percepciones.vacationAntAmount > 0 && ( 
                <DetailRow 
                    label={`Vacaciones Pendientes (${percepciones.vacationAntDays})`} 
                    value={percepciones.vacationAntAmount} 
                    calculation={<>{`${percepciones.vacationAntDays} días * ${formatCurrency(employee.dailySalary)} (SD)`}<TaxBreakdown taxable={percepciones.vacationAntTaxable} exempt={percepciones.vacationAntExempt} /></>}
                /> 
            )}
            <DetailRow 
                label={`Vacaciones (${percepciones.vacationDays.toFixed(2)})`} 
                value={percepciones.vacationAmount} 
                calculation={<>{`(${percepciones.vacationDaysPerYear}d/año / ${percepciones.daysInYear}d) * ${percepciones.daysSinceLastAnniversary}d\n= ${percepciones.proportionalVacationDays.toFixed(2)}d prop.\n\n${percepciones.vacationDays.toFixed(2)}d * ${formatCurrency(employee.dailySalary)}`}<TaxBreakdown taxable={percepciones.vacationTaxable} exempt={percepciones.vacationExempt} /></>} 
            />
            <DetailRow 
                label={`Prima Vacacional (0.25)`} 
                value={percepciones.vacationPremiumAmount} 
                calculation={<>{`${formatCurrency(percepciones.vacationAmount)} * ${VACATION_PREMIUM_RATE * 100}%`}<TaxBreakdown taxable={percepciones.vacationPremiumTaxable} exempt={percepciones.vacationPremiumExempt} /></>} 
            />
            <DetailRow 
                label={`Aguinaldo (${percepciones.aguinaldoDays.toFixed(2)})`} 
                value={percepciones.aguinaldoAmount} 
                calculation={<>{`(${AGUINALDO_DAYS}d/ley / ${percepciones.daysInYear}d) * ${percepciones.daysWorkedInYear}d\n= ${percepciones.proportionalAguinaldoDays.toFixed(2)}d prop.\n\n${percepciones.aguinaldoDays.toFixed(2)}d * ${formatCurrency(employee.dailySalary)}`}<TaxBreakdown taxable={percepciones.aguinaldoTaxable} exempt={percepciones.aguinaldoExempt} /></>} 
            />
            <div className="border-t border-gray-300 my-2"></div>
            <DetailRow label="Subtotal Finiquito" value={percepciones.total} isBold={true} calculation={totalPercepcionesTooltip} />
          </div>

          {indemnizacion && (
            <div className="mt-4">
                 <SectionHeader title="PERCEPCIONES (INDEMNIZACIÓN)" />
                 <div className="space-y-1 text-sm">
                    {indemnizacionFields.map(field => {
                        const calculatedValue = (indemnizacion as any)[field.id];
                        const overrideValue = indemnizacionOverrides[field.id as keyof typeof indemnizacionOverrides];
                        const isCurrentlyEditing = isEditing === field.id;

                        let valueForInput: string;
                        if (isCurrentlyEditing) {
                            valueForInput = overrideValue;
                        } else {
                            const sourceValue = overrideValue !== '' ? overrideValue : calculatedValue;
                            valueForInput = formatNumberWithCommas(sourceValue);
                        }
                        
                        return (
                            <div key={field.id} className="flex justify-between items-center py-2 text-gray-600">
                                <div className="flex items-center gap-2">
                                    {indemnizacionSettings && <input type="checkbox" checked={indemnizacionSettings[field.settingKey]} onChange={() => handleSettingChange(field.settingKey)} />}
                                    <span>{field.label(data.seniorityYears)}</span>
                                </div>
                                <div 
                                    className="relative"
                                    onMouseEnter={() => !isCurrentlyEditing && setActiveIndemnizacionTooltip(field.id)}
                                    onMouseLeave={() => setActiveIndemnizacionTooltip(null)}
                                >
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                        <input
                                            type="text"
                                            value={valueForInput}
                                            onChange={(e) => onIndemnizacionOverrideChange(field.id, e.target.value)}
                                            onFocus={(e) => {
                                                setIsEditing(field.id);
                                                if (overrideValue === '') {
                                                    onIndemnizacionOverrideChange(field.id, calculatedValue.toFixed(2));
                                                }
                                                e.target.select();
                                            }}
                                            onBlur={() => {
                                                setIsEditing(null);
                                                const numericOverride = parseFloat(overrideValue);
                                                if (!isNaN(numericOverride) && numericOverride.toFixed(2) === calculatedValue.toFixed(2)) {
                                                    onIndemnizacionOverrideChange(field.id, '');
                                                } else if (overrideValue !== '' && (isNaN(numericOverride) || overrideValue.trim() === '')) {
                                                    onIndemnizacionOverrideChange(field.id, '');
                                                }
                                            }}
                                            className="w-32 text-right p-1 pl-5 border border-dashed border-gray-400 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-solid focus:border-teal-500 transition"
                                            aria-label={field.label(data.seniorityYears)}
                                        />
                                    </div>
                                    {activeIndemnizacionTooltip === field.id && (
                                        <CalculationTooltip>{field.calculation(data)}</CalculationTooltip>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    <div className="border-t border-gray-300 my-2"></div>
                    <DetailRow label="Subtotal Indemnización" value={indemnizacion.total} isBold={true} calculation={<SeveranceTooltip indemnizacion={indemnizacion} />} />
                 </div>
            </div>
          )}

        </div>
        <div>
          <SectionHeader title="DEDUCCIONES" />
          <div className="space-y-1 text-sm">
            {calculationType === 'liquidación' ? (
                <>
                    <DetailRow label="I. S. R. (Finiquito)" value={deducciones.isrFiniquito} calculation={isrOrdinaryTooltip} />
                    <DetailRow label="I. S. R. (Liquidación)" value={deducciones.isrLiquidacion} calculation={isrSeveranceTooltip} />
                </>
            ) : (
                <DetailRow label="I. S. R." value={deducciones.isrFiniquito} calculation={isrOrdinaryTooltip} />
            )}
            <DetailRow label="I. M. S. S." value={deducciones.imss} calculation={imssCalculationTooltip} />
            <div className="border-t border-gray-300 my-2"></div>
            <DetailRow label="Total de Deducciones" value={deducciones.total} isBold={true} calculation={totalDeductionsTooltip} />
          </div>
        </div>
      </div>

      <footer className="mt-8 pt-4 border-t-2 border-gray-800 flex justify-between items-center">
        <div>
            <span className="text-lg font-bold text-gray-700 mr-4">Total Percepciones</span>
             <span className="text-xl font-bold text-gray-800">
                {formatCurrency(percepciones.total + (indemnizacion?.total ?? 0))}
            </span>
        </div>
        <div 
            className="text-right relative"
            onMouseEnter={() => setShowNetoTooltip(true)}
            onMouseLeave={() => setShowNetoTooltip(false)}
        >
          <span className="text-xl font-bold text-gray-700 mr-4">TOTAL NETO</span>
          <span className="text-2xl font-bold text-green-600 cursor-help border-b-2 border-dotted border-green-600">
            {formatCurrency(netTotal)}
          </span>
          {showNetoTooltip && (
              <CalculationTooltip>
{`${formatCurrency(percepciones.total + (indemnizacion?.total ?? 0))} (Total Percepciones)
- ${formatCurrency(deducciones.total)} (Total Deducciones)`}
              </CalculationTooltip>
          )}
        </div>
      </footer>
    </div>
  );
};
