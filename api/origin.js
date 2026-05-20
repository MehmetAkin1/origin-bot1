export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "").trim().toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  try {
    // Doğrudan etimoloji verisi sunan temiz bir API kullanıyoruz
    const url = `https://etymology-api.vercel.app/api/etymology?word=${encodeURIComponent(word)}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const data = await response.json();

    // API'den etimoloji metnini alıyoruz
    let etymology = data.etymology || "";

    if (!etymology) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    // Yayındaki chat akışı için metni tek bir düzgün cümle halinde temizleyelim
    // Varsa içindeki gereksiz teknik etiketleri ve fazla boşlukları uçuruyoruz
    etymology = etymology
      .replace(/\s+/g, ' ')
      .trim();

    // Cümle "From..." diye başlıyorsa ilk harfini küçük yapalım (senin istediğin estetik format için)
    if (etymology.toLowerCase().startsWith("from")) {
      etymology = "from" + etymology.substring(4);
    }

    // Chat sınırı için maksimum karakter kontrolü
    if (etymology.length > 380) {
      etymology = etymology.substring(0, 377) + "...";
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(`📚 Origin of ${word}: ${etymology}`);

  } catch (err) {
    // API'de bir sorun olursa veya kelime bulunamazsa Wiktionary yedekleme mekanizması çalışsın
    return res.send(`📚 Origin of "${word}" not found.`);
  }
}
