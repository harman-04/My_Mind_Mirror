import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useJournalEntries } from '../hooks/useJournalData';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function ExportButtons() {
    const { theme } = useTheme();
    const { data: entries, isLoading } = useJournalEntries();
    const [isExporting, setIsExporting] = useState(false);

    const exportToCSV = () => {
        if (!entries || entries.length === 0) return;
        setIsExporting(true);

        // Define CSV headers
        const headers = [
            'Date', 'Creation Time', 'Raw Text', 'Mood Score',
            'Emotions (JSON)', 'Core Concerns', 'Summary',
            'Growth Tips', 'Key Phrases', 'Cluster ID'
        ];

        const rows = entries.map(entry => [
            entry.entryDate,
            entry.creationTimestamp,
            `"${entry.rawText.replace(/"/g, '""')}"`, // Escape quotes
            entry.moodScore ?? '',
            JSON.stringify(entry.emotions),
            JSON.stringify(entry.coreConcerns),
            `"${(entry.summary || '').replace(/"/g, '""')}"`,
            JSON.stringify(entry.growthTips),
            JSON.stringify(entry.keyPhrases),
            entry.clusterId ?? ''
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `journal_export_${new Date().toISOString().slice(0,19)}.csv`);
        setIsExporting(false);
    };

    const exportToPDF = () => {
        if (!entries || entries.length === 0) return;
        setIsExporting(true);

        try {
            const doc = new jsPDF({ orientation: 'landscape' });

            doc.setFontSize(16);
            doc.text('MyMindMirror Journal Export', 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

            // Ensure we are handling potential nulls in the mapping
            const tableData = entries.map(entry => [
                entry.entryDate || 'N/A',
                entry.moodScore?.toFixed(2) || 'N/A',
                entry.summary?.substring(0, 60) || '',
                Array.isArray(entry.keyPhrases) ? entry.keyPhrases.join(', ') : ''
            ]);

            autoTable(doc, {
                startY: 30,
                head: [['Date', 'Mood', 'Summary (truncated)', 'Key Phrases']],
                body: tableData,
                // FIX: Use 'grid' or 'striped' only. 'dark' is not a valid theme.
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    // If the app is in dark mode, make text light and background dark
                    textColor: theme === 'dark' ? [220, 220, 220] : [40, 40, 40],
                    fillColor: theme === 'dark' ? [30, 30, 30] : [255, 255, 255],
                    lineColor: theme === 'dark' ? [60, 60, 60] : [200, 200, 200],
                    lineWidth: 0.1,
                },
                headStyles: {
                    fillColor: theme === 'dark' ? [50, 50, 50] : [100, 100, 100],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: theme === 'dark' ? [40, 40, 40] : [245, 245, 245]
                },
            });

            doc.save(`journal_export_${new Date().toISOString().slice(0,19)}.pdf`);
        } catch (error) {
            console.error("PDF Export failed:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading || !entries || entries.length === 0) return null;

    return (
        <div className="flex items-center gap-3 bg-white/40 dark:bg-black/20 p-2 rounded-2xl border border-white/40 dark:border-white/10 backdrop-blur-md shadow-lg">
            {/* Animated Export Label */}
            <div className="flex items-center gap-2 px-2 hidden lg:flex">
                <div className="w-2 h-2 rounded-full bg-[#B399D4] dark:bg-[#5CC8C2] animate-pulse" />
                <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-gray-500 dark:text-gray-400">
                    Export Data
                </span>
            </div>

            <div className="h-6 w-[1px] bg-gray-300 dark:bg-gray-700 hidden lg:block mx-1" />

            {/* Premium CSV Button */}
            <button
                onClick={exportToCSV}
                disabled={isExporting}
                className={`group relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-500
                            ${theme === 'dark'
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-sm'}
                            disabled:opacity-50 active:scale-95`}
            >
                <FileSpreadsheet size={18} className="group-hover:-translate-y-1 group-hover:rotate-6 transition-transform duration-300" />
                <span>{isExporting ? 'Processing...' : 'CSV'}</span>
            </button>

            {/* Premium PDF Button */}
            <button
                onClick={exportToPDF}
                disabled={isExporting}
                className={`group relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-500
                            ${theme === 'dark'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 shadow-sm'}
                            disabled:opacity-50 active:scale-95`}
            >
                <FileText size={18} className="group-hover:-translate-y-1 group-hover:-rotate-6 transition-transform duration-300" />
                <span>{isExporting ? 'Processing...' : 'PDF'}</span>
            </button>
        </div>
    );
}

export default ExportButtons;