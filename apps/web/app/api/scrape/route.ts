import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ ok: false, error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
    if (!res.ok) {
      return NextResponse.json({ ok: true, jobs: [], hint: 'Could not fetch the URL.' });
    }
    const html = await res.text();
    const $ = cheerio.load(html);

    // This is a placeholder selector. Actual selectors would be needed for each site.
    const jobs = $('.job-listing').map((i, el) => ({
      title: $(el).find('.job-title').text(),
      company: $(el).find('.company-name').text(),
      location: $(el).find('.location').text(),
      url: $(el).find('a').attr('href'),
    })).get();

    if (/linkedin\.com/.test(url) && jobs.length === 0) {
      return NextResponse.json({ ok: true, jobs: [], hint: "LinkedIn scraping is limited. Try a more specific job board URL." });
    }

    return NextResponse.json({ ok: true, jobs });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "Scraping failed", details: e.message }, { status: 500 });
  }
}
