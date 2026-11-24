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
    'snapchat.com', 'google.com', 'apple.com', 'sentry.io'
]

DIRECTORY_DOMAINS = [
    'yelp.com', 'yellowpages.com', 'yellowpages.com.au', 'bbb.org',
    'truelocal.com.au', 'houzz.com', 'bark.com', 'angi.com', 'thumbtack.com',
    'manta.com', 'cylex', 'hotfrog.com', 'threebestrated', 'nextdoor.com',
    'checkatrade.com', 'yell.com', 'whereis.com', 'superpages.com',
    'citysearch.com', 'merchantcircle.com'
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
            # Strictly target algorithmic search results containers (#web, div#results)
            # Never scan global page links to avoid pulling trending news, sidebar topics, and ads
            algo_links = res.css(
                '#web div.algo h3 a::attr(href), '
                '#web li.algo h3 a::attr(href), '
                '#web li.algo a.d-ib::attr(href), '
                'div#results div.compTitle a::attr(href), '
                'div#results li.algo h3 a::attr(href), '
                'div#results div.algo a.thmb::attr(href)'
            ).getall()

            for l in algo_links:
                m = re.search(r'/RU=([^/]+)', l)
                if m:
                    try:
                        target = urllib.parse.unquote(m.group(1))
                        if target.startswith('http') and 'yahoo.com' not in target:
                            if target not in links:
                                links.append(target)
                    except Exception:
                        pass
                elif l.startswith('http') and 'yahoo.com' not in l:
                    if l not in links:
                        links.append(l)

            raw_snippets = res.css('#web div.algo div.compText, div#results li div.compText, #web li.algo p').getall()
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
    elif 'snapchat.com' in lower:
        platform = 'snapchat'
    elif 'pinterest.com' in lower:
        platform = 'pinterest'
    elif any(d in lower for d in DIRECTORY_DOMAINS):
        platform = 'directory'
    elif any(d in lower for d in ['linktr.ee', 'bio.link', 'beacons.ai']):
        platform = 'linktree'

    result = {
        "status": "empty",
        "variant": "www",
        "platform": platform,
        "url": clean_url,
        "final_url": clean_url,
        "http_status": 0,
        "fields": {
            "page_name": None,
            "bio": "",
            "website": None,
            "addresses": [],
            "emails": [],
            "phones": [],
            "whatsapp": None,
            "candidate_links": []
        },
        "source": "scrapling"
    }

    try:
        timeout_sec = max(4, int(timeout_ms / 1000))
        res = Fetcher.get(clean_url, timeout=timeout_sec, follow_redirects=True)
        html = extract_body_text(res)
        result["http_status"] = res.status
        final_url = str(getattr(res, "url", clean_url))
        result["final_url"] = final_url

        if res.status in (403, 429):
            result["status"] = "blocked"
            return result

        final_lower = final_url.lower()
        if "/accounts/login" in final_lower or "/login" in final_lower or "checkpoint" in final_lower:
            result["status"] = "login_wall"
            return result

        if not html or len(html.strip()) < 400:
            result["status"] = "empty"
            return result

        # Check for login wall content markers
        html_lower = html.lower()
        if ("log in to instagram" in html_lower or "log into facebook" in html_lower) and "og:title" not in html_lower:
            result["status"] = "login_wall"
            return result

        result["status"] = "ok"
        fields = result["fields"]

        # Decode unicode escapes common in embedded JSON (e.g. Facebook comet tiles)
        decoded_html = html.replace('\\u0040', '@').replace('\\/', '/')

        # 1. Extract Page Name / Title
        title_tag = res.css('meta[property="og:title"]::attr(content), title::text').get()
        if title_tag:
            clean_title = re.sub(r'\s*[\(\|\-–].*$', '', title_tag).strip()
            fields["page_name"] = clean_title or title_tag.strip()

        # 2. Extract Bio Text
        og_desc = res.css('meta[property="og:description"]::attr(content), meta[name="description"]::attr(content)').get()
        body_snippets = res.css('p::text, span::text').getall()
        clean_body = " ".join([b.strip() for b in body_snippets if len(b.strip()) > 15])
        bio_parts = []
        if og_desc:
            bio_parts.append(og_desc.strip())
        if clean_body:
            bio_parts.append(clean_body[:500])
        fields["bio"] = " ".join(bio_parts).strip()

        # 3. Extract Embedded JSON text tiles (for Facebook & modern reactive pages)
        text_tiles = re.findall(r'"text":"([^"]+)"', decoded_html)

        # Address / Geo extraction
        addresses = set()
        for t in text_tiles:
            if re.search(r',\s*[A-Z]{2}(?:,\s*[A-Z]{2,})?$', t):
                addresses.add(t.strip())
        fields["addresses"] = list(addresses)

        # Emails extraction from both JSON tiles and regex over HTML
        emails = set()
        for t in text_tiles:
            if re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', t):
                emails.add(t.strip().lower())
        for em in EMAIL_REGEX.findall(decoded_html):
            clean_em = em.lower()
            if not clean_em.endswith(('.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.js', '.css')) and 'example.com' not in clean_em:
                emails.add(clean_em)
        fields["emails"] = list(emails)[:5]

        # Phone numbers from JSON tiles and regex
        phones = set()
        for t in text_tiles:
            if re.match(r'^\+?[0-9\s().-]{8,20}$', t) and any(c.isdigit() for c in t):
                phones.add(t.strip())
        for p in INTL_PHONE_REGEX.findall(fields["bio"] or ""):
            digits = re.sub(r'\D', '', p)
            if 7 <= len(digits) <= 15:
                phones.add(p.strip())
        fields["phones"] = list(phones)[:5]

        # WhatsApp link
        wa_match = re.search(r'https?://(?:wa\.me|api\.whatsapp\.com/send)[^\s"\'<>]+', decoded_html)
        if wa_match:
            fields["whatsapp"] = wa_match.group(0)

        # For Directory listings (Yelp, YellowPages, BBB, TrueLocal, Houzz, Bark, etc.)
        if platform == 'directory':
            tel_links = res.css('a[href^="tel:"]::attr(href)').getall()
            for tl in tel_links:
                clean_tel = re.sub(r'^tel:', '', tl).strip()
                if any(c.isdigit() for c in clean_tel):
                    phones.add(clean_tel)

            addr_nodes = res.css('address, [itemprop="address"], [class*="address"], [class*="location"]').getall()
            for an in addr_nodes:
                clean_an = re.sub(r'<[^>]+>', ' ', an).strip()
                clean_an = re.sub(r'\s+', ' ', clean_an)
                if 8 < len(clean_an) < 140 and any(c.isdigit() for c in clean_an):
                    addresses.add(clean_an)

        # For TikTok profile extraction
        if platform == 'tiktok':
            tt_json_match = re.search(r'<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)</script>', html)
            if tt_json_match:
                try:
                    tt_data = json.loads(tt_json_match.group(1))
                    user_data = tt_data.get("__DEFAULT_SCOPE__", {}).get("webapp.user-detail", {}).get("userInfo", {}).get("user", {})
                    if user_data:
                        if user_data.get("nickname"):
                            fields["page_name"] = user_data.get("nickname")
                        if user_data.get("signature"):
                            fields["bio"] = user_data.get("signature")
                        if user_data.get("bioLink", {}).get("link"):
                            cand_tt = user_data["bioLink"]["link"].strip()
                            if cand_tt not in candidate_links:
                                candidate_links.append(cand_tt)
                except Exception:
                    pass

        # Outbound Website / Candidate Links (unwrapping l.facebook.com and l.instagram.com)
        candidate_links = []
        domain_regex = re.compile(r'^(?:https?://)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,})(?:/.*)?$')

        # From embedded tiles
        for t in text_tiles:
            m = domain_regex.match(t.strip())
            if m:
                dom = m.group(1).lower()
                if not any(x in dom for x in ['facebook.com', 'instagram.com', 'threads.net', 'meta.com', 'google.com']):
                    cand = t.strip()
                    if not cand.startswith('http'):
                        cand = 'https://' + cand
                    candidate_links.append(cand)

        # From l.facebook.com unwrapping
        for m in re.finditer(r'l\.facebook\.com/l\.php\?u=([^&"\']+)', decoded_html):
            target = urllib.parse.unquote(m.group(1))
            if target.startswith('http') and not any(d in target.lower() for d in SOCIAL_DOMAINS):
                candidate_links.append(target)

        # From l.instagram.com unwrapping
        for m in re.finditer(r'l\.instagram\.com/\?u=([^&"\']+)', decoded_html):
            target = urllib.parse.unquote(m.group(1))
            if target.startswith('http') and not any(d in target.lower() for d in SOCIAL_DOMAINS):
                candidate_links.append(target)

        # Filter out generic login/meta domain leaks
        filtered_cands = []
        for c in candidate_links:
            low = c.lower()
            if any(bad in low for bad in ['about.meta.com', 'meta.ai', 'threads.com', 'threads.net', 'privacy', 'terms', 'help', 'support']):
                continue
            clean_c = c.split('?')[0].rstrip('/')
            if clean_c not in filtered_cands:
                filtered_cands.append(clean_c)

        fields["candidate_links"] = filtered_cands[:5]
        if filtered_cands:
            fields["website"] = filtered_cands[0]

        return result
    except Exception as e:
        result["status"] = "error"
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
    directories = {}

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

        # Harvest social channels
        if "facebook.com/" in html_str and "facebook" not in socials:
            fb = re.search(r'https?://(?:www\.)?facebook\.com/(?:profile\.php\?id=\d+|[a-zA-Z0-9.\-_]+)', html_str)
            if fb and not any(x in fb.group(0).lower() for x in ['sharer', 'share', 'dialog', 'tr?id=', '/login']):
                socials["facebook"] = fb.group(0).rstrip('/')
        if "instagram.com/" in html_str and "instagram" not in socials:
            insta = re.search(r'https?://(?:www\.)?instagram\.com/([a-zA-Z0-9.\-_]+)', html_str)
            if insta and not any(x in insta.group(1).lower() for x in ['p', 'reel', 'reels', 'explore', 'accounts', 'about']):
                socials["instagram"] = f"https://www.instagram.com/{insta.group(1)}".rstrip('/')
        if "linkedin.com/" in html_str and "linkedin" not in socials:
            li = re.search(r'https?://(?:www\.)?linkedin\.com/(?:company|in)/[a-zA-Z0-9.\-_]+', html_str)
            if li:
                socials["linkedin"] = li.group(0).rstrip('/')
        if ("twitter.com/" in html_str or "x.com/" in html_str) and "twitter" not in socials:
            tw = re.search(r'https?://(?:www\.)?(?:twitter|x)\.com/([a-zA-Z0-9_]+)', html_str)
            if tw and not any(x in tw.group(1).lower() for x in ['intent', 'share', 'home', 'explore']):
                socials["twitter"] = f"https://x.com/{tw.group(1)}".rstrip('/')
        if "tiktok.com/" in html_str and "tiktok" not in socials:
            tt = re.search(r'https?://(?:www\.)?tiktok\.com/@([a-zA-Z0-9.\-_]+)', html_str)
            if tt:
                socials["tiktok"] = f"https://www.tiktok.com/@{tt.group(1)}".rstrip('/')
        if "youtube.com/" in html_str and "youtube" not in socials:
            yt = re.search(r'https?://(?:www\.)?youtube\.com/(?:c/|channel/|user/|@)[a-zA-Z0-9.\-_]+', html_str)
            if yt:
                socials["youtube"] = yt.group(0).rstrip('/')
        if "snapchat.com/" in html_str and "snapchat" not in socials:
            sc = re.search(r'https?://(?:www\.)?snapchat\.com/add/([a-zA-Z0-9.\-_]+)', html_str)
            if sc:
                socials["snapchat"] = f"https://www.snapchat.com/add/{sc.group(1)}".rstrip('/')
        if "pinterest.com/" in html_str and "pinterest" not in socials:
            pin = re.search(r'https?://(?:www\.)?pinterest\.com/([a-zA-Z0-9.\-_]+)', html_str)
            if pin and not any(x in pin.group(1).lower() for x in ['pin', '_']):
                socials["pinterest"] = f"https://www.pinterest.com/{pin.group(1)}".rstrip('/')
        if any(d in html_str for d in ['linktr.ee/', 'bio.link/', 'beacons.ai/']) and "linktree" not in socials:
            lt = re.search(r'https?://(?:linktr\.ee|bio\.link|beacons\.ai)/[a-zA-Z0-9.\-_]+', html_str)
            if lt:
                socials["linktree"] = lt.group(0).rstrip('/')

        # Harvest business directory citations
        for d_name, d_pat in [
            ('yelp', r'https?://(?:www\.)?yelp\.com/biz/[a-zA-Z0-9.\-_]+'),
            ('yellowpages', r'https?://(?:www\.)?yellowpages\.com(?:\.au)?/[a-zA-Z0-9.\-_/]+'),
            ('bbb', r'https?://(?:www\.)?bbb\.org/[a-zA-Z0-9.\-_/]+'),
            ('truelocal', r'https?://(?:www\.)?truelocal\.com\.au/business/[a-zA-Z0-9.\-_/]+'),
            ('houzz', r'https?://(?:www\.)?houzz\.com/pro/[a-zA-Z0-9.\-_]+'),
            ('bark', r'https?://(?:www\.)?bark\.com/[a-zA-Z0-9.\-_/]+')
        ]:
            if d_name not in directories:
                dm = re.search(d_pat, html_str)
                if dm:
                    directories[d_name] = dm.group(0).rstrip('/')

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
        "directories": directories,
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
