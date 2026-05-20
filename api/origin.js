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

    if (!originText) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    // --- Akıllı Tarihsel Köken Ayıklama Motoru ---
    // Metin içindeki dilleri ve kelimeleri "from [Dil] [Kelime]" kalıplarıyla yakalıyoruz
    const etymologyRegex = /(?:from|derived from|borrowed from)\s+([A-Z][a-zA-Z- ]+)\s+([a-z settlementα-ωΑ-Ω’“"'-]+)/gi;
    let matches = [];
    let match;

    while ((match = etymologyRegex.exec(originText)) !== null) {
      const language = match[1].trim();
      let rootWord = match[2].trim().replace(/["'“”]/g, ''); // Eski tırnakları temizle
      
      // Wikipedia veya teknik kelimeleri filtrele
      if (!["a", "the", "derived", "cognate", "source", "which", "compounded"].includes(rootWord) && language.length > 2) {
        matches.push({ language, rootWord });
      }
    }

    let finalSentence = "";

    if (matches.length > 0) {
      // En modern (en yakın) köken zincirin başındadır
      const modern = matches[0];
      // En eski köken zincirin en sonundadır (Proto veya Antik diller)
      const ancient = matches[matches.length - 1];

      // Eğer kelimenin sadece tek bir kökeni bulunabildiyse
      if (matches.length === 1 || modern.language === ancient.language) {
        finalSentence = `derived from ${modern.language} “${modern.rootWord}”.`;
      } else {
        // Hem en yeni hem de en eski kökeni birleştiren kusursuz gramer yapısı
        finalSentence = `derived from ${modern.language} “${modern.rootWord}”, tracing back to ${ancient.language} “${ancient.rootWord}”.`;
      }
    } else {
      // Eğer regex yakalayamazsa güvenli ilk cümleyi verelim
      finalSentence = originText.split('.')[0] + ".";
    }

    // Yayındaki chat estetiği için çıktıyı hazırla
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 Origin of ${word}: ${finalSentence}`);

  } catch (err) {
    return res.send(`📚 Origin of "${word}" not found.`);
  }
}
