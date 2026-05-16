import requests
import json
import time
import random
from typing import List, Dict, Optional

API_BASE = "https://www.cwl.gov.cn/cwl_admin/front/cwlkj/search/kjxx"
PAGE_URL = "https://www.cwl.gov.cn/ygkj/wqkjgg/kl8/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": PAGE_URL,
    "X-Requested-With": "XMLHttpRequest",
    "Connection": "keep-alive",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
}

_session = None


def _get_session() -> requests.Session:
    global _session
    if _session is not None:
        return _session

    _session = requests.Session()
    _session.headers.update(HEADERS)

    # First visit the page to get cookies (anti-bot check)
    try:
        _session.get(PAGE_URL, timeout=15)
        time.sleep(0.5)
    except Exception:
        pass

    return _session


def fetch_draws(issue_count: int = 30, page_size: int = 30) -> List[Dict]:
    session = _get_session()
    all_results = []
    total_pages = (issue_count + page_size - 1) // page_size

    for page_no in range(1, total_pages + 1):
        params = {
            "name": "kl8",
            "issueCount": issue_count,
            "pageNo": page_no,
            "pageSize": page_size,
            "systemType": "PC",
        }

        for attempt in range(3):
            try:
                resp = session.get(
                    API_BASE + "/findDrawNotice",
                    params=params,
                    timeout=20
                )
                if resp.status_code == 403:
                    # Re-create session on 403
                    _session = None
                    session = _get_session()
                    time.sleep(2 * (attempt + 1))
                    continue
                resp.raise_for_status()
                data = resp.json()
                if data.get("state") == 0:
                    results = data.get("result", [])
                    for r in results:
                        red_nums = [int(x) for x in r.get("red", "").split(",") if x]
                        all_results.append({
                            "code": r.get("code"),
                            "date": r.get("date", ""),
                            "week": r.get("week", ""),
                            "red": red_nums,
                            "sales": r.get("sales", ""),
                            "poolmoney": r.get("poolmoney", ""),
                        })
                break
            except Exception as e:
                if attempt == 2:
                    print(f"[Scraper] Error fetching page {page_no}: {e}")
                else:
                    time.sleep(1.5 * (attempt + 1))

        # Random delay between pages
        time.sleep(0.3 + random.random() * 0.5)

    all_results.sort(key=lambda x: x["code"], reverse=True)
    return all_results[:issue_count]


if __name__ == "__main__":
    draws = fetch_draws(5)
    print(json.dumps(draws, ensure_ascii=False, indent=2))
