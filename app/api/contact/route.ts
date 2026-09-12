import { Resend } from 'resend';
import { NextResponse } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { name, email, msg } = await req.json();

    if (!name || !email || !msg) {
      return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: 'MDLE Jean Perrin <onboarding@resend.dev>',
      to: ['charruen@gmail.com'],
      replyTo: email,
      subject: `[MDLE] Message de ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 12px;">
          <h2 style="color: #1B2A4A; margin-bottom: 4px;">📩 Nouveau message via le site MDLE</h2>
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;" />

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; width: 100px;"><strong>Nom</strong></td>
              <td style="padding: 8px 0; color: #1B2A4A;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666;"><strong>Email</strong></td>
              <td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #1B2A4A;">${email}</a></td>
            </tr>
          </table>

          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 16px 0;" />

          <p style="color: #666; margin: 0 0 8px;"><strong>Message :</strong></p>
          <p style="color: #1B2A4A; background: white; border-radius: 8px; padding: 16px; margin: 0; white-space: pre-wrap;">${msg}</p>

          <p style="color: #aaa; font-size: 12px; margin-top: 24px;">
            Envoyé depuis le formulaire de contact du site MDLE Jean Perrin.<br/>
            Pour répondre, clique sur "Répondre" — le mail sera envoyé directement à ${email}.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'Erreur lors de l\'envoi du mail.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact route error:', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
