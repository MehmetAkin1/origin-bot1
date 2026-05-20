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

    let finalSentence = "";

    if (originText) {
      // 1. Adım: İlk düzgün cümleyi alalım
      let firstSentence = originText.split('.')[0].trim();

      // 2. Adım: Cümle içindeki o uzun "from..., from..., from..." silsilesini temizleyelim
      // Sadece ilk kökeni ve parantez içindeki anlamını koruyalım
      const matches = firstSentence.match(/^.*?(?:from|borrowed from)\s+[A-Za-z ]+\s+[a-z settlementα-ωΑ-Ω’“"']+(?:\s+[^,.]+)?(?:\s*\(.*?\))?/i);
      
      if (matches && matches[0]) {
        finalSentence = matches[0].trim();
      } else {
        // Eğer regex eşleşmezse virgüllü ilk silsile parçasını güvenli olarak alalım
        const cutIndex = firstSentence.indexOf(", from ");
        if (cutIndex !== -1) {
          finalSentence = firstSentence.substring(0, cutIndex).trim();
        } else {
          finalSentence = firstSentence;
        }
      }
    }

    // Yedekleme mekanizması (Eğer çok boş kalırsa)
    if (!finalSentence || finalSentence.length < 5) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    // Grameri ve baş harfi düzeltme (Her zaman "From..." diye akıcı başlasın)
    const fromIndex = finalSentence.search(/from /i);
    if (fromIndex !== -1) {
      finalSentence = finalSentence.substring(fromIndex);
      finalSentence = "From " + finalSentence.substring(5);
    }

    // Sonuna nokta ekleyelim (Eğer yoksa)
    if (!finalSentence.endsWith(".")) {
      finalSentence += ".";
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 Origin of ${word}: ${finalSentence}`);

  } catch (err) {
    return res.send(`📚 Origin of "${word}" not found.`);
  }
}
