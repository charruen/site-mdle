"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialisation Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const NAV_LINKS = [
  { href: "#infos", label: "Infos & Bureau" },
  { href: "#carte", label: "La Carte" },
  { href: "#agenda", label: "Agenda" },
  { href: "#contact", label: "Contact" },
];

const MARQUEE_WORDS = [
  "PAR LES LYCÉENS",
  "POUR LES LYCÉENS",
  "MDLE JEAN PERRIN",
  "REJOINS-NOUS",
];

const BUREAU_MEMBERS = [
  { role: "Président", name: "Thomas", emoji: "👑" },
  { role: "Vice-Présidente 1", name: "Marie", emoji: "⚡" },
  { role: "Vice-Présidente 2", name: "Lisa", emoji: "⚡" },
  { role: "Trésorier", name: "Nathan", emoji: "💰" },
  { role: "Trésorier Adjoint", name: "Esteban", emoji: "💰" },
  { role: "Secrétaire", name: "À définir", emoji: "📝" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [agendaEvents, setAgendaEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Récupération de la carte depuis Supabase
      const { data: menuData } = await supabase
        .from("menu_items")
        .select("*")
        .order("id");

      // Récupération de l'agenda depuis Supabase
      const { data: agendaData } = await supabase
        .from("events")
        .select("*")
        .order("id");

      if (menuData) setMenuItems(menuData);
      if (agendaData) setAgendaEvents(agendaData);

      setLoading(false);
    }

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] font-sans antialiased">
{/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#1B2A4A]/10 bg-[#FAFAF8]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-5 py-4 flex justify-between items-center">
          <a href="#" className="flex items-center gap-2.5 group">
            <img
              src="/logo-mdle.png"
              alt="Logo MDLE Jean Perrin"
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
              href="https://www.helloasso.com" // 👈 Remplace par le lien direct de ta campagne HelloAsso
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#1B2A4A] text-white px-5 py-2.5 rounded-full hover:bg-[#F26D5B] transition-colors shadow-sm font-bold flex items-center gap-2"
            >
              <span>🎟️</span> Adhérer
            </a>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Ouvrir le menu"
            aria-expanded={menuOpen}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 gap-1.5"
          >
            <span
              className={`block w-6 h-0.5 rounded-full bg-[#1B2A4A] transition-transform ${
                menuOpen ? "rotate-45 translate-y-2" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 rounded-full bg-[#1B2A4A] transition-opacity ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`block w-6 h-0.5 rounded-full bg-[#1B2A4A] transition-transform ${
                menuOpen ? "-rotate-45 -translate-y-2" : ""
              }`}
            />
          </button>
        </div>

        {/* Mobile nav */}
        <div
          className={`md:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out ${
            menuOpen ? "max-h-64" : "max-h-0"
          }`}
        >
          <nav className="flex flex-col gap-1 px-5 pb-4 text-sm font-semibold">
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
              href="https://www.helloasso.com" // 👈 Remplace aussi le lien ici pour le menu mobile
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
      <section className="relative px-5 pt-16 pb-20 md:pt-24 md:pb-24 overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-24 w-72 h-72 rounded-full bg-[#F2A63C]/15 blur-2xl" />
        <div className="pointer-events-none absolute top-32 -left-20 w-64 h-64 rounded-full bg-[#2E8B7A]/15 blur-2xl" />

        <div className="relative max-w-6xl mx-auto">
          <span className="inline-flex items-center gap-2 bg-white border border-[#1B2A4A]/10 text-[#1B2A4A] text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-8 shadow-sm">
            <span className="w-1.5 h-1.5 bg-[#F26D5B] rounded-full animate-pulse" />
            Année 2026 - 2027
          </span>

          <h1 className="font-black leading-[0.95] tracking-tight text-[11vw] md:text-[6vw] lg:text-[5.5rem]">
            Ton lycée, <br />
            <span className="text-[#F26D5B]">tes</span> événements, <br />
            <span className="relative inline-block">
              ta MDLE.
              <svg
                className="absolute -bottom-2 left-0 w-full"
                viewBox="0 0 300 20"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M0 15 Q75 0 150 12 T300 8"
                  stroke="#F2A63C"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </span>
          </h1>

          <div className="mt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <p className="max-w-md text-[#1B2A4A]/60 text-base leading-relaxed">
              La Maison des Lycéens, c'est l'asso gérée par des élèves, pour les élèves.
              Foyer, projets, cafétéria et événements au Lycée Polyvalent Jean Perrin.
            </p>

            <div className="flex flex-wrap gap-3">
              <a
                href="#infos"
                className="bg-[#1B2A4A] text-white font-bold text-sm px-5 py-3 rounded-full hover:bg-[#F26D5B] transition-colors shadow-sm"
              >
                ℹ️ Infos pratiques
              </a>
              <a
                href="#carte"
                className="bg-[#F2A63C] text-[#1B2A4A] font-bold text-sm px-5 py-3 rounded-full hover:bg-[#1B2A4A] hover:text-white transition-colors shadow-sm"
              >
                🍕 La Carte
              </a>
              <a
                href="#agenda"
                className="bg-[#F26D5B] text-white font-bold text-sm px-5 py-3 rounded-full hover:bg-[#1B2A4A] transition-colors shadow-sm"
              >
                📅 Événements
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <div className="bg-[#1B2A4A] text-white py-3 overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-[marquee_22s_linear_infinite]">
          {[...Array(2)].map((_, loop) => (
            <span key={loop}>
              {MARQUEE_WORDS.map((word, i) => (
                <span
                  key={`${loop}-${i}`}
                  className="mx-6 text-sm font-bold uppercase tracking-widest inline-flex items-center gap-6"
                >
                  {word}
                  <span className="text-[#F2A63C]">✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Infos pratiques & Équipe / Bureau */}
      <section id="infos" className="max-w-6xl mx-auto px-5 py-20 md:py-28">
        <div className="mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#F26D5B]">
            Au quotidien
          </span>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-1">
            Infos pratiques & Bureau
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Bloc Horaires & Lieu */}
          <div className="bg-white border border-[#1B2A4A]/8 rounded-3xl p-8 shadow-sm">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span>📍</span> MDLE
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-[#F26D5B]/15 flex items-center justify-center shrink-0">
                  🕒
                </span>
                <div>
                  <p className="font-bold">Horaires d'ouverture</p>
                  <p className="text-[#1B2A4A]/60">Lundi 9h - 17h</p>
                  <p className="text-[#1B2A4A]/60">Mardi 9h - 17h</p>
                  <p className="text-[#1B2A4A]/60">Mercredi 9h - 12h</p>
                  <p className="text-[#1B2A4A]/60">Jeudi 9h - 17h</p>
                  <p className="text-[#1B2A4A]/60">Vendredi 9h - 15h</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-[#2E8B7A]/15 flex items-center justify-center shrink-0">
                  🏫
                </span>
                <div>
                  <p className="font-bold">Localisation</p>
                  <p className="text-[#1B2A4A]/60">Centre de la cour de récréation</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Bloc Équipe */}
          <div className="bg-white border border-[#1B2A4A]/8 rounded-3xl p-8 shadow-sm">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <span>👥</span> Les Élus de la MDLE
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {BUREAU_MEMBERS.map((member) => (
                <div
                  key={member.role}
                  className="bg-[#FAFAF8] border border-[#1B2A4A]/5 rounded-2xl p-4 flex items-center gap-3"
                >
                  <span className="text-2xl">{member.emoji}</span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1B2A4A]/40">
                      {member.role}
                    </p>
                    <p className="font-bold text-sm text-[#1B2A4A]">{member.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LA CARTE (Cafétéria) - DYNAMIQUE */}
      <section id="carte" className="bg-[#1B2A4A] text-white py-20 md:py-28 rounded-[2.5rem] md:rounded-[3rem] mx-3 md:mx-5">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#F2A63C]">
              Foyer & Cafétéria
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-1">
              La Carte de la MDLE
            </h2>
            <p className="text-white/50 text-sm mt-2 max-w-md">
              Disponible à la vente pendant les récrés et la pause du midi.
            </p>
          </div>

          {loading ? (
            <p className="text-white/60">Chargement de la carte depuis la base de données...</p>
          ) : menuItems.length === 0 ? (
            <p className="text-white/60">Aucun produit dans la carte pour l'instant.</p>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white/5 border rounded-3xl p-6 backdrop-blur-sm flex flex-col justify-between transition-opacity ${
                    item.is_available ? "border-white/10" : "border-red-500/30 opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#F2A63C] bg-white/5 px-2.5 py-1 rounded-full">
                        {item.category}
                      </span>
                      {!item.is_available && (
                        <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          Rupture
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black tracking-tight mt-3">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-white/50 mt-1">{item.description}</p>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="text-xs text-white/40">Prix</span>
                    <span className="font-bold text-[#F2A63C] text-lg">
                      {item.price}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* AGENDA - DYNAMIQUE */}
      <section id="agenda" className="max-w-6xl mx-auto px-5 py-20 md:py-28">
        <div className="mb-12 flex items-end justify-between flex-wrap gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#2E8B7A]">
              Planning & Projets
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mt-1">
              Futurs Événements
            </h2>
          </div>
        </div>

        {loading ? (
          <p className="text-[#1B2A4A]/60">Chargement de l'agenda...</p>
        ) : agendaEvents.length === 0 ? (
          <p className="text-[#1B2A4A]/60">Aucun événement prévu pour le moment.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {agendaEvents.map((event) => (
              <div
                key={event.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white border border-[#1B2A4A]/8 rounded-3xl p-6 hover:shadow-xl hover:shadow-[#1B2A4A]/5 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-5 flex-1">
                  <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:w-28 shrink-0">
                    <span className="text-sm font-black text-[#2E8B7A] uppercase">{event.date}</span>
                  </div>

                  <div className="hidden sm:block w-px self-stretch bg-[#1B2A4A]/8" />

                  <div className="flex-1">
                    <h3 className="text-lg font-black tracking-tight group-hover:text-[#F26D5B] transition-colors">
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="text-sm text-[#1B2A4A]/55 mt-1">{event.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  {event.location && (
                    <div className="text-xs font-bold text-[#1B2A4A]/60 bg-[#1B2A4A]/5 px-3 py-1.5 rounded-full shrink-0">
                      📍 {event.location}
                    </div>
                  )}
                  {event.payment_link && (
                    <a
                      href={event.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-white bg-[#F26D5B] hover:bg-[#1B2A4A] px-4 py-2 rounded-full transition-colors shrink-0"
                    >
                      Payer sur HelloAsso →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-[#1B2A4A] text-white rounded-t-[2.5rem] md:rounded-t-[3rem] mx-3 md:mx-5">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-14 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo-mdle.png"
                alt="Logo MDLE Jean Perrin"
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
              <span className="text-xl font-black tracking-tight">
                MDLE <span className="text-[#F26D5B]">Jean Perrin</span>
              </span>
            </div>
            <p className="text-white/45 text-sm max-w-sm leading-relaxed mb-6">
              L'association des lycéens, pour les lycéens. Foyer des élèves, Lycée Polyvalent Jean Perrin, Marseille.
            </p>
          </div>

          <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10">
            <iframe
              title="Carte du lycée Jean Perrin"
              src="https://www.google.com/maps?q=Lyc%C3%A9e+Jean+Perrin+Marseille&output=embed"
              className="w-full h-full grayscale-[30%] contrast-110"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}