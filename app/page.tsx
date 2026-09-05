"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialisation Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const NAV_LINKS = [
  { href: "#infos", label: "Infos & Bureau" },
  { href: "#carte", label: "La Carte" },
  { href: "#agenda", label: "Agenda" },
  { href: "#projets", label: "Projets & Ventes" },
  { href: "#contact", label: "Contact" },
];

const MARQUEE_WORDS = [
  "PAR LES LYCÉENS",
  "POUR LES LYCÉENS",
  "MDLE JEAN PERRIN",
  "REJOINS-NOUS",
];

const DEFAULT_BUREAU = [
  { role: "Président", name: "Thomas", emoji: "👑" },
  { role: "Vice-Présidente 1", name: "Marie", emoji: "⚡" },
  { role: "Vice-Présidente 2", name: "Lisa", emoji: "⚡" },
  { role: "Trésorier", name: "Nathan", emoji: "💰" },
  { role: "Trésorier Adjoint", name: "Esteban", emoji: "💰" },
  { role: "Secrétaire", name: "À définir", emoji: "📝" },
];

const DEFAULT_HOURS = [
  { day: "Lundi", hours: "9h - 17h" },
  { day: "Mardi", hours: "9h - 17h" },
  { day: "Mercredi", hours: "9h - 12h" },
  { day: "Jeudi", hours: "9h - 17h" },
  { day: "Vendredi", hours: "9h - 15h" },
];

const CATEGORIES = [
  "TOUT",
  "Ventes Saisonnières",
  "Boissons",
  "Snacks sucrés",
  "Snacks salés",
  "Formules",
];

type MenuItem = {
  id: number;
  title: string;
  category: string;
  price: string;
  description: string | null;
  is_available: boolean;
  created_at?: string;
};

type AgendaEvent = {
  id: number;
  title: string;
  date: string; // ex: "2026-09-15" ou format lisible
  location: string | null;
  description: string | null;
  payment_link: string | null;
  price: string | null;
};

type ActiveProject = {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  emoji: string | null;
  badge_tag: string | null;
};

type SiteSettings = {
  marquee_text: string;
  marquee_active: boolean;
  opening_hours: { day: string; hours: string }[];
  bureau_members: { role: string; name: string; emoji: string }[];
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<AgendaEvent[]>([]);
  const [activeProjects, setActiveProjects] = useState<ActiveProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("TOUT");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [contactMessage, setContactMessage] = useState({ name: "", email: "", msg: "" });
  const [contactSent, setContactSent] = useState(false);

  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    marquee_text: '',
    marquee_active: false,
    opening_hours: DEFAULT_HOURS,
    bureau_members: DEFAULT_BUREAU,
  });

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: menuData } = await supabase.from("menu_items").select("*").order("id");
      const { data: agendaData } = await supabase.from("events").select("*").order("id");

      try {
        const { data: projData } = await supabase
          .from("projects")
          .select("*")
          .eq("is_active", true)
          .order("id", { ascending: false });

        if (projData) setActiveProjects(projData);
      } catch {
        setActiveProjects([]);
      }

      if (menuData) setMenuItems(menuData);
      if (agendaData) setAgendaEvents(agendaData);

      try {
        const { data: settingsData } = await supabase.from('site_settings').select('*').eq('id', 1).single();
        if (settingsData) setSiteSettings(settingsData as SiteSettings);
      } catch { /* valeurs par défaut */ }

      setLoading(false);
    }

    fetchData();
  }, []);

  // Calcul du statut "Ouvert maintenant"
  const checkIsOpen = () => {
    const now = new Date();
    const days = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const currentDay = days[now.getDay()];
    const currentHour = now.getHours() + now.getMinutes() / 60;

    const todaySetting = siteSettings.opening_hours.find(h => h.day.toLowerCase() === currentDay.toLowerCase());
    if (!todaySetting) return false;

    // Exemple de parsing simple "9h - 17h"
    const match = todaySetting.hours.match(/(\d+)h?\s*-\s*(\d+)h?/i);
    if (!match) return false;

    const openTime = parseInt(match[1], 10);
    const closeTime = parseInt(match[2], 10);

    return currentHour >= openTime && currentHour < closeTime;
  };

  const isOpen = checkIsOpen();

  // Traitement et tri de la carte
  const isNewItem = (createdAt?: string) => {
    if (!createdAt) return false;
    const diffDays = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 3600 * 24);
    return diffDays <= 7;
  };

  const filteredMenuItems = menuItems
    .filter((item) => {
      if (selectedCategory === "TOUT") return item.is_available;
      return item.category === selectedCategory;
    })
    .sort((a, b) => {
      // Mettre les "Ventes Saisonnières" et les dispo en haut
      if (a.category === "Ventes Saisonnières" && b.category !== "Ventes Saisonnières") return -1;
      if (b.category === "Ventes Saisonnières" && a.category !== "Ventes Saisonnières") return 1;
      if (a.is_available === b.is_available) return 0;
      return a.is_available ? -1 : 1;
    });

  // Filtrage des événements passés
  const futureAgendaEvents = agendaEvents.filter((event) => {
    const eventDate = new Date(event.date);
    if (isNaN(eventDate.getTime())) return true; // Si format texte libre, on garde
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });

  // Générateur .ics
  const downloadICS = (event: AgendaEvent) => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MDLE Jean Perrin//FR
BEGIN:VEVENT
SUMMARY:${event.title}
DESCRIPTION:${event.description || "Événement MDLE"}
LOCATION:${event.location || "Lycée Jean Perrin"}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute("download", `${event.title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoUrl = `mailto:mdle.jeanperrin.marseille@gmail.com?subject=Contact%20MDLE%20de%20${encodeURIComponent(contactMessage.name)}&body=${encodeURIComponent(contactMessage.msg + "\n\nDe : " + contactMessage.email)}`;
    window.location.href = mailtoUrl;
    setContactSent(true);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] font-sans antialiased">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#1B2A4A]/10 bg-[#FAFAF8]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 py-4 flex justify-between items-center">
          <a href="#" className="flex items-center gap-2.5 group">
            <Image
              src="/logo-mdle.png"
              alt="Logo MDLE Jean Perrin"
              width={36}
              height={36}
              className="w-9 h-9 rounded-full object-cover shrink-0 group-hover:scale-105 transition-transform"
            />
            <span className="text-lg font-black tracking-tight">
              MDLE <span className="text-[#F26D5B]">Jean Perrin</span>
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative py-1 text-[#1B2A4A]/70 hover:text-[#1B2A4A] transition-colors after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0 after:bg-[#F26D5B] after:rounded-full after:transition-all hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/adherer"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1B2A4A] text-white px-5 py-2.5 rounded-full hover:bg-[#F26D5B] transition-colors shadow-sm font-bold flex items-center gap-2"
            >
              <span>🎟️</span> Adhérer
            </a>
          </nav>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5"
          >
            <span className={`block w-6 h-0.5 rounded-full bg-[#1B2A4A] transition-transform ${menuOpen ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block w-6 h-0.5 rounded-full bg-[#1B2A4A] transition-opacity ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-6 h-0.5 rounded-full bg-[#1B2A4A] transition-transform ${menuOpen ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        <div className={`md:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out ${menuOpen ? "max-h-80" : "max-h-0"}`}>
          <nav className="flex flex-col gap-1 px-5 pb-4 text-sm font-semibold border-t border-[#1B2A4A]/5 pt-3">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="py-2.5 border-b border-[#1B2A4A]/5 text-[#1B2A4A]/70 hover:text-[#1B2A4A] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/adherer"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              className="py-2.5 text-[#F26D5B] font-bold flex items-center gap-2"
            >
              <span>🎟️</span> Adhérer à la MDLE
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-24 w-72 h-72 rounded-full bg-[#F2A63C]/15 blur-2xl" />
        <div className="pointer-events-none absolute top-32 -left-20 w-64 h-64 rounded-full bg-[#2E8B7A]/15 blur-2xl" />

        <div className="relative max-w-6xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-white border border-[#1B2A4A]/10 text-[#1B2A4A] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 bg-[#F26D5B] rounded-full animate-pulse" />
            Année 2026 - 2027
          </span>

          <h1 className="font-black leading-[0.95] tracking-tight text-[11vw] md:text-[6vw] lg:text-[5.5rem]">
            Ton lycée, <br />
            <span className="text-[#F26D5B]">tes</span> événements, <br />
            <span className="relative inline-block">
              ta MDLE.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 15 Q75 0 150 12 T300 8" stroke="#F2A63C" strokeWidth="8" strokeLinecap="round" fill="none" />
              </svg>
            </span>
          </h1>

          <div className="mt-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <p className="max-w-md text-[#1B2A4A]/60 text-base leading-relaxed">
              La Maison des Lycéens et des Étudiants, c’est l’asso gérée par des élèves, pour les élèves.
              Foyer, projets, cafétéria et événements au Lycée Polyvalent Jean Perrin.
            </p>

            <div className="flex flex-wrap gap-3">
              <a href="#infos" className="bg-[#1B2A4A] text-white font-bold text-sm px-5 py-3 rounded-full hover:bg-[#F26D5B] transition-colors shadow-sm">
                ℹ️ Infos pratiques
              </a>
              <a href="#carte" className="bg-[#F2A63C] text-[#1B2A4A] font-bold text-sm px-5 py-3 rounded-full hover:bg-[#1B2A4A] hover:text-white transition-colors shadow-sm">
                🍕 La Carte
              </a>
              <a href="#agenda" className="bg-[#F26D5B] text-white font-bold text-sm px-5 py-3 rounded-full hover:bg-[#1B2A4A] transition-colors shadow-sm">
                📅 Événements
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Bandeau d'annonce */}
      {siteSettings.marquee_active && siteSettings.marquee_text ? (
        <div className="bg-[#F26D5B] text-white py-3 px-5 text-center text-sm font-bold shadow-inner" role="alert">
          {siteSettings.marquee_text}
        </div>
      ) : (
        <div className="bg-[#1B2A4A] text-white py-3 overflow-hidden" aria-label="Actualités de la MDLE">
          <div className="marquee-track flex w-max whitespace-nowrap">
            {[0, 1].map((groupIndex) => (
              <div key={groupIndex} className="flex shrink-0" aria-hidden={groupIndex === 1}>
                {[0, 1].map((repeatIndex) => (
                  <React.Fragment key={repeatIndex}>
                    {MARQUEE_WORDS.map((word, wordIndex) => (
                      <span key={`${groupIndex}-${repeatIndex}-${wordIndex}`} className="mx-6 inline-flex items-center gap-6 text-sm font-bold uppercase tracking-widest">
                        {word}
                        <span className="text-[#F2A63C]">✦</span>
                      </span>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section Infos & Bureau */}
      <section id="infos" className="max-w-6xl mx-auto px-5 py-16 md:py-24">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#F26D5B]">
              Au quotidien
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-1">
              Infos pratiques & Bureau
            </h2>
          </div>

          {/* Badge Ouvert / Fermé */}
          <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full font-bold text-xs shadow-sm border ${isOpen ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
            {isOpen ? "Foyer OUVERT actuellement" : "Foyer FERMÉ actuellement"}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Bloc Horaires */}
          <div className="bg-white border border-[#1B2A4A]/8 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span>📍</span> MDLE & Horaires
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-[#F26D5B]/15 flex items-center justify-center shrink-0">🕒</span>
                <div className="w-full">
                  <p className="font-bold mb-1">Horaires d'ouverture</p>
                  <div className="grid grid-cols-2 gap-2">
                    {siteSettings.opening_hours.map((h, i) => (
                      <div key={i} className="flex justify-between border-b border-[#1B2A4A]/5 pb-1 text-xs">
                        <span className="font-semibold text-[#1B2A4A]">{h.day}</span>
                        <span className="text-[#1B2A4A]/60">{h.hours}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3 pt-2">
                <span className="w-8 h-8 rounded-full bg-[#2E8B7A]/15 flex items-center justify-center shrink-0">🏫</span>
                <div>
                  <p className="font-bold">Localisation</p>
                  <p className="text-[#1B2A4A]/60 text-xs">Au centre de la cour de récréation du Lycée Jean Perrin</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Bloc Équipe */}
          <div className="bg-white border border-[#1B2A4A]/8 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span>👥</span> Les Élus de la MDLE
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {siteSettings.bureau_members.map((member, i) => (
                <div key={i} className="bg-[#FAFAF8] border border-[#1B2A4A]/5 rounded-2xl p-3.5 flex items-center gap-3">
                  <span className="text-2xl shrink-0">{member.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#1B2A4A]/40 truncate">
                      {member.role}
                    </p>
                    <p className="font-bold text-sm text-[#1B2A4A] truncate">{member.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LA CARTE (Cafétéria) */}
      <section id="carte" className="bg-[#1B2A4A] text-white py-16 md:py-24 rounded-[2.5rem] md:rounded-[3rem] mx-3 md:mx-5">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#F2A63C]">
                Foyer & Cafétéria
              </span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-1">
                La Carte de la MDLE
              </h2>
              <p className="text-white/50 text-sm mt-2 max-w-md">
                Disponible à la vente pendant les horaires d’ouverture du foyer.
              </p>
            </div>

            {/* Switch Mode Grille / Liste */}
            <div className="flex items-center gap-1 bg-white/10 p-1 rounded-full w-fit">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode === "grid" ? "bg-[#F2A63C] text-[#1B2A4A]" : "text-white/70 hover:text-white"}`}
              >
                📱 Grille
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${viewMode === "list" ? "bg-[#F2A63C] text-[#1B2A4A]" : "text-white/70 hover:text-white"}`}
              >
                📄 Liste
              </button>
            </div>
          </div>

          {/* Filtres par catégories */}
          <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${selectedCategory === cat
                  ? "bg-[#F2A63C] text-[#1B2A4A] shadow-md scale-105"
                  : "bg-white/10 text-white/80 hover:bg-white/20 border border-white/10"
                  }`}
              >
                {cat === "Ventes Saisonnières" ? "✨ Ventes Saisonnières" : cat}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-white/60">Chargement de la carte...</p>
          ) : filteredMenuItems.length === 0 ? (
            <p className="text-white/60 py-8 text-center bg-white/5 rounded-3xl border border-white/10">
              Aucun produit disponible pour le moment dans cette catégorie.
            </p>
          ) : viewMode === "grid" ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredMenuItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white/5 border rounded-3xl p-6 backdrop-blur-sm flex flex-col justify-between transition-all ${item.is_available ? "border-white/10 hover:border-[#F2A63C]/40" : "border-red-500/30 opacity-60"}`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#F2A63C] bg-white/5 px-2.5 py-1 rounded-full">
                        {item.category}
                      </span>
                      <div className="flex gap-1">
                        {isNewItem(item.created_at) && (
                          <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                            Nouveau ✨
                          </span>
                        )}
                        {!item.is_available && (
                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                            Rupture
                          </span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-lg font-black tracking-tight mt-3">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-white/50 mt-1 whitespace-pre-line leading-relaxed">{item.description}</p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs text-white/40">Prix</span>
                    <span className="font-bold text-[#F2A63C] text-lg">{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/10">
              {filteredMenuItems.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{item.title}</span>
                        {isNewItem(item.created_at) && (
                          <span className="text-[9px] font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded-full">
                            Nouveau ✨
                          </span>
                        )}
                        {!item.is_available && (
                          <span className="text-[9px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded-full">
                            Rupture
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 truncate max-w-xs">{item.description || item.category}</p>
                    </div>
                  </div>
                  <span className="font-bold text-[#F2A63C] text-base shrink-0">{item.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AGENDA - TIMELINE */}
      <section id="agenda" className="max-w-6xl mx-auto px-5 py-16 md:py-24">
        <div className="mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#2E8B7A]">
            Planning & Projets
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-1">
            Agenda à venir
          </h2>
        </div>

        {loading ? (
          <p className="text-[#1B2A4A]/60">Chargement de l’agenda...</p>
        ) : futureAgendaEvents.length === 0 ? (
          <p className="text-[#1B2A4A]/60 p-6 bg-white border border-[#1B2A4A]/8 rounded-3xl">
            Aucune date importante prévue pour le moment.
          </p>
        ) : (
          <div className="relative border-l-2 border-[#2E8B7A]/30 ml-4 md:ml-6 pl-6 md:pl-8 space-y-8">
            {futureAgendaEvents.map((event) => (
              <div key={event.id} className="relative group">
                {/* Pastille timeline */}
                <div className="absolute -left-[31px] md:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-[#2E8B7A] border-4 border-[#FAFAF8] group-hover:scale-125 transition-transform" />

                <div className="bg-white border border-[#1B2A4A]/8 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-black text-[#2E8B7A] uppercase tracking-wider bg-[#2E8B7A]/10 px-3 py-1 rounded-full">
                      📅 {event.date}
                    </span>
                    <h3 className="text-xl font-black tracking-tight mt-2 text-[#1B2A4A] group-hover:text-[#F26D5B] transition-colors">
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="text-sm text-[#1B2A4A]/60 mt-1 whitespace-pre-line leading-relaxed">{event.description}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#1B2A4A]/5">
                    {event.price && (
                      <span className="text-xs font-bold text-[#F26D5B] bg-[#F26D5B]/10 px-3 py-1.5 rounded-full">
                        🎟️ {event.price}
                      </span>
                    )}
                    {event.location && (
                      <span className="text-xs font-bold text-[#1B2A4A]/60 bg-[#1B2A4A]/5 px-3 py-1.5 rounded-full">
                        📍 {event.location}
                      </span>
                    )}
                    <button
                      onClick={() => downloadICS(event)}
                      className="text-xs font-bold text-[#1B2A4A] bg-[#FAFAF8] border border-[#1B2A4A]/15 hover:bg-[#1B2A4A] hover:text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                    >
                      🗓️ Google/Apple
                    </button>
                    {event.payment_link && (
                      <a
                        href={event.payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-white bg-[#F26D5B] hover:bg-[#1B2A4A] px-4 py-2 rounded-full transition-colors"
                      >
                        Payer →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PROJETS & OPÉRATIONS EN COURS */}
      {activeProjects.length > 0 && (
        <section id="projets" className="max-w-6xl mx-auto px-5 pb-16 md:pb-24">
          <div className="mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F26D5B]">
              Opérations & Réservations
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-1">
              Événements en cours
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map((proj) => (
              <div
                key={proj.id}
                className="bg-white border border-[#1B2A4A]/10 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-[#F26D5B]/30 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-4xl">{proj.emoji || "🚀"}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#F26D5B] bg-[#F26D5B]/10 px-2.5 py-1 rounded-full">
                      {proj.badge_tag || "Opération MDLE"}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-[#1B2A4A] group-hover:text-[#F26D5B] transition-colors">
                    {proj.title}
                  </h3>
                  {proj.description && (
                    <p className="text-xs text-[#1B2A4A]/60 mt-2 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {proj.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-[#1B2A4A]/8">
                  <a
                    href={`/p/${proj.slug}`}
                    className="w-full bg-[#1B2A4A] hover:bg-[#F26D5B] text-white font-bold py-3 px-4 rounded-2xl transition-colors text-xs flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Réserver / Commander</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer / Contact */}
      <footer id="contact" className="bg-[#1B2A4A] text-white rounded-t-[2.5rem] md:rounded-t-[3rem] mx-3 md:mx-5">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-14 grid md:grid-cols-2 gap-10 items-start">
          {/* Colonne Gauche : Contact Rapide */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-mdle.png"
                alt="Logo MDLE Jean Perrin"
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <span className="text-xl font-black tracking-tight">
                MDLE <span className="text-[#F26D5B]">Jean Perrin</span>
              </span>
            </div>

            <p className="text-white/60 text-sm max-w-sm leading-relaxed">
              Maison des Lycéens et des Étudiants — Lycée Polyvalent Jean Perrin, Marseille.
            </p>

            {/* Formulaire de Contact Rapide */}
            <form onSubmit={handleContactSubmit} className="space-y-3 bg-white/5 p-5 rounded-3xl border border-white/10">
              <p className="text-xs font-bold text-[#F2A63C] uppercase tracking-wider">Un message rapide ?</p>
              <input
                type="text"
                placeholder="Ton Prénom / Nom"
                required
                value={contactMessage.name}
                onChange={(e) => setContactMessage({ ...contactMessage, name: e.target.value })}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F26D5B]"
              />
              <input
                type="email"
                placeholder="Ton adresse email"
                required
                value={contactMessage.email}
                onChange={(e) => setContactMessage({ ...contactMessage, email: e.target.value })}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F26D5B]"
              />
              <textarea
                placeholder="Ton message..."
                required
                rows={3}
                value={contactMessage.msg}
                onChange={(e) => setContactMessage({ ...contactMessage, msg: e.target.value })}
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-white/40 focus:outline-none focus:border-[#F26D5B]"
              />
              <button
                type="submit"
                className="w-full bg-[#F26D5B] hover:bg-white hover:text-[#1B2A4A] text-white font-bold py-2.5 rounded-xl text-xs transition-colors"
              >
                {contactSent ? "Application Mail ouverte !" : "Envoyer à la MDLE 📩"}
              </button>
            </form>

            {/* Réseaux sociaux */}
            <div className="flex gap-4 pt-2">
              <a href="https://www.instagram.com/mdle.perrin" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white/70 hover:text-[#F26D5B] flex items-center gap-1.5 bg-white/5 px-3 py-2 rounded-xl">
                📸 Instagram
              </a>
              {/* <a href="https://www.tiktok.com/@mdle.perrin" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white/70 hover:text-[#F26D5B] flex items-center gap-1.5 bg-white/5 px-3 py-2 rounded-xl">
                🎵 TikTok
              </a> */}
            </div>
          </div>

          {/* Colonne Droite : Bâtiment + Lien discret Admin */}
          <div className="flex flex-col items-center md:items-end justify-between h-full gap-6">
            <div className="bg-[#FAFAF8] p-3 rounded-3xl border border-white/10 shadow-sm overflow-hidden w-full">
              <Image
                src="/plan-acces.jpg"
                alt="Bâtiment de la MDLE du Lycée Jean Perrin"
                width={1200}
                height={800}
                className="w-full h-auto max-h-[300px] object-contain rounded-2xl"
              />
            </div>

            <div className="flex justify-between items-center w-full text-[11px] text-white/30 pt-4 border-t border-white/5">
              <span>© 2026 - MDLE Lycée Jean Perrin</span>
              <a href="/admin" className="hover:text-white/60 transition-colors">
                🔒 Espace Admin
              </a>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .marquee-track {
          animation: marquee 32s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}