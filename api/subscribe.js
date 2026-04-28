export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  const API_KEY = process.env.SYSTEME_API_KEY;
  const API_BASE = 'https://api.systeme.io/api';

  if (!API_KEY) {
    console.error('SYSTEME_API_KEY manquante');
    return res.status(500).json({ error: 'Configuration serveur incomplète' });
  }

  try {
    // Étape 1 : Créer le contact
    const contactRes = await fetch(`${API_BASE}/contacts`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        locale: 'fr',
      }),
    });

    let contactId;

    if (contactRes.status === 409 || contactRes.status === 422) {
      // Contact existe déjà — on le récupère
      const searchRes = await fetch(
        `${API_BASE}/contacts?email=${encodeURIComponent(email.trim().toLowerCase())}`,
        {
          headers: {
            'X-API-Key': API_KEY,
            'Content-Type': 'application/json',
          },
        }
      );
      const existing = await searchRes.json();
      contactId = existing.items?.[0]?.id || existing.id;

      if (!contactId) {
        return res.status(500).json({ error: 'Contact existant non retrouvé' });
      }
    } else if (!contactRes.ok) {
      const err = await contactRes.text();
      console.error('Erreur création contact:', contactRes.status, err);
      return res.status(500).json({ error: 'Erreur lors de la création du contact' });
    } else {
      const contact = await contactRes.json();
      contactId = contact.id;
    }

    // Étape 2 : Appliquer le tag "Newsletter Site"
    // Remplacer TAG_ID par le vrai ID de ton tag dans Systeme.io
    const TAG_ID = process.env.SYSTEME_TAG_ID || '2';

    const tagRes = await fetch(`${API_BASE}/contacts/${contactId}/tags`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tagId: parseInt(TAG_ID, 10) }),
    });

    if (!tagRes.ok) {
      const err = await tagRes.text();
      console.error('Erreur tag:', tagRes.status, err);
      // Le contact est créé, on ne bloque pas si le tag échoue
    }

    return res.status(200).json({ success: true, message: 'Inscription réussie !' });
  } catch (err) {
    console.error('Erreur serveur:', err);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
}
