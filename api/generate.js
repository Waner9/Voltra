export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const FALLBACK_SEANCE = {
    num: 1,
    titre: "Séance de base",
    focus_sportif: "Développement général",
    focus_faiblesse: "Équilibre musculaire",
    duree_min: 60,
    ratio: "70/30",
    blocs: [
      {
        bloc_nom: "Bloc principal",
        bloc_type: "MUSCU",
        bloc_desc: "Exercices fondamentaux",
        duree_min: 40,
        exercices: [
          { nom: "Squat", execution: "Descendre jusqu'à parallèle, remonter explosif", series_reps: "4x8", recuperation: "90s", intention: "Force membres inférieurs" },
          { nom: "Développé couché", execution: "Coudes à 45°, poitrine complète", series_reps: "4x8", recuperation: "90s", intention: "Force poussée horizontale" },
          { nom: "Rowing barre", execution: "Dos plat, tirer vers le nombril", series_reps: "4x10", recuperation: "90s", intention: "Force tirage" }
        ]
      },
      {
        bloc_nom: "Cardio finisher",
        bloc_type: "CARDIO_SPECIFIQUE",
        bloc_desc: "Travail cardiovasculaire",
        duree_min: 20,
        exercices: [
          { nom: "Intervalles", execution: "30s effort max / 30s récup", series_reps: "8 rounds", recuperation: "2min", intention: "Endurance spécifique" }
        ]
      }
    ]
  };

  try {
    const { sport, ovr, weak, niveau, saison, blessures, contexte, cardioVolume, numSeance, jours } = req.body;

    if (!sport || !ovr) {
      return res.status(400).json({ error: "Paramètres manquants", seance: FALLBACK_SEANCE });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `Tu es préparateur physique. Génère la séance ${numSeance} sur ${jours} pour ${sport}.
OVR:${ovr} Faiblesses:${weak||"aucune"} Niveau:${niveau} Saison:${saison} Blessures:${blessures||"aucune"} Cardio:${cardioVolume}/100
Contexte:${contexte}

RÈGLES ABSOLUES:
- Réponds UNIQUEMENT avec du JSON entouré de balises <json> et </json>
- Aucun texte avant ou après les balises
- JSON valide parseable par JSON.parse()
- Pas d'explication, pas de commentaire

<json>
{"num":${numSeance},"titre":"string","focus_sportif":"string","focus_faiblesse":"string","duree_min":60,"ratio":"70/30","blocs":[{"bloc_nom":"string","bloc_type":"MUSCU","bloc_desc":"string","duree_min":40,"exercices":[{"nom":"string","execution":"string","series_reps":"4x8","recuperation":"90s","intention":"string"},{"nom":"string","execution":"string","series_reps":"4x8","recuperation":"90s","intention":"string"},{"nom":"string","execution":"string","series_reps":"4x8","recuperation":"90s","intention":"string"}]},{"bloc_nom":"string","bloc_type":"CARDIO_SPECIFIQUE","bloc_desc":"string","duree_min":20,"exercices":[{"nom":"string","execution":"string","series_reps":"string","recuperation":"string","intention":"string"}]}]}
</json>`
        }]
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error:", response.status);
      return res.status(200).json({ seance: { ...FALLBACK_SEANCE, num: numSeance || 1 } });
    }

    const data = await response.json();
    const rawText = data.content?.[0]?.text || "";

    if (!rawText || rawText.trim() === "") {
      console.error("Empty response from Claude");
      return res.status(200).json({ seance: { ...FALLBACK_SEANCE, num: numSeance || 1 } });
    }

    // Extraction sécurisée entre les balises <json>...</json>
    let jsonStr = "";
    const tagMatch = rawText.match(/<json>([\s\S]*?)<\/json>/);
    if (tagMatch && tagMatch[1]) {
      jsonStr = tagMatch[1].trim();
    } else {
      // Fallback : cherche le premier { et dernier }
      const start = rawText.indexOf("{");
      const end = rawText.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        jsonStr = rawText.slice(start, end + 1);
      }
    }

    if (!jsonStr) {
      console.error("No JSON found in response:", rawText);
      return res.status(200).json({ seance: { ...FALLBACK_SEANCE, num: numSeance || 1 } });
    }

    let seance;
    try {
      seance = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("JSON parse error:", parseError.message);
      console.error("Raw text was:", rawText);
      return res.status(200).json({ seance: { ...FALLBACK_SEANCE, num: numSeance || 1 } });
    }

    return res.status(200).json({ seance });

  } catch (error) {
    console.error("Handler error:", error.message);
    return res.status(200).json({ seance: FALLBACK_SEANCE });
  }
}
