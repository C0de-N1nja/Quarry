#!/usr/bin/env python3
"""
Quarry Unified Stealth Web Scraping & Intelligence Engine
Powered by Scrapling (https://github.com/d4vinci/Scrapling)

Capabilities:
  1. fetch: Fast HTTP/3 TLS impersonation + fallback to StealthyFetcher for Cloudflare Turnstile / Interstitial bypass.
  2. search: Search engine SERP scraper (Yahoo, Bing, DuckDuckGo) with unwrap logic, snippet parsing, and regex extraction.
  3. crawl: Multi-page contact crawler for prospect websites, extracting emails, phones, and social links.
  4. social: Direct social profile scraper (Facebook, Instagram, LinkedIn, X, TikTok, Linktree) with zero third-party proxies.
"""

import sys
import os
import json
import logging
import argparse
import urllib.parse
import re
from typing import Dict, Any, List

# Silence Scrapling's internal logger to ensure clean JSON stdout output
try:
    from scrapling.core.utils import log
    log.setLevel(logging.ERROR)
except Exception:
    pass

CLOUDFLARE_MARKERS = [
    "cloudflare",
    "cf-browser-verification",
    "ray id",
    "just a moment...",
    "checking your browser",
    "turnstile",
    "enable javascript and cookies"
]

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', re.IGNORECASE)
PHONE_REGEX = re.compile(r'(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b')
INTL_PHONE_REGEX = re.compile(r'\+?\d{1,4}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b')

SOCIAL_DOMAINS = [
    'facebook.com', 'fb.com', 'instagram.com', 'instagr.am', 'linkedin.com',
    'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'youtu.be', 'pinterest.com',
    'google.com', 'apple.com', 'sentry.io'
]

def is_cloudflare_challenge(status_code: int, html: str) -> bool:
    if status_code in (403, 503):
        return True
    if not html:
        return False
    lower = html.lower()
    return any(marker in lower for marker in CLOUDFLARE_MARKERS)

def extract_body_text(response) -> str:
    if hasattr(response, "body") and response.body:
        if isinstance(response.body, bytes):
            return response.body.decode("utf-8", errors="ignore")
        return str(response.body)
    if hasattr(response, "html_content") and response.html_content:
        return str(response.html_content)
    if hasattr(response, "text") and response.text:
        return str(response.text)
    return ""

def fetch_url(url: str, force_browser: bool = False, timeout_ms: int = 8000) -> dict:
    from scrapling.fetchers import Fetcher

    html = ""
    status = 0
    engine_used = "fast_http"

    # Step 1: Attempt ultra-fast HTTP/3 request with Chrome TLS fingerprint spoofing (unless forced)
    if not force_browser:
        try:
            res = Fetcher.get(
                url,
                timeout=int(timeout_ms / 1000),
                follow_redirects=True
            )
            status = res.status
            html = extract_body_text(res)

            # If clean 200 and not a Cloudflare challenge screen, return immediately
            if status < 400 and not is_cloudflare_challenge(status, html):
                return {
                    "success": True,
                    "status": status,
                    "engine": "fast_http",
                    "html": html,
                    "url": str(res.url) if hasattr(res, "url") else url
                }
        except Exception:
            pass

    # Step 2: Fallback to Stealthy headless Chromium with automated Cloudflare solving
    try:
        from scrapling.fetchers import StealthyFetcher

        engine_used = "stealth_browser"
        page = StealthyFetcher.fetch(
            url,
            headless=True,
            solve_cloudflare=True,
            disable_resources=True,
            timeout=timeout_ms
        )

        html = extract_body_text(page)
        return {
            "success": True,
            "status": page.status,
            "engine": engine_used,
            "html": html,
            "url": str(page.url) if hasattr(page, "url") else url
        }
    except Exception as e:
        return {
            "success": False,
            "status": status or 500,
            "engine": engine_used,
            "error": str(e),
            "html": html
        }

def search_query(query: str, engine: str = "yahoo", timeout_ms: int = 7000) -> dict:
    """Execute stealth search query across Yahoo or Bing using Scrapling's Fetcher"""
    import base64
    from scrapling.fetchers import Fetcher

    clean_q = query.strip()
    links: List[str] = []
    snippets: List[str] = []
    engine_name = engine.lower()

    if engine_name == "bing":
        url = "https://www.bing.com/search?q=" + urllib.parse.quote_plus(clean_q)
    elif engine_name == "duckduckgo":
        url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote_plus(clean_q)
    else:
        engine_name = "yahoo"
        url = "https://search.yahoo.com/search?p=" + urllib.parse.quote_plus(clean_q)

    try:
        timeout_sec = max(3, int(timeout_ms / 1000))
        res = Fetcher.get(url, timeout=timeout_sec, follow_redirects=True)
        html = extract_body_text(res)

        if engine_name == "yahoo":
            all_links = res.css('a::attr(href)').getall()
            for l in all_links:
                m = re.search(r'/RU=([^/]+)', l)
                if m:
                    try:
                        target = urllib.parse.unquote(m.group(1))
                        if target.startswith('http') and 'yahoo.com' not in target:
                            if target not in links:
                                links.append(target)
                    except Exception:
                        pass
            
            raw_snippets = res.css('div.compText, p, div.fc-falcon').getall()
            for s in raw_snippets:
                clean_text = re.sub(r'<[^>]+>', ' ', s).strip()
                if len(clean_text) > 20 and clean_text not in snippets:
                    snippets.append(clean_text)

        elif engine_name == "bing":
            raw_links = res.css('li.b_algo h2 a::attr(href)').getall()
            for l in raw_links:
                if 'bing.com/ck/a' in l:
                    m = re.search(r'[?&]u=([^&]+)', l)
                    if m:
                        val = m.group(1)
                        if val.startswith('a1'):
                            try:
                                b64 = val[2:] + '=='
                                decoded = base64.urlsafe_b64decode(b64).decode('utf-8', errors='ignore')
                                if decoded.startswith('http') and 'bing.com' not in decoded:
                                    if decoded not in links:
                                        links.append(decoded)
                            except Exception:
                                pass
                elif l.startswith('http') and 'bing.com' not in l:
                    if l not in links:
                        links.append(l)

            raw_snippets = res.css('li.b_algo p, li.b_algo .b_caption p').getall()
            for s in raw_snippets:
                clean_text = re.sub(r'<[^>]+>', ' ', s).strip()
                if len(clean_text) > 20 and clean_text not in snippets:
                    snippets.append(clean_text)

        combined_text = " ".join(snippets) + " " + html
        found_emails = list(set(EMAIL_REGEX.findall(combined_text)))
        clean_emails = [e for e in found_emails if not e.endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg')) and 'example.com' not in e]

        return {
            "success": True,
            "engine": f"scrapling_{engine_name}",
            "links": links[:15],
            "snippets": snippets[:10],
            "emails": clean_emails[:5],
            "html": ""
        }
    except Exception as e:
        return {
            "success": False,
            "engine": f"scrapling_{engine_name}",
            "error": str(e),
            "links": [],
            "snippets": [],
            "emails": [],
            "html": ""
        }

def scrape_social_profile(profile_url: str, timeout_ms: int = 8000) -> dict:
    """Scrape data directly from a social media profile using pure Scrapling without third-party proxies"""
    from scrapling.fetchers import Fetcher

    if not profile_url:
        return {"success": False, "error": "No URL provided"}

    clean_url = profile_url.strip().split('?')[0].rstrip('/')
    if not clean_url.startswith('http'):
        clean_url = 'https://' + clean_url

    lower = clean_url.lower()
    platform = 'unknown'
    if 'facebook.com' in lower or 'fb.com' in lower:
        platform = 'facebook'
    elif 'instagram.com' in lower:
        platform = 'instagram'
    elif 'linkedin.com' in lower:
        platform = 'linkedin'
    elif 'twitter.com' in lower or 'x.com' in lower:
        platform = 'twitter'
    elif 'tiktok.com' in lower:
        platform = 'tiktok'
    elif 'youtube.com' in lower:
        platform = 'youtube'
    elif any(d in lower for d in ['linktr.ee', 'bio.link', 'beacons.ai']):
        platform = 'linktree'

    result = {
        "success": False,
        "platform": platform,
        "url": clean_url,
        "page_name": None,
        "bio": "",
        "website": None,
        "emails": [],
        "phones": [],
        "whatsapp": None,
        "candidate_links": [],
        "engine": "scrapling_social"
    }

    try:
        timeout_sec = max(4, int(timeout_ms / 1000))
        # Use Chrome TLS impersonation
        res = Fetcher.get(clean_url, timeout=timeout_sec, follow_redirects=True)
        html = extract_body_text(res)

        if not html or res.status >= 400:
            # Fallback to stealth browser if fast HTTP was blocked
            from scrapling.fetchers import StealthyFetcher
            page = StealthyFetcher.fetch(clean_url, headless=True, solve_cloudflare=True, timeout=timeout_ms)
            html = extract_body_text(page)

        if not html:
            result["error"] = "Empty page content"
            return result

        result["success"] = True

        # 1. Extract Title / Page Name
        title_tag = res.css('meta[property="og:title"]::attr(content), title::text').get()
        if title_tag:
            clean_title = re.sub(r'\s*[\(\|\-–].*$', '', title_tag).strip()
            result["page_name"] = clean_title or title_tag.strip()

        # 2. Extract Bio Text
        og_desc = res.css('meta[property="og:description"]::attr(content), meta[name="description"]::attr(content)').get()
        body_snippets = res.css('p::text, span::text').getall()
        clean_body = " ".join([b.strip() for b in body_snippets if len(b.strip()) > 15])
        
        bio_parts = []
        if og_desc:
            bio_parts.append(og_desc.strip())
        if clean_body:
            bio_parts.append(clean_body[:500])
        result["bio"] = " ".join(bio_parts).strip()

        # 3. Extract Emails
        combined = (result["bio"] + " " + html)
        emails = set(EMAIL_REGEX.findall(combined))
        clean_emails = [e.lower() for e in emails if not e.endswith(('.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.js', '.css')) and 'example.com' not in e]
        result["emails"] = list(clean_emails)[:5]

        # 4. Extract Phones & WhatsApp
        phones = set()
        for p in INTL_PHONE_REGEX.findall(result["bio"] or ""):
            digits = re.sub(r'\D', '', p)
            if 7 <= len(digits) <= 15:
                phones.add(p.strip())
        result["phones"] = list(phones)[:3]

        wa_match = re.search(r'https?://(?:wa\.me|api\.whatsapp\.com/send)[^\s"\'<>]+', html)
        if wa_match:
            result["whatsapp"] = wa_match.group(0)

        # 5. Extract Candidate External Links & Website
        candidate_links = []
        
        # Check unwrapped Facebook outbound links (l.facebook.com/l.php?u=...)
        for m in re.finditer(r'l\.facebook\.com/l\.php\?u=([^&"\']+)', html):
            target = urllib.parse.unquote(m.group(1))
            if target.startswith('http') and not any(d in target.lower() for d in SOCIAL_DOMAINS):
                candidate_links.append(target)

        # Check Instagram external bio link
        for m in re.finditer(r'https?://(?:l\.instagram\.com/\?u=|linktr\.ee/|bio\.link/|beacons\.ai/)[^\s"\'<>]+', html):
            raw = m.group(0)
            if 'l.instagram.com/?u=' in raw:
                q = urllib.parse.parse_qs(urllib.parse.urlparse(raw).query)
                if 'u' in q and q['u'][0].startswith('http'):
                    target = q['u'][0]
                    if not any(d in target.lower() for d in SOCIAL_DOMAINS):
                        candidate_links.append(target)
            else:
                candidate_links.append(raw)

        # Check all other standard links (for Linktree, bio links, or direct profile links)
        for link in res.css('a::attr(href)').getall():
            if link.startswith('//'):
                link = 'https:' + link
            if link.startswith('http'):
                clean_l = link.split('?')[0].rstrip('/')
                lower_l = clean_l.lower()
                if not any(d in lower_l for d in SOCIAL_DOMAINS):
                    if not any(x in lower_l for x in ['privacy', 'terms', 'cookie', 'help', 'login', 'signup', 'support']):
                        candidate_links.append(clean_l)

        # Deduplicate candidates
        seen = set()
        deduped = []
        for c in candidate_links:
            norm = c.rstrip('/')
            if norm not in seen:
                seen.add(norm)
                deduped.append(norm)

        result["candidate_links"] = deduped[:5]
        if deduped:
            result["website"] = deduped[0]

        return result
    except Exception as e:
        result["error"] = str(e)
        return result

def crawl_site(base_url: str, timeout_ms: int = 10000) -> dict:
    """Crawl homepage and contact subpages using Scrapling to extract authentic contacts and socials"""
    from scrapling.fetchers import Fetcher

    if not base_url.startswith('http'):
        base_url = 'https://' + base_url

    parsed_base = urllib.parse.urlparse(base_url)
    domain = parsed_base.netloc.lower()

    visited = set()
    emails = set()
    phones = set()
    socials = {}

    def harvest_from_html(html_str: str, current_url: str):
        if not html_str:
            return
        for e in EMAIL_REGEX.findall(html_str):
            if not e.endswith(('.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.css', '.js')) and 'example.com' not in e:
                emails.add(e.lower())
        for p in INTL_PHONE_REGEX.findall(html_str):
            digits = re.sub(r'\D', '', p)
            if 7 <= len(digits) <= 15:
                phones.add(p.strip())
        if "facebook.com/" in html_str and "facebook" not in socials:
            fb = re.search(r'https?://(?:www\.)?facebook\.com/[a-zA-Z0-9.\-_]+', html_str)
            if fb and not any(x in fb.group(0).lower() for x in ['sharer', 'share', 'dialog', 'tr?id=']):
                socials["facebook"] = fb.group(0)
        if "instagram.com/" in html_str and "instagram" not in socials:
            insta = re.search(r'https?://(?:www\.)?instagram\.com/[a-zA-Z0-9.\-_]+', html_str)
            if insta and not any(x in insta.group(0).lower() for x in ['p/', 'explore/']):
                socials["instagram"] = insta.group(0)
        if "linkedin.com/" in html_str and "linkedin" not in socials:
            li = re.search(r'https?://(?:www\.)?linkedin\.com/(?:company|in)/[a-zA-Z0-9.\-_]+', html_str)
            if li:
                socials["linkedin"] = li.group(0)

    home_fetch = fetch_url(base_url, timeout_ms=timeout_ms)
    visited.add(base_url)

    if not home_fetch.get("success"):
        return {
            "success": False,
            "url": base_url,
            "error": home_fetch.get("error", "Failed to fetch homepage"),
            "emails": [],
            "phones": [],
            "socials": {}
        }

    home_html = home_fetch.get("html", "")
    harvest_from_html(home_html, base_url)

    contact_keywords = ['contact', 'about', 'get-in-touch', 'team', 'reach']
    subpage_urls = []
    
    hrefs = re.findall(r'href=[\'"]([^\'"]+)[\'"]', home_html, re.IGNORECASE)
    for h in hrefs:
        h_lower = h.lower()
        if any(kw in h_lower for kw in contact_keywords):
            full_sub = urllib.parse.urljoin(base_url, h)
            sub_parsed = urllib.parse.urlparse(full_sub)
            if sub_parsed.netloc.lower() == domain and full_sub not in visited and full_sub not in subpage_urls:
                subpage_urls.append(full_sub)

    for sub in subpage_urls[:3]:
        visited.add(sub)
        sub_res = fetch_url(sub, timeout_ms=5000)
        if sub_res.get("success") and sub_res.get("html"):
            harvest_from_html(sub_res["html"], sub)

    return {
        "success": True,
        "url": base_url,
        "emails": list(emails),
        "phones": list(phones)[:5],
        "socials": socials,
        "pages_scraped": len(visited)
    }

def main():
    parser = argparse.ArgumentParser(description="Quarry Unified Scrapling Engine")
    subparsers = parser.add_subparsers(dest="command")

    # Command: fetch
    p_fetch = subparsers.add_parser("fetch")
    p_fetch.add_argument("url", help="Target URL to fetch")
    p_fetch.add_argument("--stealth", action="store_true", help="Force stealth headless browser mode")
    p_fetch.add_argument("--timeout", type=int, default=8000, help="Timeout in milliseconds")

    # Command: search
    p_search = subparsers.add_parser("search")
    p_search.add_argument("query", help="Search query string")
    p_search.add_argument("--engine", default="yahoo", choices=["yahoo", "bing", "duckduckgo"])
    p_search.add_argument("--timeout", type=int, default=7000, help="Timeout in milliseconds")

    # Command: crawl
    p_crawl = subparsers.add_parser("crawl")
    p_crawl.add_argument("url", help="Prospect homepage URL")
    p_crawl.add_argument("--timeout", type=int, default=10000, help="Timeout in milliseconds")

    # Command: social
    p_social = subparsers.add_parser("social")
    p_social.add_argument("url", help="Social profile URL to inspect")
    p_social.add_argument("--timeout", type=int, default=8000, help="Timeout in milliseconds")

    args = parser.parse_args()

    if not args.command:
        if len(sys.argv) > 1 and not sys.argv[1].startswith("-"):
            url = sys.argv[1]
            stealth = "--stealth" in sys.argv
            result = fetch_url(url, force_browser=stealth)
            print(json.dumps(result))
            return
        parser.print_help()
        return

    if args.command == "fetch":
        res = fetch_url(args.url, force_browser=args.stealth, timeout_ms=args.timeout)
        print(json.dumps(res))
    elif args.command == "search":
        res = search_query(args.query, engine=args.engine, timeout_ms=args.timeout)
        print(json.dumps(res))
    elif args.command == "crawl":
        res = crawl_site(args.url, timeout_ms=args.timeout)
        print(json.dumps(res))
    elif args.command == "social":
        res = scrape_social_profile(args.url, timeout_ms=args.timeout)
        print(json.dumps(res))

if __name__ == "__main__":
    main()
