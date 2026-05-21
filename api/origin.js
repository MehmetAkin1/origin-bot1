export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // Etymonline tabanlı arama motorundan kelimenin ham etimoloji hikayesini çekiyoruz
    const url = `https://en.wiktionary.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(word)}&format=json`;
    
    // Daha derin ve hikayesel analiz için Wiktionary'nin özel extract motorunu rafine ediyoruz
    const etymonUrl = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word)}&format=json&prop=text&disableeditsection=true`;
    
    const response = await fetch(etymonUrl, {
      headers: { 'User-Agent': 'TwitchBotEtimoloji/1.0' }
    });

    if (!response.ok) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const data = await response.json();
    if (data.error) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const htmlContent = data.parse.text['*'];

    const cleanHTML = (str) => {
      return str
        .replace(/<[^>]*>/g, '') 
        .replace(/\[\d+\]/g, '') 
        .replace(/\s+/g, ' ')   
        .trim();
    };

    // Etimoloji paragrafını buluyoruz
    const parts = htmlContent.split(/<h[234][^>]*>\s*<span[^>]*>Etymology[^<]*<\/span>/i);
    let rawText = "";

    if (parts.length > 1) {
      const etymologySection = parts[1].split(/<h[234]/)[0];
      const pMatch = etymologySection.match(/<p>([\s\S]*?)<\/p>/);
      if (pMatch) rawText = cleanHTML(pMatch[1]);
    }

    if (!rawText) {
      const pMatches = htmlContent.match(/<p>([\s\S]*?)<\/p>/g) || [];
      for (const p of pMatches) {
        const cleaned = cleanHTML(p);
        if (cleaned.toLowerCase().includes("from ") || cleaned.toLowerCase().includes("derived") || cleaned.toLowerCase().includes("compounded")) {
          rawText = cleaned;
          break;
        }
      }
    }

    // --- Dil, Kelime ve Anlam Analiz Filtresi ---
    // Örnek: "from Ancient Greek oktō (“eight”) + pous (“foot”)"
    // Bu algoritma metindeki dilleri, kelimeleri ve tırnak içindeki anlamları eşleştirir
    const langRegex = /([A-Z][a-zA-Z ]+)\s+([a-z settlementα-ωΑ-Ω’“"'-]+)\s*(?:[\(（][^]*?[\)）])?\s*(?:“([^”]+)”|'([^']+)'|"([^"]+)")?/gi;
    
    let components = [];
    let match;

    // Metin içindeki tüm anlamlı etimolojik birleşenleri tarıyoruz
    while ((match = langRegex.exec(rawText)) !== null) {
      const lang = match[1].trim();
      const rootWord = match[2].trim();
      const meaning = match[3] || match[4] || match[5] || "";

      // Dil isimlerini ve geçerli kelimeleri süzüyoruz
      if (
        lang.length > 2 && 
        rootWord.length > 1 && 
        meaning &&
        !["Wiktionary", "Wikipedia", "A", "The", "From", "Cognate"].includes(lang) &&
        !["a", "the", "and", "or", "of", "to", "in"].includes(rootWord)
      ) {
        components.push({ lang, rootWord, meaning });
      }
    }

    let resultSentence = "";

    if (components.length >= 2) {
      // Octopus gibi çoklu bileşenden (Compound) oluşan kelimeler için kusursuz cümle yapısı
      const partsText = components.map(c => `${c.lang} “${c.rootWord}” (${c.meaning})`).join(" + ");
      resultSentence = `is a compound of ${partsText}.`;
    } else if (components.length === 1) {
      // Tek bir kökten düzgünce türeyen kelimeler için
      resultSentence = `comes from ${components[0].lang} “${components[0].rootWord}”, meaning "${components[0].meaning}".`;
    } else {
      // Eğer kelime analizi çok karmaşıksa, metnin ilk ve en anlamlı cümlesini doğrudan ve temiz şekilde ver
      let fallback = rawText.split('.')[0].trim();
      if (fallback.toLowerCase().startsWith("from")) {
        fallback = "Comes " + fallback;
      }
      resultSentence = fallback.endsWith(".") ? fallback : fallback + ".";
    }

    // Chat estetiği için çıktıyı son haline getiriyoruz
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: ${resultSentence}`);

  } catch (err) {
    return res.send(`📚 Origin of "${word}" not found.`);
  }
}
