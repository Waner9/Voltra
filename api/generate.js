export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { sport, ovr, weak, jours, niveau, saison, blessures, equipement, contexte, cardioVolume, cardioType, patterns } = req.body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: `Expert préparateur physique. Génère un programme JSON pour ${sport}.
Contexte: ${contexte}
OVR:${ovr} Faiblesses:${weak||"aucune"} Niveau:${niveau} Jours:${jours} Saison:${saison}
Blessures:${blessures||"aucune"} Cardio:${cardioVolume}/100 ${cardioType}
IMPORTANT: Réponds UNIQUEMENT avec du JSON valide, rien d'autre.`,
        messages: [{
          role: "user",
          content: `Programme ${jours} séances ${sport} OVR${ovr}. JSON strict:
{"programme_titre":"string","programme_sous_titre":"string","logique_programme":"string","strategie_cardio":"string","seances":[{"num":1,"titre":"string","focus_sportif":"string","focus_faiblesse":"string","duree_min":60,"ratio":"70/30","blocs":[{"bloc_nom":"string","bloc_type":"MUSCU","bloc_desc":"string","duree_min":45,"exercices":[{"nom":"string","type_exercice":"MUSCU","geste_sportif":"string","position_depart":"string","execution":"string","focus_technique":["string","string","string"],"series_reps":"4x8","recuperation":"90s","zone_fc":"","structure_cardio":"","intention":"string","progression":"string"}]}]}],"conseils_specifiques":["string"],"conseils_cardio":["string"]}`
        }]
      }),
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
