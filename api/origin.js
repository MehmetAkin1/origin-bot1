export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // Kelimenin direkt etimolojik köken bilgisini veren daha temiz bir alternatif API kullanıyoruz
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(word)}`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TwitchBotEtimoloji/1.0' }
    });

    if (!response.ok) {
      // Alternatif olarak basit arama endpoint'ini deneyelim
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const data = await response.json();
    
    // İngilizce etimoloji kısmını arıyoruz
    let etymology = "";
    
    if (data.en) {
      // Wiktionary API bazen etimolojiyi doğrudan nesne içinde verebilir, vermezse ilk anlamı işleyeceğiz
      // HTML etiketlerini regex ile en temiz hale getiriyoruz
      const cleanHTML = (html) => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      for (const sense of data.en) {
        if (sense.definitions && sense.definitions.length > 0) {
          // Kelimenin tanımını alıp temizleyelim
          etymology = cleanHTML(sense.definitions[0].definition);
          break;
        }
      }
    }

    // Eğer rest API'den çok kuru bir tanım geldiyse, doğrudan her dilde çalışan alternatif bir etimoloji parse motoruna yönlendirelim
    const backupUrl = `https://en.wiktionary.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(word)}&format=json`;
    const backupResp = await fetch(backupUrl);
    const backupData = await backupResp.json();
    const pages = backupData?.query?.pages;
    const pageId = pages ? Object.keys(pages)[0] : null;
    let extractText = pageId && pageId !== "-1" ? pages[pageId].extract : "";

    // Eğer ana extract varsa ve kelime kökeni içeriyorsa onu tercih edelim
    if (extractText && (extractText.toLowerCase().includes("from") || extractText.toLowerCase().includes("cognate"))) {
      etymology = extractText.split('\n')[0]; // İlk paragrafı al
    }

    if (!etymology || etymology.length < 5) {
      return res.send(`📚 [${word.toUpperCase()}] Origin info not explicitly found. Check: https://en.wiktionary.org/wiki/${word}`);
    }

    // Metni chat için kırp
    if (etymology.length > 350) {
      etymology = etymology.substring(0, 347) + "...";
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 [${word.toUpperCase()}]: ${etymology}`);

  } catch (err) {
    return res.send("❌ Error fetching etymology. Try again later.");
  }
}
