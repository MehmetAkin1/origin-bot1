export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // Tamamen ücretsiz, limitsiz ve API anahtarsız çalışan açık AI proxy endpoint'i
    const aiResponse = await fetch("https://text-generator-three.vercel.app/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `You are an etymology expert bot for a Twitch chat. Analyze the word "${word}" and provide a concise, single-sentence etymology in English strictly using the format "comes from [Language] “[Word]”, meaning "[Meaning]"." If it is a compound word (like octopus, geography), strictly use the format "is a compound of [Language] “[Word]” ([Meaning]) + [Language] “[Word]” ([Meaning])." Do not add any other text, greetings, or chat fluff. Word: ${word}`
      })
    });

    const finalSentence = await aiResponse.text();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: ${finalSentence.trim()}`);

  } catch (err) {
    // Herhangi bir ağ probleminde yayının aksamaması için güvenli bir yedek cümle fırlatır
    return res.send(`📚 ${word.toUpperCase()}: comes from early linguistic roots.`);
  }
}
