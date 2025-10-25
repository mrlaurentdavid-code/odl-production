require('dotenv').config(); // Load environment variables first

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const { requireAuth } = require('./middleware-auth');

const app = express();
const PORT = process.env.PORT || 3002;

// Configuration
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());

// Servir les fichiers statiques (HTML, CSS, JS)
app.use(express.static(__dirname));

// Route d'analyse de facture (protégée par auth)
app.post('/api/analyze-invoice', requireAuth(), async (req, res) => {
    try {
        const { filePath } = req.body;

        if (!filePath) {
            return res.status(400).json({ error: 'filePath requis' });
        }

        console.log('📄 Analyse de la facture:', filePath);

        // Récupérer les catégories disponibles
        const { data: categories, error: categoriesError } = await supabase
            .from('Catégorie de dépense')
            .select('Catégorie')
            .order('Catégorie');

        if (categoriesError) {
            console.error('⚠️ Erreur récupération catégories:', categoriesError);
        }

        const categoryList = categories ? categories.map(c => c.Catégorie).join(', ') : 'Fournitures, Transport, Repas, Hébergement, Autres';
        console.log('📋 Catégories disponibles:', categoryList);

        // Récupérer l'URL publique du fichier depuis Supabase
        const { data: { publicUrl } } = supabase.storage
            .from('justificatifs')
            .getPublicUrl(filePath);

        console.log('🔗 URL publique:', publicUrl);

        // Télécharger l'image
        const imageResponse = await fetch(publicUrl);
        if (!imageResponse.ok) {
            throw new Error('Impossible de télécharger l\'image');
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(imageBuffer).toString('base64');

        // Déterminer le type MIME
        const extension = filePath.split('.').pop().toLowerCase();
        let mediaType = 'image/jpeg';
        let sourceType = 'image';

        if (extension === 'png') mediaType = 'image/png';
        else if (extension === 'gif') mediaType = 'image/gif';
        else if (extension === 'webp') mediaType = 'image/webp';
        else if (extension === 'pdf') {
            mediaType = 'application/pdf';
            sourceType = 'document';
        }

        console.log('🤖 Appel à Claude pour analyse... (type:', mediaType, ')');

        // Construire le contenu selon le type
        const contentBlock = sourceType === 'document'
            ? {
                type: 'document',
                source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Image
                }
            }
            : {
                type: 'image',
                source: {
                    type: 'base64',
                    media_type: mediaType,
                    data: base64Image
                }
            };

        // Analyser avec Claude Vision
        const message = await anthropic.messages.create({
            model: 'claude-3-7-sonnet-20250219',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: [
                    contentBlock,
                    {
                        type: 'text',
                        text: `Analyse cette facture et extrait les informations suivantes au format JSON strict:
{
  "fournisseur": "nom du fournisseur",
  "date": "date au format YYYY-MM-DD",
  "montant_ttc": "montant TTC en nombre décimal",
  "montant_ht": "montant HT en nombre décimal (ou null)",
  "montant_tva": "montant TVA en nombre décimal (ou null)",
  "devise": "code devise ISO (CHF, EUR, USD, etc.)",
  "categorie": "catégorie de dépense"
}

IMPORTANT: Pour la catégorie, tu DOIS choisir UNE SEULE catégorie parmi cette liste exacte:
${categoryList}

Choisis la catégorie la plus appropriée en fonction du contenu de la facture. Tu DOIS toujours renseigner une catégorie, même si tu dois estimer.

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`
                    }
                ]
            }]
        });

        // Extraire le JSON de la réponse
        const responseText = message.content[0].text;
        console.log('📝 Réponse brute:', responseText);

        // Parser le JSON
        let extractedData;
        try {
            // Essayer de parser directement
            extractedData = JSON.parse(responseText);
        } catch (e) {
            // Si ça échoue, essayer d'extraire le JSON du texte
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                extractedData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Impossible d\'extraire le JSON de la réponse');
            }
        }

        console.log('✅ Données extraites:', extractedData);

        res.json(extractedData);

    } catch (error) {
        console.error('❌ Erreur lors de l\'analyse:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'analyse de la facture',
            details: error.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'note-de-frais-api' });
});

app.listen(PORT, () => {
    console.log(`✅ Serveur Notes de Frais démarré sur le port ${PORT}`);
});
