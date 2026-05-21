export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // 1. ADIM: Wiktionary'den kelimenin ham etimoloji verisini çekiyoruz
    const url = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word)}&format=json&prop=text&disableeditsection=true`;
    const response = await fetch(url, { headers: { 'User-Agent': 'TwitchBotEtimoloji/1.0' } });
    
    let rawEtymology = "";
    if (response.ok) {
      const data = await response.json();
      if (!data.error) {
        const html = data.parse.text['*'];
        const parts = html.split(/<h[234][^>]*>\s*<span[^>]*>Etymology[^<]*<\/span>/i);
        rawEtymology = parts.length > 1 ? parts[1].split(/<h[234]/)[0] : html;
        rawEtymology = rawEtymology.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    }

    // Vercel'e ekleyeceğimiz güvenli anahtarı alıyoruz
    const apiKey = process.env.OPENROUTER_API_KEY;

    // 2. ADIM: AI Motoruna bağlanma
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an etymology expert bot for Twitch chat. Analyze the given text and provide a concise, single-sentence etymology in English.
            STRICT FORMATTING RULES:
            - If it's a standard single-root word, strictly use this format: "comes from [Language] “[Word]”, meaning "[Meaning]"."
            - If it's a compound word (like octopus, geography), strictly use this format: "is a compound of [Language] “[Word]” ([Meaning]) + [Language] “[Word]” ([Meaning])."
            - Keep it brief, clear, and perfectly grammatical. Max 300 characters. No chat fluff.`
          },
          {
            role: "user",
            content: `Word: ${word}\nRaw Data: ${rawEtymology || "Look up standard etymology for this word."}`
          }
        ]
      })
    });

    const aiData = await aiResponse.json();
    let finalSentence = aiData?.choices?.[0]?.message?.content?.trim() || "";

    if (!finalSentence || finalSentence.length < 5) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    finalSentence = finalSentence.replace(/^["']|["']$/g, '');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: ${finalSentence}`);

  } catch (err) {
    return res.send(`📚 Origin of "${word}" not found.`);
  }
}
