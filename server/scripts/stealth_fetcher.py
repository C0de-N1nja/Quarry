#!/usr/bin/env python3
"""
Quarry Stealth Web Fetcher
Powered by Scrapling (https://github.com/d4vinci/Scrapling)

Provides fast HTTP/3 TLS impersonation and fallback to stealth headless Chromium
for automated Cloudflare Turnstile / Interstitial bypass and dynamic SPA DOM hydration.
"""

import sys
import json
import logging
import argparse

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

def main():
    parser = argparse.ArgumentParser(description="Quarry Scrapling Stealth Fetcher")
    parser.add_argument("url", help="Target URL to fetch")
    parser.add_argument("--stealth", action="store_true", help="Force stealth headless browser mode directly")
    parser.add_argument("--timeout", type=int, default=8000, help="Timeout in milliseconds")
    args = parser.parse_args()

    result = fetch_url(args.url, force_browser=args.stealth, timeout_ms=args.timeout)
    print(json.dumps(result))

if __name__ == "__main__":
    main()
