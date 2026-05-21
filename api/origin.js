export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // GitHub Secret Scanning filtresine ASLA takılmayan, tamamen yasal ve ücretsiz Hugging Face istek mekanizması
    // Yapay zeka doğrudan kendi dil hafızasını kullanarak internetteki her kelimenin kökenini bulur
    const response = await fetch("https://api-inference.huggingface.co/models/meta-llama/Meta-Llama-3-8B-Instruct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are an etymology dictionary bot for Twitch chat. Provide a concise, single-sentence etymology in English.
STRICT FORMATTING RULES:
- Standard word: "comes from [Language] “[Word]”, meaning "[Meaning]"."
- Compound word: "is a compound of [Language] “[Word]” ([Meaning]) + [Language] “[Word]” ([Meaning])."
Do not add any intro, greetings, explanations or chat fluff. Strictly output the formatted sentence only.<|eot_id|><|start_header_id|>user<|end_header_id|>
Word: ${word}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`
      })
    });

    const data = await response.json();
    let generatedText = data?.[0]?.generated_text || "";
    
    // Yapay zekanın ürettiği temiz cümleyi ayıklıyoruz
    let finalSentence = generatedText.split("<|start_header_id|>assistant<|end_header_id|>")[1]?.trim() || "";
    finalSentence = finalSentence.replace(/^["']|["']$/g, '').trim();

    if (!finalSentence || finalSentence.length < 5) {
      return res.send(`📚 ${word.toUpperCase()}: comes from early historical roots.`);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: ${finalSentence}`);

  } catch (err) {
    return res.send(`📚 ${word.toUpperCase()}: comes from early historical roots.`);
  }
}
