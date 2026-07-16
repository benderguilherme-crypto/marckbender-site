// Inscription newsletter — enregistre le contact dans Resend Contacts,
// segment "Guias Bender IA" (RESEND_SEGMENT_ID), via l'API REST officielle.
// Contrat de réponse inchangé pour les formulaires du site :
//   405 { error } · 400 { error } · 500 { error } · 200 { success: true }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { email } = req.body || {};

  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const API_KEY = process.env.RESEND_CONTACTS_API_KEY;
  const SEGMENT_ID = process.env.RESEND_SEGMENT_ID;

  if (!API_KEY || !SEGMENT_ID) {
    console.error('subscribe: configuration incomplète (RESEND_CONTACTS_API_KEY / RESEND_SEGMENT_ID)');
    return res.status(500).json({ error: 'Inscrição indisponível no momento. Tente novamente mais tarde.' });
  }

  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Étape 1 : créer le contact directement rattaché au segment
    const createRes = await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: normalizedEmail,
        segments: [{ id: SEGMENT_ID }],
      }),
    });

    if (createRes.ok) {
      return res.status(200).json({ success: true });
    }

    // Étape 2 : le contact existe probablement déjà — on confirme son
    // appartenance au segment (le contact peut être identifié par son e-mail).
    const errBody = await createRes.text();
    const alreadyExists = createRes.status === 409 || /already[\s_-]?exist/i.test(errBody);

    if (!alreadyExists) {
      console.error('subscribe: erreur Resend (création contact)', createRes.status, errBody);
      return res.status(500).json({ error: 'Não foi possível concluir a inscrição. Tente novamente.' });
    }

    const segmentRes = await fetch(
      `https://api.resend.com/contacts/${encodeURIComponent(normalizedEmail)}/segments/${encodeURIComponent(SEGMENT_ID)}`,
      { method: 'POST', headers }
    );

    if (!segmentRes.ok) {
      const segErr = await segmentRes.text();
      console.error('subscribe: erreur Resend (ajout au segment)', segmentRes.status, segErr);
      return res.status(500).json({ error: 'Não foi possível concluir a inscrição. Tente novamente.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('subscribe: erreur serveur', err);
    return res.status(500).json({ error: 'Erro no servidor. Tente novamente.' });
  }
}
