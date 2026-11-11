import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, Trash2, FilePlus, AlertCircle } from 'lucide-react';
import {
  SportsFlyLabReport,
  parseSportsFlyLabExcel,
  createNewLabReportWithBranding,
  getStoredLabSchoolBranding,
  applyBrandingToReport,
  getStoredLabReports,
  saveStoredLabReports,
  ensureDataConsistency,
  analyzeLabPerformanceMetrics,
} from '../../data/sportsFlyLabData';
import {
  ExcelDataAuditModal,
  auditImportedAthletes,
  ExcelAuditSummary,
} from '../modals/ExcelDataAuditModal';

interface BatchAthleteManagerViewProps {
  onNavigate: (page: string) => void;
}

export const BatchAthleteManagerView: React.FC<BatchAthleteManagerViewProps> = ({ onNavigate }) => {
  const [pendingAthletes, setPendingAthletes] = useState<SportsFlyLabReport[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [auditModal, setAuditModal] = useState<{
    isOpen: boolean;
    summary: ExcelAuditSummary | null;
    fileName: string;
  }>({
    isOpen: false,
    summary: null,
    fileName: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const branding = getStoredLabSchoolBranding();
    const newAthletes: SportsFlyLabReport[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const buffer = await file.arrayBuffer();
        const template = createNewLabReportWithBranding({
          athleteName: 'Geçici',
          sportBranch: 'Genel',
          gender: 'Erkek',
          ageYears: 12,
        });
        const reports = parseSportsFlyLabExcel(buffer, template, false);
        const branded = reports.map(r => applyBrandingToReport(r, branding));
        newAthletes.push(...branded);
      } catch (err) {
        console.error(`Error parsing ${file.name}:`, err);
      }
    }

    setPendingAthletes((prev) => [...prev, ...newAthletes]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (newAthletes.length > 0) {
      const summary = auditImportedAthletes(
        newAthletes,
        files.length === 1 ? files[0].name : `${files.length} Excel Dosyası`
      );
      setAuditModal({
        isOpen: true,
        summary,
        fileName: files.length === 1 ? files[0].name : `${files.length} Excel Dosyası`,
      });
    }
  };

  const handleCreateKarne = (athlete: SportsFlyLabReport) => {
    const branding = getStoredLabSchoolBranding();
    const labReport = applyBrandingToReport(athlete, branding);
    const existingLabReports = getStoredLabReports();

    const normalizeName = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
    const targetName = normalizeName(athlete.athleteName);

    const existsIndex = existingLabReports.findIndex(
      (k) => (k.id && athlete.id && k.id === athlete.id) || (k.athleteName && normalizeName(k.athleteName) === targetName)
    );

    let updatedReports = [...existingLabReports];
    let targetReportId = labReport.id;

    if (existsIndex >= 0) {
      const existing = existingLabReports[existsIndex];
      targetReportId = existing.id;
      labReport.id = targetReportId;
      if (existing.athleteCode && !labReport.athleteCode) labReport.athleteCode = existing.athleteCode;

      ensureDataConsistency(labReport);
      labReport.aiRecommendations = analyzeLabPerformanceMetrics(labReport);
      updatedReports[existsIndex] = labReport;
    } else {
      ensureDataConsistency(labReport);
      labReport.aiRecommendations = analyzeLabPerformanceMetrics(labReport);
      updatedReports.unshift(labReport);
    }

    saveStoredLabReports(updatedReports);

    window.dispatchEvent(
      new CustomEvent('sportsfly_reports_updated', {
        detail: { reportId: targetReportId, report: labReport },
      })
    );

    onNavigate('sportsfly-lab');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Toplu Karne Yükleme ve Yönetim</h1>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('sportsfly-lab')}
            className="px-4 py-2 bg-slate-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-700 transition"
          >
            <FileText className="w-4 h-4" />
            SportsFly Lab'a Dön
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Upload className="w-4 h-4" />
            Excel Dosyası Yükle
          </button>
        </div>
        <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" multiple />
      </div>

      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-700 uppercase font-semibold">
            <tr>
              <th className="px-6 py-4">Sporcu Adı</th>
              <th className="px-6 py-4">Branş</th>
              <th className="px-6 py-4">Durum</th>
              <th className="px-6 py-4">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendingAthletes.map((athlete, index) => (
              <tr key={index}>
                <td className="px-6 py-4 font-medium text-slate-900">{athlete.athleteName}</td>
                <td className="px-6 py-4 text-slate-600">{athlete.sportBranch}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    Bekliyor
                  </span>
                </td>
                <td className="px-6 py-4 flex gap-2">
                  <button onClick={() => handleCreateKarne(athlete)} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">
                    Karne Oluştur
                  </button>
                  <button onClick={() => setPendingAthletes(prev => prev.filter((_, i) => i !== index))} className="text-red-600 hover:text-red-800 font-semibold text-xs">
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pendingAthletes.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <FilePlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
            Henüz dosya yüklenmedi.
          </div>
        )}
      </div>

      {/* Ön-Denetim Modalı */}
      <ExcelDataAuditModal
        isOpen={auditModal.isOpen}
        onClose={() => setAuditModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirmAll={() => setAuditModal((prev) => ({ ...prev, isOpen: false }))}
        summary={auditModal.summary}
        fileName={auditModal.fileName}
      />
    </div>
  );
};
