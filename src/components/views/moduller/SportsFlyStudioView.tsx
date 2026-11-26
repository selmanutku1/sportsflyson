import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  Palette,
  Megaphone,
  Trophy,
  Award,
  Instagram,
  Download,
  Save,
  Sparkles,
  Image as ImageIcon,
  Upload,
  Trash2,
  Copy,
  Check,
  ArrowLeft,
  SlidersHorizontal,
  Users,
  Building2,
  ZoomIn,
  ZoomOut,
  Grid,
  FolderOpen,
  BookmarkCheck,
  AlignLeft,
  AlignCenter,
  FileText,
  X,
  RotateCcw,
  Layers,
  Plus,
  ArrowUp,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Wand2,
  Shield,
} from 'lucide-react';
import {
  STUDIO_ASPECT_RATIOS,
  STUDIO_CATEGORIES,
  STUDIO_COPY_PRESETS,
  STUDIO_QUICK_PROMPTS,
  STUDIO_SCENE_GALLERY,
  STUDIO_TEMPLATES,
  STUDIO_THEME_PALETTES,
  STUDIO_VISUAL_MODES,
  SavedStudioDesign,
  StudioAspectRatioId,
  StudioBrandKit,
  StudioCategoryId,
  StudioDesignState,
  StudioImageLayer,
  StudioPatternStyle,
  StudioSceneOption,
  StudioVisualMode,
  buildDesignStateFromTemplate,
  matchStudioSceneByPrompt,
} from '../../../data/sportsFlyStudioData';
import {
  compressImageFileForStudio,
  fetchStudioWorkspaceFromFirestore,
  getDefaultStudioBrandKit,
  loadLocalStudioWorkspace,
  saveStudioWorkspaceToFirestore,
} from '../../../services/sportsFlyStudioService';
import { StudioCanvasPreview } from './studio/StudioCanvasPreview';
import { sporcularService } from '../../../services/firestoreService';
import { subelerService } from '../../../services/operationsFirestoreService';
import { ACTIVE_ATHLETES_ROSTER } from '../../../data/activeAthletesData';
import { getStoredSubeSporcular } from '../../../data/subeOzetData';
import { getStoredSubeler } from '../../../data/subeData';
import { auth } from '../../../firebase';

interface SportsFlyStudioViewProps {
  initialCategory?: StudioCategoryId;
  onToast?: (msg: string) => void;
  onBackToIntegrations?: () => void;
}

interface StudioAthleteOption {
  id: string;
  name: string;
  branch: string;
  group: string;
  code: string;
  attendanceRate: number;
  facility: string;
  avatarUrl?: string;
}

interface StudioBranchOption {
  id: string;
  name: string;
  address: string;
  phone: string;
}

type StudioWorkspaceTab = 'editor' | 'saved' | 'brand';
type MobilePaneTab = 'controls' | 'preview';

const normalizeDesignState = (state: StudioDesignState): StudioDesignState => ({
  ...state,
  featureImageUrl: state.featureImageUrl || '',
  showFeatureImage: Boolean(state.showFeatureImage && state.featureImageUrl),
  featureImageFit: state.featureImageFit === 'contain' ? 'contain' : 'cover',
  featureImageHeight: state.featureImageHeight || 156,
  customImages: Array.isArray(state.customImages) ? state.customImages : [],
  visualMode: state.visualMode || 'diagonal-campaign',
});

export const SportsFlyStudioView: React.FC<SportsFlyStudioViewProps> = ({
  initialCategory = 'duyuru',
  onToast,
  onBackToIntegrations,
}) => {
  const initialLocalWorkspace = useMemo(() => loadLocalStudioWorkspace(), []);
  const [brandKit, setBrandKit] = useState<StudioBrandKit>(initialLocalWorkspace.brandKit);
  const [savedDesigns, setSavedDesigns] = useState<SavedStudioDesign[]>(
    initialLocalWorkspace.savedDesigns
  );

  const [activeCategory, setActiveCategory] = useState<StudioCategoryId>(
    initialCategory as StudioCategoryId
  );
  const [design, setDesign] = useState<StudioDesignState>(() => {
    const firstTpl =
      STUDIO_TEMPLATES.find((t) => t.categoryId === initialCategory) || STUDIO_TEMPLATES[0];
    return buildDesignStateFromTemplate(firstTpl, initialLocalWorkspace.brandKit);
  });

  const [workspaceTab, setWorkspaceTab] = useState<StudioWorkspaceTab>('editor');
  const [mobilePane, setMobilePane] = useState<MobilePaneTab>('controls');
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [promptText, setPromptText] = useState<string>(
    () =>
      STUDIO_SCENE_GALLERY.find((s) => s.categoryId === initialCategory)?.samplePrompt ||
      STUDIO_SCENE_GALLERY[0].samplePrompt
  );
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    () =>
      STUDIO_SCENE_GALLERY.find((s) => s.categoryId === initialCategory)?.id ||
      STUDIO_SCENE_GALLERY[0].id
  );
  const [isComposingAi, setIsComposingAi] = useState(false);
  const [aiComposeHint, setAiComposeHint] = useState<string | null>(null);
  const [customLayerUrlInput, setCustomLayerUrlInput] = useState('');
  const [autoFitZoom, setAutoFitZoom] = useState<number>(0.78);
  const [manualZoomDelta, setManualZoomDelta] = useState<number>(0);
  const [showSafeGuides, setShowSafeGuides] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<'png' | 'jpeg' | 'pdf' | null>(null);
  const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const [athleteOptions, setAthleteOptions] = useState<StudioAthleteOption[]>(() => {
    const roster = ACTIVE_ATHLETES_ROSTER.map((a) => ({
      id: a.id,
      name: a.name,
      branch: a.branch,
      group: a.categoryGroup,
      code: a.code,
      attendanceRate: a.attendanceRate,
      facility: a.facility,
      avatarUrl: a.avatarUrl,
    }));
    const subeList = getStoredSubeSporcular().map((s) => ({
      id: s.id,
      name: s.name,
      branch: s.branch,
      group: s.group,
      code: s.code,
      attendanceRate: s.attendanceRate,
      facility: s.subeId,
      avatarUrl: s.avatarUrl,
    }));
    const merged = [...roster, ...subeList];
    const seen = new Set<string>();
    return merged.filter((item) => {
      const key = item.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  const [branchOptions, setBranchOptions] = useState<StudioBranchOption[]>(() =>
    getStoredSubeler().map((b) => ({
      id: b.id,
      name: b.ad,
      address: `${b.adres}${b.ilce ? `, ${b.ilce}` : ''}`,
      phone: b.telefon,
    }))
  );

  const exportStageRef = useRef<HTMLDivElement | null>(null);
  const stageWrapperRef = useRef<HTMLDivElement | null>(null);
  const heroUploadRef = useRef<HTMLInputElement | null>(null);
  const featureUploadRef = useRef<HTMLInputElement | null>(null);
  const customLayerUploadRef = useRef<HTMLInputElement | null>(null);
  const avatarUploadRef = useRef<HTMLInputElement | null>(null);
  const logoUploadRef = useRef<HTMLInputElement | null>(null);
  const brandLogoUploadRef = useRef<HTMLInputElement | null>(null);

  const notify = (msg: string) => {
    if (onToast) onToast(msg);
    setStatusFeedback(msg);
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  useEffect(() => {
    let mounted = true;

    fetchStudioWorkspaceFromFirestore()
      .then((ws) => {
        if (!mounted) return;
        setBrandKit(ws.brandKit);
        setSavedDesigns(ws.savedDesigns);
      })
      .catch(() => {});

    if (auth.currentUser) {
      sporcularService
        .getAll()
        .then((docs) => {
          if (!mounted || !Array.isArray(docs) || docs.length === 0) return;
          setAthleteOptions((prev) => {
            const firestoreAthletes: StudioAthleteOption[] = docs.map((d) => ({
              id: d.id,
              name: d.name || 'Sporcu',
              branch: d.branch || 'Basketbol',
              group: d.teamGroup || d.facility || 'Gelişim Grubu',
              code: d.code || 'SF-0001',
              attendanceRate: 95,
              facility: d.facility || d.branch || 'Merkez Tesis',
              avatarUrl: d.avatarUrl,
            }));
            const map = new Map<string, StudioAthleteOption>();
            [...firestoreAthletes, ...prev].forEach((a) => {
              const key = a.name.toLowerCase();
              if (!map.has(key)) map.set(key, a);
            });
            return Array.from(map.values());
          });
        })
        .catch(() => {});

      subelerService
        .getAll()
        .then((docs) => {
          if (!mounted || !Array.isArray(docs) || docs.length === 0) return;
          setBranchOptions(
            docs.map((b) => ({
              id: b.id,
              name: b.ad,
              address: `${b.adres}${b.ilce ? `, ${b.ilce}` : ''}`,
              phone: b.telefon,
            }))
          );
        })
        .catch(() => {});
    }

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setManualZoomDelta(0);
  }, [design.aspectRatio]);

  useEffect(() => {
    if (initialCategory && initialCategory !== activeCategory) {
      handleSelectCategory(initialCategory as StudioCategoryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory]);

  const categoryTemplates = useMemo(
    () => STUDIO_TEMPLATES.filter((t) => t.categoryId === activeCategory),
    [activeCategory]
  );

  const categoryCopyPresets = useMemo(
    () => STUDIO_COPY_PRESETS.filter((p) => p.categoryId === activeCategory),
    [activeCategory]
  );

  const orderedSceneGallery = useMemo(() => {
    const matched = matchStudioSceneByPrompt(promptText, activeCategory);
    return [...STUDIO_SCENE_GALLERY].sort((a, b) => {
      if (a.id === selectedSceneId) return -1;
      if (b.id === selectedSceneId) return 1;
      if (a.id === matched.id) return -1;
      if (b.id === matched.id) return 1;
      if (a.categoryId === activeCategory && b.categoryId !== activeCategory) return -1;
      if (b.categoryId === activeCategory && a.categoryId !== activeCategory) return 1;
      return 0;
    });
  }, [promptText, activeCategory, selectedSceneId]);

  const activeRatioMeta = useMemo(
    () =>
      STUDIO_ASPECT_RATIOS.find((r) => r.id === design.aspectRatio) ||
      STUDIO_ASPECT_RATIOS[1],
    [design.aspectRatio]
  );

  useEffect(() => {
    const el = stageWrapperRef.current;
    if (!el || typeof window === 'undefined') return;

    const computeFit = () => {
      const width = el.clientWidth;
      if (!width) return;
      const availableWidth = Math.max(220, width - 32);
      const fit = Math.min(0.95, Math.max(0.38, availableWidth / activeRatioMeta.stageWidth));
      setAutoFitZoom(Number(fit.toFixed(2)));
    };

    computeFit();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => computeFit());
      observer.observe(el);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', computeFit);
    return () => window.removeEventListener('resize', computeFit);
  }, [activeRatioMeta.stageWidth, workspaceTab, mobilePane]);

  const effectiveZoom = Math.min(
    1.15,
    Math.max(0.35, Number((autoFitZoom + manualZoomDelta).toFixed(2)))
  );

  const activeVisualUrl =
    design.categoryId === 'sporcu-kartlari'
      ? design.heroPhotoUrl || design.athleteAvatarUrl || design.featureImageUrl
      : design.featureImageUrl || design.heroPhotoUrl;

  const applySceneVisualToState = (
    prev: StudioDesignState,
    scene: StudioSceneOption
  ): StudioDesignState => {
    if (prev.categoryId === 'sporcu-kartlari') {
      return {
        ...prev,
        heroPhotoUrl: scene.url,
        showHeroPhoto: true,
        photoScrimOpacity: prev.photoScrimOpacity || 80,
      };
    }
    return {
      ...prev,
      featureImageUrl: scene.url,
      showFeatureImage: true,
    };
  };

  const handleSelectCategory = (catId: StudioCategoryId) => {
    setActiveCategory(catId);
    setWorkspaceTab('editor');
    setSelectedLayerId(null);
    setAiComposeHint(null);
    const tpl = STUDIO_TEMPLATES.find((t) => t.categoryId === catId);
    if (tpl) {
      setDesign(buildDesignStateFromTemplate(tpl, brandKit));
    }
    const defaultScene = STUDIO_SCENE_GALLERY.find((s) => s.categoryId === catId);
    if (defaultScene) {
      setSelectedSceneId(defaultScene.id);
      setPromptText(defaultScene.samplePrompt);
    }
  };

  const handleApplyTemplate = (templateId: string) => {
    const tpl = STUDIO_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    setActiveCategory(tpl.categoryId);
    setSelectedLayerId(null);
    setDesign(buildDesignStateFromTemplate(tpl, brandKit));
    const matchingScene = STUDIO_SCENE_GALLERY.find(
      (s) => s.defaultTemplateId === tpl.id
    );
    if (matchingScene) {
      setSelectedSceneId(matchingScene.id);
    }
    notify(`"${tpl.name}" şablonu uygulandı.`);
  };

  const handleSelectScene = (scene: StudioSceneOption) => {
    setSelectedSceneId(scene.id);
    setDesign((prev) => applySceneVisualToState(prev, scene));
  };

  const handleSelectCopyPreset = (presetId: string) => {
    const preset = STUDIO_COPY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDesign((prev) => ({
      ...prev,
      kicker: preset.kicker,
      headline: preset.headline,
      subheadline: preset.subheadline,
      highlightBadge: preset.highlightBadge,
      ctaText: preset.ctaText,
      designName: preset.label,
    }));
  };

  const handlePromptChange = (nextPrompt: string) => {
    setPromptText(nextPrompt);
    if (nextPrompt.trim().length >= 3) {
      const matched = matchStudioSceneByPrompt(nextPrompt, activeCategory);
      setSelectedSceneId(matched.id);
      setDesign((prev) => applySceneVisualToState(prev, matched));
    }
  };

  const handleSuggestCopyWithAi = async () => {
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt) {
      notify('Önce prompt alanına kısa bir tasarım fikri yazın.');
      return;
    }

    setIsComposingAi(true);
    setAiComposeHint(null);
    try {
      const res = await fetch('/api/studio/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmedPrompt,
          topic: activeCategory,
          headline: design.headline,
          subheadline: design.subheadline,
          clubName: design.clubName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.suggestion) {
        const errMsg =
          data?.error ||
          'Yapay zeka metin servisi şu an aktif değil; prompta uygun sahne yerel kütüphaneden seçildi.';
        setAiComposeHint(errMsg);
        const matched = matchStudioSceneByPrompt(trimmedPrompt, activeCategory);
        setSelectedSceneId(matched.id);
        setDesign((prev) => applySceneVisualToState(prev, matched));
        return;
      }

      const s = data.suggestion;
      const suggestedScene =
        STUDIO_SCENE_GALLERY.find((item) => item.id === s.sceneId) ||
        matchStudioSceneByPrompt(trimmedPrompt, activeCategory);
      const suggestedPalette = STUDIO_THEME_PALETTES.find((p) => p.id === s.themeId);

      setSelectedSceneId(suggestedScene.id);
      setDesign((prev) => {
        const withScene = applySceneVisualToState(prev, suggestedScene);
        return {
          ...withScene,
          kicker: s.kicker || withScene.kicker,
          headline: s.headline || withScene.headline,
          subheadline: s.subheadline || withScene.subheadline,
          highlightBadge: s.highlightBadge || withScene.highlightBadge,
          ctaText: s.ctaText || withScene.ctaText,
          patternStyle: s.patternStyle || withScene.patternStyle,
          visualMode: (s.visualMode as StudioVisualMode) || withScene.visualMode,
          ...(suggestedPalette
            ? {
                themeId: suggestedPalette.id,
                backgroundColor: suggestedPalette.backgroundColor,
                surfaceColor: suggestedPalette.surfaceColor,
                primaryColor: suggestedPalette.primaryColor,
                accentColor: suggestedPalette.accentColor,
                textColor: suggestedPalette.textColor,
                mutedTextColor: suggestedPalette.mutedTextColor,
              }
            : {}),
        };
      });
      setAiComposeHint('Gemini metin önerisi ve eşleşen sahne tuvale uygulandı.');
      notify('AI metin ve sahne önerisi uygulandı.');
    } catch {
      setAiComposeHint(
        'Sunucuya ulaşılamadı; prompta uygun görsel stüdyo kütüphanesinden seçildi.'
      );
    } finally {
      setIsComposingAi(false);
    }
  };

  const handleGenerateDesign = () => {
    const trimmedPrompt = promptText.trim();
    const chosenScene =
      STUDIO_SCENE_GALLERY.find((s) => s.id === selectedSceneId) ||
      matchStudioSceneByPrompt(trimmedPrompt, activeCategory);

    setSelectedSceneId(chosenScene.id);
    setDesign((prev) => {
      const updated = applySceneVisualToState(prev, chosenScene);
      return {
        ...updated,
        designName:
          prev.headline.trim().slice(0, 60) || prev.designName || chosenScene.title,
      };
    });

    setMobilePane('preview');
    notify('Tasarım oluşturuldu ve canlı önizlemeye yansıtıldı.');
  };

  const handleApplyPalette = (paletteId: string) => {
    const pal = STUDIO_THEME_PALETTES.find((p) => p.id === paletteId);
    if (!pal) return;
    setDesign((prev) => ({
      ...prev,
      themeId: pal.id,
      backgroundColor: pal.backgroundColor,
      surfaceColor: pal.surfaceColor,
      primaryColor: pal.primaryColor,
      accentColor: pal.accentColor,
      textColor: pal.textColor,
      mutedTextColor: pal.mutedTextColor,
    }));
  };

  const handleApplyBrandKitToCurrent = () => {
    setDesign((prev) => ({
      ...prev,
      clubName: brandKit.clubName,
      clubLogoUrl: brandKit.logoUrl,
      footerContact: brandKit.phone,
      footerWeb: brandKit.websiteOrHandle,
      primaryColor: brandKit.primaryColor,
      accentColor: brandKit.accentColor,
    }));
    notify('Kulüp Marka Kiti aktif tasarıma uygulandı.');
  };

  const handleSelectAthleteAutofill = (athleteId: string) => {
    const found = athleteOptions.find((a) => a.id === athleteId);
    if (!found) return;
    setDesign((prev) => ({
      ...prev,
      athleteName: found.name,
      athleteBranch: found.branch,
      athleteGroup: found.group,
      athleteCode: found.code,
      athleteAvatarUrl: found.avatarUrl || prev.athleteAvatarUrl,
      locationText: found.facility || prev.locationText,
      stats: [
        { label: 'Devam Oranı', value: `%${found.attendanceRate}` },
        { label: 'Branş', value: found.branch },
        { label: 'Sporcu Kodu', value: found.code },
      ],
    }));
    notify(`${found.name} bilgileri tasarıma aktarıldı.`);
  };

  const handleSelectBranchAutofill = (branchId: string) => {
    const found = branchOptions.find((b) => b.id === branchId);
    if (!found) return;
    setDesign((prev) => ({
      ...prev,
      locationText: found.name,
      footerContact: found.phone || prev.footerContact,
    }));
    notify(`"${found.name}" şube bilgileri uygulandı.`);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'hero' | 'feature' | 'avatar' | 'logo' | 'brand-logo'
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Lütfen geçerli bir görsel dosyası (PNG, JPEG, WebP) seçin.');
      return;
    }

    try {
      const compressedUrl = await compressImageFileForStudio(
        file,
        target === 'hero' ? 960 : target === 'feature' ? 880 : 512,
        0.82
      );

      if (target === 'hero') {
        setDesign((prev) => ({
          ...prev,
          heroPhotoUrl: compressedUrl,
          showHeroPhoto: true,
        }));
        notify('Arka plan görseli eklendi.');
      } else if (target === 'feature') {
        setDesign((prev) => ({
          ...prev,
          featureImageUrl: compressedUrl,
          showFeatureImage: true,
        }));
        notify('Afiş içi görsel güncellendi.');
      } else if (target === 'avatar') {
        setDesign((prev) => ({
          ...prev,
          athleteAvatarUrl: compressedUrl,
        }));
        notify('Sporcu fotoğrafı güncellendi.');
      } else if (target === 'logo') {
        setDesign((prev) => ({
          ...prev,
          clubLogoUrl: compressedUrl,
          showClubLogo: true,
        }));
        notify('Kulüp logosu tasarıma eklendi.');
      } else if (target === 'brand-logo') {
        setBrandKit((prev) => ({ ...prev, logoUrl: compressedUrl }));
        notify('Marka kiti logosu güncellendi.');
      }
    } catch (err) {
      console.error(err);
      notify('Görsel yüklenirken bir hata oluştu.');
    }
  };

  const handleCustomLayersUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      notify('Lütfen geçerli görsel dosyaları (PNG, JPEG, WebP) seçin.');
      return;
    }

    const remainingSlots = Math.max(0, 6 - (design.customImages?.length || 0));
    if (remainingSlots === 0) {
      notify('Bir tasarıma en fazla 6 adet ek görsel katmanı ekleyebilirsiniz.');
      return;
    }

    const filesToProcess = validFiles.slice(0, remainingSlots);
    try {
      const compressedUrls = await Promise.all(
        filesToProcess.map((f) => compressImageFileForStudio(f, 720, 0.82))
      );

      const baseCount = design.customImages?.length || 0;
      const newLayers: StudioImageLayer[] = compressedUrls.map((url, idx) => {
        const cleanName = filesToProcess[idx].name.replace(/\.[^/.]+$/, '').slice(0, 26);
        return {
          id: `layer-${Date.now()}-${idx}`,
          label: cleanName || `Görsel ${baseCount + idx + 1}`,
          url,
          x: Math.min(82, 50 + ((baseCount + idx) % 3) * 8 - 8),
          y: Math.min(82, 50 + ((baseCount + idx) % 3) * 8 - 8),
          width: 148,
          opacity: 100,
          borderRadius: 12,
          fit: 'contain',
          shadow: true,
        };
      });

      setDesign((prev) => ({
        ...prev,
        customImages: [...(prev.customImages || []), ...newLayers],
      }));
      setSelectedLayerId(newLayers[newLayers.length - 1].id);
      notify(`${newLayers.length} görsel tuvale eklendi.`);
    } catch (err) {
      console.error(err);
      notify('Ek görseller işlenirken hata oluştu.');
    }
  };

  const handleAddCustomImageFromUrl = (rawUrl: string, label: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    const isSafeUrl =
      trimmed.startsWith('https://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('data:image/');
    if (!isSafeUrl) {
      notify('Geçerli bir görsel URL adresi (https://...) girin.');
      return;
    }
    if ((design.customImages?.length || 0) >= 6) {
      notify('Bir tasarıma en fazla 6 adet ek görsel katmanı ekleyebilirsiniz.');
      return;
    }
    const newLayer: StudioImageLayer = {
      id: `layer-${Date.now()}`,
      label: label.trim() || `Görsel ${(design.customImages?.length || 0) + 1}`,
      url: trimmed,
      x: 50,
      y: 50,
      width: 140,
      opacity: 100,
      borderRadius: 12,
      fit: 'contain',
      shadow: true,
    };
    setDesign((prev) => ({
      ...prev,
      customImages: [...(prev.customImages || []), newLayer],
    }));
    setSelectedLayerId(newLayer.id);
    setCustomLayerUrlInput('');
    notify('Görsel katmanı tuvale eklendi.');
  };

  const updateCustomLayer = (layerId: string, patch: Partial<StudioImageLayer>) => {
    setDesign((prev) => ({
      ...prev,
      customImages: (prev.customImages || []).map((layer) =>
        layer.id === layerId ? { ...layer, ...patch } : layer
      ),
    }));
  };

  const removeCustomLayer = (layerId: string) => {
    setDesign((prev) => ({
      ...prev,
      customImages: (prev.customImages || []).filter((layer) => layer.id !== layerId),
    }));
    setSelectedLayerId((prev) => (prev === layerId ? null : prev));
  };

  const moveCustomLayerToFront = (layerId: string) => {
    setDesign((prev) => {
      const list = prev.customImages || [];
      const target = list.find((l) => l.id === layerId);
      if (!target) return prev;
      return {
        ...prev,
        customImages: [...list.filter((l) => l.id !== layerId), target],
      };
    });
  };

  const handleSaveDesignToWorkspace = async () => {
    setIsSavingWorkspace(true);
    try {
      const nowIso = new Date().toISOString();
      const entryId = design.id.startsWith('saved-')
        ? design.id
        : `saved-${Date.now()}`;
      const savedEntry: SavedStudioDesign = {
        id: entryId,
        title: design.designName.trim() || design.headline.slice(0, 60) || 'Kulüp Tasarımı',
        categoryId: design.categoryId,
        aspectRatio: design.aspectRatio,
        updatedAt: nowIso,
        state: {
          ...design,
          id: entryId,
        },
      };

      const nextList = [
        savedEntry,
        ...savedDesigns.filter((d) => d.id !== entryId),
      ].slice(0, 25);

      setDesign(savedEntry.state);
      setSavedDesigns(nextList);
      await saveStudioWorkspaceToFirestore({
        brandKit,
        savedDesigns: nextList,
      });
      notify('Tasarım SportsFly arşivinize kaydedildi.');
    } catch (err) {
      console.error(err);
      notify('Tasarım yerel olarak kaydedildi.');
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const handleSaveBrandKit = async () => {
    setIsSavingWorkspace(true);
    try {
      await saveStudioWorkspaceToFirestore({
        brandKit,
        savedDesigns,
      });
      handleApplyBrandKitToCurrent();
      notify('Kulüp Marka Kiti kaydedildi ve uygulandı.');
    } catch (err) {
      console.error(err);
      notify('Marka kiti kaydedildi.');
    } finally {
      setIsSavingWorkspace(false);
    }
  };

  const handleLoadSavedDesign = (item: SavedStudioDesign) => {
    setActiveCategory(item.categoryId);
    setSelectedLayerId(null);
    setDesign(normalizeDesignState(item.state));
    setWorkspaceTab('editor');
    notify(`"${item.title}" düzenleyiciye yüklendi.`);
  };

  const handleDeleteSavedDesign = async (id: string) => {
    const nextList = savedDesigns.filter((d) => d.id !== id);
    setSavedDesigns(nextList);
    try {
      await saveStudioWorkspaceToFirestore({
        brandKit,
        savedDesigns: nextList,
      });
    } catch {}
    notify('Kayıtlı tasarım silindi.');
  };

  const handleExport = async (format: 'png' | 'jpeg' | 'pdf') => {
    if (!exportStageRef.current) {
      notify('Önizleme sahnesi hazır değil.');
      return;
    }

    const wasShowingGuides = showSafeGuides;
    if (wasShowingGuides) {
      setShowSafeGuides(false);
      await new Promise((r) => setTimeout(r, 60));
    }

    setIsExporting(format);
    try {
      const node = exportStageRef.current;
      const ratio = activeRatioMeta;
      const pixelRatio = Math.max(2, Math.round((ratio.exportWidth / ratio.stageWidth) * 10) / 10);
      const safeFileName = (design.designName || 'sportsfly-studio-tasarim')
        .toLowerCase()
        .replace(/[^a-z0-9ğüşıöç-]+/gi, '-')
        .replace(/-+/g, '-')
        .slice(0, 48);

      const filterFn = (domNode: HTMLElement) =>
        !(domNode?.getAttribute && domNode.getAttribute('data-studio-guide') === 'true');

      if (format === 'png') {
        const dataUrl = await toPng(node, {
          pixelRatio,
          cacheBust: true,
          backgroundColor: design.backgroundColor,
          filter: filterFn,
        });
        const link = document.createElement('a');
        link.download = `${safeFileName}-${ratio.id.replace(':', 'x')}.png`;
        link.href = dataUrl;
        link.click();
        notify(`PNG (${ratio.dimensionsLabel}) indirildi.`);
      } else if (format === 'jpeg') {
        const dataUrl = await toJpeg(node, {
          pixelRatio,
          quality: 0.94,
          cacheBust: true,
          backgroundColor: design.backgroundColor,
          filter: filterFn,
        });
        const link = document.createElement('a');
        link.download = `${safeFileName}-${ratio.id.replace(':', 'x')}.jpg`;
        link.href = dataUrl;
        link.click();
        notify(`JPEG (${ratio.dimensionsLabel}) indirildi.`);
      } else {
        const imgData = await toPng(node, {
          pixelRatio,
          cacheBust: true,
          backgroundColor: design.backgroundColor,
          filter: filterFn,
        });
        const orientation = ratio.exportWidth > ratio.exportHeight ? 'landscape' : 'portrait';
        const pdf = new jsPDF({
          orientation,
          unit: 'px',
          format: [ratio.exportWidth, ratio.exportHeight],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, ratio.exportWidth, ratio.exportHeight);
        pdf.save(`${safeFileName}-${ratio.id.replace(':', 'x')}.pdf`);
        notify(`PDF afiş (${ratio.dimensionsLabel}) indirildi.`);
      }
    } catch (err) {
      console.error('[SportsFlyStudio] Export error:', err);
      notify('Dışa aktarma sırasında görsel kaynaklı bir hata oluştu.');
    } finally {
      setIsExporting(null);
      if (wasShowingGuides) {
        setShowSafeGuides(true);
      }
    }
  };

  const renderCategoryIcon = (iconName: string, isSelected: boolean) => {
    const cls = `w-4 h-4 shrink-0 ${
      isSelected ? 'text-white' : 'text-slate-600 dark:text-slate-300'
    }`;
    switch (iconName) {
      case 'Megaphone':
        return <Megaphone className={cls} />;
      case 'Trophy':
        return <Trophy className={cls} />;
      case 'Award':
        return <Award className={cls} />;
      case 'Instagram':
        return <Instagram className={cls} />;
      default:
        return <Palette className={cls} />;
    }
  };

  return (
    <div className="space-y-4 text-slate-900 dark:text-slate-100">
      {/* Toast Feedback */}
      {statusFeedback && (
        <div className="fixed top-20 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-700 flex items-center gap-2.5 text-xs font-semibold">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusFeedback}</span>
          <button
            type="button"
            onClick={() => setStatusFeedback(null)}
            className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* COMPACT STUDIO HEADER */}
      <header className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#0F2444] text-white flex items-center justify-center shrink-0">
            <Palette className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white truncate">
              SportsFly Studio
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
              Konu, başlık, logo ve prompt ile kulüp tasarımı oluşturun
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onBackToIntegrations && (
            <button
              type="button"
              onClick={onBackToIntegrations}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Entegrasyonlar</span>
            </button>
          )}

          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setWorkspaceTab('editor')}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workspaceTab === 'editor'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Tasarım Oluştur
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceTab('saved')}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workspaceTab === 'saved'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Kayıtlı ({savedDesigns.length})
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceTab('brand')}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                workspaceTab === 'brand'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Marka Kiti
            </button>
          </div>
        </div>
      </header>

      {/* TAB 1: CLEAN DESIGN COMPOSER + LIVE PREVIEW */}
      {workspaceTab === 'editor' && (
        <div className="space-y-4">
          {/* Mobile Pane Switcher */}
          <div className="md:hidden grid grid-cols-2 gap-1.5 bg-white dark:bg-[#111c2e] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setMobilePane('controls')}
              className={`h-10 rounded-lg text-xs font-bold cursor-pointer ${
                mobilePane === 'controls'
                  ? 'bg-[#0F2444] text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Tasarım Formu
            </button>
            <button
              type="button"
              onClick={() => setMobilePane('preview')}
              className={`h-10 rounded-lg text-xs font-bold cursor-pointer ${
                mobilePane === 'preview'
                  ? 'bg-[#0F2444] text-white'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              Önizleme & İndir
            </button>
          </div>

          {/* Mobile Real-Time Live Preview Card (always visible while typing on <md) */}
          {mobilePane === 'controls' && (
            <div className="md:hidden bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
                  <Eye className="w-4 h-4 text-[#0F2444] dark:text-sky-400 shrink-0" />
                  <span>Canlı Önizleme</span>
                  <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                    · {activeRatioMeta.shortLabel}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobilePane('preview')}
                  className="h-8 px-3 rounded-lg bg-[#0F2444] dark:bg-sky-600 text-white text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Tam Boy & İndir
                </button>
              </div>
              <div className="w-full overflow-x-auto rounded-xl bg-slate-100 dark:bg-[#09101c] border border-slate-200/80 dark:border-slate-800 p-3 flex items-center justify-center">
                <StudioCanvasPreview
                  design={design}
                  zoom={design.aspectRatio === '9:16' ? 0.34 : 0.44}
                  showSafeGuides={false}
                  selectedLayerId={selectedLayerId}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
            {/* LEFT PANEL: STREAMLINED COMPOSER */}
            <div
              className={`md:col-span-5 bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-5 ${
                mobilePane === 'controls' ? 'block' : 'hidden md:block'
              }`}
            >
              {/* STEP 1: TOPIC & TEMPLATE */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    1. Konu Seçimi
                  </span>
                  <select
                    aria-label="Şablon Seçimi"
                    value={design.templateId}
                    onChange={(e) => handleApplyTemplate(e.target.value)}
                    className="h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer max-w-[210px]"
                  >
                    {categoryTemplates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {STUDIO_CATEGORIES.map((cat) => {
                    const selected = activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${
                          selected
                            ? 'bg-[#0F2444] dark:bg-sky-600 text-white border-transparent'
                            : 'bg-slate-50/70 dark:bg-slate-900/60 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {renderCategoryIcon(cat.iconName, selected)}
                        <span className="text-xs font-bold truncate">{cat.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Visual Poster Style / Mode Picker */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Tasarım Modu (Afiş Görselleştirme)
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {STUDIO_VISUAL_MODES.map((mode) => {
                      const active = (design.visualMode || 'diagonal-campaign') === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() =>
                            setDesign((prev) => ({
                              ...prev,
                              visualMode: mode.id,
                            }))
                          }
                          title={mode.subtitle}
                          className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                            active
                              ? 'border-[#0F2444] dark:border-sky-400 bg-slate-50 dark:bg-slate-800 ring-1 ring-[#0F2444]/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-slate-300'
                          }`}
                        >
                          {/* Miniature Graphic Poster Diagram */}
                          <div className="w-full h-9 rounded-md overflow-hidden relative border border-slate-200/70 dark:border-slate-700">
                            {mode.id === 'diagonal-campaign' && (
                              <div className="w-full h-full bg-emerald-600 relative">
                                <div
                                  className="absolute inset-0 bg-[#0A1E3C]"
                                  style={{ clipPath: 'polygon(0 0, 58% 0, 35% 100%, 0 100%)' }}
                                />
                                <div className="absolute top-1.5 inset-x-1.5 h-1.5 bg-white/90 rounded-2xs" />
                                <div className="absolute bottom-1 inset-x-2 h-1 bg-amber-300/90 rounded-2xs" />
                              </div>
                            )}
                            {mode.id === 'duotone-editorial' && (
                              <div className="w-full h-full bg-gradient-to-br from-emerald-700 to-teal-900 relative">
                                <div className="absolute top-1.5 left-1.5 right-3 h-1.5 bg-white/90 rounded-2xs" />
                                <div className="absolute bottom-2 right-1.5 left-3 h-1 bg-white/80 rounded-2xs" />
                              </div>
                            )}
                            {mode.id === 'club-neon-spotlight' && (
                              <div className="w-full h-full bg-[#07193B] relative">
                                <div className="absolute top-1 inset-x-2 h-1.5 bg-amber-400 rounded-2xs" />
                                <div className="absolute top-4 left-1.5 w-7 h-2.5 bg-[#091834] border border-amber-400" />
                              </div>
                            )}
                            {mode.id === 'academy-info-poster' && (
                              <div className="w-full h-full bg-gradient-to-b from-sky-200 via-sky-50 to-white relative">
                                <div className="absolute top-1 inset-x-2 h-1.5 bg-[#0A3E96] rounded-2xs" />
                                <div className="absolute bottom-2 inset-x-1.5 grid grid-cols-3 gap-0.5">
                                  <div className="h-2 bg-white border border-sky-200 rounded-2xs" />
                                  <div className="h-2 bg-white border border-sky-200 rounded-2xs" />
                                  <div className="h-2 bg-white border border-sky-200 rounded-2xs" />
                                </div>
                                <div className="absolute bottom-0.5 inset-x-2 h-1 bg-[#0A2C6B] rounded-full" />
                              </div>
                            )}
                            {mode.id === 'classic-card' && (
                              <div className="w-full h-full bg-slate-800 relative p-1 flex flex-col justify-between">
                                <div className="h-1.5 w-8 bg-white/85 rounded-2xs" />
                                <div className="h-3 w-full bg-slate-600 rounded-2xs" />
                                <div className="h-1 w-full bg-amber-400 rounded-2xs" />
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-tight line-clamp-1">
                            {mode.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STEP 2: HEADLINE & COPY SELECTION */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Başlık & Metin
                  </span>
                  <select
                    aria-label="Hazır Metin Seç"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleSelectCopyPreset(e.target.value);
                      e.target.value = '';
                    }}
                    className="h-8 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer max-w-[200px]"
                  >
                    <option value="" disabled>
                      Hazır metin seç...
                    </option>
                    {categoryCopyPresets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Başlık
                    </label>
                    <input
                      type="text"
                      value={design.headline}
                      onChange={(e) =>
                        setDesign((prev) => ({ ...prev, headline: e.target.value }))
                      }
                      placeholder="Örn: YENİ DÖNEM KAYITLARI BAŞLADI"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-[#0F2444]/20"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Metin / Açıklama
                    </label>
                    <textarea
                      rows={2}
                      value={design.subheadline}
                      onChange={(e) =>
                        setDesign((prev) => ({ ...prev, subheadline: e.target.value }))
                      }
                      placeholder="Afiş veya gönderide görünecek açıklama metni..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-[#0F2444]/20"
                    />
                  </div>
                </div>
              </div>

              {/* STEP 3: LOGO UPLOAD & CLUB NAME */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    3. Logo Ekleme
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setDesign((prev) => ({ ...prev, showClubLogo: !prev.showClubLogo }))
                    }
                    className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                  >
                    {design.showClubLogo ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Logoyu Göster</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                        <span>Logo Gizli</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1 shrink-0">
                    {design.clubLogoUrl ? (
                      <img
                        src={design.clubLogoUrl}
                        alt={design.clubName}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Shield className="w-5 h-5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-[130px]">
                    <input
                      type="text"
                      value={design.clubName}
                      onChange={(e) =>
                        setDesign((prev) => ({ ...prev, clubName: e.target.value }))
                      }
                      aria-label="Kulüp Adı"
                      placeholder="Kulüp Adı"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-white"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => logoUploadRef.current?.click()}
                      className="h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{design.clubLogoUrl ? 'Değiştir' : 'Logo Yükle'}</span>
                    </button>
                    {design.clubLogoUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setDesign((prev) => ({
                            ...prev,
                            clubLogoUrl: '',
                          }))
                        }
                        title="Logoyu Kaldır"
                        className="w-9 h-9 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* STEP 4: PROMPT VISUAL COMPOSER */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    4. Prompt ile Görsel Alanı
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      activeCategory === 'sporcu-kartlari'
                        ? heroUploadRef.current?.click()
                        : featureUploadRef.current?.click()
                    }
                    className="text-xs font-bold text-[#0F2444] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Özel Görsel Yükle</span>
                  </button>
                </div>

                <textarea
                  rows={2}
                  value={promptText}
                  onChange={(e) => handlePromptChange(e.target.value)}
                  placeholder="Nasıl bir tasarım istiyorsunuz? Örn: U14 basketbol maç günü afişi, salon atmosferi..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0F2444]/20"
                />

                {/* Quick Prompt Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {STUDIO_QUICK_PROMPTS.map((qp) => (
                    <button
                      key={qp.label}
                      type="button"
                      onClick={() => {
                        setPromptText(qp.prompt);
                        const matched = matchStudioSceneByPrompt(qp.prompt, qp.categoryId);
                        setSelectedSceneId(matched.id);
                        setDesign((prev) => applySceneVisualToState(prev, matched));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
                    >
                      {qp.label}
                    </button>
                  ))}
                </div>

                {/* Matching Visual Strip */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold">Prompta Uygun Sahne Görselleri</span>
                    <button
                      type="button"
                      disabled={isComposingAi}
                      onClick={handleSuggestCopyWithAi}
                      className="font-bold text-[#0F2444] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {isComposingAi ? 'Öneriliyor...' : 'Prompttan AI Metin Öner'}
                      </span>
                    </button>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {orderedSceneGallery.slice(0, 8).map((scene) => {
                      const isActive =
                        selectedSceneId === scene.id || activeVisualUrl === scene.url;
                      return (
                        <button
                          key={scene.id}
                          type="button"
                          onClick={() => handleSelectScene(scene)}
                          title={scene.title}
                          className={`group relative w-20 shrink-0 rounded-xl overflow-hidden border text-left transition-all cursor-pointer ${
                            isActive
                              ? 'border-[#0F2444] dark:border-sky-400 ring-2 ring-[#0F2444]/20'
                              : 'border-slate-200 dark:border-slate-700 opacity-85 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={scene.url}
                            alt={scene.title}
                            className="w-20 h-14 object-cover"
                          />
                          <div className="px-1.5 py-1 bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate">
                            {scene.title}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {aiComposeHint && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5">
                      {aiComposeHint}
                    </div>
                  )}
                </div>
              </div>

              {/* PRIMARY CREATE DESIGN CTA */}
              <button
                type="button"
                onClick={handleGenerateDesign}
                className="w-full h-12 rounded-xl bg-[#0F2444] hover:bg-blue-900 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Wand2 className="w-4 h-4" />
                <span>Tasarım Oluştur</span>
              </button>

              {/* COLLAPSIBLE ADVANCED CUSTOMIZATION */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="w-full py-2 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Gelişmiş Özelleştirme (Format, Renk, Ek Görseller & Detaylar)</span>
                  </span>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="pt-3 space-y-4 text-xs">
                    {/* Quick Club Data Bindings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <select
                          aria-label="Sporcu Verisinden Doldur"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) handleSelectAthleteAutofill(e.target.value);
                            e.target.value = '';
                          }}
                          className="w-full h-9 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          <option value="" disabled>
                            Sporcudan Doldur...
                          </option>
                          {athleteOptions.map((ath) => (
                            <option key={ath.id} value={ath.id}>
                              {ath.name} ({ath.branch})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <select
                          aria-label="Şubeden Bilgi Doldur"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) handleSelectBranchAutofill(e.target.value);
                            e.target.value = '';
                          }}
                          className="w-full h-9 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold cursor-pointer"
                        >
                          <option value="" disabled>
                            Şubeden Doldur...
                          </option>
                          {branchOptions.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Tuval Formatı
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {STUDIO_ASPECT_RATIOS.map((ratio) => {
                          const active = design.aspectRatio === ratio.id;
                          return (
                            <button
                              key={ratio.id}
                              type="button"
                              onClick={() =>
                                setDesign((prev) => ({
                                  ...prev,
                                  aspectRatio: ratio.id as StudioAspectRatioId,
                                }))
                              }
                              className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                                active
                                  ? 'bg-[#0F2444] text-white border-transparent'
                                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <div className="font-bold text-[11px]">{ratio.shortLabel}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Theme Palette */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-slate-700 dark:text-slate-300">
                          Renk Teması
                        </label>
                        <button
                          type="button"
                          onClick={handleApplyBrandKitToCurrent}
                          className="text-[11px] font-bold text-[#0F2444] dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          Marka Kitini Uygula
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {STUDIO_THEME_PALETTES.map((pal) => {
                          const active = design.themeId === pal.id;
                          return (
                            <button
                              key={pal.id}
                              type="button"
                              onClick={() => handleApplyPalette(pal.id)}
                              className={`p-2 rounded-xl border text-left cursor-pointer ${
                                active
                                  ? 'border-[#0F2444] dark:border-sky-400 bg-slate-50 dark:bg-slate-800'
                                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-1 mb-1">
                                <span
                                  className="w-3.5 h-3.5 rounded border border-black/10"
                                  style={{ backgroundColor: pal.backgroundColor }}
                                />
                                <span
                                  className="w-3.5 h-3.5 rounded border border-black/10"
                                  style={{ backgroundColor: pal.primaryColor }}
                                />
                                <span
                                  className="w-3.5 h-3.5 rounded border border-black/10"
                                  style={{ backgroundColor: pal.accentColor }}
                                />
                              </div>
                              <div className="font-bold text-[11px] truncate">{pal.name}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Colors + Pattern + Alignment */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Zemin
                        </label>
                        <input
                          type="color"
                          value={design.backgroundColor}
                          onChange={(e) =>
                            setDesign((prev) => ({
                              ...prev,
                              themeId: 'custom',
                              backgroundColor: e.target.value,
                            }))
                          }
                          className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Ana Renk
                        </label>
                        <input
                          type="color"
                          value={design.primaryColor}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, primaryColor: e.target.value }))
                          }
                          className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Vurgu
                        </label>
                        <input
                          type="color"
                          value={design.accentColor}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, accentColor: e.target.value }))
                          }
                          className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Arka Plan Deseni
                        </label>
                        <select
                          value={design.patternStyle}
                          onChange={(e) =>
                            setDesign((prev) => ({
                              ...prev,
                              patternStyle: e.target.value as StudioPatternStyle,
                            }))
                          }
                          className="w-full h-9 px-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        >
                          <option value="court-lines">Saha Çizgileri</option>
                          <option value="dot-grid">Nokta Izgara</option>
                          <option value="diagonal-stripes">Dinamik Çapraz</option>
                          <option value="clean-solid">Düz Temiz Zemin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Metin Hizalama
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setDesign((prev) => ({ ...prev, textAlign: 'left' }))
                            }
                            className={`h-9 rounded-xl border flex items-center justify-center gap-1 font-bold cursor-pointer ${
                              design.textAlign === 'left'
                                ? 'bg-[#0F2444] text-white border-transparent'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <AlignLeft className="w-3.5 h-3.5" />
                            <span>Sol</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDesign((prev) => ({ ...prev, textAlign: 'center' }))
                            }
                            className={`h-9 rounded-xl border flex items-center justify-center gap-1 font-bold cursor-pointer ${
                              design.textAlign === 'center'
                                ? 'bg-[#0F2444] text-white border-transparent'
                                : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <AlignCenter className="w-3.5 h-3.5" />
                            <span>Orta</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Headline scale */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">
                          Başlık Boyutu
                        </span>
                        <span className="tabular-nums font-bold">%{design.headlineScale}</span>
                      </div>
                      <input
                        type="range"
                        min={80}
                        max={125}
                        value={design.headlineScale}
                        onChange={(e) =>
                          setDesign((prev) => ({
                            ...prev,
                            headlineScale: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-[#0F2444]"
                      />
                    </div>

                    {/* Additional Fields: Kicker, Badge, CTA, Date/Time/Location */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Üst Etiket
                        </label>
                        <input
                          type="text"
                          value={design.kicker}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, kicker: e.target.value }))
                          }
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Vurgu Rozeti
                        </label>
                        <input
                          type="text"
                          value={design.highlightBadge}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, highlightBadge: e.target.value }))
                          }
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Tarih
                        </label>
                        <input
                          type="text"
                          value={design.dateText}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, dateText: e.target.value }))
                          }
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Saat
                        </label>
                        <input
                          type="text"
                          value={design.timeText}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, timeText: e.target.value }))
                          }
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Salon / Şube
                        </label>
                        <input
                          type="text"
                          value={design.locationText}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, locationText: e.target.value }))
                          }
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Alt Çağrı Metni
                        </label>
                        <input
                          type="text"
                          value={design.ctaText}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, ctaText: e.target.value }))
                          }
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Telefon / Web
                        </label>
                        <input
                          type="text"
                          value={design.footerContact}
                          onChange={(e) =>
                            setDesign((prev) => ({ ...prev, footerContact: e.target.value }))
                          }
                          className="w-full px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 tabular-nums"
                        />
                      </div>
                    </div>

                    {/* Category-specific fields */}
                    {design.categoryId === 'mac-turnuva' && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          Maç & Skor Bilgileri
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={design.homeTeamName}
                            onChange={(e) =>
                              setDesign((prev) => ({ ...prev, homeTeamName: e.target.value }))
                            }
                            placeholder="Ev Sahibi"
                            className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                          <input
                            type="text"
                            value={design.awayTeamName}
                            onChange={(e) =>
                              setDesign((prev) => ({ ...prev, awayTeamName: e.target.value }))
                            }
                            placeholder="Deplasman"
                            className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                        {design.layoutVariant === 'final-score' && (
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={design.homeScore}
                              onChange={(e) =>
                                setDesign((prev) => ({ ...prev, homeScore: e.target.value }))
                              }
                              placeholder="Ev Skor"
                              className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold tabular-nums"
                            />
                            <input
                              type="text"
                              value={design.awayScore}
                              onChange={(e) =>
                                setDesign((prev) => ({ ...prev, awayScore: e.target.value }))
                              }
                              placeholder="Rakip Skor"
                              className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold tabular-nums"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {design.categoryId === 'sporcu-kartlari' && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            Sporcu Kartı Detayları
                          </span>
                          <button
                            type="button"
                            onClick={() => avatarUploadRef.current?.click()}
                            className="text-[11px] font-bold text-[#0F2444] dark:text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Sporcu Fotoğrafı</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={design.athleteName}
                            onChange={(e) =>
                              setDesign((prev) => ({ ...prev, athleteName: e.target.value }))
                            }
                            placeholder="Sporcu Adı"
                            className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                          <input
                            type="text"
                            value={design.athleteBranch}
                            onChange={(e) =>
                              setDesign((prev) => ({ ...prev, athleteBranch: e.target.value }))
                            }
                            placeholder="Branş"
                            className="px-2.5 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      </div>
                    )}

                    {/* Extra Image / Sponsor Layers */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5" />
                          <span>Ek Görsel & Sponsor Katmanları</span>
                        </span>
                        <span className="text-[11px] font-bold tabular-nums text-slate-500">
                          {design.customImages?.length || 0}/6
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => customLayerUploadRef.current?.click()}
                          className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Katman Ekle</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => heroUploadRef.current?.click()}
                          className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                          <span>Arka Plan Fotoğrafı</span>
                        </button>
                        {design.showFeatureImage && design.featureImageUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setDesign((prev) => ({
                                ...prev,
                                featureImageFit:
                                  prev.featureImageFit === 'cover' ? 'contain' : 'cover',
                              }))
                            }
                            className="h-8 px-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold cursor-pointer"
                          >
                            Görsel Modu:{' '}
                            {design.featureImageFit === 'cover' ? 'Doldur' : 'Sığdır'}
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="url"
                          value={customLayerUrlInput}
                          onChange={(e) => setCustomLayerUrlInput(e.target.value)}
                          placeholder="Sponsor / çıkartma görsel URL (https://...)"
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px]"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleAddCustomImageFromUrl(customLayerUrlInput, 'Ek Görsel')
                          }
                          className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-[11px] cursor-pointer"
                        >
                          Ekle
                        </button>
                      </div>

                      {(design.customImages?.length || 0) > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {design.customImages.map((layer) => (
                            <div
                              key={layer.id}
                              className={`flex items-center justify-between gap-2 p-2 rounded-lg border ${
                                selectedLayerId === layer.id
                                  ? 'bg-white dark:bg-slate-900 border-[#0F2444] dark:border-sky-400'
                                  : 'bg-white/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedLayerId(layer.id)}
                                className="flex items-center gap-2 flex-1 min-w-0 text-left cursor-pointer"
                              >
                                <img
                                  src={layer.url}
                                  alt={layer.label}
                                  className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0"
                                />
                                <span className="font-bold truncate">{layer.label}</span>
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => moveCustomLayerToFront(layer.id)}
                                  title="Öne Al"
                                  className="w-7 h-7 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeCustomLayer(layer.id)}
                                  title="Sil"
                                  className="w-7 h-7 rounded border border-rose-200 text-rose-600 flex items-center justify-center cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}

                          {(() => {
                            const activeLayer = design.customImages.find(
                              (l) => l.id === selectedLayerId
                            );
                            if (!activeLayer) return null;
                            return (
                              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-2">
                                <div>
                                  <div className="text-[10px] font-semibold text-slate-500">
                                    Boyut ({activeLayer.width}px)
                                  </div>
                                  <input
                                    type="range"
                                    min={48}
                                    max={340}
                                    value={activeLayer.width}
                                    onChange={(e) =>
                                      updateCustomLayer(activeLayer.id, {
                                        width: Number(e.target.value),
                                      })
                                    }
                                    className="w-full accent-[#0F2444]"
                                  />
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold text-slate-500">
                                    Köşe ({activeLayer.borderRadius}px)
                                  </div>
                                  <input
                                    type="range"
                                    min={0}
                                    max={160}
                                    value={activeLayer.borderRadius}
                                    onChange={(e) =>
                                      updateCustomLayer(activeLayer.id, {
                                        borderRadius: Number(e.target.value),
                                      })
                                    }
                                    className="w-full accent-[#0F2444]"
                                  />
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold text-slate-500">
                                    Opaklık (%{activeLayer.opacity})
                                  </div>
                                  <input
                                    type="range"
                                    min={20}
                                    max={100}
                                    value={activeLayer.opacity}
                                    onChange={(e) =>
                                      updateCustomLayer(activeLayer.id, {
                                        opacity: Number(e.target.value),
                                      })
                                    }
                                    className="w-full accent-[#0F2444]"
                                  />
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT PANEL: STICKY REAL-TIME LIVE CANVAS STAGE & EXPORT */}
            <div
              className={`md:col-span-7 md:sticky md:top-2 bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 ${
                mobilePane === 'preview' ? 'block' : 'hidden md:block'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs min-w-0">
                  <Eye className="w-4 h-4 text-[#0F2444] dark:text-sky-400 shrink-0" />
                  <span className="font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                    Canlı Önizleme
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="font-semibold text-slate-600 dark:text-slate-300 truncate">
                    {STUDIO_VISUAL_MODES.find(
                      (m) => m.id === (design.visualMode || 'diagonal-campaign')
                    )?.title || 'Dinamik Şerit'}
                  </span>
                  <span className="text-slate-400 hidden sm:inline">·</span>
                  <span className="text-slate-500 dark:text-slate-400 tabular-nums hidden sm:inline">
                    {activeRatioMeta.dimensionsLabel}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {/* Instant Aspect Ratio Pills */}
                  <div className="hidden sm:inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 mr-1">
                    {STUDIO_ASPECT_RATIOS.map((ratio) => {
                      const active = design.aspectRatio === ratio.id;
                      return (
                        <button
                          key={ratio.id}
                          type="button"
                          onClick={() =>
                            setDesign((prev) => ({
                              ...prev,
                              aspectRatio: ratio.id as StudioAspectRatioId,
                            }))
                          }
                          className={`px-2 py-1 rounded-md text-[11px] font-bold tabular-nums cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                            active
                              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
                          }`}
                        >
                          {ratio.id}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSafeGuides((v) => !v)}
                    className={`h-8 px-2.5 rounded-lg border text-xs font-bold flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                      showSafeGuides
                        ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                    title="Güvenli Alan Çizgileri"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kılavuz</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setManualZoomDelta((d) => Number(Math.max(0.35 - autoFitZoom, d - 0.1).toFixed(2)))
                    }
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                    aria-label="Uzaklaştır"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualZoomDelta(0)}
                    title="Ekrana Sığdır"
                    className="text-xs font-bold tabular-nums w-11 text-center text-slate-700 dark:text-slate-200 hover:text-sky-600 cursor-pointer"
                  >
                    %{Math.round(effectiveZoom * 100)}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setManualZoomDelta((d) => Number(Math.min(1.15 - autoFitZoom, d + 0.1).toFixed(2)))
                    }
                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                    aria-label="Yakınlaştır"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Canvas Drafting Stage */}
              <div
                ref={stageWrapperRef}
                className="w-full overflow-x-auto rounded-2xl bg-slate-100 dark:bg-[#09101c] border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex items-center justify-center min-h-[380px]"
              >
                <StudioCanvasPreview
                  design={design}
                  exportRef={exportStageRef}
                  zoom={effectiveZoom}
                  showSafeGuides={showSafeGuides}
                  selectedLayerId={selectedLayerId}
                  onSelectLayer={(id) => {
                    setSelectedLayerId(id);
                    if (id) setShowAdvanced(true);
                  }}
                  onUpdateLayerPosition={(id, x, y) => updateCustomLayer(id, { x, y })}
                />
              </div>

              {/* Export & Save Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDesignToWorkspace}
                    disabled={isSavingWorkspace}
                    className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingWorkspace ? 'Kaydediliyor...' : 'Kaydet'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(design.templateId)}
                    className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Sıfırla</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isExporting !== null}
                    onClick={() => handleExport('jpeg')}
                    className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExporting === 'jpeg' ? 'Hazırlanıyor...' : 'JPEG'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExporting !== null}
                    onClick={() => handleExport('pdf')}
                    className="h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{isExporting === 'pdf' ? 'Hazırlanıyor...' : 'PDF'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isExporting !== null}
                    onClick={() => handleExport('png')}
                    className="h-10 px-4 rounded-xl bg-[#0F2444] hover:bg-blue-900 dark:bg-sky-600 dark:hover:bg-sky-500 text-white text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExporting === 'png' ? 'Oluşturuluyor...' : 'PNG İndir'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SAVED DESIGNS */}
      {workspaceTab === 'saved' && (
        <section className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Kayıtlı Kulüp Tasarımları
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kaydettiğiniz duyuru, maç afişi, sporcu kartı ve sosyal medya şablonları
              </p>
            </div>
          </div>

          {savedDesigns.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-3">
              <FolderOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Henüz kayıtlı tasarımınız bulunmuyor
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Tasarım Oluştur sekmesinden tasarımınızı hazırlayıp “Kaydet” butonuna bastığınızda burada listelenir.
              </p>
              <button
                type="button"
                onClick={() => setWorkspaceTab('editor')}
                className="h-10 px-4 rounded-xl bg-[#0F2444] text-white text-xs font-bold cursor-pointer"
              >
                İlk Tasarımı Oluştur
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedDesigns.map((item) => {
                const catMeta = STUDIO_CATEGORIES.find((c) => c.id === item.categoryId);
                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between gap-4 bg-slate-50/60 dark:bg-slate-900/40"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>{catMeta?.title || 'Tasarım'}</span>
                        <span className="tabular-nums">{item.aspectRatio}</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {item.state.headline} · {item.state.clubName}
                      </p>
                      <div className="text-[11px] text-slate-400 tabular-nums">
                        Güncelleme: {new Date(item.updatedAt).toLocaleDateString('tr-TR')}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleLoadSavedDesign(item)}
                        className="h-9 px-3.5 rounded-lg bg-[#0F2444] text-white text-xs font-bold cursor-pointer flex-1"
                      >
                        Düzenle & İndir
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const cloned: SavedStudioDesign = {
                            ...item,
                            id: `saved-${Date.now()}`,
                            title: `${item.title} (Kopya)`,
                            updatedAt: new Date().toISOString(),
                          };
                          cloned.state = {
                            ...cloned.state,
                            id: cloned.id,
                            designName: cloned.title,
                          };
                          const next = [cloned, ...savedDesigns];
                          setSavedDesigns(next);
                          saveStudioWorkspaceToFirestore({
                            brandKit,
                            savedDesigns: next,
                          }).catch(() => {});
                          notify('Tasarım kopyalandı.');
                        }}
                        className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white cursor-pointer"
                        title="Kopyala"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSavedDesign(item.id)}
                        className="w-9 h-9 rounded-lg border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 hover:bg-rose-50 cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 3: CLUB BRAND KIT */}
      {workspaceTab === 'brand' && (
        <section className="bg-white dark:bg-[#111c2e] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                Kulüp Marka Kiti
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Yeni açılan tüm afiş, maç günü ve sosyal medya şablonları otomatik olarak buradaki kulüp kimliğinizi kullanır.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveBrandKit}
              disabled={isSavingWorkspace}
              className="h-10 px-4 rounded-xl bg-[#0F2444] text-white text-xs font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>{isSavingWorkspace ? 'Kaydediliyor...' : 'Marka Kitini Kaydet'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Varsayılan Kulüp Adı
              </label>
              <input
                type="text"
                value={brandKit.clubName}
                onChange={(e) => setBrandKit((prev) => ({ ...prev, clubName: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-semibold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Varsayılan Telefon
              </label>
              <input
                type="text"
                value={brandKit.phone}
                onChange={(e) => setBrandKit((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 tabular-nums"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Web Sitesi / Instagram Adresi
              </label>
              <input
                type="text"
                value={brandKit.websiteOrHandle}
                onChange={(e) =>
                  setBrandKit((prev) => ({ ...prev, websiteOrHandle: e.target.value }))
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ana Marka Rengi
                </label>
                <input
                  type="color"
                  value={brandKit.primaryColor}
                  onChange={(e) =>
                    setBrandKit((prev) => ({ ...prev, primaryColor: e.target.value }))
                  }
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Vurgu Rengi
                </label>
                <input
                  type="color"
                  value={brandKit.accentColor}
                  onChange={(e) =>
                    setBrandKit((prev) => ({ ...prev, accentColor: e.target.value }))
                  }
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden p-1.5">
                {brandKit.logoUrl ? (
                  <img
                    src={brandKit.logoUrl}
                    alt={brandKit.clubName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Palette className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  Kulüp Logosu (Marka Kiti)
                </div>
                <div className="text-[11px] text-slate-500">
                  PNG, JPEG veya SVG formatında şeffaf kulüp arması önerilir.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => brandLogoUploadRef.current?.click()}
                className="h-9 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Logo Seç</span>
              </button>
              <button
                type="button"
                onClick={() => setBrandKit(getDefaultStudioBrandKit())}
                className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 cursor-pointer"
              >
                Kulüp Profilinden Çek
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={heroUploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => handleImageUpload(e, 'hero')}
        className="hidden"
      />
      <input
        ref={featureUploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => handleImageUpload(e, 'feature')}
        className="hidden"
      />
      <input
        ref={customLayerUploadRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => {
          handleCustomLayersUpload(e.target.files);
          e.target.value = '';
        }}
        className="hidden"
      />
      <input
        ref={avatarUploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => handleImageUpload(e, 'avatar')}
        className="hidden"
      />
      <input
        ref={logoUploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => handleImageUpload(e, 'logo')}
        className="hidden"
      />
      <input
        ref={brandLogoUploadRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => handleImageUpload(e, 'brand-logo')}
        className="hidden"
      />
    </div>
  );
};
