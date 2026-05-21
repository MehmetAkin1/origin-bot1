export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // Tamamen açık, ücretsiz ve anahtarsız çalışan alternatif bir etimoloji parse motoru
    const url = `https://en.wiktionary.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(word)}&format=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    const pages = data?.query?.pages;
    const pageId = pages ? Object.keys(pages)[0] : null;
    let extractText = pageId && pageId !== "-1" ? pages[pageId].extract : "";

    if (!extractText || extractText.length < 5) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    // İlk cümleyi alalım (Temiz ve net köken cümlesi)
    let firstSentence = extractText.split('.')[0].trim();

    // Yayındaki chat estetiği için "From..." diye başlayan yapıyı "comes from" yapar
    if (firstSentence.toLowerCase().startsWith("from")) {
      firstSentence = "comes from" + firstSentence.substring(4);
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: ${firstSentence}.`);

  } catch (err) {
    return res.send(`📚 Origin of "${word}" not found.`);
  }
}
