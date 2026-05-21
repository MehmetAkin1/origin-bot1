export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // Dünyanın en stabil ve resmi ücretsiz sözlük API'sini kullanıyoruz
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const data = await response.json();
    
    // API'den gelen resmi köken (etimoloji) bilgisini cımbızlıyoruz
    let originText = data[0]?.origin || "";

    // Eğer aranan kelimenin özel bir köken açıklaması yoksa (çok nadir), tanımından akıllı bir parça üretelim
    if (!originText) {
      const definition = data[0]?.meanings[0]?.definitions[0]?.definition || "";
      if (definition) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        return res.send(`📚 ${word.toUpperCase()}: Historical English word meaning "${definition.split('.')[0]}".`);
      }
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    // Yayındaki chat estetiği için "From..." diye başlayan yapıyı senin istediğin formata sokar
    let finalSentence = originText.split('.')[0].trim();
    
    if (finalSentence.toLowerCase().startsWith("from")) {
      finalSentence = "comes from" + finalSentence.substring(4);
    }

    // Baş harfini düzeltip sonuna nokta koyalım
    finalSentence = finalSentence.charAt(0).toUpperCase() + finalSentence.slice(1) + ".";

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 ${word.toUpperCase()}: ${finalSentence}`);

  } catch (err) {
    return res.send(`📚 Origin of "${word}" not found.`);
  }
}
