export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // Tamamen ücretsiz, limitsiz ve API anahtarsız resmi Hugging Face AI Inference motoru
    const prompt = `You are an etymology bot. For the word "${word}", provide a concise single-sentence etymology in English strictly using the format "comes from [Language] “[Word]”, meaning "[Meaning]"." If compound, use "is a compound of [Language] “[Word]” ([Meaning]) + [Language] “[Word]” ([Meaning])." No chat fluff. Word: ${word}`;
    
    const url = `https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta/v1/chat/completions`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        max_tokens: 80,
        temperature: 0.1
      })
    });

    const data = await response.json();
    let finalSentence = data?.choices?.[0]?.message?.content?.trim() || "";

    // Yapay zeka bazen cevabı tırnak içinde döndürebilir, onu temizleyelim
    finalSentence = finalSentence.replace(/^["']|["']$/g, '').trim();

    if (!finalSentence || finalSentence.length < 5) {
      return res.send(`📚 ${word.toUpperCase()}: comes from historical linguistic roots.`);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: ${finalSentence}`);

  } catch (err) {
    return res.send(`📚 ${word.toUpperCase()}: comes from historical linguistic roots.`);
  }
}
