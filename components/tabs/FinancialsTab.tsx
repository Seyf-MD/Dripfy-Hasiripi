import * as React from 'react';
import { FinancialRecord, FinanceForecastData, ForecastInsightSeverity, ForecastScenario, InvoiceDocument, InvoicePreviewReference } from '../../types';
import { ArrowUp, ArrowDown, PlusCircle, TrendingUp, TrendingDown, AlertTriangle, Activity, Sparkles } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import ForecastChart from '../finance/ForecastChart';
import { fetchFinanceForecast } from '../../services/forecasting/client';
import { fetchInvoices, fetchInvoicePreview } from '../../services/invoices/client';
import InvoiceStatusPanel from '../finance/InvoiceStatusPanel';
import InvoicePreviewPanel from '../finance/InvoicePreviewPanel';

interface FinancialsTabProps {
    data: FinancialRecord[];
    canEdit: boolean;
    onOpenModal: (item: FinancialRecord | Partial<FinancialRecord>, type: 'financials', isNew?: boolean) => void;
    onUpdate: (itemId: string, field: keyof FinancialRecord, value: any) => void;
    dateFilter: 'week' | 'month' | null;
}

type SortKey = keyof FinancialRecord;
type SortDirection = 'ascending' | 'descending';

const getStatusColor = (status: string) => {
    const colors = { 'Paid': 'bg-green-500/20 text-green-500 dark:text-green-300', 'Pending': 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-300', 'Overdue': 'bg-red-500/20 text-red-500 dark:text-red-300' };
    return colors[status as keyof typeof colors] || 'bg-neutral-700';
}

const severityStyles: Record<ForecastInsightSeverity, string> = {
    positive: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    critical: 'bg-red-500/10 text-red-600 dark:text-red-400',
    info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
};

const normaliseSeverity = (severity?: string): ForecastInsightSeverity => {
    if (!severity) return 'info';
    if (severity === 'high' || severity === 'critical') return 'critical';
    if (severity === 'warning') return 'warning';
    if (severity === 'positive') return 'positive';
    return 'info';
};

const FinancialsTab: React.FC<FinancialsTabProps> = ({ data, canEdit, onOpenModal, onUpdate, dateFilter }) => {
    const { t } = useLanguage();
    const [sortConfig, setSortConfig] = React.useState<{ key: SortKey; direction: SortDirection } | null>({ key: 'dueDate', direction: 'ascending' });
    const [editingCell, setEditingCell] = React.useState<{ recordId: string; field: keyof FinancialRecord } | null>(null);
    const [activeSection, setActiveSection] = React.useState<'records' | 'forecast'>('records');
    const [forecastScenario, setForecastScenario] = React.useState<string>('optimistic');
    const [forecastData, setForecastData] = React.useState<FinanceForecastData | null>(null);
    const [forecastLoading, setForecastLoading] = React.useState(false);
    const [forecastError, setForecastError] = React.useState<string | null>(null);
    const [invoiceList, setInvoiceList] = React.useState<InvoiceDocument[]>([]);
    const [invoiceLoading, setInvoiceLoading] = React.useState(false);
    const [invoiceError, setInvoiceError] = React.useState<string | null>(null);
    const [selectedInvoiceId, setSelectedInvoiceId] = React.useState<string | null>(null);
    const [previewRef, setPreviewRef] = React.useState<InvoicePreviewReference | null>(null);
    const [previewLoading, setPreviewLoading] = React.useState(false);
    const [previewError, setPreviewError] = React.useState<string | null>(null);

    const formatCurrency = React.useCallback((value: number) => {
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
    }, []);

    const formatDate = React.useCallback((value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    }, []);

    const loadForecast = React.useCallback((signal?: AbortSignal) => {
        setForecastLoading(true);
        fetchFinanceForecast({ scenario: forecastScenario, signal })
            .then((data) => {
                setForecastData(data);
                setForecastError(null);
            })
            .catch((error) => {
                if (error?.name === 'AbortError') {
                    return;
                }
                const message = error instanceof Error ? error.message : 'Tahmin verileri alınamadı.';
                setForecastError(message);
            })
            .finally(() => {
                setForecastLoading(false);
            });
    }, [forecastScenario]);

    React.useEffect(() => {
        const controller = new AbortController();
        loadForecast(controller.signal);
        return () => controller.abort();
    }, [loadForecast]);

    React.useEffect(() => {
        const controller = new AbortController();
        setInvoiceLoading(true);
        fetchInvoices(controller.signal)
            .then((items) => {
                setInvoiceList(items);
                setInvoiceError(null);
                setSelectedInvoiceId((current) => {
                    if (current && items.some(item => item.id === current)) {
                        return current;
                    }
                    return items[0]?.id ?? null;
                });
            })
            .catch((error) => {
                if ((error as any)?.name === 'AbortError') {
                    return;
                }
                const message = error instanceof Error ? error.message : 'Faturalar alınamadı.';
                setInvoiceError(message);
                setInvoiceList([]);
                setSelectedInvoiceId(null);
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setInvoiceLoading(false);
                }
            });
        return () => controller.abort();
    }, []);

    React.useEffect(() => {
        if (!selectedInvoiceId) {
            setPreviewRef(null);
            return;
        }
        const controller = new AbortController();
        setPreviewLoading(true);
        setPreviewError(null);
        fetchInvoicePreview(selectedInvoiceId, controller.signal)
            .then((ref) => {
                setPreviewRef(ref);
            })
            .catch((error) => {
                if ((error as any)?.name === 'AbortError') {
                    return;
                }
                const message = error instanceof Error ? error.message : 'Önizleme alınamadı.';
                setPreviewError(message);
                setPreviewRef(null);
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setPreviewLoading(false);
                }
            });
        return () => controller.abort();
    }, [selectedInvoiceId]);

    const selectedInvoice = React.useMemo(() => {
        if (!selectedInvoiceId) {
            return null;
        }
        return invoiceList.find((item) => item.id === selectedInvoiceId) || null;
    }, [invoiceList, selectedInvoiceId]);

    const handleSelectInvoice = React.useCallback((invoiceId: string) => {
        setSelectedInvoiceId(invoiceId);
    }, []);

    const handleRefreshPreview = React.useCallback(() => {
        if (!selectedInvoiceId) {
            return;
        }
        setPreviewLoading(true);
        setPreviewError(null);
        fetchInvoicePreview(selectedInvoiceId)
            .then((ref) => {
                setPreviewRef(ref);
            })
            .catch((error) => {
                const message = error instanceof Error ? error.message : 'Önizleme alınamadı.';
                setPreviewError(message);
                setPreviewRef(null);
            })
            .finally(() => {
                setPreviewLoading(false);
            });
    }, [selectedInvoiceId]);

    const activeScenarioData = React.useMemo(() => {
        if (!forecastData) return null;
        return forecastData.scenarios?.[forecastScenario] || forecastData.scenario;
    }, [forecastData, forecastScenario]);

    const comparisonScenarios = React.useMemo(() => {
        const scenarios = forecastData?.scenarios;
        if (!scenarios || !activeScenarioData) return [];
        return (Object.values(scenarios) as ForecastScenario[]).filter((item) => item.name !== activeScenarioData.name);
    }, [forecastData, activeScenarioData]);

    const anomalies = forecastData?.anomalies ?? [];
    const recommendations = forecastData?.recommendations ?? [];

    const handleScenarioChange = React.useCallback((scenarioName: string) => {
        setForecastScenario(scenarioName);
    }, []);

    const handleRetryForecast = React.useCallback(() => {
        loadForecast();
    }, [loadForecast]);

    const filteredAndSortedData = React.useMemo(() => {
        let filteredData = [...data];

        if (dateFilter) {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            if (dateFilter === 'week') {
                const endOfWeek = new Date(today);
                const day = today.getDay();
                endOfWeek.setDate(today.getDate() + (day === 0 ? 0 : 7 - day)); // End of Sunday
                filteredData = filteredData.filter(item => {
                    const dueDate = new Date(item.dueDate);
                    return dueDate >= today && dueDate <= endOfWeek;
                });
            } else if (dateFilter === 'month') {
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                 filteredData = filteredData.filter(item => {
                    const dueDate = new Date(item.dueDate);
                    return dueDate >= today && dueDate <= endOfMonth;
                });
            }
        }

        if (sortConfig !== null) {
            filteredData.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                let comparison = 0;
                
                if (sortConfig.key === 'amount') {
                    comparison = (aValue as number) - (bValue as number);
                } else if (sortConfig.key === 'dueDate') {
                    comparison = new Date(aValue as string).getTime() - new Date(bValue as string).getTime();
                } else {
                    comparison = String(aValue).localeCompare(String(bValue));
                }

                return sortConfig.direction === 'ascending' ? comparison : -comparison;
            });
        }
        return filteredData;
    }, [data, sortConfig, dateFilter]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortKey) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />;
        return sortConfig.direction === 'ascending'
            ? <ArrowUp size={14} className="text-[var(--drip-primary)]"/>
            : <ArrowDown size={14} className="text-[var(--drip-primary)]"/>;
    };

    const headers: { key: SortKey; label: string }[] = [
        { key: 'description', label: t('financials.description') },
        { key: 'amount', label: t('financials.amount') },
        { key: 'status', label: t('financials.status') },
        { key: 'dueDate', label: t('financials.dueDate') },
        { key: 'type', label: t('financials.type') },
    ];
    
    const handleAddNew = () => {
        onOpenModal({ description: '', amount: 0, status: 'Pending', dueDate: new Date().toISOString().split('T')[0], type: 'Outgoing' }, 'financials', true);
    }
    
    const handleCellClick = (recordId: string, field: keyof FinancialRecord) => {
        if (canEdit) {
            setEditingCell({ recordId, field });
        }
    };

    const handleUpdate = (recordId: string, field: keyof FinancialRecord, value: any) => {
        let finalValue = value;
        if (field === 'amount') {
            finalValue = Number(value);
        }
        onUpdate(recordId, field, finalValue);
        setEditingCell(null);
    };

    const inputClasses = "w-full bg-slate-100 dark:bg-neutral-700 border-transparent focus:bg-slate-200 dark:focus:bg-neutral-600 rounded p-1.5 text-sm focus:ring-2 focus:ring-[var(--drip-primary)] focus:outline-none focus:border-[var(--drip-primary)] text-[var(--drip-text)] dark:text-white";

    const recordsContent = (
        <div className="space-y-6">
            <div className="overflow-x-auto bg-white dark:bg-neutral-800/50 rounded-lg border border-slate-200 dark:border-neutral-700">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-neutral-700">
                    <thead className="bg-slate-50 dark:bg-neutral-800">
                        <tr>
                            {headers.map(header => (
                                <th key={header.key} scope="col" className="py-3.5 px-3 text-left text-sm font-semibold text-neutral-800 dark:text-white first:pl-4 first:sm:pl-6">
                                    <button onClick={() => requestSort(header.key)} className="flex items-center gap-2 group text-neutral-800 dark:text-white hover:text-[var(--drip-primary)] transition-colors">
                                        {header.label} {getSortIcon(header.key)}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-neutral-800 bg-white dark:bg-neutral-900/50">
                        {filteredAndSortedData.map((record) => (
                            <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/70 group">
                                <td onClick={() => onOpenModal(record, 'financials')} className="w-1/3 py-4 pl-4 pr-3 text-sm font-medium text-[var(--drip-text)] dark:text-white sm:pl-6 cursor-pointer">{record.description}</td>

                                <td onClick={() => handleCellClick(record.id, 'amount')} className="whitespace-nowrap px-3 py-2 text-sm text-[var(--drip-muted)] dark:text-neutral-400 cursor-pointer">
                                    {editingCell?.recordId === record.id && editingCell?.field === 'amount' ? (
                                        <input
                                            type="number"
                                            defaultValue={record.amount}
                                            onBlur={(e) => handleUpdate(record.id, 'amount', e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            autoFocus
                                            className={inputClasses}
                                        />
                                    ) : (
                                        <span className={record.amount < 0 ? 'text-red-500 dark:text-red-400' : 'text-[var(--drip-primary)] dark:text-[var(--drip-primary)]'}>
                                            {formatCurrency(record.amount)}
                                        </span>
                                    )}
                                </td>

                                <td onClick={() => handleCellClick(record.id, 'status')} className="whitespace-nowrap px-3 py-2 text-sm cursor-pointer">
                                    {editingCell?.recordId === record.id && editingCell?.field === 'status' ? (
                                        <select
                                            defaultValue={record.status}
                                            onChange={(e) => handleUpdate(record.id, 'status', e.target.value)}
                                            onBlur={() => setEditingCell(null)}
                                            autoFocus
                                            className={inputClasses}
                                        >
                                            <option value="Paid">{t('status.paid')}</option>
                                            <option value="Pending">{t('status.pending')}</option>
                                            <option value="Overdue">{t('status.overdue')}</option>
                                        </select>
                                    ) : (
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>{t(`status.${record.status.toLowerCase()}`)}</span>
                                    )}
                                </td>

                                <td onClick={() => handleCellClick(record.id, 'dueDate')} className="whitespace-nowrap px-3 py-2 text-sm text-[var(--drip-muted)] dark:text-neutral-400 cursor-pointer">
                                    {editingCell?.recordId === record.id && editingCell?.field === 'dueDate' ? (
                                        <input
                                            type="date"
                                            defaultValue={record.dueDate}
                                            onBlur={(e) => handleUpdate(record.id, 'dueDate', e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                                            autoFocus
                                            className={inputClasses}
                                        />
                                    ) : (
                                        new Date(record.dueDate).toLocaleDateString()
                                    )}
                                </td>

                                <td className="whitespace-nowrap px-3 py-2 text-sm text-[var(--drip-muted)] dark:text-neutral-400">
                                    {record.type === 'Incoming'
                                        ? <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400"><TrendingUp size={16} /> {t('financials.incoming')}</span>
                                        : <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400"><TrendingDown size={16} /> {t('financials.outgoing')}</span>
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="space-y-3">
                    {invoiceError && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 px-4 py-3 text-sm">
                            {invoiceError}
                        </div>
                    )}
                    {invoiceLoading && invoiceList.length === 0 ? (
                        <div className="bg-white dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-700 rounded-xl p-6 text-sm text-slate-500 dark:text-neutral-400">
                            Fatura verileri yükleniyor...
                        </div>
                    ) : (
                        <InvoiceStatusPanel
                            invoices={invoiceList}
                            selectedInvoiceId={selectedInvoiceId}
                            onSelect={handleSelectInvoice}
                        />
                    )}
                </div>
                <div className="space-y-3">
                    {previewError && (
                        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-700 px-4 py-3 text-sm">
                            {previewError}
                        </div>
                    )}
                    <InvoicePreviewPanel
                        invoice={selectedInvoice}
                        preview={previewRef}
                        loading={previewLoading}
                        onRefresh={handleRefreshPreview}
                    />
                </div>
            </div>
        </div>
    );
    const forecastContent = (
        <div className="space-y-6">
            {forecastLoading && forecastData && (
                <div className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/50 px-4 py-2 text-sm text-[var(--drip-muted)] dark:text-neutral-300">
                    {t('financials.forecastRefreshing')}
                </div>
            )}
            {forecastLoading && !forecastData ? (
                <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-8 animate-pulse">
                    <div className="h-6 w-48 bg-slate-200 dark:bg-neutral-700 rounded mb-4"></div>
                    <div className="h-48 bg-slate-100 dark:bg-neutral-800 rounded"></div>
                </div>
            ) : forecastError ? (
                <div className="rounded-xl border border-red-200 dark:border-red-500/40 bg-red-50/70 dark:bg-red-950/40 p-6">
                    <div className="flex items-start gap-3 text-red-700 dark:text-red-200">
                        <AlertTriangle size={20} className="mt-0.5" />
                        <div>
                            <p className="font-semibold text-sm">{t('financials.forecastError')}</p>
                            <p className="text-sm mt-1 opacity-80">{forecastError}</p>
                            <button onClick={handleRetryForecast} className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors">
                                {t('financials.retryForecast')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : forecastData && activeScenarioData ? (
                <>
                    <ForecastChart
                        history={forecastData.history}
                        baseline={forecastData.baseline}
                        activeScenario={activeScenarioData}
                        comparisonScenarios={comparisonScenarios}
                        onScenarioChange={handleScenarioChange}
                    />
                    <div className="grid gap-4 lg:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-[var(--drip-text)] dark:text-white">
                                <Activity size={18} />
                                <h4 className="font-semibold text-sm">{t('financials.anomalyTracker')}</h4>
                            </div>
                            <div className="mt-4 space-y-3">
                                {anomalies.length === 0 && (
                                    <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">{t('financials.noAnomalies')}</p>
                                )}
                                {anomalies.slice(0, 4).map((anomaly) => {
                                    const tone = normaliseSeverity(anomaly.severity);
                                    return (
                                        <div key={`${anomaly.date}-${anomaly.value}`} className="rounded-lg bg-slate-50 dark:bg-neutral-800/60 p-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="font-medium text-[var(--drip-text)] dark:text-white">{formatDate(anomaly.date)}</span>
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${severityStyles[tone]}`}>
                                                    {formatCurrency(anomaly.value)}
                                                </span>
                                            </div>
                                            <p className="mt-2 text-xs text-[var(--drip-muted)] dark:text-neutral-300">{anomaly.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-[var(--drip-text)] dark:text-white">
                                <Sparkles size={18} />
                                <h4 className="font-semibold text-sm">{t('financials.actionRecommendations')}</h4>
                            </div>
                            <div className="mt-4 space-y-3">
                                {recommendations.length === 0 && (
                                    <p className="text-sm text-[var(--drip-muted)] dark:text-neutral-400">{t('financials.noRecommendations')}</p>
                                )}
                                {recommendations.map((card, index) => {
                                    const tone = normaliseSeverity(card.severity);
                                    return (
                                        <div key={`${card.title}-${index}`} className="rounded-lg border border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 p-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${severityStyles[tone]}`}>{card.title}</span>
                                            </div>
                                            <p className="mt-2 text-sm text-[var(--drip-muted)] dark:text-neutral-300 leading-relaxed">{card.description}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );

    return (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900/70 p-1">
                    <button
                        onClick={() => setActiveSection('records')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeSection === 'records' ? 'bg-[var(--drip-primary)] text-white shadow-sm' : 'text-[var(--drip-text)] dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                    >
                        {t('financials.recordsTab')}
                    </button>
                    <button
                        onClick={() => setActiveSection('forecast')}
                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${activeSection === 'forecast' ? 'bg-[var(--drip-primary)] text-white shadow-sm' : 'text-[var(--drip-text)] dark:text-neutral-200 hover:bg-slate-100 dark:hover:bg-neutral-800'}`}
                    >
                        {t('financials.forecastInsights')}
                    </button>
                </div>
                {canEdit && activeSection === 'records' && (
                    <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-[var(--drip-primary)] text-white text-sm font-semibold rounded-lg hover:bg-[var(--drip-primary-dark)] transition-colors">
                        <PlusCircle size={18}/> {t('financials.newRecord')}
                    </button>
                )}
            </div>

            {activeSection === 'records' ? recordsContent : forecastContent}
        </div>
    );
};

export default FinancialsTab;
