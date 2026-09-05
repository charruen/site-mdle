"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

type MenuItem = {
  id: number;
  title: string;
  category: string;
  price: string;
  description: string | null;
  is_available: boolean;
};

type AgendaEvent = {
  id: number;
  title: string;
  date: string;
  location: string | null;
  description: string | null;
  payment_link: string | null;
  price: string | null;
};

type Project = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  goal_amount: number | null;
  current_amount: number | null;
};

type BannerSetting = {
  id: number;
  content: string;
  is_active: boolean;
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"menu" | "agenda" | "projects" | "settings">("menu");
  const [loading, setLoading] = useState(true);

  // État Cafétéria
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newItem, setNewItem] = useState({ title: "", category: "Ventes Saisonnières", price: "", description: "" });

  // État Agenda
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", location: "", description: "", price: "", payment_link: "" });

  // État Projets
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProject, setNewProject] = useState({ title: "", slug: "", description: "", goal_amount: "", status: "actif" });

  // État Bandeau
  const [banner, setBanner] = useState<BannerSetting | null>(null);
  const [bannerText, setBannerText] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    if (!supabase) return;
    setLoading(true);

    const { data: menuData } = await supabase.from("menu_items").select("*").order("id", { ascending: true });
    const { data: eventData } = await supabase.from("events").select("*").order("id", { ascending: true });
    const { data: projectData } = await supabase.from("projects").select("*").order("id", { ascending: true });
    const { data: bannerData } = await supabase.from("settings").select("*").eq("key", "announcement_banner").single();

    if (menuData) setMenuItems(menuData);
    if (eventData) setEvents(eventData);
    if (projectData) setProjects(projectData);
    if (bannerData) {
      setBanner(bannerData);
      setBannerText(bannerData.value || "");
    }

    setLoading(false);
  }

  // --- Gestion Cafétéria ---
  const toggleAvailability = async (item: MenuItem) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);

    if (!error) {
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i))
      );
    }
  };

  const addMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newItem.title || !newItem.price) return;

    const { data, error } = await supabase.from("menu_items").insert([
      { ...newItem, is_available: true }
    ]).select();

    if (!error && data) {
      setMenuItems((prev) => [...prev, data[0]]);
      setNewItem({ title: "", category: "Ventes Saisonnières", price: "", description: "" });
    }
  };

  const deleteMenuItem = async (id: number) => {
    if (!supabase) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (!error) {
      setMenuItems((prev) => prev.filter((i) => i.id !== id));
    }
  };

  // --- Gestion Agenda ---
  const addAgendaEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newEvent.title || !newEvent.date) return;

    const { data, error } = await supabase.from("events").insert([newEvent]).select();

    if (!error && data) {
      setEvents((prev) => [...prev, data[0]]);
      setNewEvent({ title: "", date: "", location: "", description: "", price: "", payment_link: "" });
    }
  };

  const deleteAgendaEvent = async (id: number) => {
    if (!supabase) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (!error) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  // --- Gestion Projets ---
  const addProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !newProject.title) return;

    const generatedSlug = newProject.slug || newProject.title.toLowerCase().replace(/ /g, "-");
    const { data, error } = await supabase.from("projects").insert([
      {
        title: newProject.title,
        slug: generatedSlug,
        description: newProject.description,
        goal_amount: newProject.goal_amount ? parseFloat(newProject.goal_amount) : null,
        status: newProject.status
      }
    ]).select();

    if (!error && data) {
      setProjects((prev) => [...prev, data[0]]);
      setNewProject({ title: "", slug: "", description: "", goal_amount: "", status: "actif" });
    }
  };

  const deleteProject = async (id: number) => {
    if (!supabase) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (!error) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  // --- Gestion Paramètres / Bandeau ---
  const saveBanner = async () => {
    if (!supabase) return;
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "announcement_banner", value: bannerText }, { onConflict: "key" });

    if (!error) alert("Bandeau mis à jour !");
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] p-6 max-w-6xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#1B2A4A]/10 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#F26D5B]">Panneau de Gestion</span>
          <h1 className="text-3xl font-black">Admin MDLE Jean Perrin</h1>
        </div>
        <a href="/" className="text-xs font-bold bg-[#1B2A4A] text-white px-4 py-2 rounded-full hover:bg-[#F26D5B] transition-colors w-fit">
          ← Retour au site public
        </a>
      </div>

      {/* Navigation Onglets */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white p-1.5 rounded-2xl border border-[#1B2A4A]/10 w-fit">
        <button
          onClick={() => setActiveTab("menu")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === "menu" ? "bg-[#1B2A4A] text-white" : "text-[#1B2A4A]/60 hover:text-[#1B2A4A]"}`}
        >
          🍕 Carte & Cafétéria
        </button>
        <button
          onClick={() => setActiveTab("agenda")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === "agenda" ? "bg-[#1B2A4A] text-white" : "text-[#1B2A4A]/60 hover:text-[#1B2A4A]"}`}
        >
          📅 Agenda & Événements
        </button>
        <button
          onClick={() => setActiveTab("projects")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === "projects" ? "bg-[#1B2A4A] text-white" : "text-[#1B2A4A]/60 hover:text-[#1B2A4A]"}`}
        >
          🚀 Projets & Ventes
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors ${activeTab === "settings" ? "bg-[#1B2A4A] text-white" : "text-[#1B2A4A]/60 hover:text-[#1B2A4A]"}`}
        >
          ⚙️ Configuration Site
        </button>
      </div>

      {loading ? (
        <p className="text-[#1B2A4A]/60">Chargement des données Supabase...</p>
      ) : activeTab === "menu" ? (
        /* GESTION CARTE */
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-3xl border border-[#1B2A4A]/10 shadow-sm h-fit">
            <h2 className="text-lg font-black mb-4">Ajouter un produit</h2>
            <form onSubmit={addMenuItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Nom de l'article</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Pain au chocolat, Pack Snack..."
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Catégorie</label>
                <select
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                >
                  <option value="Ventes Saisonnières">✨ Ventes Saisonnières</option>
                  <option value="Boissons">Boissons</option>
                  <option value="Snacks sucrés">Snacks sucrés</option>
                  <option value="Snacks salés">Snacks salés</option>
                  <option value="Formules">Formules</option>
                </select>
              </div>
              <div>
                <label className="font-bold block mb-1">Prix</label>
                <input
                  type="text"
                  required
                  placeholder="ex: 1,50 €"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Description (optionnelle)</label>
                <textarea
                  rows={2}
                  placeholder="Détails du produit..."
                  value={newItem.description || ""}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#F26D5B] text-white font-bold py-3 rounded-xl hover:bg-[#1B2A4A] transition-colors"
              >
                + Ajouter à la carte
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h2 className="text-lg font-black mb-4">Produits actuels ({menuItems.length})</h2>
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-[#1B2A4A]/10 flex items-center justify-between gap-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{item.title}</span>
                    <span className="text-[10px] bg-[#1B2A4A]/5 px-2 py-0.5 rounded-full font-bold text-[#1B2A4A]/60">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#F26D5B] mt-0.5">{item.price}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleAvailability(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${item.is_available ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}
                  >
                    {item.is_available ? "Disponible" : "Rupture"}
                  </button>
                  <button
                    onClick={() => deleteMenuItem(item.id)}
                    className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Supprimer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === "agenda" ? (
        /* GESTION AGENDA */
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-3xl border border-[#1B2A4A]/10 shadow-sm h-fit">
            <h2 className="text-lg font-black mb-4">Ajouter un événement</h2>
            <form onSubmit={addAgendaEvent} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Titre de l'événement</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Tombola de Noël..."
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Lieu</label>
                <input
                  type="text"
                  placeholder="ex: Foyer"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Prix</label>
                <input
                  type="text"
                  placeholder="ex: Gratuit / 2 €"
                  value={newEvent.price}
                  onChange={(e) => setNewEvent({ ...newEvent, price: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Lien SumUp / Paiement</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={newEvent.payment_link}
                  onChange={(e) => setNewEvent({ ...newEvent, payment_link: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#2E8B7A] text-white font-bold py-3 rounded-xl hover:bg-[#1B2A4A] transition-colors"
              >
                + Ajouter à l'agenda
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h2 className="text-lg font-black mb-4">Événements ({events.length})</h2>
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-white p-4 rounded-2xl border border-[#1B2A4A]/10 flex items-center justify-between gap-4 shadow-sm"
              >
                <div>
                  <span className="text-[10px] font-bold text-[#2E8B7A] uppercase bg-[#2E8B7A]/10 px-2 py-0.5 rounded-full">
                    {event.date}
                  </span>
                  <h3 className="font-bold text-sm text-[#1B2A4A] mt-1">{event.title}</h3>
                  {event.location && <p className="text-xs text-[#1B2A4A]/50">📍 {event.location}</p>}
                </div>
                <button
                  onClick={() => deleteAgendaEvent(event.id)}
                  className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : activeTab === "projects" ? (
        /* GESTION PROJETS */
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-3xl border border-[#1B2A4A]/10 shadow-sm h-fit">
            <h2 className="text-lg font-black mb-4">Ajouter un projet</h2>
            <form onSubmit={addProject} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Titre du projet</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Sweat Lycée 2026"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Slug URL (ex: sweat-2026)</label>
                <input
                  type="text"
                  placeholder="Automatique si vide"
                  value={newProject.slug}
                  onChange={(e) => setNewProject({ ...newProject, slug: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Objectif (€)</label>
                <input
                  type="number"
                  placeholder="ex: 500"
                  value={newProject.goal_amount}
                  onChange={(e) => setNewProject({ ...newProject, goal_amount: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Présentation du projet..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#1B2A4A] text-white font-bold py-3 rounded-xl hover:bg-[#F26D5B] transition-colors"
              >
                + Publier le projet
              </button>
            </form>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h2 className="text-lg font-black mb-4">Projets en cours ({projects.length})</h2>
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white p-4 rounded-2xl border border-[#1B2A4A]/10 flex items-center justify-between gap-4 shadow-sm"
              >
                <div>
                  <h3 className="font-bold text-sm text-[#1B2A4A]">{project.title}</h3>
                  <span className="text-[10px] text-[#1B2A4A]/50">/p/{project.slug}</span>
                  {project.goal_amount && (
                    <p className="text-xs font-bold text-[#2E8B7A] mt-1">Objectif: {project.goal_amount} €</p>
                  )}
                </div>
                <button
                  onClick={() => deleteProject(project.id)}
                  className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* CONFIGURATION SITE */
        <div className="bg-white p-6 rounded-3xl border border-[#1B2A4A]/10 shadow-sm max-w-2xl">
          <h2 className="text-lg font-black mb-4">Annonce du site (Bandeau défilant)</h2>
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-bold block mb-1">Texte de l'annonce</label>
              <input
                type="text"
                placeholder="ex: 📣 Adhésions 2025/2026 ouvertes au Foyer !"
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                className="w-full bg-[#FAFAF8] border border-[#1B2A4A]/10 rounded-xl p-2.5 focus:outline-none focus:border-[#F26D5B]"
              />
            </div>
            <button
              onClick={saveBanner}
              className="bg-[#F26D5B] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#1B2A4A] transition-colors"
            >
              Enregistrer le bandeau
            </button>
          </div>
        </div>
      )}
    </div>
  );
}