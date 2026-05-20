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

    // Sadece etimoloji bölümünü izole ediyoruz
    const parts = htmlContent.split(/<h[234][^>]*>\s*<span[^>]*>Etymology[^<]*<\/span>/i);
    let etymologyHtml = "";

    if (parts.length > 1) {
      etymologyHtml = parts[1].split(/<h[234]/)[0];
    } else {
      etymologyHtml = htmlContent; // Eğer başlık yoksa tüm metne bak
    }

    // HTML içindeki etimolojik kelime linklerini ve dillerini yakalayan akıllı regex
    // Wiktionary link yapısı: <a href="/wiki/kelime" title="kelime">görünen_kelime</a>
    const linkRegex = /<a href="\/wiki\/[^"]+"[^>]*>([\s\S]*?)<\/h[234]/i; 
    
    // Etimoloji kısmındaki tüm <p> etiketleri içindeki linkleri tarayalım
    const pMatches = etymologyHtml.match(/<p>([\s\S]*?)<\/p>/g) || [];
    let validWords = [];

    for (const p of pMatches) {
      // Bir paragraf içindeki tüm bağlantıları (linkleri) bulalım
      const links = p.match(/<a href="\/wiki\/[^"]+"[^>]*>([\s\S]*?)<\/a>/g) || [];
      
      for (const link of links) {
        // Linkin içindeki saf kelime metnini temizleyelim
        let text = link.replace(/<[^>]*>/g, '').trim();
        
        // Teknik veya temizlenmesi gereken kelimeleri (Wiktionary yönlendirmelerini) eliyoruz
        if (
          text && 
          text.length > 1 && 
          !/^[0-9]+$/.test(text) &&
          !["Wiktionary", "Wikipedia", "Appendix", "Key", "Cognate", "borrowed", "derived"].includes(text)
        ) {
          validWords.push(text);
        }
      }
      if (validWords.length > 0) break; // İlk anlamlı paragraftaki linkleri toplamak yeterli
    }

    let finalSentence = "";

    if (validWords.length >= 2) {
      // İlk bulunan kelime en modern kökendir (Örn: Middle French desastre veya direkt desastre)
      const modernWord = validWords[0];
      // En son bulunan anlamlı kelime en eski kökendir (Örn: Yunanca veya Latince asıl kök)
      const ancientWord = validWords[validWords.length - 1];

      if (modernWord.toLowerCase() === ancientWord.toLowerCase()) {
        finalSentence = `derived from “${modernWord}”.`;
      } else {
        finalSentence = `derived from “${modernWord}”, tracing back to “${ancientWord}”.`;
      }
    } else if (validWords.length === 1) {
      finalSentence = `derived from “${validWords[0]}”.`;
    } else {
      // Eğer link yapısından hiçbir şey çözülemezse düz metne dön ve ilk cümleyi ver
      const cleanText = etymologyHtml.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      finalSentence = cleanText.split('.')[0] + ".";
    }

    // Çıktıyı gönder
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 Origin of ${word}: ${finalSentence}`);

  } catch (err) {
    return res.send(`📚 Origin of "${word}" not found.`);
  }
}
