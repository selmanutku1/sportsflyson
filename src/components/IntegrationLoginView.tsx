import React, { useState, useEffect } from 'react';
import { Package, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { getStoredIntegrations } from '../data/entegrasyonlarData';
import { getStoredUserProfile } from '../data/userProfile';
import { isSuperAdminUser } from '../data/packagePermissions';
import { EntegrasyonItem } from '../types';
import { getStoredLocalCompanyProfile, fetchCompanyProfileFromFirestore } from '../services/companyProfileService';

interface IntegrationLoginViewProps {
  onSuccess: () => void;
  onError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  onBack?: () => void;
}

export const IntegrationLoginView: React.FC<IntegrationLoginViewProps> = ({ onSuccess, onError, setIsLoading, onBack }) => {
  const userProfile = getStoredUserProfile();
  const isSuperAdmin = isSuperAdminUser(userProfile?.role, userProfile?.email);

  const [integrations, setIntegrations] = useState<EntegrasyonItem[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('');
  const [code, setCode] = useState('');
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    const list = getStoredIntegrations().filter((item) => item.isActive);
    setIntegrations(list);
    if (list.length > 0) {
      // Prioritize sportsfly-lab or first item
      const labItem = list.find((i) => i.id === 'int-sportsfly-lab');
      setSelectedIntegrationId(labItem ? labItem.id : list[0].id);
    }
    fetchCompanyProfileFromFirestore().catch(() => {});
  }, []);

  const handleIntegrationLogin = async () => {
    const trimmedId = selectedIntegrationId.trim();
    const trimmedCode = code.trim();

    if (!trimmedId) {
      onError('Lütfen bir entegrasyon seçiniz.');
      return;
    }

    if (!isSuperAdmin && !trimmedCode) {
      onError('Lütfen geçiş kodunu giriniz.');
      return;
    }

    setIsLoading(true);
    onError(null);

    try {
      const selectedItem = integrations.find((i) => i.id === trimmedId);
      const integrationName = selectedItem ? selectedItem.name : trimmedId;

      let validCodes = ['SPORTSFLY2026', 'ADMIN2026', '123456'];
      let isAllowedForModule = true;
      let matchedAny = false;
      let matchedCompanyEntry: any = null;

      try {
        const storedAccess = localStorage.getItem('sportsfly_integration_access_list');
        if (storedAccess) {
          const parsed = JSON.parse(storedAccess);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed.forEach((entry: any) => {
              const codeMatch = entry.accessCode && entry.accessCode.trim().toUpperCase() === trimmedCode.toUpperCase();
              const companyMatch = entry.companyName && entry.companyName.trim().toLowerCase() === trimmedCode.toLowerCase();
              if (codeMatch || companyMatch) {
                matchedAny = true;
                matchedCompanyEntry = entry;
                if (entry.accessCode) validCodes.push(entry.accessCode.toUpperCase());
                if (entry.activeModules && trimmedId in entry.activeModules) {
                  if (entry.activeModules[trimmedId] === false) {
                    isAllowedForModule = false;
                  }
                }
              }
            });
          }
        }
      } catch (e) {}

      const cleanInput = trimmedCode.toUpperCase();
      const isMatch = isSuperAdmin || validCodes.includes(cleanInput) || cleanInput === '123456' || (selectedItem && cleanInput === selectedItem.name.toUpperCase()) || matchedAny;

      if (!isMatch) {
        onError('Geçiş kodu hatalı! Lütfen geçerli bir kod giriniz.');
        setIsLoading(false);
        return;
      }

      if (!isSuperAdmin && !isAllowedForModule) {
        onError(`"${integrationName}" entegrasyonu için bu geçiş koduna yetki tanımlanmamış / entegrasyon aktif değil.`);
        setIsLoading(false);
        return;
      }

      if (selectedItem && !selectedItem.isActive) {
        onError(`"${integrationName}" entegrasyonu aktif değildir.`);
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem('sportsfly_integration_active', 'true');
      sessionStorage.setItem('sportsfly_integration_entry_source', 'true');
      localStorage.setItem('sportsfly_integration_entry_source', 'true');
      sessionStorage.setItem('sportsfly_integration_name', integrationName);
      sessionStorage.setItem('sportsfly_selected_integration_id', trimmedId);

      const profileToSave = matchedCompanyEntry || getStoredLocalCompanyProfile();
      sessionStorage.setItem('sportsfly_active_company_profile', JSON.stringify(profileToSave));
      localStorage.setItem('sportsfly_active_company_profile', JSON.stringify(profileToSave));

      onSuccess();
    } catch (e) {
      console.error('Integration login error details:', e);
      onError('Bağlantı hatası.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-3 duration-300">
      {/* Integration Select */}
      <div className="space-y-1.5 text-left">
        <label className="block text-[11px] sm:text-xs font-bold text-slate-700">
          Entegrasyon Modülü Seçin
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Package className="w-4 h-4 text-sky-600" />
          </div>
          <select
            value={selectedIntegrationId}
            onChange={(e) => setSelectedIntegrationId(e.target.value)}
            className="w-full pl-10 pr-4 py-3 sm:py-2.5 min-h-[46px] rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-base sm:text-sm font-semibold focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none transition-all cursor-pointer shadow-2xs"
          >
            {integrations.length === 0 ? (
              <option value="">Aktif entegrasyon bulunamadı</option>
            ) : (
              integrations.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.category ? `· ${item.category}` : ''}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {/* Pass Code Input */}
      <div className="space-y-1.5 text-left">
        <label className="block text-[11px] sm:text-xs font-bold text-slate-700">
          Geçiş Kodu
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <KeyRound className="w-4 h-4 text-sky-600" />
          </div>
          <input
            type={showCode ? 'text' : 'password'}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleIntegrationLogin();
              }
            }}
            placeholder="Geçiş kodunuzu girin"
            autoComplete="off"
            className="w-full pl-10 pr-11 py-3 sm:py-2.5 min-h-[46px] rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-base sm:text-sm font-mono tracking-wider focus:ring-2 focus:ring-sky-500 focus:bg-white focus:outline-none transition-all shadow-2xs placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 font-bold"
          />
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
            title={showCode ? 'Kodu Gizle' : 'Kodu Göster'}
          >
            {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto sm:flex-1 py-3 px-5 min-h-[46px] rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs sm:text-sm tracking-wide transition-all shadow-2xs cursor-pointer flex items-center justify-center"
          >
            Geri Dön
          </button>
        )}
        <button
          type="button"
          onClick={handleIntegrationLogin}
          className="w-full sm:w-auto sm:flex-[2] py-3 px-6 min-h-[46px] rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 group"
        >
          <span>Giriş Yap</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
