#!/usr/bin/env python3
"""
Quarry Unified Stealth Web Scraping & Intelligence Engine
Powered by Scrapling (https://github.com/d4vinci/Scrapling)

Capabilities:
  1. fetch: Fast HTTP/3 TLS impersonation + fallback to StealthyFetcher for Cloudflare Turnstile / Interstitial bypass.
  2. search: Search engine SERP scraper (Yahoo, Bing, DuckDuckGo) with unwrap logic, snippet parsing, and regex extraction.
  3. crawl: Multi-page contact crawler for prospect websites, extracting emails, phones, and social links.
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

    # Search URL construction
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
            
            # Extract text snippets
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

        # Harvest emails and phone numbers from the search results
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
        # Emails
        for e in EMAIL_REGEX.findall(html_str):
            if not e.endswith(('.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.css', '.js')) and 'example.com' not in e:
                emails.add(e.lower())
        # Phones
        for p in INTL_PHONE_REGEX.findall(html_str):
            digits = re.sub(r'\D', '', p)
            if 7 <= len(digits) <= 15:
                phones.add(p.strip())
        # Socials
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

    # 1. Fetch homepage
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

    # 2. Extract potential contact / about links
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

    # 3. Fetch up to 3 contact subpages with fast HTTP/3
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

    args = parser.parse_args()

    # Backwards compatibility: if no subcommand, treat first argument as url for fetch
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

if __name__ == "__main__":
    main()
