
export interface EmployeeData {
  id: string;
  terminationDate: Date;
  hireDate: Date;
  fullName: string;
  rfc: string;
  position: string;
  location: string;
  dailySalary: number;
  vacAnt: number;
  overtime: number; // Amount from column "Horas Extra"
}

export interface IsrCalculationDetails {
    periodTaxableIncome: number;
    aguinaldoTaxable: number;
    vacationPremiumTaxable: number;
    vacationAntTaxable: number;
    previousPeriodTaxableIncome: number;
    previousPeriodIsr: number;
    totalMonthlyTaxableIncome: number;
    lowerLimit: number;
    surplus: number;
    percentage: number;
    marginalTax: number;
    fixedQuota: number;
    totalMonthlyIsrBeforeSubsidy: number;
    subsidy: number;
    totalMonthlyIsr: number;
    isrToWithholdOrdinary: number;
    isrToWithhold: number;
    // Severance specific
    severanceTotalIncome?: number;
    severanceExempt?: number;
    severanceTaxable?: number;
    lastMonthlyOrdinaryIncome?: number;
    isrForLastMonthlyOrdinaryIncome?: number;
    lastMonthEffectiveRate?: number;
    isrOnSeverance?: number;
}

export interface ImssCalculationDetails {
    sbc: number;
    salaryDays: number;
    uma: number;
    excedenteSbc: number;
    illnessAndMaternity: number;
    disabilityAndLife: number;
    unemploymentAndOldAge: number;
    prestacionesEnDinero: number;
    gastosMedicosPensionados: number;
}

export interface Deducciones {
    isrFiniquito: number;
    isrLiquidacion: number;
    imss: number;
    total: number;
    isrDetails: IsrCalculationDetails;
    imssDetails: ImssCalculationDetails;
}

export interface Percepciones {
    salaryDays: number;
    salaryAmount: number;
    aguinaldoDays: number;
    aguinaldoAmount: number;
    vacationDays: number;
    vacationAmount: number;
    vacationPremiumAmount: number;
    vacationAntDays: number;
    vacationAntAmount: number;
    additionalPerceptionAmount: number;
    overtimeAmount: number;
    overtimeTaxable: number;
    overtimeExempt: number;
    total: number;
    // For tooltip/details
    daysWorkedInYear: number;
    daysSinceLastAnniversary: number;
    daysInYear: number;
    vacationDaysPerYear: number;
    proportionalVacationDays: number;
    proportionalAguinaldoDays: number;
    // Tax breakdown
    salaryTaxable: number;
    salaryExempt: number;
    vacationTaxable: number;
    vacationExempt: number;
    aguinaldoTaxable: number;
    aguinaldoExempt: number;
    vacationPremiumTaxable: number;
    vacationPremiumExempt: number;
    vacationAntTaxable: number;
    vacationAntExempt: number;
}

export interface IndemnizacionDetails {
    indemnizacion90dias: number;
    veinteDiasPorAnio: number;
    primaAntiguedad: number;
    primaAntiguedadProporcional: number;
    horasExtrasDobles: number;
    horasExtrasTriples: number;
    total: number;
    primaAntiguedadSalaryBase: number;
}

export interface FiniquitoCalculation {
    employee: EmployeeData;
    percepciones: Percepciones;
    indemnizacion: IndemnizacionDetails | undefined;
    deducciones: Deducciones;
    netTotal: number;
    sdi: number;
    dailyAguinaldo: number;
    dailyVacationPremium: number;
    seniorityYears: number;
    calculationType: 'finiquito' | 'liquidación';
}

export interface IndemnizacionSettings {
    include90Days: boolean;
    include20Days: boolean;
    includeSeniorityPremium: boolean;
    includeProportionalSeniorityPremium: boolean;
}

export interface IndemnizacionOverrides {
    indemnizacion90dias?: number;
    veinteDiasPorAnio?: number;
    primaAntiguedad?: number;
    primaAntiguedadProporcional?: number;
}
