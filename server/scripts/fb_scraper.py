#!/usr/bin/env python3
"""
High-Performance Facebook Page Intelligence Extractor
Combines:
  1. wael-sudo2/facebook-page-info-scraper (Relay GraphQL About app sections in <1s)
  2. OpenGraph / Meta crawler extraction
  3. Post caption contact harvester (shaikhsajid1111/facebook_page_scraper logic)
"""

import sys
import json
import re
import urllib.parse

# Inject local facebook-page-info-scraper library
sys.path.insert(0, '/home/beast/github-tools/facebook-page-info-scraper')

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
PHONE_REGEX = re.compile(r'(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?[2-9]\d{2}[-.\s]?\d{4}\b')
URL_REGEX = re.compile(r'https?://(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^\s"<>]*)?')

def clean_fb_url(raw_url):
    """Normalize Facebook page URL to clean format"""
    if not raw_url:
        return None
    url = raw_url.strip().split('?')[0].rstrip('/')
    if not url.startswith('http'):
        url = 'https://' + url
    return url

def scrape_facebook_page(target_url):
    cleaned = clean_fb_url(target_url)
    if not cleaned:
        return {"ok": False, "error": "Invalid URL"}

    result = {
        "ok": False,
        "source_url": cleaned,
        "page_name": None,
        "email": None,
        "phone": None,
        "website": None,
        "address": None,
        "category": None,
        "bio": None,
        "followers": None,
        "likes": None,
        "candidate_links": [],
        "source_engine": None
    }

    # Step 1: High-Speed Relay Payload Extraction (wael-sudo2)
    try:
        from facebook_page_info_scraper import scrape_pages
        res = scrape_pages([cleaned], threads=1, want_about=True)
        if res and len(res) > 0 and res[0].get("ok"):
            data = res[0]
            result["ok"] = True
            result["source_engine"] = "relay_payload"
            result["page_name"] = data.get("page_name")
            result["email"] = data.get("email")
            result["phone"] = data.get("phone_number")
            result["website"] = data.get("page_website")
            result["address"] = data.get("address")
            result["category"] = data.get("page_category")
            result["bio"] = data.get("bio")
            result["followers"] = data.get("page_followers")
            result["likes"] = data.get("page_likes")

            if result["website"]:
                result["candidate_links"].append(result["website"])
    except Exception as e:
        result["error_relay"] = str(e)

    # Step 2: OpenGraph Crawler Fallback if Relay was walled or missing bio
    if not result.get("bio") or not result.get("page_name"):
        try:
            import requests
            headers = {
                "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9"
            }
            resp = requests.get(cleaned, headers=headers, timeout=8)
            if resp.status_code == 200:
                html = resp.text
                og_title = re.search(r'<meta\s+property="og:title"\s+content="([^"]*)"', html, re.I)
                og_desc = re.search(r'<meta\s+property="og:description"\s+content="([^"]*)"', html, re.I)

                if og_title and not result.get("page_name"):
                    result["page_name"] = og_title.group(1).split('|')[0].strip()
                if og_desc and not result.get("bio"):
                    result["bio"] = og_desc.group(1).strip()
                    # Check if email/phone exists inside og:description
                    if not result.get("email"):
                        em = EMAIL_REGEX.search(result["bio"])
                        if em: result["email"] = em.group(0)
                    if not result.get("phone"):
                        ph = PHONE_REGEX.search(result["bio"])
                        if ph: result["phone"] = ph.group(0)

                result["ok"] = True
                if not result.get("source_engine"):
                    result["source_engine"] = "opengraph_crawler"
        except Exception as e:
            result["error_og"] = str(e)

    # Filter candidate external websites
    valid_candidates = []
    for link in result.get("candidate_links", []):
        if link and not any(d in link.lower() for d in ['facebook.com', 'fbcdn.net', 'instagram.com']):
            valid_candidates.append(link)
    result["candidate_links"] = list(set(valid_candidates))

    return result

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "No URL provided"}))
        sys.exit(1)

    url_to_scrape = sys.argv[1]
    res = scrape_facebook_page(url_to_scrape)
    print(json.dumps(res, indent=2))
