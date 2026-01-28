
import { EmployeeData, FiniquitoCalculation, Percepciones, Deducciones, IsrCalculationDetails, ImssCalculationDetails, IndemnizacionDetails, IndemnizacionSettings, IndemnizacionOverrides } from '../types';
import { AGUINALDO_DAYS, VACATION_PREMIUM_RATE, ISR_MONTHLY_TABLE_2026, IMSS_RATES_EMPLOYEE, SUBSIDY_2026_INCOME_LIMIT, SUBSIDY_2026_PERCENT_JAN, SUBSIDY_2026_PERCENT_FEB_DEC, MONTHLY_FACTOR, UMA_2025, UMA_2026 } from '../constants';

function parseDate(dateStr: string): Date {
    if (!dateStr) return new Date(NaN);
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [day, month, year] = parts.map(Number);
        if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900) {
            return new Date(year, month - 1, day);
        }
    }
    return new Date(NaN);
}

export function parseEmployeeData(text: string): EmployeeData[] {
  const rows = text.trim().split('\n').slice(1);
  const employees: EmployeeData[] = [];

  rows.forEach((row) => {
    const columns = row.split('\t');
    if (columns.length >= 11) {
      const hireDate = parseDate(columns[1]);
      const terminationDate = parseDate(columns[2]);
      const dailySalaryStr = columns[7]?.trim().replace(/,/g, '');
      const dailySalary = parseFloat(dailySalaryStr);
      
      const overtimeStr = columns[13]?.trim().replace(/,/g, '') || '0';
      const overtime = parseFloat(overtimeStr);

      const vacAntStr = columns[18]?.trim() || '0';
      const vacAnt = parseFloat(vacAntStr);
      
      if (!isNaN(hireDate.getTime()) && !isNaN(terminationDate.getTime()) && !isNaN(dailySalary) && dailySalary > 0) {
        employees.push({
          id: columns[0].trim(),
          terminationDate,
          hireDate,
          fullName: columns[6].trim(),
          rfc: columns[8].trim(),
          position: columns[9].trim(),
          location: columns[10].trim(),
          dailySalary,
          vacAnt: !isNaN(vacAnt) ? vacAnt : 0,
          overtime: !isNaN(overtime) ? overtime : 0,
        });
      }
    }
  });

  return employees;
}

const getDaysBetween = (startDate: Date, endDate: Date) => {
    const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endUTC = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(Math.abs(endUTC - startUTC) / oneDay) + 1;
};

const getVacationDaysForSeniority = (years: number): number => {
    if (years <= 0) return 0;
    if (years === 1) return 12;
    if (years === 2) return 14;
    if (years === 3) return 16;
    if (years === 4) return 18;
    if (years === 5) return 20;
    if (years >= 6 && years <= 10) return 22;
    if (years >= 11 && years <= 15) return 24;
    if (years >= 16 && years <= 20) return 26;
    if (years >= 21 && years <= 25) return 28;
    if (years >= 26 && years <= 30) return 30;
    if (years >= 31 && years <= 35) return 32;
    if (years >= 36 && years <= 40) return 34;
    if (years >= 41 && years <= 45) return 36;
    return 38;
};

const calculateIsrOnAmount = (amount: number, uma: number, date: Date) => {
    const bracket = ISR_MONTHLY_TABLE_2026.find(b => amount >= b.lowerLimit && amount <= b.upperLimit);
    if (!bracket) return { isr: 0, subsidy: 0 };
    
    const surplus = amount - bracket.lowerLimit;
    const marginalTax = surplus * bracket.percentage;
    const isrBeforeSubsidy = marginalTax + bracket.fixedQuota;

    let subsidy = 0;
    if (amount <= SUBSIDY_2026_INCOME_LIMIT) {
        const isJan = date.getFullYear() === 2026 && date.getMonth() === 0;
        const percent = isJan ? SUBSIDY_2026_PERCENT_JAN : SUBSIDY_2026_PERCENT_FEB_DEC;
        subsidy = uma * percent * MONTHLY_FACTOR;
    }
    
    const finalIsr = Math.max(0, isrBeforeSubsidy - subsidy);
    return { isr: finalIsr, subsidy };
};

export function calculateFiniquito(
    employee: EmployeeData, 
    umaInput: number, 
    salarioMinimo: number,
    calculationType: 'finiquito' | 'liquidación',
    previousPeriodIncome: number = 0, 
    previousPeriodIsr: number = 0,
    horasExtrasDobles: number = 0,
    horasExtrasTriples: number = 0,
    salaryDaysOverride?: number,
    additionalPerception: number = 0,
    indemnizacionSettings: IndemnizacionSettings = { 
        include90Days: true,
        include20Days: true,
        includeSeniorityPremium: true,
        includeProportionalSeniorityPremium: true
    },
    indemnizacionOverrides: IndemnizacionOverrides = {}
): FiniquitoCalculation {
    const { hireDate, terminationDate, dailySalary, vacAnt, overtime } = employee;

    // Lógica de selección de UMA dinámica: Enero 2026 usa UMA 2025
    const isJan2026 = terminationDate.getFullYear() === 2026 && terminationDate.getMonth() === 0;
    const effectiveUma = isJan2026 ? UMA_2025 : umaInput;

    const seniorityTotalDays = getDaysBetween(hireDate, terminationDate);
    const seniorityYears = Math.floor(seniorityTotalDays / 365.25);
    const vacationDaysPerYear = getVacationDaysForSeniority(seniorityYears + 1);

    const dailyAguinaldo = (dailySalary * AGUINALDO_DAYS) / 365;
    const dailyVacationPremium = (dailySalary * vacationDaysPerYear * VACATION_PREMIUM_RATE) / 365;
    const sdi = parseFloat((dailySalary + dailyAguinaldo + dailyVacationPremium).toFixed(2));

    const daysInYear = (terminationDate.getFullYear() % 4 === 0 && terminationDate.getFullYear() % 100 !== 0) || terminationDate.getFullYear() % 400 === 0 ? 366 : 365;
    const startOfYear = new Date(terminationDate.getFullYear(), 0, 1);
    const effectiveStartForAguinaldo = hireDate > startOfYear ? hireDate : startOfYear;
    const daysWorkedInYear = getDaysBetween(effectiveStartForAguinaldo, terminationDate);

    const dayOfMonth = terminationDate.getDate();
    const calculatedSalaryDays = dayOfMonth > 15 ? dayOfMonth - 15 : dayOfMonth;
    const salaryDays = (salaryDaysOverride !== undefined && !isNaN(salaryDaysOverride)) 
        ? salaryDaysOverride 
        : calculatedSalaryDays;
        
    const salaryAmount = dailySalary * salaryDays;

    const unroundedProportionalAguinaldoDays = (AGUINALDO_DAYS / daysInYear) * daysWorkedInYear;
    const proportionalAguinaldoDays = parseFloat(unroundedProportionalAguinaldoDays.toFixed(2));
    const aguinaldoAmount = parseFloat((proportionalAguinaldoDays * dailySalary).toFixed(2));
    
    const lastAnniversary = new Date(terminationDate.getFullYear(), hireDate.getMonth(), hireDate.getDate());
    if(lastAnniversary > terminationDate) lastAnniversary.setFullYear(terminationDate.getFullYear() - 1);
    const daysSinceLastAnniversary = getDaysBetween(lastAnniversary, terminationDate);

    const unroundedProportionalVacationDays = (vacationDaysPerYear / daysInYear) * daysSinceLastAnniversary;
    const proportionalVacationDays = parseFloat(unroundedProportionalVacationDays.toFixed(2));
    const vacationAmount = parseFloat((proportionalVacationDays * dailySalary).toFixed(2));
    const vacationPremiumAmount = parseFloat((vacationAmount * VACATION_PREMIUM_RATE).toFixed(2));

    const vacationAntAmount = (vacAnt || 0) * dailySalary;

    const totalHorasExtrasDobles = overtime + horasExtrasDobles;
    const totalOvertimeAmount = totalHorasExtrasDobles + horasExtrasTriples;
    const overtimeExemptLimit = 5 * effectiveUma;
    const potentialExemption = totalHorasExtrasDobles * 0.5;
    const overtimeExempt = Math.min(potentialExemption, overtimeExemptLimit);
    const overtimeTaxable = (totalHorasExtrasDobles - overtimeExempt) + horasExtrasTriples;

    const aguinaldoExemptLimit = effectiveUma * 30;
    const aguinaldoExempt = Math.min(aguinaldoAmount, aguinaldoExemptLimit);
    const aguinaldoTaxable = aguinaldoAmount - aguinaldoExempt;

    const vacationPremiumExemptLimit = effectiveUma * 15;
    const vacationPremiumExempt = Math.min(vacationPremiumAmount, vacationPremiumExemptLimit);
    const vacationPremiumTaxable = vacationPremiumAmount - vacationPremiumExempt;

    const totalOrdinaryPercepciones = salaryAmount + aguinaldoAmount + vacationAmount + vacationPremiumAmount + vacationAntAmount + additionalPerception + totalOvertimeAmount;
    let totalPercepciones = totalOrdinaryPercepciones;

    const percepciones: Percepciones = {
        salaryDays, salaryAmount, aguinaldoDays: proportionalAguinaldoDays, aguinaldoAmount, vacationDays: proportionalVacationDays, vacationAmount, vacationPremiumAmount, vacationAntDays: vacAnt || 0, vacationAntAmount, additionalPerceptionAmount: additionalPerception, 
        overtimeAmount: totalOvertimeAmount, overtimeTaxable, overtimeExempt,
        total: parseFloat(totalOrdinaryPercepciones.toFixed(2)),
        daysWorkedInYear, daysSinceLastAnniversary, daysInYear, vacationDaysPerYear, proportionalVacationDays: unroundedProportionalVacationDays, proportionalAguinaldoDays: unroundedProportionalAguinaldoDays,
        salaryTaxable: salaryAmount, salaryExempt: 0, vacationTaxable: vacationAmount, vacationExempt: 0, aguinaldoTaxable, aguinaldoExempt, vacationPremiumTaxable, vacationPremiumExempt, vacationAntTaxable: vacationAntAmount, vacationAntExempt: 0,
    };

    let indemnizacion: IndemnizacionDetails | undefined = undefined;
    if (calculationType === 'liquidación') {
        const calculated90dias = indemnizacionSettings.include90Days ? sdi * 90 : 0;
        const indemnizacion90dias = indemnizacionOverrides.indemnizacion90dias ?? calculated90dias;
        const calculated20dias = indemnizacionSettings.include20Days ? sdi * 20 * seniorityYears : 0;
        const veinteDiasPorAnio = indemnizacionOverrides.veinteDiasPorAnio ?? calculated20dias;
        const primaAntiguedadSalaryBase = Math.min(sdi, salarioMinimo * 2);
        const calculatedPrimaAntiguedad = indemnizacionSettings.includeSeniorityPremium ? primaAntiguedadSalaryBase * 12 * seniorityYears : 0;
        const primaAntiguedad = indemnizacionOverrides.primaAntiguedad ?? calculatedPrimaAntiguedad;
        const proportionalPrimaDays = (12 / 365) * daysWorkedInYear;
        const calculatedPrimaProporcional = indemnizacionSettings.includeProportionalSeniorityPremium ? parseFloat((primaAntiguedadSalaryBase * proportionalPrimaDays).toFixed(2)) : 0;
        const primaAntiguedadProporcional = indemnizacionOverrides.primaAntiguedadProporcional ?? calculatedPrimaProporcional;

        const totalIndemnizacionPerceptions = indemnizacion90dias + veinteDiasPorAnio + primaAntiguedad + primaAntiguedadProporcional;
        totalPercepciones += totalIndemnizacionPerceptions;

        indemnizacion = {
            indemnizacion90dias, veinteDiasPorAnio, primaAntiguedad, primaAntiguedadProporcional,
            horasExtrasDobles, horasExtrasTriples,
            total: totalIndemnizacionPerceptions,
            primaAntiguedadSalaryBase,
        }
    }

    const sbc = Math.min(sdi, effectiveUma * 25);
    const excedente = Math.max(0, sbc - (3 * effectiveUma));
    const imssEnfermedad = excedente * IMSS_RATES_EMPLOYEE.ENFERMEDAD_MATERNIDAD_EXCEDENTE * salaryDays;
    const imssPrestacionesDinero = sbc * IMSS_RATES_EMPLOYEE.PRESTACIONES_DINERO * salaryDays;
    const imssGastosMedicos = sbc * IMSS_RATES_EMPLOYEE.GASTOS_MEDICOS_PENSIONADOS * salaryDays;
    const imssInvalidez = sbc * IMSS_RATES_EMPLOYEE.INVALIDEZ_VIDA * salaryDays;
    const imssCesantia = sbc * IMSS_RATES_EMPLOYEE.CESANTIA_VEJEZ * salaryDays;
    const imss = parseFloat((imssEnfermedad + imssInvalidez + imssCesantia + imssPrestacionesDinero + imssGastosMedicos).toFixed(2));
    const imssDetails: ImssCalculationDetails = { sbc, salaryDays, uma: effectiveUma, excedenteSbc: excedente, illnessAndMaternity: imssEnfermedad, disabilityAndLife: imssInvalidez, unemploymentAndOldAge: imssCesantia, prestacionesEnDinero: imssPrestacionesDinero, gastosMedicosPensionados: imssGastosMedicos };

    const periodTaxableIncome = percepciones.salaryTaxable + percepciones.vacationTaxable + percepciones.aguinaldoTaxable + percepciones.vacationPremiumTaxable + percepciones.vacationAntTaxable + additionalPerception + overtimeTaxable;
    const actualPreviousPeriodIncome = dayOfMonth > 15 ? previousPeriodIncome : 0;
    const actualPreviousPeriodIsr = dayOfMonth > 15 ? previousPeriodIsr : 0;
    const totalMonthlyTaxableIncome = periodTaxableIncome + actualPreviousPeriodIncome;

    const bracket = ISR_MONTHLY_TABLE_2026.find(b => totalMonthlyTaxableIncome >= b.lowerLimit && totalMonthlyTaxableIncome <= b.upperLimit);
    const surplus = bracket ? totalMonthlyTaxableIncome - bracket.lowerLimit : 0;
    const marginalTax = bracket ? surplus * bracket.percentage : 0;
    const totalMonthlyIsrBeforeSubsidy = bracket ? marginalTax + bracket.fixedQuota : 0;
    
    let subsidy = 0;
    if (totalMonthlyTaxableIncome <= SUBSIDY_2026_INCOME_LIMIT) {
        const percent = isJan2026 ? SUBSIDY_2026_PERCENT_JAN : SUBSIDY_2026_PERCENT_FEB_DEC;
        subsidy = effectiveUma * percent * MONTHLY_FACTOR;
    }

    const totalMonthlyIsr = Math.max(0, totalMonthlyIsrBeforeSubsidy - subsidy);
    const isrFiniquito = parseFloat(Math.max(0, totalMonthlyIsr - actualPreviousPeriodIsr).toFixed(2));

    let isrLiquidacion = 0;
    let isrDetails: IsrCalculationDetails;
    
    if (calculationType === 'liquidación' && indemnizacion) {
        const severanceTotalIncome = indemnizacion.indemnizacion90dias + indemnizacion.veinteDiasPorAnio + indemnizacion.primaAntiguedad + indemnizacion.primaAntiguedadProporcional;
        const severanceExempt = 90 * effectiveUma * seniorityYears;
        const severanceTaxable = Math.max(0, severanceTotalIncome - severanceExempt);
        const lastMonthlyOrdinaryIncome = (dailySalary * 30);
        const isrInfo = calculateIsrOnAmount(lastMonthlyOrdinaryIncome, effectiveUma, terminationDate);
        const lastMonthEffectiveRate = parseFloat((lastMonthlyOrdinaryIncome > 0 ? isrInfo.isr / lastMonthlyOrdinaryIncome : 0).toFixed(4));
        isrLiquidacion = parseFloat((severanceTaxable * lastMonthEffectiveRate).toFixed(2));
        
        isrDetails = {
            periodTaxableIncome, aguinaldoTaxable: percepciones.aguinaldoTaxable, vacationPremiumTaxable: percepciones.vacationPremiumTaxable, vacationAntTaxable: percepciones.vacationAntTaxable, previousPeriodTaxableIncome: actualPreviousPeriodIncome, previousPeriodIsr: actualPreviousPeriodIsr,
            totalMonthlyTaxableIncome, lowerLimit: bracket?.lowerLimit ?? 0, surplus, percentage: bracket?.percentage ?? 0, marginalTax, fixedQuota: bracket?.fixedQuota ?? 0, totalMonthlyIsrBeforeSubsidy, subsidy, totalMonthlyIsr, isrToWithholdOrdinary: isrFiniquito,
            severanceTotalIncome, severanceExempt, severanceTaxable,
            lastMonthlyOrdinaryIncome, isrForLastMonthlyOrdinaryIncome: isrInfo.isr, lastMonthEffectiveRate, isrOnSeverance: isrLiquidacion,
            isrToWithhold: isrFiniquito + isrLiquidacion,
        };
    } else {
        isrDetails = {
            periodTaxableIncome, aguinaldoTaxable: percepciones.aguinaldoTaxable, vacationPremiumTaxable: percepciones.vacationPremiumTaxable, vacationAntTaxable: percepciones.vacationAntTaxable, previousPeriodTaxableIncome: actualPreviousPeriodIncome, previousPeriodIsr: actualPreviousPeriodIsr,
            totalMonthlyTaxableIncome, lowerLimit: bracket?.lowerLimit ?? 0, surplus, percentage: bracket?.percentage ?? 0, marginalTax, fixedQuota: bracket?.fixedQuota ?? 0, totalMonthlyIsrBeforeSubsidy, subsidy, totalMonthlyIsr, isrToWithholdOrdinary: isrFiniquito,
            isrToWithhold: isrFiniquito,
        };
    }
    
    const totalDeductions = isrFiniquito + isrLiquidacion + imss;
    const netTotal = totalPercepciones - totalDeductions;

    return {
        employee, percepciones, indemnizacion, deducciones: { isrFiniquito, isrLiquidacion, imss, total: parseFloat(totalDeductions.toFixed(2)), isrDetails, imssDetails }, netTotal, sdi, 
        dailyAguinaldo, dailyVacationPremium, seniorityYears, calculationType
    };
}
