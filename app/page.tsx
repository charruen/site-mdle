export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Navigation */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-900 tracking-tight">
            MDL <span className="text-blue-600">Jean Perrin</span>
          </h1>
          <nav className="space-x-6 text-sm font-medium text-slate-600">
            <a href="#about" className="hover:text-blue-600 transition">À propos</a>
            <a href="#infos" className="hover:text-blue-600 transition">Infos & Carte</a>
            <a href="#contact" className="hover:text-blue-600 transition">Contact</a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-900 to-slate-900 text-white py-20 px-4 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
            Maison des Lycéens
          </span>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            L'association gérée par et pour les lycéens.
          </h2>
          <p className="text-slate-300 text-lg">
            Retrouve toutes les infos sur la MDL du lycée polyvalent Jean Perrin, nos projets, animations et événements tout au long de l'année.
          </p>
        </div>
      </section>

      {/* Présentation */}
      <section id="about" className="max-w-5xl mx-auto px-4 py-16">
        <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Ce que fait la MDL</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-blue-600 font-bold text-lg mb-2">🎉 Événements</div>
            <p className="text-slate-600 text-sm">
              Organisation des temps forts du lycée : animations, fêtes, projets citoyens et solidarité.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-blue-600 font-bold text-lg mb-2">🤝 Vie Lycéenne</div>
            <p className="text-slate-600 text-sm">
              Aménagement des espaces de détente et soutien aux initiatives portées par les élèves.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-blue-600 font-bold text-lg mb-2">📢 Projets</div>
            <p className="text-slate-600 text-sm">
              Mise en place de clubs, sorties, partenariats et actions pour dynamiser le lycée.
            </p>
          </div>
        </div>
      </section>

      {/* Infos pratiques & Carte */}
      <section id="infos" className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Où nous trouver ?</h3>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Le bureau de la MDL se situe directement dans le foyer des élèves du lycée Jean Perrin. Passe nous voir pendant les pauses ou entre deux cours !
            </p>
            <ul className="space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">📍 Emplacement :</span> Foyer des élèves
              </li>
              <li className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">🕒 Horaires :</span> Récréations & Pause méridienne
              </li>
              <li className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">🏫 Établissement :</span> Lycée Polyvalent Jean Perrin
              </li>
            </ul>
          </div>
          <div className="bg-slate-100 h-64 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 font-medium">
            [ Plan / Carte du Foyer du Lycée ]
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-slate-900 text-slate-400 text-sm py-8 border-t border-slate-800">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© MDL Lycée Jean Perrin. Tous droits réservés.</p>
          <div className="space-x-4">
            <a href="#" className="hover:text-white transition">Instagram</a>
            <a href="#" className="hover:text-white transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}