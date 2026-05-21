import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const word = (req.query.word || "")
    .trim()
    .toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  try {
    const response = await fetch(
      `https://www.etymonline.com/word/${encodeURIComponent(word)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!response.ok) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    const html = await response.text();

    const $ = cheerio.load(html);

    // SAYFADAKİ TÜM ANA METNİ ÇEK
    let text =
      $("main").text().trim() ||
      $("article").text().trim() ||
      $("body").text().trim();

    // Temizle
    text = text
      .replace(/\s+/g, " ")
      .replace("Advertisement", "")
      .trim();

    // İlk 350 karakter
    const shortText = text.substring(0, 350);

    if (!shortText) {
      return res.send(`📚 Origin of "${word}" not found.`);
    }

    return res.send(`📚 ${word.toUpperCase()}: ${shortText}`);
  } catch (err) {
    return res.send("Error fetching etymology.");
  }
}
