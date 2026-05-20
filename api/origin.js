export default async function handler(req, res) {
  // Hem ?word= hem de StreamElements'in gönderebileceği alternatif query'leri destekleyelim
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // Wiktionary parse API'sini kullanarak sayfa içeriğini çekiyoruz
    const url = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word)}&format=json&prop=text&disableeditsection=true`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TwitchBotEtimoloji/1.0 (akin@example.com)' }
    });

    if (!response.ok) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const data = await response.json();
    
    if (data.error) {
      return res.send(`📚 Origin of "${word}" not found on Wiktionary.`);
    }

    const htmlContent = data.parse.text['*'];

    // Basit bir regex ile HTML içindeki Etimoloji (Etymology) bölümünü yakalıyoruz
    // İngilizce Wiktionary'de etimoloji genellikle <p> etiketleri içinde yer alır
    const etymologyRegex = /<h[23][^>]*>\s*<span[^>]*>Etymology<\/span>[\s\S]*?<\/h[23]>/i;
    const match = htmlContent.match(etymologyRegex);

    let originText = "";

    if (match) {
      // Etimoloji başlığının altındaki ilk <p> bloğunu temizleyip alıyoruz
      const section = match[0];
      const pMatch = htmlContent.substring(htmlContent.indexOf(section)).match(/<p>([\s\S]*?)<\/p>/);
      if (pMatch) {
        originText = pMatch[1].replace(/<[^>]*>/g, '').trim(); // HTML etiketlerini temizle
      }
    }

    // Eğer spesifik bir Etimoloji başlığı bulunamadıysa, kelimenin ilk genel tanımını gösterelim
    if (!originText) {
      const cleanText = htmlContent.replace(/<[^>]*>/g, ' ');
      const sentences = cleanText.split('.').map(s => s.trim()).filter(s => s.length > 1);
      originText = sentences.slice(0, 2).join('. ') + '.';
    }

    // Twitch chat sınırı için metni kısaltalım (Maksimum 400 karakter)
    if (originText.length > 400) {
      originText = originText.substring(0, 397) + "...";
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 [${word.toUpperCase()}] Origin: ${originText}`);

  } catch (err) {
    return res.send("❌ Error fetching etymology. Try again later.");
  }
}
