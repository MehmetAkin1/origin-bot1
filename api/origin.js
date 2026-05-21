export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // 1. ADIM: Wiktionary'den en temiz metin özetini (extract) çekiyoruz
    const url = `https://en.wiktionary.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(word)}&format=json`;
    const response = await fetch(url, { headers: { 'User-Agent': 'TwitchBotEtimoloji/1.0' } });
    
    if (!response.ok) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const data = await response.json();
    const pages = data?.query?.pages;
    const pageId = pages ? Object.keys(pages)[0] : null;
    
    if (!pageId || pageId === "-1") {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    let extractText = pages[pageId].extract || "";

    // 2. ADIM: Kelimenin tam etimoloji paragrafını Wiktionary parse API'si ile derinlemesine tarıyoruz
    const parseUrl = `https://en.wiktionary.org/w/api.php?action=parse&page=${encodeURIComponent(word)}&format=json&prop=text&disableeditsection=true`;
    const parseResponse = await fetch(parseUrl, { headers: { 'User-Agent': 'TwitchBotEtimoloji/1.0' } });
    
    let etymologyText = "";
    if (parseResponse.ok) {
      const parseData = await parseResponse.json();
      if (!parseData.error) {
        const html = parseData.parse.text['*'];
        const parts = html.split(/<h[234][^>]*>\s*<span[^>]*>Etymology[^<]*<\/span>/i);
        if (parts.length > 1) {
          etymologyText = parts[1].split(/<h[234]/)[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
    }

    // İki kaynaktan gelen veriyi birleştirip analiz için temiz bir havuz oluşturuyoruz
    const combinedData = (etymologyText + " " + extractText).replace(/\s+/g, ' ').trim();

    // 3. ADIM: Tamamen yerel (local) çalışan akıllı dil ve köken yakalayıcı algoritma
    // Bu liste en yaygın etimolojik köken dillerini içerir
    const languages = [
      "Ancient Greek", "Greek", "Latin", "Old French", "Middle French", "French",
      "Old English", "Middle English", "German", "Dutch", "Old Norse", "Norse",
      "Sanskrit", "Arabic", "Persian", "Italian", "Spanish", "Czech", "Russian",
      "Proto-Indo-European", "Proto-Germanic", "Slavic", "West Slavic"
    ];

    let foundLanguage = "";
    let foundRootWord = "";
    let foundMeaning = "";

    // Kelimenin hikayesindeki dilleri tarıyoruz
    for (const lang of languages) {
      if (combinedData.includes(lang)) {
        foundLanguage = lang;
        break; 
      }
    }

    // Özel durumlar için manuel kelime eşleştirmeleri (Hata payını sıfırlamak için en popüler kelimeler)
    const customDatabase = {
      robot: { lang: "Czech", root: "robota", meaning: "forced labor" },
      disaster: { lang: "Middle French", root: "desastre", meaning: "ill-starred" },
      salary: { lang: "Latin", root: "salarium", meaning: "salt money" },
      octopus: { lang: "Ancient Greek", root: "oktō + pous", meaning: "eight + foot" },
      geography: { lang: "Ancient Greek", root: "gē + graphia", meaning: "earth + writing" },
      coffee: { lang: "Arabic", root: "qahwah", meaning: "coffee" }
    };

    if (customDatabase[word]) {
      foundLanguage = customDatabase[word].lang;
      foundRootWord = customDatabase[word].root;
      foundMeaning = customDatabase[word].meaning;
    } else {
      // Eğer kelime özel listede yoksa, metinden tırnak içindeki orijinal kök kelimeyi ve anlamını cımbızlıyoruz
      const wordMatch = combinedData.match(/(?:from|borrowed from|derived from)[^“"']*?[“"']([a-zA-Z settlementα-ωΑ-Ω’'-]+)[“"']/i);
      if (wordMatch) {
        foundRootWord = wordMatch[1].trim();
      }

      const meaningMatch = combinedData.match(/(?:meaning|“|")([^”"'\(\)]+)(?:”|"|\))/i);
      if (meaningMatch && meaningMatch[1].length > 2 && meaningMatch[1] !== foundRootWord) {
        foundMeaning = meaningMatch[1].trim();
      }
    }

    // Varsayılan dinamik cümle kurulumu
    let finalOutput = "";
    if (foundLanguage && foundRootWord) {
      if (foundMeaning) {
        finalOutput = `comes from ${foundLanguage} “${foundRootWord}”, meaning "${foundMeaning}".`;
      } else {
        finalOutput = `comes from ${foundLanguage} “${foundRootWord}”.`;
      }
    } else {
      // Eğer yukarıdaki algoritmalar tamamen boş dönerse, Wiktionary'nin en temiz ilk cümlesini güvenli modda veriyoruz
      const firstSentence = extractText.split('.')[0].trim();
      if (firstSentence.length > 10) {
        finalOutput = firstSentence.replace(/From /i, "comes from ") + ".";
      } else {
        return res.send(`📚 Origin of "${word}" not found.`);
      }
    }

    // Cümle temizliği ve yayına hazırlık
    finalOutput = finalOutput.replace(/\s+/g, ' ').replace(/\.+$/, '') + ".";

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: ${finalOutput}`);

  } catch (err) {
    return res.send(`📚 Origin of "${word}" not found.`);
  }
}
