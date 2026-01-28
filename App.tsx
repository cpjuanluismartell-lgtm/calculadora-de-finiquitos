
import React, { useState, useCallback, useEffect } from 'react';
import { FiniquitoCalculation, EmployeeData, IndemnizacionSettings, IndemnizacionOverrides, IndemnizacionDetails } from './types';
import { parseEmployeeData, calculateFiniquito } from './services/calculationService';
import { FiniquitoDetail } from './components/FiniquitoDetail';
import { DEFAULT_UMA, DEFAULT_SALARIO_MINIMO } from './constants';

type CalculationType = 'finiquito' | 'liquidación';

const App: React.FC = () => {
    const [calculationType, setCalculationType] = useState<CalculationType>('finiquito');
    const [inputText, setInputText] = useState('');
    const [employees, setEmployees] = useState<EmployeeData[]>([]);
    const [finiquitos, setFiniquitos] = useState<FiniquitoCalculation[]>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [uma, setUma] = useState<number>(() => {
        const saved = localStorage.getItem('appConfig_uma');
        return saved ? parseFloat(saved) : DEFAULT_UMA;
    });
    const [salarioMinimo, setSalarioMinimo] = useState<number>(() => {
        const saved = localStorage.getItem('appConfig_salarioMinimo');
        return saved ? saved : DEFAULT_SALARIO_MINIMO;
    });

    const [tempUma, setTempUma] = useState<string>(() => {
        const saved = localStorage.getItem('appConfig_uma');
        return saved ? saved : String(DEFAULT_UMA);
    });
    const [tempSalarioMinimo, setTempSalarioMinimo] = useState<string>(() => {
        const saved = localStorage.getItem('appConfig_salarioMinimo');
        return saved ? saved : String(DEFAULT_SALARIO_MINIMO);
    });

    const [adjustmentIncome, setAdjustmentIncome] = useState('');
    const [adjustmentIsr, setAdjustmentIsr] = useState('');
    const [horasExtrasDobles, setHorasExtrasDobles] = useState('');
    const [horasExtrasTriples, setHorasExtrasTriples] = useState('');
    const [salaryDaysOverride, setSalaryDaysOverride] = useState('');
    const [additionalPerception, setAdditionalPerception] = useState('');
    
    const defaultIndemnizacionSettings: IndemnizacionSettings = {
        include90Days: true,
        include20Days: true,
        includeSeniorityPremium: true,
        includeProportionalSeniorityPremium: true
    };
    const [indemnizacionSettings, setIndemnizacionSettings] = useState<IndemnizacionSettings>(defaultIndemnizacionSettings);

    const initialIndemnizacionOverrides = {
        indemnizacion90dias: '',
        veinteDiasPorAnio: '',
        primaAntiguedad: '',
        primaAntiguedadProporcional: '',
    };
    const [indemnizacionOverrides, setIndemnizacionOverrides] = useState(initialIndemnizacionOverrides);

    const handleIndemnizacionOverrideChange = (key: keyof IndemnizacionDetails, value: string) => {
        const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1');
        setIndemnizacionOverrides(prev => ({
            ...prev,
            [key]: sanitizedValue,
        }));
    };

    const handleCalculate = useCallback(() => {
        setIsLoading(true);
        setError(null);
        setFiniquitos([]);
        setSelectedEmployeeId(null);
        
        setTimeout(() => {
            try {
                const parsedEmployees = parseEmployeeData(inputText);
                if (parsedEmployees.length === 0) {
                    throw new Error("No se pudieron encontrar datos de empleados válidos. Revisa el formato.");
                }
                setEmployees(parsedEmployees);
                const results = parsedEmployees.map(emp => calculateFiniquito(emp, uma, salarioMinimo, calculationType));
                setFiniquitos(results);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Ocurrió un error inesperado.");
            } finally {
                setIsLoading(false);
            }
        }, 500);
    }, [inputText, uma, salarioMinimo, calculationType]);
    
    const recalculateSelected = useCallback(() => {
        if (!selectedEmployeeId) return;
        const employeeData = employees.find(e => e.id === selectedEmployeeId);
        if (!employeeData) return;

        try {
            const incomeNum = parseFloat(adjustmentIncome) || 0;
            const isrNum = parseFloat(adjustmentIsr) || 0;
            const heDoblesNum = parseFloat(horasExtrasDobles) || 0;
            const heTriplesNum = parseFloat(horasExtrasTriples) || 0;
            const salaryDaysOverrideNum = parseFloat(salaryDaysOverride);
            const additionalPerceptionNum = parseFloat(additionalPerception) || 0;

            // Explicitly cast Object.entries to [string, string][] to avoid unknown errors during reduce
            const overridesForCalc: IndemnizacionOverrides = (Object.entries(indemnizacionOverrides) as [string, string][]).reduce((acc, [key, value]) => {
                if (value !== '') {
                    const num = parseFloat(value);
                    if (!isNaN(num)) {
                        acc[key as keyof IndemnizacionOverrides] = num;
                    }
                }
                return acc;
            }, {} as IndemnizacionOverrides);

            const updatedFiniquito = calculateFiniquito(
                employeeData, uma, salarioMinimo, calculationType, 
                incomeNum, isrNum, heDoblesNum, heTriplesNum, salaryDaysOverrideNum, additionalPerceptionNum,
                indemnizacionSettings,
                overridesForCalc
            );

            setFiniquitos(currentFiniquitos =>
                currentFiniquitos.map(f =>
                    f.employee.id === selectedEmployeeId ? updatedFiniquito : f
                )
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : "Ocurrió un error inesperado al recalcular.");
        }
    }, [adjustmentIncome, adjustmentIsr, horasExtrasDobles, horasExtrasTriples, salaryDaysOverride, additionalPerception, indemnizacionSettings, selectedEmployeeId, employees, uma, salarioMinimo, calculationType, indemnizacionOverrides]);

    useEffect(() => {
        recalculateSelected();
    }, [adjustmentIncome, adjustmentIsr, horasExtrasDobles, horasExtrasTriples, salaryDaysOverride, additionalPerception, indemnizacionSettings, indemnizacionOverrides, recalculateSelected]);

    useEffect(() => {
        if (employees.length > 0) {
            try {
                 const results = employees.map(emp => {
                    const isSelected = emp.id === selectedEmployeeId;
                    const incomeNum = isSelected ? (parseFloat(adjustmentIncome) || 0) : 0;
                    const isrNum = isSelected ? (parseFloat(adjustmentIsr) || 0) : 0;
                    const heDoblesNum = isSelected ? (parseFloat(horasExtrasDobles) || 0) : 0;
                    const heTriplesNum = isSelected ? (parseFloat(horasExtrasTriples) || 0) : 0;
                    const salaryDaysOverrideNum = isSelected ? parseFloat(salaryDaysOverride) : NaN;
                    const additionalPerceptionNum = isSelected ? (parseFloat(additionalPerception) || 0) : 0;
                    const currentSettings = isSelected ? indemnizacionSettings : defaultIndemnizacionSettings;
                    
                    // Explicitly cast Object.entries to [string, string][] to avoid unknown errors during reduce
                    const overridesForCalc: IndemnizacionOverrides = isSelected ? (Object.entries(indemnizacionOverrides) as [string, string][]).reduce((acc, [key, value]) => {
                        if (value !== '') {
                            const num = parseFloat(value);
                            if (!isNaN(num)) {
                                acc[key as keyof IndemnizacionOverrides] = num;
                            }
                        }
                        return acc;
                    }, {} as IndemnizacionOverrides) : {};

                    return calculateFiniquito(emp, uma, salarioMinimo, calculationType, incomeNum, isrNum, heDoblesNum, heTriplesNum, salaryDaysOverrideNum, additionalPerceptionNum, currentSettings, overridesForCalc);
                });
                setFiniquitos(results);
            } catch (e) {
                setError(e instanceof Error ? e.message : "Ocurrió un error inesperado al recalcular todos los empleados.");
            }
        }
    }, [uma, salarioMinimo, calculationType, employees, selectedEmployeeId, adjustmentIncome, adjustmentIsr, horasExtrasDobles, horasExtrasTriples, salaryDaysOverride, additionalPerception, indemnizacionSettings, indemnizacionOverrides]);


    const handleSaveConfig = () => {
        const newUma = parseFloat(tempUma) || DEFAULT_UMA;
        const newSalarioMinimo = parseFloat(tempSalarioMinimo) || DEFAULT_SALARIO_MINIMO;
        localStorage.setItem('appConfig_uma', String(newUma));
        localStorage.setItem('appConfig_salarioMinimo', String(newSalarioMinimo));
        setUma(newUma);
        setSalarioMinimo(newSalarioMinimo);
    };

    const hasConfigChanges = tempUma !== String(uma) || tempSalarioMinimo !== String(salarioMinimo);
    const selectedFiniquito = finiquitos.find(f => f.employee.id === selectedEmployeeId);
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className='flex items-center gap-3'>
                        <i className="fa-solid fa-calculator text-3xl text-teal-600"></i>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">Calculadora de Finiquito y Liquidación</h1>
                            <p className="text-sm text-slate-500">Basado en LFT, LISR y LSS de México</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-8">
                    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                         <h2 className="text-xl font-semibold mb-4 text-slate-800">1. Elige el tipo de cálculo</h2>
                         <div className="flex rounded-md shadow-sm">
                            <button onClick={() => setCalculationType('finiquito')} className={`flex-1 px-4 py-3 text-sm font-medium border ${calculationType === 'finiquito' ? 'bg-teal-600 text-white border-teal-600 z-10' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'} rounded-l-md`}>
                                <i className="fa-solid fa-handshake mr-2"></i>Finiquito
                            </button>
                            <button onClick={() => setCalculationType('liquidación')} className={`flex-1 px-4 py-3 text-sm font-medium border ${calculationType === 'liquidación' ? 'bg-teal-600 text-white border-teal-600 z-10' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'} rounded-r-md -ml-px`}>
                               <i className="fa-solid fa-file-signature mr-2"></i>Liquidación
                            </button>
                         </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                        <h2 className="text-xl font-semibold mb-4 text-slate-800">2. Pega los datos de tus empleados</h2>
                        <p className="text-sm text-slate-500 mb-4">Pega la tabla desde Excel. Columnas requeridas: <code className="bg-slate-100 p-1 rounded-md text-xs">A: Código, B: Alta, C: Baja, G: Nombre, H: SD, I: RFC, J: Puesto, K: Ubicación, S: VAC ANT</code></p>
                        <textarea
                            className="w-full h-64 p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 font-mono text-sm"
                            placeholder="Pega tu tabla aquí..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                        />
                        <button onClick={handleCalculate} disabled={!inputText || isLoading} className="w-full mt-4 bg-teal-600 text-white font-bold py-3 px-4 rounded-md hover:bg-teal-700 disabled:bg-slate-400 flex items-center justify-center">
                            {isLoading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Calculando...</>) 
                            : (<><i className="fa-solid fa-play mr-2"></i> Calcular</>)}
                        </button>
                        {error && <p className="text-red-600 bg-red-100 p-3 rounded-md mt-4 text-sm">{error}</p>}
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                        <h2 className="text-xl font-semibold mb-4 text-slate-800">Configuración</h2>
                         <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                             <div>
                                <label htmlFor="uma" className="block text-sm font-medium text-slate-600">UMA</label>
                                <input type="number" id="uma" value={tempUma} onChange={(e) => setTempUma(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 rounded-md text-sm" />
                            </div>
                            <div>
                                <label htmlFor="salarioMinimo" className="block text-sm font-medium text-slate-600">Salario Mínimo General</label>
                                <input type="number" id="salarioMinimo" value={tempSalarioMinimo} onChange={(e) => setTempSalarioMinimo(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 rounded-md text-sm" />
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button onClick={handleSaveConfig} disabled={!hasConfigChanges} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-slate-400">
                                <i className="fa-solid fa-save mr-2"></i>Guardar Cambios
                            </button>
                        </div>
                    </div>
                
                    <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200">
                        <h2 className="text-xl font-semibold mb-4 text-slate-800">3. Resultados</h2>
                        {finiquitos.length > 0 ? (
                            <div className="overflow-auto max-h-[600px]"><table className="w-full text-left text-sm"><thead className="bg-slate-100 sticky top-0"><tr><th className="p-3 font-semibold">Empleado</th><th className="p-3 font-semibold text-right">Neto a Pagar</th></tr></thead><tbody className="divide-y divide-slate-200">{finiquitos.map(f => (<tr key={f.employee.id} onClick={() => { setSelectedEmployeeId(f.employee.id); setAdjustmentIncome(''); setAdjustmentIsr(''); setHorasExtrasDobles(''); setHorasExtrasTriples(''); setAdditionalPerception(''); setSalaryDaysOverride(String(f.percepciones.salaryDays)); setIndemnizacionSettings(defaultIndemnizacionSettings); setIndemnizacionOverrides(initialIndemnizacionOverrides); }} className={`cursor-pointer hover:bg-teal-50 ${selectedEmployeeId === f.employee.id ? 'bg-teal-100' : ''}`}><td className="p-3"><div className="font-medium text-slate-900">{f.employee.fullName}</div><div className="text-slate-500">{f.employee.id} - {f.employee.position}</div></td><td className="p-3 text-right font-semibold text-teal-700">{formatCurrency(f.netTotal)}</td></tr>))}</tbody></table></div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 bg-slate-50 p-6 rounded-md"><i className="fa-solid fa-file-invoice-dollar text-4xl mb-3"></i><p>Los resultados aparecerán aquí.</p></div>
                        )}
                    </div>
                </div>

                {selectedFiniquito && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-semibold mb-2 text-slate-800 text-center uppercase">Detalle del Cálculo: {selectedFiniquito.employee.fullName}</h2>
                        <div className="max-w-4xl mx-auto my-4 p-6 border border-slate-200 rounded-lg bg-white shadow-md">
                            <h3 className="text-md font-semibold text-slate-700 mb-2">Ajustes para este cálculo</h3>
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                                <div>
                                    <p className="text-sm font-medium text-slate-600 mb-1">Días de Sueldo a Pagar</p>
                                    <input type="number" value={salaryDaysOverride} onChange={(e) => setSalaryDaysOverride(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-600 mb-1">Percepción Adicional Gravada</p>
                                    <input type="number" value={additionalPerception} onChange={(e) => setAdditionalPerception(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-600 mb-1">Ajuste de ISR Mensual</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input type="number" value={adjustmentIncome} onChange={(e) => setAdjustmentIncome(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="Ingreso" />
                                        <input type="number" value={adjustmentIsr} onChange={(e) => setAdjustmentIsr(e.target.value)} className="w-full p-2 border border-slate-300 rounded-md text-sm" placeholder="ISR" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <FiniquitoDetail 
                            data={selectedFiniquito} 
                            indemnizacionSettings={indemnizacionSettings}
                            onSettingsChange={setIndemnizacionSettings}
                            indemnizacionOverrides={indemnizacionOverrides}
                            onIndemnizacionOverrideChange={handleIndemnizacionOverrideChange}
                        />
                    </div>
                )}
            </main>
        </div>
    );
};

export default App;
