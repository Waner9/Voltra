export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { sport, ovr, weak, jours, niveau, saison, blessures, contexte, cardioVolume, cardioType, numSeance } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `Tu es préparateur physique. Génère UNE séance de musculation+cardio pour ${sport} (séance ${numSeance}/${jours}).
OVR:${ovr} Faiblesses:${weak||"aucune"} Niveau:${niveau} Saison:${saison} Blessures:${blessures||"aucune"}
Cardio:${cardioVolume}/100 ${cardioType}
Contexte sport:${contexte}

Réponds UNIQUEMENT en JSON valide compact:
{"num":${numSeance},"titre":"string","focus_sportif":"string","focus_faiblesse":"string","duree_min":60,"ratio":"70/30","blocs":[{"bloc_nom":"string","bloc_type":"MUSCU","bloc_desc":"string","duree_min":40,"exercices":[{"nom":"string","type_exercice":"MUSCU","geste_sportif":"string","position_depart":"string","execution":"string","focus_technique":["string","string","string"],"series_reps":"4x8","recuperation":"90s","zone_fc":"","structure_cardio":"","intention":"string","progression":"string"},{"nom":"string","type_exercice":"MUSCU","geste_sportif":"string","position_depart":"string","execution":"string","focus_technique":["string","string","string"],"series_reps":"4x8","recuperation":"90s","zone_fc":"","structure_cardio":"","intention":"string","progression":"string"},{"nom":"string","type_exercice":"MUSCU","geste_sportif":"string","position_depart":"string","execution":"string","focus_technique":["string","string","string"],"series_reps":"4x8","recuperation":"90s","zone_fc":"","structure_cardio":"","intention":"string","progression":"string"}]},{"bloc_nom":"string","bloc_type":"CARDIO_SPECIFIQUE","bloc_desc":"string","duree_min":20,"exercices":[{"nom":"string","type_exercice":"CARDIO","geste_sportif":"string","position_depart":"string","execution":"string","focus_technique":["string","string","string"],"series_reps":"string","recuperation":"string","zone_fc":"string","structure_cardio":"string","intention":"string","progression":"string"}]}]}`
        }]
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const seance = JSON.parse(clean);
    return res.status(200).json({ seance });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
