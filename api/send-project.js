// Endpoint "Enviar projeto" — reçoit { email, message, website } depuis le formulaire
// de la section #contact et envoie un e-mail via l'API REST de Resend (fetch, zéro dépendance).
//
// Évolution prévue : une étape de synthèse IA (objet généré automatiquement, demande
// structurée) pourra être insérée entre la validation et l'envoi, sans changer le
// formulaire côté navigateur — mêmes champs, même contrat JSON.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { email, message, website } = req.body || {};

  // Honeypot anti-robots : un humain ne voit jamais ce champ. S'il est rempli,
  // on répond comme si tout allait bien, sans rien envoyer.
  if (website) {
    return res.status(200).json({ success: true });
  }

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }

  const text = typeof message === 'string' ? message.trim() : '';
  if (text.length < 20 || text.length > 3000) {
    return res.status(400).json({ error: 'A mensagem deve ter entre 20 e 3000 caracteres' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_TO = process.env.PROJECT_EMAIL_TO;
  const EMAIL_FROM = process.env.RESEND_FROM;

  if (!RESEND_API_KEY || !EMAIL_TO || !EMAIL_FROM) {
    console.error('send-project: configuration incomplète (RESEND_API_KEY / PROJECT_EMAIL_TO / RESEND_FROM)');
    return res.status(500).json({ error: 'Envio indisponível no momento. Tente novamente mais tarde.' });
  }

  const visitorEmail = email.trim().toLowerCase();
  const receivedAt = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Paris' });

  const emailBody = [
    `De: ${visitorEmail}`,
    `Recebido em: ${receivedAt} (horário de Paris)`,
    '',
    'Mensagem:',
    text,
  ].join('\n');

  try {
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [EMAIL_TO],
        reply_to: visitorEmail,
        subject: 'Novo projeto pelo site Bender IA',
        text: emailBody,
      }),
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      console.error('send-project: erreur Resend', sendRes.status, err);
      return res.status(500).json({ error: 'Não foi possível enviar agora. Tente novamente.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('send-project: erreur serveur', err);
    return res.status(500).json({ error: 'Erro no servidor. Tente novamente.' });
  }
}
