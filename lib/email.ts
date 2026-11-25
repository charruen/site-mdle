import { Resend } from 'resend'
import {
  COUNTER_CLOSING_LABEL,
  COUNTER_HOURS,
  COUNTER_LOCATION,
  DELIVERY_DATE_LABEL,
  EDITION_YEAR,
} from './config'

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  return new Resend(apiKey)
}

function getSenderEmail(): string {
  return process.env.EMAIL_FROM || 'MDLE Lycée Jean Perrin <roses@mdle-jeanperrin.fr>'
}

function resolveRecipientEmail(originalEmail: string): string {
  const override = process.env.REMINDERS_TEST_EMAIL
  if (override && override.trim()) {
    console.log(`[Email] Redirection de ${originalEmail} vers REMINDERS_TEST_EMAIL : ${override}`)
    return override.trim()
  }
  return originalEmail
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

type OrderEmailData = {
  id: string
  sender_name: string
  sender_email: string
  recipient_name: string
  recipient_class: string
  red_roses_count: number
  pink_roses_count: number
  has_message: boolean
  total_amount: number
  payment_method: 'sumup_online' | 'mdle_counter'
  payment_status: string
  unsubscribe_token?: string
}

/**
 * E-mail de confirmation de commande
 */
export async function sendOrderConfirmationEmail(order: OrderEmailData): Promise<boolean> {
  const resend = getResendClient()
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY non configurée. E-mail de confirmation non envoyé.')
    return false
  }

  const to = resolveRecipientEmail(order.sender_email)
  const shortId = order.id.slice(0, 8).toUpperCase()
  const baseUrl = getBaseUrl()
  const unsubscribeUrl = `${baseUrl}/api/orders/unsubscribe?token=${order.unsubscribe_token || ''}`

  const isCounter = order.payment_method === 'mdle_counter'
  const totalRoses = order.red_roses_count + order.pink_roses_count

  const subject = `Confirmation de commande roses #${shortId} — Saint-Valentin ${EDITION_YEAR}`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF8F7; color: #231919; margin: 0; padding: 24px; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #F6DEDC; box-shadow: 0 4px 12px rgba(183,16,42,0.06);">
    <!-- Header -->
    <tr>
      <td style="background-color: #b7102a; padding: 28px 32px; text-align: center; color: #FFFFFF;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">Maison Des Lycéens & Étudiants</h1>
        <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Opération Saint-Valentin ${EDITION_YEAR} • Lycée Jean Perrin</p>
      </td>
    </tr>
    <!-- Contenu -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="font-size: 18px; color: #b7102a; margin-top: 0;">Bonjour ${escapeHtml(order.sender_name)},</h2>
        <p style="font-size: 15px; margin: 0 0 20px;">
          Nous avons bien reçu ta commande pour l'opération Saint-Valentin ! Voici le récapitulatif :
        </p>

        <!-- Récapitulatif -->
        <table width="100%" style="background-color: #FFF0EF; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #565e74;">Référence :</td>
            <td style="padding: 6px 0; font-weight: 700; text-align: right; color: #b7102a;">#${shortId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #565e74;">Destinataire :</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${escapeHtml(order.recipient_name)} (${escapeHtml(order.recipient_class)})</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #565e74;">Roses commandées :</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">
              ${order.red_roses_count > 0 ? `${order.red_roses_count} rouge${order.red_roses_count > 1 ? 's' : ''}` : ''}
              ${order.red_roses_count > 0 && order.pink_roses_count > 0 ? ' & ' : ''}
              ${order.pink_roses_count > 0 ? `${order.pink_roses_count} rose${order.pink_roses_count > 1 ? 's' : ''}` : ''}
              (${totalRoses} au total)
            </td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #565e74;">Mot doux manuscrit :</td>
            <td style="padding: 6px 0; font-weight: 600; text-align: right;">${order.has_message ? 'Oui (+0,50 €)' : 'Non'}</td>
          </tr>
          <tr style="border-top: 1px solid #F6DEDC;">
            <td style="padding: 10px 0 4px; font-weight: 700; font-size: 16px;">Total :</td>
            <td style="padding: 10px 0 4px; font-weight: 800; font-size: 18px; text-align: right; color: #b7102a;">${order.total_amount.toFixed(2)} €</td>
          </tr>
        </table>

        <!-- Instructions de règlement -->
        <div style="background-color: #FFF8F7; border-left: 4px solid #b7102a; padding: 16px; border-radius: 4px; margin-bottom: 24px;">
          <h3 style="margin: 0 0 8px; font-size: 15px; color: #b7102a;">
            ${isCounter ? 'Règlement au Foyer MDLE (espèces ou carte bancaire)' : 'Règlement en ligne par Carte Bancaire (SumUp)'}
          </h3>
          ${
            isCounter
              ? `<p style="margin: 0; font-size: 14px; line-height: 1.5;">
                  Ta commande est réservée ! Pour la valider définitivement, viens régler <strong>${order.total_amount.toFixed(2)} €</strong> au Foyer MDLE (${COUNTER_LOCATION}) :<br>
                  • Horaires : ${COUNTER_HOURS}<br>
                  • <strong>Date limite impérative : ${COUNTER_CLOSING_LABEL}</strong>.<br>
                  <span style="color: #ba1a1a; font-weight: 600;">Pense à indiquer ta référence #${shortId} et ton nom lors du paiement.</span>
                </p>`
              : `<p style="margin: 0; font-size: 14px; line-height: 1.5;">
                  Le paiement sécurisé en ligne s'effectue par carte bancaire. Si ton paiement a déjà été validé à l'écran, ta commande est confirmée ! En cas d'interruption, tu recevras un lien de régularisation.
                </p>`
          }
        </div>

        <!-- Distribution -->
        <p style="font-size: 14px; color: #565e74; margin-bottom: 24px;">
          📅 <strong>Distribution officielle :</strong> ${DELIVERY_DATE_LABEL} directement en classe par les membres du bureau MDLE.
        </p>

        <p style="font-size: 14px; color: #565e74; margin-bottom: 0;">
          Une question ? Réponds directement à cet e-mail ou écris-nous à <a href="mailto:contact@mdle-jeanperrin.fr" style="color: #b7102a;">contact@mdle-jeanperrin.fr</a>.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #FFF0EF; padding: 16px 32px; text-align: center; font-size: 12px; color: #565e74; border-top: 1px solid #F6DEDC;">
        Maison Des Lycéens et Étudiants du Lycée Jean Perrin — Association Loi 1901<br>
        <a href="${unsubscribeUrl}" style="color: #8f6f6e; text-decoration: underline; margin-top: 6px; display: inline-block;">Ne plus recevoir d'e-mails de relance pour cette commande</a>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    const { error } = await resend.emails.send({
      from: getSenderEmail(),
      to: [to],
      subject,
      html,
    })
    if (error) {
      console.error('[Email] Erreur envoi confirmation Resend :', error)
      return false
    }
    return true
  } catch (err) {
    console.error('[Email] Exception envoi confirmation Resend :', err)
    return false
  }
}

/**
 * E-mail de relance automatique (Comptoir ou Carte)
 */
export async function sendReminderEmail(order: OrderEmailData, daysRemaining: number, isLastDay: boolean): Promise<boolean> {
  const resend = getResendClient()
  if (!resend) return false

  const to = resolveRecipientEmail(order.sender_email)
  const shortId = order.id.slice(0, 8).toUpperCase()
  const baseUrl = getBaseUrl()
  const unsubscribeUrl = `${baseUrl}/api/orders/unsubscribe?token=${order.unsubscribe_token || ''}`
  const isCounter = order.payment_method === 'mdle_counter'

  let subject = ''
  let urgencyText = ''

  if (isLastDay) {
    subject = `⚠️ DERNIER JOUR : Réglez votre commande roses #${shortId} avant clôture !`
    urgencyText = isCounter
      ? `Aujourd'hui est le dernier jour pour régler votre commande au Foyer MDLE avant la fermeture de 17h30. Sans règlement, votre commande ne pourra pas être préparée.`
      : `Les commandes pour la Saint-Valentin ferment ce soir à 23h59. Réglez votre commande en ligne pour qu'elle soit prise en compte.`
  } else if (daysRemaining <= 2) {
    subject = `Rappel urgent : Plus que ${daysRemaining} jours pour valider votre commande #${shortId}`
    urgencyText = `Il ne vous reste plus que ${daysRemaining} jours pour finaliser votre règlement. Les roses non réglées ne seront pas commandées auprès du grossiste.`
  } else {
    subject = `Rappel : Commande de roses #${shortId} en attente de règlement`
    urgencyText = `Votre réservation de roses pour la Saint-Valentin est enregistrée mais en attente de paiement.`
  }

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF8F7; color: #231919; margin: 0; padding: 24px; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #F6DEDC;">
    <tr>
      <td style="background-color: ${isLastDay ? '#ba1a1a' : '#b7102a'}; padding: 24px 32px; text-align: center; color: #FFFFFF;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Rappel Saint-Valentin ${EDITION_YEAR} • MDLE</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="font-size: 15px; margin-top: 0;">Bonjour <strong>${escapeHtml(order.sender_name)}</strong>,</p>
        <p style="font-size: 15px; color: #231919;">
          ${urgencyText}
        </p>

        <div style="background-color: #FFF0EF; border-radius: 10px; padding: 16px; margin: 20px 0; font-size: 14px;">
          <p style="margin: 0 0 6px;"><strong>Référence :</strong> #${shortId}</p>
          <p style="margin: 0 0 6px;"><strong>Destinataire :</strong> ${escapeHtml(order.recipient_name)} (${escapeHtml(order.recipient_class)})</p>
          <p style="margin: 0 0 6px;"><strong>Roses :</strong> ${order.red_roses_count + order.pink_roses_count} rose(s)</p>
          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #b7102a;"><strong>Montant à régler :</strong> ${order.total_amount.toFixed(2)} €</p>
        </div>

        <div style="background-color: #FFF8F7; border: 1px solid #F6DEDC; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h4 style="margin: 0 0 8px; font-size: 14px; color: #b7102a;">Comment régler :</h4>
          ${
            isCounter
              ? `<p style="margin: 0; font-size: 14px;">
                  Passe au <strong>Foyer MDLE</strong> (${COUNTER_HOURS}) avec ta référence <strong>#${shortId}</strong> avant <strong>${COUNTER_CLOSING_LABEL}</strong>.
                </p>`
              : `<p style="margin: 0; font-size: 14px;">
                  Rends-toi sur le site de la MDLE pour finaliser ton règlement par carte bancaire sécurisée.
                </p>`
          }
        </div>

        <p style="font-size: 13px; color: #565e74;">
          Si tu as déjà effectué ce paiement il y a quelques minutes, ne tiens pas compte de ce message.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #FFF0EF; padding: 16px 32px; text-align: center; font-size: 12px; color: #565e74; border-top: 1px solid #F6DEDC;">
        MDLE Jean Perrin • <a href="${unsubscribeUrl}" style="color: #8f6f6e; text-decoration: underline;">Se désabonner des relances</a>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    const { error } = await resend.emails.send({
      from: getSenderEmail(),
      to: [to],
      subject,
      html,
    })
    return !error
  } catch (err) {
    console.error('[Email] Erreur envoi relance :', err)
    return false
  }
}

/**
 * E-mail d'annulation / expiration de commande non réglée
 */
export async function sendOrderExpiredEmail(order: OrderEmailData): Promise<boolean> {
  const resend = getResendClient()
  if (!resend) return false

  const to = resolveRecipientEmail(order.sender_email)
  const shortId = order.id.slice(0, 8).toUpperCase()

  const subject = `Commande de roses #${shortId} annulée pour défaut de règlement`

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF8F7; color: #231919; margin: 0; padding: 24px; line-height: 1.6;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #F6DEDC;">
    <tr>
      <td style="background-color: #565e74; padding: 24px 32px; text-align: center; color: #FFFFFF;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Clôture des commandes • MDLE</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="font-size: 15px; margin-top: 0;">Bonjour <strong>${escapeHtml(order.sender_name)}</strong>,</p>
        <p style="font-size: 15px; color: #231919;">
          La période de règlement pour la Saint-Valentin ${EDITION_YEAR} est maintenant terminée. N'ayant pas reçu votre règlement de ${order.total_amount.toFixed(2)} € pour la commande <strong>#${shortId}</strong>, celle-ci a été automatiquement annulée et les roses ne seront pas distribuées.
        </p>
        <p style="font-size: 14px; color: #565e74;">
          Si vous pensez qu'il s'agit d'une erreur, contactez le bureau MDLE au plus vite à <a href="mailto:contact@mdle-jeanperrin.fr" style="color: #b7102a;">contact@mdle-jeanperrin.fr</a>.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    const { error } = await resend.emails.send({
      from: getSenderEmail(),
      to: [to],
      subject,
      html,
    })
    return !error
  } catch (err) {
    console.error('[Email] Erreur envoi expiration :', err)
    return false
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
