export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const { sport, ovr, weak, jours, niveau, saison, blessures, contexte, cardioVolume, numSeance } = req.body;

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
          content: `Préparateur physique expert. Séance ${numSeance} pour ${sport}. OVR:${ovr} Faiblesses:${weak||"aucune"} Niveau:${niveau}.
JSON compact COURT sans espaces:
{"num":${numSeance},"titre":"string","focus_sportif":"string","focus_faiblesse":"string","duree_min":60,"ratio":"70/30","blocs":[{"bloc_nom":"string","bloc_type":"MUSCU","bloc_desc":"string","duree_min":40,"exercices":[{"nom":"string","execution":"string","series_reps":"4x8","recuperation":"90s","intention":"string"},{"nom":"string","execution":"string","series_reps":"4x8","recuperation":"90s","intention":"string"},{"nom":"string","execution":"string","series_reps":"4x8","recuperation":"90s","intention":"string"}]},{"bloc_nom":"string","bloc_type":"CARDIO_SPECIFIQUE","bloc_desc":"string","duree_min":20,"exercices":[{"nom":"string","execution":"string","series_reps":"string","recuperation":"string","intention":"string"}]}]}`
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
