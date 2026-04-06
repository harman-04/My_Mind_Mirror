import React, { useState } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useJournalEntries } from '../hooks/useJournalData';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';

function ExportButtons() {
    const { theme } = useTheme();
    const { data: entries, isLoading } = useJournalEntries();
    const [isExporting, setIsExporting] = useState(false);

    // ------------------------------------------------------------------
    // Helper: format emotions object as readable string
    // ------------------------------------------------------------------
    const formatEmotions = (emotions) => {
        if (!emotions) return '';
        if (typeof emotions === 'string') {
            try {
                emotions = JSON.parse(emotions);
            } catch (e) {
                return emotions;
            }
        }
        if (typeof emotions === 'object') {
            return Object.entries(emotions)
                .filter(([, score]) => score > 0.01)
                .map(([emotion, score]) => `${emotion} (${(score * 100).toFixed(1)}%)`)
                .join(', ');
        }
        return String(emotions);
    };

    // ------------------------------------------------------------------
    // CSV export (unchanged)
    // ------------------------------------------------------------------
    const exportToCSV = () => {
        if (!entries || entries.length === 0) return;
        setIsExporting(true);

        const headers = [
            'Date', 'Creation Time', 'Raw Text', 'Mood Score',
            'Emotions (readable)', 'Core Concerns', 'Summary',
            'Growth Tips', 'Key Phrases', 'Cluster ID'
        ];

        const rows = entries.map(entry => [
            entry.entryDate,
            entry.creationTimestamp,
            `"${entry.rawText.replace(/"/g, '""')}"`,
            entry.moodScore ?? '',
            `"${formatEmotions(entry.emotions).replace(/"/g, '""')}"`,
            `"${(entry.coreConcerns || []).join('; ').replace(/"/g, '""')}"`,
            `"${(entry.summary || '').replace(/"/g, '""')}"`,
            `"${(entry.growthTips || []).join('; ').replace(/"/g, '""')}"`,
            `"${(entry.keyPhrases || []).join('; ').replace(/"/g, '""')}"`,
            entry.clusterId ?? ''
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `journal_export_${new Date().toISOString().slice(0,19)}.csv`);
        setIsExporting(false);
    };

    // ------------------------------------------------------------------
    // PDF export – fully robust, no overlap, proper pagination
    // ------------------------------------------------------------------
    const exportToPDF = () => {
        if (!entries || entries.length === 0) return;
        setIsExporting(true);

        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const leftMargin = 14;
            const rightMargin = 14;
            const topMargin = 20;
            const bottomMargin = 20;
            const maxTextWidth = pageWidth - leftMargin - rightMargin;
            let yOffset = topMargin;
            let currentPage = 1;

            // ------------------------------------------------------------------
            // Helper: check if remaining space is enough for a given height
            // ------------------------------------------------------------------
            const needsNewPage = (requiredHeight) => {
                const available = pageHeight - yOffset - bottomMargin;
                return requiredHeight > available;
            };

            // ------------------------------------------------------------------
            // Helper: add a new page and reset Y offset
            // ------------------------------------------------------------------
            const addNewPage = () => {
                doc.addPage();
                currentPage++;
                yOffset = topMargin;
            };

            // ------------------------------------------------------------------
            // Helper: render a block of text with automatic page break
            // Returns the actual height used (in mm)
            // ------------------------------------------------------------------
            const renderTextBlock = (text, fontSize, isBold = false, gapAfter = 2) => {
                if (!text) return 0;
                doc.setFontSize(fontSize);
                doc.setFont(undefined, isBold ? 'bold' : 'normal');

                // Split text into lines that fit within maxTextWidth
                const lines = doc.splitTextToSize(text, maxTextWidth);
                // Calculate exact height of this block
                const textDimensions = doc.getTextDimensions(lines.join('\n'), { maxWidth: maxTextWidth });
                const blockHeight = textDimensions.h;

                if (needsNewPage(blockHeight + gapAfter)) {
                    addNewPage();
                }

                doc.text(lines, leftMargin, yOffset);
                yOffset += blockHeight + gapAfter;
                return blockHeight + gapAfter;
            };

            // ------------------------------------------------------------------
            // Helper: render a labelled section (label + content)
            // ------------------------------------------------------------------
            const renderSection = (label, content, fontSize = 10, labelBold = true, gapAfter = 3) => {
                if (!content) return;
                const labelText = labelBold ? `${label}:` : label;
                renderTextBlock(labelText, fontSize, true, 1);
                renderTextBlock(content, fontSize, false, gapAfter);
            };

            // ------------------------------------------------------------------
            // Helper: render a bullet list with automatic pagination
            // ------------------------------------------------------------------
            const renderBulletList = (label, items, fontSize = 10, gapAfter = 3) => {
                if (!items || items.length === 0) return;
                renderTextBlock(`${label}:`, fontSize, true, 1);
                for (const item of items) {
                    const bulletLine = `• ${item}`;
                    renderTextBlock(bulletLine, fontSize, false, 1.5);
                }
                yOffset += gapAfter;
            };

            // ------------------------------------------------------------------
            // Helper: add footer with page number
            // ------------------------------------------------------------------
            const addFooter = (pageNumber) => {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    `Page ${pageNumber}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            };

            // ------------------------------------------------------------------
            // 1. Title and header
            // ------------------------------------------------------------------
            doc.setFontSize(18);
            doc.setTextColor(100, 80, 150);
            doc.text('MyMindMirror Journal Export', leftMargin, yOffset);
            yOffset += 8;
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated: ${new Date().toLocaleString()}`, leftMargin, yOffset);
            yOffset += 12;

            // ------------------------------------------------------------------
            // 2. Process each entry
            // ------------------------------------------------------------------
            for (let i = 0; i < entries.length; i++) {
                const entry = entries[i];

                // Estimate if entry header fits; if not, new page
                if (needsNewPage(15)) {
                    addNewPage();
                }

                // Entry header
                doc.setFontSize(12);
                doc.setTextColor(0, 0, 0);
                doc.setFont(undefined, 'bold');
                doc.text(`Entry ${i + 1}: ${entry.entryDate}`, leftMargin, yOffset);
                yOffset += 6;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                doc.text(`Created: ${entry.creationTimestamp}`, leftMargin, yOffset);
                yOffset += 6;

                // Mood score
                doc.text(`Mood Score: ${entry.moodScore?.toFixed(2) ?? 'N/A'}`, leftMargin, yOffset);
                yOffset += 6;

                // Summary
                if (entry.summary) {
                    renderSection('Summary', entry.summary, 10, true, 4);
                }

                // Raw text (critical: handle very long text)
                if (entry.rawText) {
                    renderSection('Raw Text', entry.rawText, 9, true, 5);
                }

                // Emotions
                const emotionsStr = formatEmotions(entry.emotions);
                if (emotionsStr) {
                    renderSection('Emotions', emotionsStr, 9, true, 3);
                }

                // Core Concerns (bullet list)
                renderBulletList('Core Concerns', entry.coreConcerns, 9, 4);

                // Growth Tips (bullet list)
                renderBulletList('Growth Tips', entry.growthTips, 9, 4);

                // Key Phrases (comma list)
                if (entry.keyPhrases?.length) {
                    renderSection('Key Phrases', entry.keyPhrases.join(', '), 9, true, 3);
                }

                // Cluster ID
                if (entry.clusterId) {
                    renderTextBlock(`Cluster ID: ${entry.clusterId}`, 9, false, 4);
                }

                // Separator line (except after last entry)
                if (i < entries.length - 1) {
                    if (needsNewPage(5)) {
                        addNewPage();
                    }
                    doc.setDrawColor(200, 200, 200);
                    doc.line(leftMargin, yOffset, pageWidth - rightMargin, yOffset);
                    yOffset += 6;
                }
            }

            // ------------------------------------------------------------------
            // 3. Add page numbers to all pages
            // ------------------------------------------------------------------
            const totalPages = doc.getNumberOfPages();
            for (let p = 1; p <= totalPages; p++) {
                doc.setPage(p);
                addFooter(p);
            }

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
            <div className="flex items-center gap-2 px-2 hidden lg:flex">
                <div className="w-2 h-2 rounded-full bg-[#B399D4] dark:bg-[#5CC8C2] animate-pulse" />
                <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-gray-500 dark:text-gray-400">
                    Export Data
                </span>
            </div>
            <div className="h-6 w-[1px] bg-gray-300 dark:bg-gray-700 hidden lg:block mx-1" />

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