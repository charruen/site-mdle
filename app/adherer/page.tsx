"use client";

import { useState } from "react";

export default function AdhererPage() {
    const [status, setStatus] = useState<"idle" | "done">("idle");

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
                    {status === "idle" ? (
                        <div className="space-y-4 text-center">
                            <p className="text-sm text-[#1B2A4A]/70 mb-4">
                                Pour adhérer à la MDLE, clique sur le bouton ci-dessous pour connaître la démarche.
                            </p>
                            <button
                                onClick={() => setStatus("done")}
                                className="w-full bg-[#1B2A4A] text-white font-bold text-sm py-3.5 rounded-full hover:bg-[#F26D5B] transition-colors"
                            >
                                Adhérer à la MDLE
                            </button>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 rounded-full bg-[#F2A63C]/10 flex items-center justify-center mx-auto mb-4 text-2xl">
                                ℹ️
                            </div>
                            <h2 className="font-black text-lg mb-2">Démarche d'adhésion</h2>
                            <p className="text-sm text-[#1B2A4A]/60 leading-relaxed">
                                Veuillez vous rapprocher de M. Baccam, CPE à la Vie Scolaire.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}