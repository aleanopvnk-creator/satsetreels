"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  Clipboard,
  X,
  BadgeCheck,
  Video,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  AlertCircle,
  FileText,
  CheckCircle2,
  Music,
  History,
  Trash2,
  Globe,
  Sun,
  Moon,
  Clock,
  Image as ImageIcon,
  Camera,
  Film,
  Headphones,
  ScanSearch,
  Infinity,
  Info,
  Menu,
} from "lucide-react";
import FaqAccordion from "@/components/FaqAccordion";
import AdSlot from "@/components/AdSlot";
import InfoModal, { ModalTab } from "@/components/InfoModal";
import { Language, translations } from "@/lib/translations";

export interface MediaItem {
  id?: string;
  type: "video" | "image";
  url: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
}

export interface ExtractionData {
  shortcode: string;
  mediaType: "video" | "image";
  videoUrl?: string;
  audioUrl?: string;
  imageUrl?: string;
  items?: MediaItem[];
  thumbnailUrl: string;
  caption: string;
  author: string;
  duration?: number;
  source: string;
}

export interface DownloadHistoryItem {
  id: string;
  shortcode: string;
  url: string;
  thumbnailUrl: string;
  author: string;
  caption: string;
  mediaType: "video" | "image";
  timestamp: number;
  timeFormatted?: string;
}

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExtractionData | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [downloadingVideo, setDownloadingVideo] = useState(false);
  const [downloadingAudio, setDownloadingAudio] = useState(false);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<"reels" | "audio" | "photo">("reels");
  const [mismatchSuggestion, setMismatchSuggestion] = useState<"reels" | "audio" | "photo" | null>(null);

  // Production Features
  const [lang, setLang] = useState<Language>("id");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
  const [copiedHistoryId, setCopiedHistoryId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaModal, setShowPwaModal] = useState(false);

  const t = translations[lang];

  // Helper to detect if an Instagram URL is explicitly a Reels video
  const isExplicitReelsUrl = (testUrl: string) => {
    return /(?:instagram\.com|instagr\.am)\/(?:reel|reels|share\/reel)\/([A-Za-z0-9_-]+)/i.test(testUrl.trim());
  };

  // Interactive handler for services from Hero or Footer
  const handleSelectService = (category: "reels" | "audio" | "photo") => {
    setActiveCategory(category);
    scrollToSection("hero");
    setTimeout(() => {
      const inputEl = document.getElementById("instagram-url-input");
      inputEl?.focus();
    }, 350);

    const currentInput = url.trim();

    // Real-time mismatch check: If user typed/pasted a Reels link but selects "photo" (Foto HD)
    if (currentInput && isExplicitReelsUrl(currentInput) && category === "photo") {
      setError(t.categories.mismatch.photoForReels);
      setMismatchSuggestion("reels");
      setData(null);
      return;
    }

    // If data is already extracted on screen, check if selected category contradicts media type
    if (data) {
      const isVideoContent = data.mediaType === "video" || !!data.videoUrl;
      if (isVideoContent && category === "photo") {
        setError(t.categories.mismatch.photoForVideo);
        setMismatchSuggestion("reels");
        setData(null);
        return;
      } else if (!isVideoContent && category === "reels") {
        setError(t.categories.mismatch.videoForPhoto);
        setMismatchSuggestion("photo");
        setData(null);
        return;
      } else if (!isVideoContent && category === "audio") {
        setError(t.categories.mismatch.audioForPhoto);
        setMismatchSuggestion("photo");
        setData(null);
        return;
      }
    }

    // Clear mismatch error if switching to a compatible category
    if (mismatchSuggestion) {
      setError(null);
      setMismatchSuggestion(null);
    }
  };

  // Quick switch category handler from error banner
  const handleSwitchCategory = (targetCat: "reels" | "audio" | "photo") => {
    setActiveCategory(targetCat);
    setError(null);
    setMismatchSuggestion(null);
    if (url.trim()) {
      triggerSubmit(url.trim(), targetCat);
    }
  };

  // Helper to smoothly scroll to an element considering sticky header and mobile viewports
  const scrollToSection = (id: string) => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(id);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "start" });

    setTimeout(() => {
      const updatedEl = document.getElementById(id);
      if (updatedEl) {
        const rect = updatedEl.getBoundingClientRect();
        if (rect.top < 50 || rect.top > 180) {
          const headerOffset = 70;
          const elementPosition = rect.top + window.scrollY;
          window.scrollTo({
            top: Math.max(0, elementPosition - headerOffset),
            behavior: "smooth",
          });
        }
      }
    }, 260);
  };

  // Automatic smooth scroll to loading skeleton when extraction starts
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        scrollToSection("loading-section");
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Automatic smooth scroll to result area when extraction completes successfully
  useEffect(() => {
    if (data && !isLoading) {
      const timer = setTimeout(() => {
        scrollToSection("result-section");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data, isLoading]);

  // Load Saved Preferences (Theme, Language, History) & PWA Listeners
  useEffect(() => {
    try {
      const savedLang = (localStorage.getItem("satsetreels_lang") || localStorage.getItem("reelsnap_lang")) as Language | null;
      if (savedLang === "id" || savedLang === "en") {
        setLang(savedLang);
      }

      const savedTheme = (localStorage.getItem("satsetreels_theme") || localStorage.getItem("reelsnap_theme")) as "dark" | "light" | null;
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }

      const savedHistory = localStorage.getItem("satsetreels_download_history") || localStorage.getItem("reelsnap_download_history");
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setHistory(parsed.slice(0, 6));
        }
      }
    } catch {
      // ignore storage errors
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Theme Toggle Handler
  const toggleTheme = () => {
    const isCurrentDark = document.documentElement.classList.contains("dark");
    const newTheme = isCurrentDark ? "light" : "dark";
    
    document.documentElement.classList.add("theme-transitioning");
    setTheme(newTheme);
    if (typeof document !== "undefined") {
      const d = document.documentElement;
      d.classList.remove("dark", "light");
      d.classList.add(newTheme);
      d.setAttribute("data-theme", newTheme);
      d.style.colorScheme = newTheme;
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) metaTheme.setAttribute("content", newTheme === "light" ? "#f8fafc" : "#09090b");
    }
    try {
      localStorage.setItem("satsetreels_theme", newTheme);
    } catch {
      // ignore
    }
    setTimeout(() => {
      document.documentElement.classList.remove("theme-transitioning");
    }, 250);
  };

  // Language Toggle Handler
  const toggleLanguage = () => {
    const newLang: Language = lang === "id" ? "en" : "id";
    setLang(newLang);
    try {
      localStorage.setItem("satsetreels_lang", newLang);
    } catch {
      // ignore
    }
  };

  // Install PWA Handler
  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else {
      setShowPwaModal(true);
    }
  };

  const handleOpenModal = (tab: ModalTab) => {
    setModalTab(tab);
  };

  const handleScrollToFaq = () => {
    const faqElement = document.getElementById("faq");
    if (faqElement) {
      faqElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Extraction submit runner
  const triggerSubmit = useCallback(
    async (targetUrl: string, categoryOverride?: "reels" | "audio" | "photo") => {
      const cleanTarget = targetUrl.trim();
      if (!cleanTarget) {
        setError(t.hero.emptyError);
        setMismatchSuggestion(null);
        return;
      }

      const activeCat = categoryOverride || activeCategory;

      // 1. Instant check: If user selected "photo" (Foto HD) but the link is a Reels video link
      if (activeCat === "photo" && isExplicitReelsUrl(cleanTarget)) {
        setError(t.categories.mismatch.photoForReels);
        setMismatchSuggestion("reels");
        setData(null);
        setIsLoading(false);
        return;
      }

      // Dismiss virtual keyboard on mobile for maximum viewport visibility
      if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      setIsLoading(true);
      setError(null);
      setMismatchSuggestion(null);
      setData(null);
      setIsCaptionExpanded(false);

      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: cleanTarget }),
        });

        const resData = await response.json();

        if (!response.ok || !resData.success) {
          throw new Error(resData.error || "Gagal mengekstrak media dari URL Instagram tersebut.");
        }

        const isVideoContent = resData.mediaType === "video" || !!resData.videoUrl;

        // 2. Strict Feature Validation on extracted content:
        // If user chose "Foto HD" but the media is a Video
        if (activeCat === "photo" && isVideoContent) {
          setError(t.categories.mismatch.photoForVideo);
          setMismatchSuggestion("reels");
          setData(null);
          return;
        }

        // If user chose "Video Reels" but the media is a static Photo
        if (activeCat === "reels" && !isVideoContent) {
          setError(t.categories.mismatch.videoForPhoto);
          setMismatchSuggestion("photo");
          setData(null);
          return;
        }

        // If user chose "Audio MP3" but the media is a static Photo without audio
        if (activeCat === "audio" && !isVideoContent) {
          setError(t.categories.mismatch.audioForPhoto);
          setMismatchSuggestion("photo");
          setData(null);
          return;
        }

        setData(resData);
        setError(null);
        setMismatchSuggestion(null);

        // Format timestamp safely inside event handler
        const now = new Date();
        const timeFormatted = now.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        // Save to Recent Downloads History (Max 6, deduplicated by shortcode)
        const historyItem: DownloadHistoryItem = {
          id: resData.shortcode,
          shortcode: resData.shortcode,
          url: cleanTarget,
          thumbnailUrl: resData.thumbnailUrl,
          author: resData.author || "Instagram Creator",
          caption: resData.caption || "",
          mediaType: resData.mediaType || "video",
          timestamp: Date.now(),
          timeFormatted,
        };

        setHistory((prev) => {
          const filtered = prev.filter((item) => item.shortcode !== resData.shortcode);
          const updated = [historyItem, ...filtered].slice(0, 6);
          try {
            localStorage.setItem("satsetreels_download_history", JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Terjadi gangguan saat mengambil data. Silakan periksa kembali tautan Anda."
        );
        setMismatchSuggestion(null);
      } finally {
        setIsLoading(false);
      }
    },
    [t.hero.emptyError, t.categories.mismatch, activeCategory, lang]
  );

  // Form submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerSubmit(url);
  };

  // Paste from clipboard handler with auto-fetch
  const handlePaste = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        setError(t.hero.clipboardError);
        return;
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        const clean = text.trim();
        setUrl(clean);
        setError(null);
        setMismatchSuggestion(null);

        // Auto-fetch if valid Instagram link
        if (/(?:instagram\.com|instagr\.am)\/(?:reel|reels|p|tv|share\/(?:reel|p))\/([A-Za-z0-9_-]+)/i.test(clean)) {
          triggerSubmit(clean);
        }
      }
    } catch {
      setError(t.hero.clipboardDenied);
    }
  };

  // Clear input handler
  const handleClear = () => {
    setUrl("");
    setError(null);
    setMismatchSuggestion(null);
    setData(null);
  };

  // Clear History handler
  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem("satsetreels_download_history");
      localStorage.removeItem("reelsnap_download_history");
    } catch {
      // ignore
    }
  };

  // Copy caption to clipboard
  const handleCopyCaption = async () => {
    if (!data?.caption) return;
    try {
      await navigator.clipboard.writeText(data.caption);
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2500);
    } catch {
      setError("Gagal menyalin keterangan ke clipboard.");
    }
  };

  // Copy link from history
  const handleCopyHistoryLink = async (itemUrl: string, id: string) => {
    try {
      await navigator.clipboard.writeText(itemUrl);
      setCopiedHistoryId(id);
      setTimeout(() => setCopiedHistoryId(null), 2000);
    } catch {
      // ignore
    }
  };

  // Direct download helpers triggering /api/download proxy
  const handleDownloadVideo = () => {
    if (!data?.videoUrl) return;
    setDownloadingVideo(true);
    const downloadUrl = `/api/download?url=${encodeURIComponent(data.videoUrl)}&filename=SatsetReels-${data.shortcode}.mp4`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `SatsetReels-${data.shortcode}.mp4`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloadingVideo(false), 2000);
  };

  const handleDownloadAudio = () => {
    const audioSource = data?.audioUrl || data?.videoUrl;
    if (!audioSource) return;
    setDownloadingAudio(true);
    const downloadUrl = `/api/download?url=${encodeURIComponent(audioSource)}&filename=SatsetReels-Audio-${data.shortcode}.mp3&type=audio`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `SatsetReels-Audio-${data.shortcode}.mp3`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloadingAudio(false), 2500);
  };

  const handleDownloadPhoto = (photoUrl?: string) => {
    const targetPhoto = photoUrl || data?.imageUrl || (data?.items && data.items[0]?.url) || data?.thumbnailUrl;
    if (!targetPhoto) return;
    setDownloadingPhoto(true);

    const downloadUrl = `/api/download?url=${encodeURIComponent(targetPhoto)}&filename=SatsetReels-Photo-${data?.shortcode}.jpg&type=image`;

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute("download", `SatsetReels-Photo-${data?.shortcode}.jpg`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloadingPhoto(false), 2000);
  };

  const handleReset = () => {
    setData(null);
    setUrl("");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        const inputEl = document.getElementById("instagram-url-input");
        inputEl?.focus();
      }, 350);
    }
  };

  // Media flags and item resolution
  const isVideo = data?.mediaType === "video";
  const currentPhotoUrl = data?.imageUrl || (data?.items && data.items[0]?.url) || data?.thumbnailUrl || "";
  const proxiedPhotoUrl = currentPhotoUrl
    ? `/api/download?url=${encodeURIComponent(currentPhotoUrl)}&filename=photo-${data?.shortcode}.jpg&type=image`
    : "";

  const proxiedVideoUrl = data?.videoUrl
    ? `/api/download?url=${encodeURIComponent(data.videoUrl)}&filename=preview-${data?.shortcode}.mp4`
    : "";

  const proxiedThumbnailUrl = data?.thumbnailUrl
    ? `/api/download?url=${encodeURIComponent(data.thumbnailUrl)}&filename=poster-${data?.shortcode}.jpg&type=image`
    : "";

  return (
    <div
      className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-zinc-950 text-slate-950 dark:text-zinc-100 overflow-x-hidden selection:bg-pink-500 selection:text-white"
    >
      {/* Top Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl border-b bg-white/95 dark:bg-zinc-950/85 border-slate-200 dark:border-zinc-800/80 shadow-xs dark:shadow-none"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => scrollToSection("hero")}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer text-left focus:outline-none"
            >
              <img
                src="/icon.png"
                alt="SatsetReels Logo"
                className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform hover:scale-105 select-none"
              />
              <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white">
                Satset<span className="text-ig-gradient font-bold">Reels</span>
              </span>
            </button>
          </div>

          {/* Center Navigation Anchor Links (Smooth Scroll) */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => scrollToSection("hero")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              {t.navbar.home}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("how-to")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              {t.navbar.howTo}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              {t.navbar.features}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("faq")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              {t.navbar.faq}
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("about")}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer"
            >
              {t.navbar.about}
            </button>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* PWA Install Button */}
            <button
              type="button"
              onClick={handleInstallApp}
              title={t.navbar.installApp}
              className="hidden xs:inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">{t.navbar.installApp}</span>
              <span className="sm:hidden">{t.navbar.installAppShort}</span>
            </button>

            {/* Language Switcher (ID / EN) */}
            <button
              type="button"
              onClick={toggleLanguage}
              title="Ganti Bahasa / Switch Language"
              className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
              <span>{lang.toUpperCase()}</span>
            </button>

            {/* Theme Toggle (Dark / Light) */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Ganti Tema"
              title={theme === "dark" ? "Mode Terang (Light Mode)" : "Mode Gelap (Dark Mode)"}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Sun className="w-4 h-4 text-zinc-300 hidden dark:block" />
              <Moon className="w-4 h-4 text-zinc-700 block dark:hidden" />
            </button>

            {/* Mobile Navigation Drawer Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white hover:bg-slate-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4 text-zinc-400" />
              ) : (
                <Menu className="w-4 h-4 text-zinc-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer Dropdown */}
        {mobileMenuOpen && (
          <div
            className="md:hidden border-b px-3 py-2.5 space-y-1 bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 shadow-md dark:shadow-lg"
          >
            <div className="grid grid-cols-1 gap-0.5">
              <button
                type="button"
                onClick={() => {
                  scrollToSection("hero");
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <span>{t.navbar.home}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  scrollToSection("how-to");
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <span>{t.navbar.howTo}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  scrollToSection("features");
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <span>{t.navbar.features}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  scrollToSection("faq");
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <span>{t.navbar.faq}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  scrollToSection("about");
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200"
              >
                <span>{t.navbar.about}</span>
              </button>
            </div>

            {/* Mobile Quick Action Link */}
            <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between px-2">
              <button
                type="button"
                onClick={() => {
                  handleInstallApp();
                  setMobileMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 py-1 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{t.navbar.installApp}</span>
              </button>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
                SatsetReels • Web App
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section id="hero" className="relative pt-6 pb-4 sm:pt-10 sm:pb-8 px-4 sm:px-6 scroll-mt-20">
          <div className="relative max-w-3xl mx-auto text-center">
            {/* Tag Badge */}
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-slate-200 dark:border-zinc-800 bg-slate-100/80 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 text-xs font-medium mb-3.5 sm:mb-4 select-none max-w-full">
              <span className="truncate sm:whitespace-normal">{t.hero.badge}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.2]">
              {t.hero.titleLine1} <br className="hidden sm:inline" />
              <span className="text-ig-gradient font-extrabold">{t.hero.titleLine2}</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm md:text-base font-normal text-slate-600 dark:text-zinc-400 max-w-lg mx-auto leading-relaxed px-2">
              {t.hero.subtitle}
            </p>

            {/* Category Selector Tabs */}
            <div className="mt-5 max-w-2xl mx-auto flex items-center justify-center">
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 gap-1">
                <button
                  type="button"
                  onClick={() => handleSelectService("reels")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeCategory === "reels"
                      ? "bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-sm font-semibold border border-slate-200/60 dark:border-zinc-700/60"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>{t.categories.reels}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectService("audio")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeCategory === "audio"
                      ? "bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-sm font-semibold border border-slate-200/60 dark:border-zinc-700/60"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-200"
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>{t.categories.audio}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectService("photo")}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    activeCategory === "photo"
                      ? "bg-white dark:bg-zinc-800 text-slate-950 dark:text-white shadow-sm font-semibold border border-slate-200/60 dark:border-zinc-700/60"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-200"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>{t.categories.photo}</span>
                </button>
              </div>
            </div>

            {/* Input Form Card */}
            <div className="mt-4 sm:mt-5 max-w-2xl mx-auto">
              <form
                onSubmit={handleSubmit}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const droppedText =
                    e.dataTransfer.getData("text/uri-list") ||
                    e.dataTransfer.getData("text/plain");
                  if (droppedText && droppedText.trim()) {
                    const clean = droppedText.trim();
                    setUrl(clean);
                    setError(null);
                    setTimeout(() => triggerSubmit(clean), 60);
                  }
                }}
                className={`rounded-2xl border p-1.5 sm:p-2 transition-all ${
                  isDragging
                    ? "border-pink-500 bg-pink-500/5 ring-2 ring-pink-500/20"
                    : "bg-white dark:bg-zinc-900/90 border-slate-300 dark:border-zinc-800 shadow-xs focus-within:border-slate-400 dark:focus-within:border-zinc-700 focus-within:ring-2 focus-within:ring-slate-300/40 dark:focus-within:ring-zinc-700/40"
                }`}
              >
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="url"
                      id="instagram-url-input"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData("text").trim();
                        if (/(?:instagram\.com|instagr\.am)\/(?:reel|reels|p|tv|share\/(?:reel|p))\/([A-Za-z0-9_-]+)/i.test(pasted)) {
                          setUrl(pasted);
                          setError(null);
                          setMismatchSuggestion(null);
                          setTimeout(() => triggerSubmit(pasted), 60);
                        }
                      }}
                      placeholder={t.categories?.placeholders?.[activeCategory] || t.hero.placeholder}
                      className="w-full h-11 sm:h-12 pl-3.5 pr-22 sm:pr-24 text-base sm:text-sm bg-transparent font-normal focus:outline-none text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 placeholder:text-xs sm:placeholder:text-sm"
                      disabled={isLoading}
                      required
                    />

                    {/* Dynamic Clear / Paste Button inside input */}
                    <div className="absolute right-2 flex items-center gap-1">
                      {url ? (
                        <button
                          type="button"
                          onClick={handleClear}
                          aria-label={t.hero.clearBtn}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{t.hero.clearBtn}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handlePaste}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60"
                        >
                          <Clipboard className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                          <span>{t.hero.pasteBtn}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-7 rounded-xl bg-ig-gradient bg-ig-gradient-hover text-white font-medium text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shrink-0 shadow-sm active:scale-[0.99]"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>{t.hero.processingBtn}</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 stroke-[2.2]" />
                        <span>{t.hero.downloadBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Supported Links Format Info */}
              <div className="mt-2.5 flex items-start sm:items-center justify-center gap-1.5 px-2 text-center select-none">
                <Info className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5 sm:mt-0" />
                <span className="text-[11px] sm:text-xs font-normal text-slate-500 dark:text-zinc-500 leading-tight sm:leading-normal">
                  {isDragging ? t.hero.dropHere : t.hero.supportedLinksInfo}
                </span>
              </div>

              {/* Error Message Alert with Smart Category Mismatch Actions */}
              {error && (
                <div
                  className={`mt-4 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-start gap-3 text-left transition-all animate-in fade-in ${
                    mismatchSuggestion
                      ? "bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-xs"
                      : "bg-red-950/40 border border-red-900/60 text-red-300"
                  }`}
                >
                  <AlertCircle
                    className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mt-0.5 ${
                      mismatchSuggestion
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-400"
                    }`}
                  />
                  <div className="flex-1">
                    <p
                      className={`font-semibold text-xs sm:text-sm ${
                        mismatchSuggestion
                          ? "text-amber-900 dark:text-amber-200"
                          : "text-red-200"
                      }`}
                    >
                      {mismatchSuggestion ? t.categories.mismatch.title : "Gagal Memproses Tautan"}
                    </p>
                    <p
                      className={`mt-1 leading-relaxed text-[11px] sm:text-xs ${
                        mismatchSuggestion
                          ? "text-amber-800 dark:text-amber-300/90"
                          : "text-red-400"
                      }`}
                    >
                      {error}
                    </p>

                    {/* Quick Switch Action Buttons */}
                    {mismatchSuggestion && (
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {mismatchSuggestion === "reels" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSwitchCategory("reels")}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ig-gradient bg-ig-gradient-hover text-white font-medium text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>{t.categories.mismatch.switchToReels}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSwitchCategory("audio")}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 font-medium text-xs transition-all cursor-pointer active:scale-95"
                            >
                              <Music className="w-3.5 h-3.5" />
                              <span>{t.categories.mismatch.switchToAudio}</span>
                            </button>
                          </>
                        )}
                        {mismatchSuggestion === "photo" && (
                          <button
                            type="button"
                            onClick={() => handleSwitchCategory("photo")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ig-gradient bg-ig-gradient-hover text-white font-medium text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                          >
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span>{t.categories.mismatch.switchToPhoto}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Downloads History (Client-Side via localStorage) */}
            {history.length > 0 && (
              <div className="mt-6 sm:mt-8 max-w-2xl mx-auto text-left">
                <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-lg">
                  <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-zinc-800/80">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-pink-400" />
                      <h3 className="font-bold text-white text-xs sm:text-sm">
                        {t.history.title}
                      </h3>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                        {history.length} {t.history.itemsCount}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearHistory}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t.history.clear}</span>
                    </button>
                  </div>

                  {/* History Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {history.map((item) => (
                      <div
                        key={item.shortcode}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors group"
                      >
                        {/* Thumbnail */}
                        <div className="w-12 h-12 rounded-lg bg-black overflow-hidden relative shrink-0">
                          <img
                            src={`/api/download?url=${encodeURIComponent(item.thumbnailUrl)}&filename=thumb-${item.shortcode}.jpg&type=image`}
                            alt={item.author}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-[8.5px] font-bold text-white uppercase">
                            {item.mediaType === "video" ? "MP4 HD" : "FOTO HD"}
                          </span>
                        </div>

                        {/* Info & Actions */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-xs truncate">
                            @{item.author}
                          </p>
                          <p className="text-[10.5px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-zinc-500" />
                            <span>{item.timeFormatted || t.history.justNow}</span>
                          </p>

                          <div className="flex items-center gap-2 mt-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setUrl(item.url);
                                triggerSubmit(item.url);
                              }}
                              className="text-[10.5px] font-semibold text-pink-400 hover:text-pink-300 transition-colors cursor-pointer"
                            >
                              {t.history.reDownload}
                            </button>
                            <span className="text-zinc-600">•</span>
                            <button
                              type="button"
                              onClick={() => handleCopyHistoryLink(item.url, item.id)}
                              className="text-[10.5px] font-semibold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                            >
                              {copiedHistoryId === item.id ? t.history.copied : t.history.copyLink}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Top Responsive Ad Slot */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <AdSlot slotId="top-horizontal-banner" format="horizontal" lang={lang} />
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <section id="loading-section" className="py-6 px-4 sm:px-6 max-w-2xl mx-auto scroll-mt-20 sm:scroll-mt-24">
            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 sm:p-6 shadow-xl space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-zinc-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-32 h-3.5 rounded bg-slate-200 dark:bg-zinc-800" />
                  <div className="w-20 h-2.5 rounded bg-slate-200 dark:bg-zinc-800" />
                </div>
              </div>
              <div className="w-full aspect-video rounded-xl bg-slate-200 dark:bg-zinc-800" />
              <div className="space-y-2">
                <div className="w-3/4 h-3.5 rounded bg-slate-200 dark:bg-zinc-800" />
                <div className="w-1/2 h-3 rounded bg-slate-200 dark:bg-zinc-800" />
              </div>
              <div className="w-full h-11 rounded-xl bg-slate-200 dark:bg-zinc-800" />
            </div>
          </section>
        )}

        {/* Result Area: Focused on Reels Video & MP3 Audio */}
        {data && (
          <section id="result-section" className="py-6 px-3 sm:px-6 max-w-4xl mx-auto scroll-mt-20 sm:scroll-mt-24">
            <div className="rounded-2xl border p-4 sm:p-6 md:p-7 transition-all bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center">
                {/* Left Column: Responsive Uncropped Media Player & Image Viewer */}
                <div className="md:col-span-5 flex flex-col items-center justify-center w-full">
                  <div className="w-full max-w-[320px] xs:max-w-[340px] sm:max-w-[360px] md:max-w-[380px] min-h-[260px] max-h-[500px] flex items-center justify-center bg-black rounded-xl overflow-hidden border border-zinc-800 relative group p-2">
                    {isVideo ? (
                      <video
                        key={proxiedVideoUrl}
                        src={proxiedVideoUrl}
                        poster={proxiedThumbnailUrl}
                        controls
                        preload="metadata"
                        playsInline
                        className="w-auto h-auto max-w-full max-h-[460px] object-contain rounded-lg select-none"
                      >
                        Browser Anda tidak mendukung pemutar video. Silakan langsung unduh file melalui tombol di samping.
                      </video>
                    ) : (
                      <div className="relative w-full h-full flex flex-col items-center justify-center min-h-[260px]">
                        <img
                          key={proxiedPhotoUrl}
                          src={proxiedPhotoUrl}
                          alt={data.caption || "Instagram Photo"}
                          className="w-auto h-auto max-w-full max-h-[460px] object-contain rounded-lg select-none transition-all duration-300"
                          loading="eager"
                        />
                        <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full bg-black/80 text-[10px] font-semibold text-white border border-white/10 shadow-sm flex items-center gap-1 select-none">
                          <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{t.result.uncroppedLabel}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Media Details & Actions */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-3.5 sm:space-y-4">
                  {/* Creator Info & Detected Media Type */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800/80 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-0.5 bg-ig-gradient flex items-center justify-center shrink-0">
                        <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-white font-bold text-xs sm:text-sm uppercase">
                          {data.author.charAt(0) || "IG"}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base truncate">
                            @{data.author}
                          </h3>
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {isVideo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                              <Video className="w-3 h-3 text-zinc-500" />
                              <span>{t.result.videoBadge}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                              <ImageIcon className="w-3 h-3 text-zinc-500" />
                              <span>{t.result.photoBadge}</span>
                            </span>
                          )}
                          <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 truncate">
                            • #{data.shortcode}
                          </p>
                        </div>
                      </div>
                    </div>

                    <a
                      href={`https://www.instagram.com/p/${data.shortcode}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors shrink-0 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60"
                    >
                      <span>{t.result.openInIg}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Caption Box */}
                  {data.caption && (
                    <div className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950/40 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10.5px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-zinc-400 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-zinc-500" />
                          <span>{t.result.captionTitle}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyCaption}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          {copiedCaption ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {t.result.copied}
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>{t.result.copyCaption}</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p
                        className={`text-xs sm:text-sm font-normal leading-relaxed whitespace-pre-line text-slate-700 dark:text-zinc-300 ${!isCaptionExpanded ? "line-clamp-3" : ""}`}
                      >
                        {data.caption}
                      </p>
                      {data.caption.length > 120 && (
                        <button
                          type="button"
                          onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
                          className="mt-1 text-[11px] font-medium text-pink-600 dark:text-pink-400 hover:underline cursor-pointer"
                        >
                          {isCaptionExpanded ? t.result.showLess : t.result.showMore}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Feature Highlights Pills */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10.5px] sm:text-[11px]">
                    <span className="px-2 py-0.5 rounded-md font-medium border bg-slate-100 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700/60 text-slate-700 dark:text-zinc-300">
                      {t.result.badges.format}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-medium border bg-slate-100 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700/60 text-slate-700 dark:text-zinc-300">
                      {t.result.badges.resolution}
                    </span>
                    <span className="px-2 py-0.5 rounded-md font-medium border bg-emerald-50 dark:bg-zinc-800/80 border-emerald-200 dark:border-zinc-700/60 text-emerald-800 dark:text-emerald-400">
                      {t.result.badges.uncropped}
                    </span>
                    {isVideo && (
                      <span className="px-2 py-0.5 rounded-md font-medium border bg-slate-100 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700/60 text-slate-700 dark:text-zinc-300">
                        {t.result.badges.audio}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md font-medium border bg-emerald-50 dark:bg-zinc-800/80 border-emerald-200 dark:border-zinc-700/60 text-emerald-800 dark:text-emerald-400">
                      {t.result.badges.noWatermark}
                    </span>
                  </div>

                  {/* Action Download Buttons */}
                  <div className="space-y-2 pt-1">
                    {/* VIDEO DOWNLOAD OPTIONS (Reels / Feed Video) */}
                    {isVideo && (
                      <>
                        {activeCategory === "audio" && data.audioUrl ? (
                          <>
                            {/* Prioritize Audio MP3 button when user selected Audio MP3 tab */}
                            <button
                              type="button"
                              onClick={handleDownloadAudio}
                              disabled={downloadingAudio}
                              className="w-full h-11 sm:h-12 px-4 rounded-xl bg-ig-gradient bg-ig-gradient-hover text-white font-semibold text-xs sm:text-sm shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              {downloadingAudio ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>{t.result.convertingAudio}</span>
                                </>
                              ) : (
                                <>
                                  <Music className="w-4 h-4 stroke-[2.2]" />
                                  <span>{t.result.downloadAudio}</span>
                                  <span className="text-[10px] sm:text-xs font-normal px-2 py-0.5 rounded-md bg-white/20 text-white">
                                    192 kbps MP3
                                  </span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={handleDownloadVideo}
                              disabled={downloadingVideo}
                              className="w-full h-11 sm:h-12 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-semibold text-xs sm:text-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              {downloadingVideo ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>{t.result.preparingVideo}</span>
                                </>
                              ) : (
                                <>
                                  <Video className="w-4 h-4 stroke-[2.2] text-zinc-500" />
                                  <span>{t.result.downloadVideo}</span>
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            {/* Prioritize Video Reels button when user selected Reels tab */}
                            <button
                              type="button"
                              onClick={handleDownloadVideo}
                              disabled={downloadingVideo}
                              className="w-full h-11 sm:h-12 px-4 rounded-xl bg-ig-gradient bg-ig-gradient-hover text-white font-semibold text-xs sm:text-sm shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                              {downloadingVideo ? (
                                <>
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                  <span>{t.result.preparingVideo}</span>
                                </>
                              ) : (
                                <>
                                  <Download className="w-4 h-4 stroke-[2.2]" />
                                  <span>{t.result.downloadVideo}</span>
                                </>
                              )}
                            </button>

                            {data.audioUrl && (
                              <button
                                type="button"
                                onClick={handleDownloadAudio}
                                disabled={downloadingAudio}
                                className="w-full h-11 sm:h-12 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 font-semibold text-xs sm:text-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                              >
                                {downloadingAudio ? (
                                  <>
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                    <span>{t.result.convertingAudio}</span>
                                  </>
                                ) : (
                                  <>
                                    <Music className="w-4 h-4 stroke-[2.2] text-zinc-500" />
                                    <span>{t.result.downloadAudio}</span>
                                    <span className="text-[10px] sm:text-xs font-normal px-2 py-0.5 rounded-md bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
                                      192 kbps
                                    </span>
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}

                    {/* PHOTO DOWNLOAD OPTIONS (Single Photo) */}
                    {!isVideo && (
                      <button
                        type="button"
                        onClick={() => handleDownloadPhoto(currentPhotoUrl)}
                        disabled={downloadingPhoto}
                        className="w-full h-11 sm:h-12 px-4 rounded-xl bg-ig-gradient bg-ig-gradient-hover text-white font-semibold text-xs sm:text-sm shadow-sm active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        {downloadingPhoto ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{t.result.preparingPhoto}</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 stroke-[2.2]" />
                            <span>{t.result.downloadPhoto}</span>
                            <span className="text-[10px] sm:text-xs font-normal px-2 py-0.5 rounded-md bg-white/20 text-white">
                              HD Asli
                            </span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Reset / Unduh Media Lainnya */}
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full h-10 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 font-medium text-xs sm:text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{t.result.downloadAnother}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* How To Download Section (3 Steps) */}
        <section id="how-to" className="py-10 sm:py-14 px-4 sm:px-6 max-w-4xl mx-auto scroll-mt-20">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {t.howTo.title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm font-normal text-slate-500 dark:text-zinc-400 max-w-md mx-auto">
              {t.howTo.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <div className="rounded-2xl p-5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center mx-auto mb-3 border border-slate-200 dark:border-zinc-700/60">
                1
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">
                {t.howTo.step1Title}
              </h3>
              <p className="text-xs sm:text-sm font-normal text-slate-600 dark:text-zinc-400 leading-relaxed">
                {t.howTo.step1Desc}
              </p>
            </div>

            <div className="rounded-2xl p-5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center mx-auto mb-3 border border-slate-200 dark:border-zinc-700/60">
                2
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">
                {t.howTo.step2Title}
              </h3>
              <p className="text-xs sm:text-sm font-normal text-slate-600 dark:text-zinc-400 leading-relaxed">
                {t.howTo.step2Desc}
              </p>
            </div>

            <div className="rounded-2xl p-5 border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 text-center transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center mx-auto mb-3 border border-slate-200 dark:border-zinc-700/60">
                3
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">
                {t.howTo.step3Title}
              </h3>
              <p className="text-xs sm:text-sm font-normal text-slate-600 dark:text-zinc-400 leading-relaxed">
                {t.howTo.step3Desc}
              </p>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-10 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto border-t border-slate-200 dark:border-zinc-800/80 scroll-mt-20">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
              {t.features.title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm font-normal text-slate-500 dark:text-zinc-400 max-w-lg mx-auto">
              {t.features.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
            {/* Feature 1: Kualitas Full HD Asli */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                <Film className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">{t.features.feat1Title}</h3>
              <p className="text-xs sm:text-sm font-normal text-slate-600 dark:text-zinc-400 leading-relaxed">{t.features.feat1Desc}</p>
            </div>

            {/* Feature 2: 100% Tanpa Watermark */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                <BadgeCheck className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">{t.features.feat2Title}</h3>
              <p className="text-xs sm:text-sm font-normal text-slate-600 dark:text-zinc-400 leading-relaxed">{t.features.feat2Desc}</p>
            </div>

            {/* Feature 3: Ekstrak Audio MP3 192 kbps */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                <Headphones className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">{t.features.feat3Title}</h3>
              <p className="text-xs sm:text-sm font-normal text-slate-600 dark:text-zinc-400 leading-relaxed">{t.features.feat3Desc}</p>
            </div>

            {/* Feature 4: Deteksi Otomatis Reels & Foto */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                <ScanSearch className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">{t.features.feat4Title}</h3>
              <p className="text-xs sm:text-sm font-normal text-slate-600 dark:text-zinc-400 leading-relaxed">{t.features.feat4Desc}</p>
            </div>

            {/* Feature 5: 100% Gratis Tanpa Batas */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                <Infinity className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">{t.features.feat5Title}</h3>
              <p className="text-xs sm:text-sm font-normal text-slate-600 dark:text-zinc-400 leading-relaxed">{t.features.feat5Desc}</p>
            </div>

            {/* Feature 6: Aman & Responsif */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                <ShieldCheck className="w-5 h-5 stroke-[2]" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base mb-1.5">{t.features.feat6Title}</h3>
              <p className="text-xs sm:text-sm font-normal text-slate-600 dark:text-zinc-400 leading-relaxed">{t.features.feat6Desc}</p>
            </div>
          </div>
        </section>

        {/* Middle Responsive Ad Slot */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <AdSlot slotId="mid-content-banner" format="horizontal" lang={lang} />
        </div>

        {/* FAQ Section */}
        <section id="faq" className="py-12 sm:py-16 px-4 sm:px-6 max-w-4xl mx-auto scroll-mt-20">
          <div className="text-center mb-8 sm:mb-10">
            <span className="text-[11px] sm:text-xs font-black text-pink-700 dark:text-pink-300 uppercase tracking-widest px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30">
              {t.faq.badge}
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-950 dark:text-white mt-3">
              {t.faq.title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-700 dark:text-zinc-300 max-w-md mx-auto">
              {t.faq.subtitle}
            </p>
          </div>

          <FaqAccordion lang={lang} />
        </section>

        {/* About SatsetReels Section (Split Bento Grid Layout) */}
        <section id="about" className="py-12 sm:py-16 px-4 sm:px-6 max-w-6xl mx-auto scroll-mt-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
            {/* Left Column: Narrative Card (55% / 7 cols) */}
            <div
              className="lg:col-span-7 flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 sm:p-8 md:p-9 bg-white dark:bg-zinc-900/40 transition-colors"
            >
              <div>
                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 mb-3.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                  <span>{t.about.badge}</span>
                </div>

                {/* Narrative Title */}
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-3.5 leading-snug">
                  {t.about.title}
                </h2>

                {/* 2 Comprehensive Paragraphs */}
                <div className="space-y-3 text-xs sm:text-sm font-normal text-slate-600 dark:text-zinc-400 leading-relaxed text-justify sm:text-left">
                  <p>{t.about.p1}</p>
                  <p>{t.about.p2}</p>
                </div>
              </div>

              {/* 3 Pill Badges at bottom */}
              <div className="mt-6 pt-5 border-t border-slate-200 dark:border-zinc-800/80 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60">
                  {t.about.pills.pill1}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60">
                  {t.about.pills.pill2}
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60">
                  {t.about.pills.pill3}
                </span>
              </div>
            </div>

            {/* Right Column: 2x2 Bento Feature Cards (45% / 5 cols) */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              {/* Card 1: Unduhan Video Reels */}
              <div
                className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900/40 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    <Film className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1 leading-snug">
                    {t.about.bento.card1Title}
                  </h3>
                </div>
                <p className="text-xs font-normal text-slate-500 dark:text-zinc-400 leading-relaxed mt-2">
                  {t.about.bento.card1Desc}
                </p>
              </div>

              {/* Card 2: Foto Postingan HD */}
              <div
                className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900/40 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    <Camera className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1 leading-snug">
                    {t.about.bento.card2Title}
                  </h3>
                </div>
                <p className="text-xs font-normal text-slate-500 dark:text-zinc-400 leading-relaxed mt-2">
                  {t.about.bento.card2Desc}
                </p>
              </div>

              {/* Card 3: Konverter Audio MP3 */}
              <div
                className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900/40 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    <Headphones className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1 leading-snug">
                    {t.about.bento.card3Title}
                  </h3>
                </div>
                <p className="text-xs font-normal text-slate-500 dark:text-zinc-400 leading-relaxed mt-2">
                  {t.about.bento.card3Desc}
                </p>
              </div>

              {/* Card 4: Privasi Tanpa Jejak */}
              <div
                className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900/40 flex flex-col justify-between hover:border-slate-300 dark:hover:border-zinc-700 transition-colors group"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center mb-3 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                    <ShieldCheck className="w-5 h-5 stroke-[2]" />
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1 leading-snug">
                    {t.about.bento.card4Title}
                  </h3>
                </div>
                <p className="text-xs font-normal text-slate-500 dark:text-zinc-400 leading-relaxed mt-2">
                  {t.about.bento.card4Desc}
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Area */}
      <footer
        className="border-t bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800/80 text-slate-700 dark:text-zinc-300"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
          {/* 4 Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 pb-10 sm:pb-12 border-b border-slate-200 dark:border-zinc-800/80">
            {/* Column 1: Brand & Status Jaringan (span 4) */}
            <div className="lg:col-span-4 space-y-3.5">
              <div className="flex items-center gap-2.5">
                <img
                  src="/icon.png"
                  alt="SatsetReels Logo"
                  className="w-7 h-7 sm:w-8 sm:h-8 object-contain select-none"
                />
                <span className="font-bold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
                  Satset<span className="text-ig-gradient font-bold">Reels</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm font-normal text-slate-500 dark:text-zinc-400 leading-relaxed max-w-sm">
                {t.footer.tagline}
              </p>

              <p className="text-[11px] font-normal text-slate-400 dark:text-zinc-500 pt-1">
                {t.footer.platforms}
              </p>
            </div>

            {/* Column 2: Layanan Instagram - Interaktif (span 3) */}
            <div className="lg:col-span-3 space-y-3">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                {t.footer.col2Title}
              </h3>
              <ul className="space-y-1.5 text-xs sm:text-sm font-normal">
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectService("reels")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer text-left flex items-center gap-2"
                  >
                    <Video className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{t.footer.serviceReels}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectService("audio")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer text-left flex items-center gap-2"
                  >
                    <Headphones className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{t.footer.serviceAudio}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleSelectService("photo")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer text-left flex items-center gap-2"
                  >
                    <Camera className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{t.footer.servicePhoto}</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Panduan & Navigasi (span 2) */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                {t.footer.col3Title}
              </h3>
              <ul className="space-y-1.5 text-xs sm:text-sm font-normal">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("hero")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer text-left flex items-center"
                  >
                    {t.footer.navHome}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("how-to")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer text-left flex items-center"
                  >
                    {t.footer.navHowTo}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("features")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer text-left flex items-center"
                  >
                    {t.footer.navFeatures}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("faq")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer text-left flex items-center"
                  >
                    {t.footer.navFaq}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollToSection("about")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer text-left flex items-center"
                  >
                    {t.footer.navAbout}
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 4: Legalitas & Pusat Bantuan (span 3) */}
            <div className="lg:col-span-3 space-y-3">
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                {t.footer.col4Title}
              </h3>
              <ul className="space-y-1.5 text-xs sm:text-sm font-normal">
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenModal("privacy")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-left"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{t.footer.legalPrivacy}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenModal("terms")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-left"
                  >
                    <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{t.footer.legalTerms}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenModal("dmca")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-left"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{t.footer.legalDmca}</span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => handleOpenModal("help")}
                    className="py-1 text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 text-left"
                  >
                    <Info className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{t.footer.legalHelp}</span>
                  </button>
                </li>
              </ul>

              {/* Single row of clean, elegant social media icon buttons without repetitive text */}
              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <a
                    href="https://www.instagram.com/aaleano?cplk=eGlsNnBveTkxbzl2&utm_source=qr"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    title="Instagram (@aaleano)"
                    className="w-8 h-8 rounded-lg bg-slate-200/60 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>

                  <a
                    href="https://www.tiktok.com/@aleeinhere"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok"
                    title="TikTok (@aleeinhere)"
                    className="w-8 h-8 rounded-lg bg-slate-200/60 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.97v7.68c0 2.11-.64 4.24-1.92 5.91-1.66 2.17-4.32 3.44-7.05 3.36-2.58-.08-5.02-1.32-6.57-3.37-1.76-2.31-2.23-5.46-1.26-8.23.97-2.77 3.35-4.84 6.26-5.41.66-.13 1.33-.18 2-.17v4.06c-.44-.03-.89-.01-1.33.07-1.38.25-2.55 1.19-3.08 2.49-.53 1.3-.32 2.82.56 3.93.88 1.11 2.31 1.74 3.73 1.62 1.42-.12 2.68-.96 3.25-2.26.24-.55.36-1.15.36-1.76V.02z"/>
                    </svg>
                  </a>

                  <a
                    href="https://wa.me/628111644119"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                    title="WhatsApp"
                    className="w-8 h-8 rounded-lg bg-slate-200/60 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Legal Disclaimer & Copyright Notice */}
          <div className="pt-8 sm:pt-10 space-y-3.5 text-xs">
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-zinc-500 leading-relaxed text-justify sm:text-left">
              {t.footer.disclaimer}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-slate-200 dark:border-zinc-800/60 text-center sm:text-left">
              <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-zinc-400">
                © 2026 SatsetReels. {t.footer.copyright}
              </p>
              <div className="flex items-center gap-2 text-[10.5px] font-normal text-slate-400 dark:text-zinc-500 flex-wrap justify-center">
                <span>{t.footer.tagBottomRight}</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Info & Legal Modal (Google AdSense Compliant Dialog) */}
      <InfoModal
        isOpen={modalTab !== null}
        onClose={() => setModalTab(null)}
        activeTab={modalTab || "privacy"}
        setActiveTab={(tab) => setModalTab(tab)}
        onScrollToFaq={handleScrollToFaq}
        lang={lang}
      />

      {/* iOS PWA Install Instruction Dialog Modal */}
      {showPwaModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setShowPwaModal(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border-2 border-pink-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-400 p-0.5 mx-auto">
              <img
                src="/icon.png"
                alt="SatsetReels Icon"
                className="w-full h-full object-contain rounded-2xl"
              />
            </div>
            <div>
              <h3 className="font-black text-slate-950 dark:text-white text-base">
                {t.pwaModal.title}
              </h3>
              <p className="text-xs font-semibold text-slate-600 dark:text-zinc-300 mt-1">
                {t.pwaModal.iosInstructions}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-zinc-800/80 text-left text-xs font-bold text-slate-800 dark:text-zinc-200 space-y-1.5 border border-slate-200 dark:border-zinc-700">
              <p>{t.pwaModal.step1}</p>
              <p>{t.pwaModal.step2}</p>
              <p>{t.pwaModal.step3}</p>
            </div>

            <button
              type="button"
              onClick={() => setShowPwaModal(false)}
              className="w-full py-2.5 rounded-xl bg-ig-gradient text-white font-bold text-xs shadow-md shadow-pink-500/20 active:scale-[0.98] transition-all cursor-pointer"
            >
              {t.pwaModal.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
