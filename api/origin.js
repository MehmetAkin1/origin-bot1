export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // 1. ADIM: Wiktionary'den kelimenin ham özetini çekiyoruz
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

    // 2. ADIM: Derin etimoloji metnini çekiyoruz
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

    const combinedData = (etymologyText + " " + extractText).replace(/\s+/g, ' ').trim();

    // 3. ADIM: EVRENSEL DİL VE KÖKEN YAKALAYICI
    // Burası kelime ayırt etmeksizin metindeki Dil + Kelime + Anlam yapısını cımbızlar
    let foundLanguage = "";
    let foundRootWord = "";
    let foundMeaning = "";

    // En popüler etimolojik dilleri hızlıca kontrol edelim
    const languages = [
      "Old English", "Middle English", "Ancient Greek", "Greek", "Latin", "Old French", 
      "Middle French", "French", "German", "Dutch", "Old Norse", "Norse", "Arabic", 
      "Sanskrit", "Italian", "Spanish", "Czech", "Russian", "Proto-Germanic"
    ];

    for (const lang of languages) {
      if (combinedData.toLowerCase().includes(lang.toLowerCase())) {
        foundLanguage = lang;
        break;
      }
    }

    // Eğer spesifik bir dil bulunamazsa genel bir tanım yapalım
    if (!foundLanguage) {
      if (combinedData.toLowerCase().includes("germanic")) foundLanguage = "Germanic";
      else if (combinedData.toLowerCase().includes("romance")) foundLanguage = "Romance";
      else foundLanguage = "historical linguistic roots";
    }

    // Her kelimede tırnak içindeki orijinal kökü yakalamak için esnek regex (dog, tree, ship için)
    const rootMatch = combinedData.match(/(?:from|derived from|borrowed from)\s+(?:the\s+)?(?:[A-Za-z]+\s+)?([a-zA-Z settlementα-ωΑ-Ω’'-]+)/i);
    if (rootMatch) {
      const cleanRoot = rootMatch[1].split(' ')[0].replace(/[“"’',.]/g, '').trim();
      if (cleanRoot.length > 1 && cleanRoot.toLowerCase() !== word) {
        foundRootWord = cleanRoot;
      }
    }

    // Anlam yakalama filtresi (Metindeki parantez içi veya tırnak içi anlamları bulur)
    const meaningMatch = combinedData.match(/(?:meaning|sense of|“|")([^,.;”")]+)/i);
    if (meaningMatch && meaningMatch[1].length > 2) {
      const cleanMeaning = meaningMatch[1].replace(/[“"’']/g, '').trim();
      if (cleanMeaning.toLowerCase() !== word && cleanMeaning.toLowerCase() !== foundRootWord?.toLowerCase()) {
        foundMeaning = cleanMeaning;
      }
    }

    // Manuel Sabit Veritabanı (Bunlar zaten nokta atışı kalacak)
    const customDatabase = {
      robot: { lang: "Czech", root: "robota", meaning: "forced labor" },
      disaster: { lang: "Middle French", root: "desastre", meaning: "ill-starred" },
      salary: { lang: "Latin", root: "salarium", meaning: "salt money" },
      octopus: { lang: "Ancient Greek", root: "oktō + pous", meaning: "eight + foot" },
      geography: { lang: "Ancient Greek", root: "gē + graphia", meaning: "earth + writing" },
      coffee: { lang: "Arabic", root: "qahwah", meaning: "coffee" },
      dog: { lang: "Old English", root: "docga", meaning: "dog or hound" },
      tree: { lang: "Old English", root: "trēow", meaning: "tree or timber" },
      ship: { lang: "Old English", root: "scip", meaning: "boat or ship" },
      car: { lang: "Old French", root: "carre", meaning: "wheeled vehicle" }
    };

    if (customDatabase[word]) {
      foundLanguage = customDatabase[word].lang;
      foundRootWord = customDatabase[word].root;
      foundMeaning = customDatabase[word].meaning;
    }

    // 4. ADIM: Kusursuz Cümle Kurulumu
    let finalOutput = "";
    if (foundRootWord) {
      if (foundMeaning) {
        finalOutput = `comes from ${foundLanguage} “${foundRootWord}”, meaning "${foundMeaning}".`;
      } else {
        finalOutput = `comes from ${foundLanguage} “${foundRootWord}”.`;
      }
    } else {
      // Eğer kelime çok köklüyse ve regex patlarsa, Wiktionary'nin en temiz ilk cümlesini kibarlaştırıp verir
      let firstSentence = extractText.split('.')[0].trim();
      if (firstSentence.toLowerCase().startsWith("from")) {
        firstSentence = "comes from" + firstSentence.substring(4);
      }
      finalOutput = firstSentence;
    }

    // Yayına hazırlık rötuşları
    if (!finalOutput.endsWith(".")) finalOutput += ".";
    finalOutput = finalOutput.replace(/comes from/i, "comes from");

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: ${finalOutput}`);

  } catch (err) {
    return res.send(`📚 ${word.toUpperCase()}: comes from historical linguistic roots.`);
  }
}
