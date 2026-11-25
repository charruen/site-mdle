import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de désinscription des e-mails de relance
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return new NextResponse(
      renderHtml('Lien invalide', 'Le jeton de désinscription est manquant ou invalide.', false),
      { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }

  try {
    const supabase = getSupabaseAdmin()
    const { data: order, error } = await supabase
      .from('roses_orders')
      .update({ reminders_opt_out: true })
      .eq('unsubscribe_token', token)
      .select('id, recipient_name')
      .single()

    if (error || !order) {
      return new NextResponse(
        renderHtml('Commande introuvable', 'Cette commande n’a pas été trouvée ou a déjà été traitée.', false),
        { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } }
      )
    }

    return new NextResponse(
      renderHtml(
        'Désinscription confirmée',
        `Vous ne recevrez plus d'e-mails de rappel pour la commande #${order.id.slice(0, 8).toUpperCase()}. Si votre commande n'est pas réglée avant la date limite, elle sera simplement annulée automatiquement.`,
        true
      ),
      { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  } catch (err) {
    console.error('Erreur unsubscribe :', err)
    return new NextResponse(
      renderHtml('Erreur serveur', 'Une erreur est survenue lors de la désinscription.', false),
      { status: 500, headers: { 'content-type': 'text/html; charset=utf-8' } }
    )
  }
}

function renderHtml(title: string, message: string, isSuccess: boolean): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — MDLE Saint-Valentin</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FFF8F7;
      color: #231919;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
      box-sizing: border-box;
    }
    .card {
      background: #FFFFFF;
      max-width: 480px;
      width: 100%;
      border-radius: 16px;
      padding: 32px 24px;
      box-shadow: 0 4px 20px rgba(183,16,42,0.08);
      border: 1px solid #F6DEDC;
      text-align: center;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 20px;
      color: ${isSuccess ? '#b7102a' : '#ba1a1a'};
      margin: 0 0 12px;
    }
    p {
      font-size: 14px;
      color: #565e74;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    a.btn {
      display: inline-block;
      background-color: #b7102a;
      color: #FFFFFF;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      padding: 10px 20px;
      border-radius: 9999px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${isSuccess ? '✉️' : '⚠️'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/" class="btn">Retour à la boutique</a>
  </div>
</body>
</html>
  `
}
