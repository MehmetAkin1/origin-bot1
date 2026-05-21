import * as cheerio from "cheerio";

export default async function handler(req, res) {
  const word = (req.query.word || req.query.query || "")
    .trim()
    .toLowerCase();

  if (!word) {
    return res.send("Usage: !origin [word]");
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");

  try {
    const url = `https://www.etymonline.com/search?q=${encodeURIComponent(word)}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    if (!response.ok) {
      return res.send(`📚 Could not fetch etymology for "${word}".`);
    }

    const html = await response.text();

    const $ = cheerio.load(html);

    // İlk gerçek etymology paragrafını bul
    let text = "";

    $("a").each((i, el) => {
      const href = $(el).attr("href") || "";

      if (
        href.includes("/word/") &&
        $(el).text().toLowerCase() === word
      ) {
        text = $(el).parent().text().trim();
        return false;
      }
    });

    // fallback
    if (!text) {
      text = $("main").text().trim().slice(0, 500);
    }

    // temizle
    text = text
      .replace(/\s+/g, " ")
      .replace("Advertisement", "")
      .trim();

    // çok uzunsa kes
    if (text.length > 350) {
      text = text.slice(0, 350) + "...";
    }

    if (!text) {
      return res.send(`📚 No etymology found for "${word}".`);
    }

    return res.send(`📚 ${word.toUpperCase()}: ${text}`);
  } catch (err) {
    return res.send("Error fetching etymology.");
  }
}
