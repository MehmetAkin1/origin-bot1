export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // Wiktionary parse API'si ile sayfa içeriğini çekiyoruz
    const url = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word)}&format=json&prop=text&disableeditsection=true`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TwitchBotEtimoloji/1.0' }
    });

    if (!response.ok) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const data = await response.json();
    
    if (data.error) {
      return res.send(`📚 Origin of "${word}" not found on Wiktionary.`);
    }

    const htmlContent = data.parse.text['*'];

    // HTML etiketlerini ve gereksiz boşlukları temizleme fonksiyonu
    const cleanHTML = (str) => {
      return str
        .replace(/<[^>]*>/g, '') // HTML etiketlerini kaldır
        .replace(/\[\d+\]/g, '') // [1], [2] gibi kaynak linklerini kaldır
        .replace(/\s+/g, ' ')   // Fazla boşlukları temizle
        .trim();
    };

    // HTML içeriğini "Etymology" başlıklarına göre bölüyoruz
    const parts = htmlContent.split(/<h[234][^>]*>\s*<span[^>]*>Etymology[^<]*<\/span>/i);
    let originText = "";

    if (parts.length > 1) {
      // Etymology başlığından sonra gelen kısmı alıyoruz
      const etymologySection = parts[1].split(/<h[234]/)[0];
      
      // Bu bölümün içindeki ilk <p> etiketini buluyoruz
      const pMatch = etymologySection.match(/<p>([\s\S]*?)<\/p>/);
      if (pMatch) {
        originText = cleanHTML(pMatch[1]);
      }
    }

    // Eğer spesifik bir Etymology başlığı altından veri çekemediysek alternatif arama yapıyoruz
    if (!originText || originText.length < 10) {
      // Tüm metni temizleyip "From..." veya "Borrowed from..." gibi etimolojik anahtar kelimeleri arıyoruz
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

    // Hala bulunamadıysa en azından kelimenin ilk açıklama cümlesini verelim boş kalmasın
    if (!originText || originText.length < 10) {
      const allParagraphs = htmlContent.match(/<p>([\s\S]*?)<\/p>/g) || [];
      for (const p of allParagraphs) {
        const cleaned = cleanHTML(p);
        if (cleaned.length > 25 && !cleaned.includes("Wikipedia") && !cleaned.includes("mw-parser-output")) {
          originText = cleaned;
          break;
        }
      }
    }

    // Eğer hiçbir şey ayıklanamadıysa
    if (!originText || originText.length < 5) {
      return res.send(`📚 [${word.toUpperCase()}]: Origin details could not be parsed. See: https://en.wiktionary.org/wiki/${word}`);
    }

    // Twitch chat sınırı için metni kırpma (Maksimum 380 karakter)
    if (originText.length > 380) {
      originText = originText.substring(0, 377) + "...";
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 [${word.toUpperCase()}]: ${originText}`);

  } catch (err) {
    return res.send("❌ Error fetching etymology. Try again later.");
  }
}
