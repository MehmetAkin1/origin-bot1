export default async function handler(req, res) {
  const word = req.query.word?.toLowerCase();

  if (!word) {
    return res.send("Usage: ?word=example");
  }

  try {
    // Wiktionary API
    const url = `https://en.wiktionary.org/api/rest_v1/page/definition/${word}`;

    const response = await fetch(url);

    if (!response.ok) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const data = await response.json();

    // basit formatlama (ilk anlamı alıyoruz)
    const meaning =
      data?.en?.[0]?.definitions?.[0]?.definition ||
      "No definition found.";

    res.send(`📚 ${word} → ${meaning}`);
  } catch (err) {
    res.send("Error fetching origin.");
  }
}
