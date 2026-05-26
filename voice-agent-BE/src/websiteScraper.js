import { load } from 'cheerio';

const BASE_URL = 'https://browns.pharmacy';

const PAGES_TO_SCRAPE = [
  '/',
  '/about',
  '/services',
  '/contact',
  '/opening-hours',
  '/products',
  '/team',
];

/**
 * Fetches a single URL and extracts its visible text content.
 *
 * @param {string} url
 * @returns {Promise<string>}
 */
async function scrapePage(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VoiceAgentBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return '';

    const html = await response.text();
    const $ = load(html);

    $('script, style, nav, footer, header, noscript, iframe, img').remove();

    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim();

    return text.slice(0, 3000);
  } catch {
    return '';
  }
}

/**
 * Scrapes the browns.pharmacy website and returns a condensed text
 * suitable for injection into the voice agent's system instructions.
 *
 * @returns {Promise<string>}
 */
export async function scrapeWebsiteContent() {
  console.log('Scraping browns.pharmacy...');

  const results = await Promise.all(
    PAGES_TO_SCRAPE.map(async (path) => {
      const url = `${BASE_URL}${path}`;
      const text = await scrapePage(url);
      if (!text) return null;
      return `[${path}]\n${text}`;
    })
  );

  const content = results.filter(Boolean).join('\n\n');

  console.log(`Scraped ${results.filter(Boolean).length}/${PAGES_TO_SCRAPE.length} pages (${content.length} chars)`);

  return content;
}
