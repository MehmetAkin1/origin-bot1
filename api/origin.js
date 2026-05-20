export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    const url = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word)}&format=json&prop=text&disableeditsection=true`;
    
    const response = await fetch(url, {
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

    const parts = htmlContent.split(/<h[234][^>]*>\s*<span[^>]*>Etymology[^<]*<\/span>/i);
    let originText = "";

    if (parts.length > 1) {
      const etymologySection = parts[1].split(/<h[234]/)[0];
      const pMatch = etymologySection.match(/<p>([\s\S]*?)<\/p>/);
      if (pMatch) {
        originText = cleanHTML(pMatch[1]);
      }
    }

    if (!originText || originText.length < 10) {
      const allParagraphs = htmlContent.match(/<p>([\s\S]*?)<\/p>/g) || [];
      for (const p of allParagraphs) {
        const cleaned = cleanHTML(p);
        if (cleaned.toLowerCase().includes("from ") || cleaned.toLowerCase().includes("derived") || cleaned.toLowerCase().includes("borrowed")) {
          if (cleaned.length > 20 && !cleaned.includes("Wikipedia")) {
            originText = cleaned;
            break;
          }
        }
      }
    }

    let shortOrigin = "";

    if (originText) {
      const fromIndex = originText.search(/from /i);
      const borrowedIndex = originText.search(/borrowed/i);
      
      let baseText = originText;
      if (fromIndex !== -1) {
        baseText = originText.substring(fromIndex);
      } else if (borrowedIndex !== -1) {
        baseText = originText.substring(borrowedIndex);
      }

      const firstSentence = baseText.split('.')[0].trim();
      
      // Hatalı split kısımları düzeltildi
      shortOrigin = firstSentence
        .split(", cognate")[0]
        .split(", source")[0]
        .split("; compare")[0]
        .split(", from which")[0];
    }

    if (!shortOrigin || shortOrigin.length < 5) {
      if (originText) {
        shortOrigin = originText.split('.')[0] + ".";
      } else {
        return res.send(`📚 [${word.toUpperCase()}]: Origin details are too complex. See: https://en.wiktionary.org/wiki/${word}`);
      }
    }

    if (shortOrigin.toLowerCase().startsWith("from")) {
      shortOrigin = "from" + shortOrigin.substring(4);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: "${shortOrigin}"`);

  } catch (err) {
    return res.send("❌ Error fetching etymology.");
  }
}
