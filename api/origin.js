export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // Dünyanın en büyük resmi sözlük veritabanından kelimenin etimolojisini çekiyoruz
    const url = `https://dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(word)}?key=416973aa-2651-4fa3-94df-74f0cbfbbcf1`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const data = await response.json();
    
    // Kelimenin kısa ve öz etimoloji (et) bilgisini alıyoruz
    let etymology = data[0]?.et?.[0]?.[1] || "";
    
    // Eğer Merriam-Webster'da özel bir etimoloji alanı yoksa, en temel tanımını alıp anlam yapalım
    if (!etymology) {
      const shortDef = data[0]?.shortdef?.[0] || "";
      if (shortDef) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(`📚 ${word.toUpperCase()}: Historical English word meaning "${shortDef}".`);
      }
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    // Merriam-Webster'ın içindeki özel it etiketlerini temizliyoruz ({it}latin{/it} -> Latin)
    let cleanEtym = etymology
      .replace(/\{it\}/g, '“')
      .replace(/\{\/it\}/g, '”')
      .replace(/\{ma\}/g, '')
      .replace(/\{\/ma\}/g, '')
      .replace(/\{et_link\|[^}]*\}/g, '')
      .replace(/\[=[^\]]*\]/g, '')
      .trim();

    // Yayındaki chat estetiği için cümleyi toparlıyoruz
    if (cleanEtym.startsWith(",")) cleanEtym = cleanEtym.substring(1).trim();
    
    let finalSentence = "";
    if (cleanEtym.toLowerCase().startsWith("from")) {
      finalSentence = "comes " + cleanEtym;
    } else {
      finalSentence = "comes from " + cleanEtym;
    }

    // Cümle sonu kontrolü
    if (!finalSentence.endsWith(".")) finalSentence += ".";

    // --- Manuel Altın Garanti (Kusursuz Görünmesini İstediğin Baş Tacı Kelimeler) ---
    const goldenDatabase = {
      robot: 'comes from Czech “robota”, meaning "forced labor".',
      disaster: 'comes from Middle French “desastre”, meaning "ill-starred".',
      panic: 'comes from Ancient Greek “panikos”, meaning "pertaining to Pan" (the god of woods and fields who caused terror).',
      what: 'comes from Old English “hwæt”, meaning "what, why, or lo!".',
      octopus: 'is a compound of Ancient Greek “ὀκτώ” (eight) + “πούς” (foot).',
      geography: 'is a compound of Ancient Greek “γῆ” (earth) + “γραφή” (writing).',
      ship: 'comes from Old English “scip”, of Germanic origin.'
    };

    if (goldenDatabase[word]) {
      finalSentence = goldenDatabase[word];
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: ${finalSentence}`);

  } catch (err) {
    return res.send(`📚 Origin of "${word}" not found.`);
  }
}
