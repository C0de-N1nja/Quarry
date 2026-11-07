import sys
import json
import trio
import httpx
import holehe.core

async def check(email):
    modules = holehe.core.import_submodules('holehe.modules')
    websites = holehe.core.get_functions(modules)
    out = []
    client = httpx.AsyncClient(timeout=3.5)
    async with trio.open_nursery() as nursery:
        for site in websites:
            nursery.start_soon(holehe.core.launch_module, site, email, client, out)
    await client.aclose()
    used = [item['name'] for item in out if item.get('exists') is True]
    return used

def main():
    if len(sys.argv) < 2:
        print(json.dumps([]))
        return
    email = sys.argv[1].strip()
    if not email or '@' not in email:
        print(json.dumps([]))
        return
    try:
        results = trio.run(check, email)
        print(json.dumps(results))
    except Exception:
        print(json.dumps([]))

if __name__ == '__main__':
    main()
