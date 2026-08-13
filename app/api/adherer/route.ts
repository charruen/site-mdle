import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Utilise la clé service_role côté serveur uniquement (jamais exposée au client).
// Si ton projet a déjà un client Supabase partagé (ex: lib/supabase.ts),
// remplace ces 4 lignes par l'import de ce client.
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const firstname = (body.firstname ?? "").trim();
        const lastname = (body.lastname ?? "").trim();
        const studentClass = (body.class ?? "").trim();

        if (!firstname || !lastname || !studentClass) {
            return NextResponse.json(
                { error: "Prénom, nom et classe sont obligatoires." },
                { status: 400 }
            );
        }

        const { data, error } = await supabase
            .from("adherents")
            .insert({
                firstname,
                lastname,
                class: studentClass,
            })
            .select()
            .single();

        if (error) {
            console.error("Erreur Supabase (adherents):", error);
            return NextResponse.json(
                { error: "Impossible d'enregistrer l'adhésion." },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, adherent: data });
    } catch (err) {
        console.error("Erreur route /api/adherer:", err);
        return NextResponse.json(
            { error: "Requête invalide." },
            { status: 400 }
        );
    }
}