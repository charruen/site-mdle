"use client";

import { useState } from "react";

// 🔧 À REMPLACER : colle ici ton vrai lien de paiement SumUp fixe à 10€
const SUMUP_LINK = "https://pay.sumup.com/b2c/REMPLACE_MOI";

export default function AdhererPage() {
    const [firstname, setFirstname] = useState("");
    const [lastname, setLastname] = useState("");
    const [studentClass, setStudentClass] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
        "idle"
    );
    const [errorMsg, setErrorMsg] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        setErrorMsg("");

        try {
            const res = await fetch("/api/adherer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    firstname,
                    lastname,
                    class: studentClass,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorMsg(data.error || "Une erreur est survenue.");
                setStatus("error");
                return;
            }

            setStatus("done");
        } catch {
            setErrorMsg("Impossible de contacter le serveur. Réessaie.");
            setStatus("error");
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF8] text-[#1B2A4A] flex items-center justify-center px-5 py-16">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <span className="inline-flex items-center gap-2 bg-white border border-[#1B2A4A]/10 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6 shadow-sm">
                        Adhésion MDLE
                    </span>
                    <h1 className="text-3xl font-black tracking-tight mb-2">
                        Rejoins la MDL
                    </h1>
                    <p className="text-[#1B2A4A]/60 text-sm">
                        10€ pour l’année, pour soutenir la vie du lycée.
                    </p>
                </div>

                <div className="bg-white border border-[#1B2A4A]/10 rounded-3xl p-7 shadow-sm">
                    {status !== "done" ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="firstname"
                                    className="block text-xs font-bold uppercase tracking-widest text-[#1B2A4A]/50 mb-1.5"
                                >
                                    Prénom
                                </label>
                                <input
                                    id="firstname"
                                    type="text"
                                    required
                                    value={firstname}
                                    onChange={(e) => setFirstname(e.target.value)}
                                    className="w-full rounded-xl border border-[#1B2A4A]/15 px-4 py-2.5 text-sm outline-none focus:border-[#F26D5B] transition-colors"
                                    placeholder="Ex : Nathan"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="lastname"
                                    className="block text-xs font-bold uppercase tracking-widest text-[#1B2A4A]/50 mb-1.5"
                                >
                                    Nom
                                </label>
                                <input
                                    id="lastname"
                                    type="text"
                                    required
                                    value={lastname}
                                    onChange={(e) => setLastname(e.target.value)}
                                    className="w-full rounded-xl border border-[#1B2A4A]/15 px-4 py-2.5 text-sm outline-none focus:border-[#F26D5B] transition-colors"
                                    placeholder="Ex : Dupont"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="class"
                                    className="block text-xs font-bold uppercase tracking-widest text-[#1B2A4A]/50 mb-1.5"
                                >
                                    Classe
                                </label>
                                <input
                                    id="class"
                                    type="text"
                                    required
                                    value={studentClass}
                                    onChange={(e) => setStudentClass(e.target.value)}
                                    className="w-full rounded-xl border border-[#1B2A4A]/15 px-4 py-2.5 text-sm outline-none focus:border-[#F26D5B] transition-colors"
                                    placeholder="Ex : 1ère 3"
                                />
                            </div>

                            {status === "error" && (
                                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                                    {errorMsg}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={status === "loading"}
                                className="w-full bg-[#1B2A4A] text-white font-bold text-sm py-3.5 rounded-full hover:bg-[#F26D5B] transition-colors disabled:opacity-50"
                            >
                                {status === "loading" ? "Enregistrement..." : "Continuer"}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 rounded-full bg-[#2E8B7A]/10 flex items-center justify-center mx-auto mb-4 text-2xl">
                                ✅
                            </div>
                            <h2 className="font-black text-lg mb-2">C’est presque fini !</h2>
                            <p className="text-sm text-[#1B2A4A]/60 mb-6 leading-relaxed">
                                Il ne reste plus qu’à régler ton adhésion de 10€ sur SumUp.
                            </p>
                            <a
                                href={SUMUP_LINK}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block w-full bg-[#F26D5B] text-white font-bold text-sm py-3.5 rounded-full hover:bg-[#1B2A4A] transition-colors"
                            >
                                Payer 10€ sur SumUp
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}