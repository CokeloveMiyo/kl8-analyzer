import os
import json
import re
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()


def get_openai_client():
    try:
        from openai import OpenAI
        api_key = os.getenv("OPENAI_API_KEY", "")
        api_base = os.getenv("OPENAI_API_BASE", "https://api.deepseek.com")
        if not api_key or "your-" in api_key:
            return None
        return OpenAI(api_key=api_key, base_url=api_base)
    except ImportError:
        return None
    except Exception:
        return None



def build_prompt(analysis: Dict, select_type: int) -> str:
    base = analysis.get("basic_trend", {})
    freq = base.get("frequency", {})
    current_missing = base.get("current_missing", {})

    latest_draw = analysis.get("latest_draw", {})
    latest_numbers = latest_draw.get("red", [])

    sum_data = analysis.get("sum_trend", [])
    sum_recent = [d["sum"] for d in sum_data[-10:]] if sum_data else []
    size_data = analysis.get("size_trend", [])
    size_recent = [(d["big"], d["small"]) for d in size_data[-10:]] if size_data else []
    oe_data = analysis.get("odd_even_trend", [])
    oe_recent = [(d["odd"], d["even"]) for d in oe_data[-10:]] if oe_data else []

    hot = [(n, c) for n, c in sorted(freq.items(), key=lambda x: x[1], reverse=True)[:10]]
    cold = [(n, c) for n, c in sorted(freq.items(), key=lambda x: x[1])[:10]]
    missing_top = [(n, current_missing.get(n, 0)) for n in sorted(current_missing, key=lambda x: current_missing[x], reverse=True)[:10]]

    prompt = f"""Data analysis task: You have {analysis.get("total_periods", 0)} rounds of historical number-drawing data. Each round draws 20 numbers from pool 1-80. Latest result: {sorted(latest_numbers)} (round {latest_draw.get("code", "N/A")}).

Recent 10 rounds sum values: {sum_recent}
Recent 10 rounds big/small counts (big>=41): {size_recent}
Recent 10 rounds odd/even counts: {oe_recent}

Top 10 most frequent (number, count): {hot}
Top 10 least frequent (number, count): {cold}
Top 10 longest missing (number, rounds): {missing_top}

Task: Based on the statistical data above, recommend {select_type} numbers from 1-80 (no duplicates) with the highest appearance probability for the next round. Consider frequency trends, missing patterns, sum ranges, and odd/even balance.

Output STRICTLY as JSON only, no markdown, no extra text:
{{"recommended_numbers": [num1,num2,...], "reasons": {{"num1":"reason in Chinese(<=20 chars)"}}, "summary": "one-line Chinese analysis(<=100 chars)"}}"""
    return prompt

def _parse_json_response(content: str) -> dict:
    """Robust JSON extraction from AI response."""
    import unicodedata
    import json as _json
    import re as _re

    if not content or not content.strip():
        raise ValueError("Empty response from AI")

    original = content
    content = content.strip()

    # Remove markdown code fences
    if content.startswith("```"):
        lines = content.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        content = "\n".join(lines).strip()

    # Clean invisible Unicode (zero-width, control chars except newline/tab)
    cleaned = []
    for ch in content:
        cat = unicodedata.category(ch)
        if cat == "Cf":
            continue
        if cat == "Cc" and ch not in ("\n", "\r", "\t"):
            continue
        cleaned.append(ch)
    content = "".join(cleaned)

    # Strategy 1: find JSON object containing recommended_numbers
    match = _re.search(r'\{\s*"recommended_numbers"', content)
    if match:
        start = match.start()
    else:
        # Strategy 2: find recommended_numbers array anywhere, wrap it
        match_arr = _re.search(r'"recommended_numbers"\s*:\s*(\[[^\]]*\])', content)
        if match_arr:
            # Try to find a summary too
            sum_match = _re.search(r'"summary"\s*:\s*"([^"]*)"', content)
            summary = sum_match.group(1) if sum_match else ""
            arr = _json.loads(match_arr.group(1))
            return {"recommended_numbers": arr, "reasons": {}, "summary": summary}
        # Strategy 3: find any { in the content
        start = content.rfind("{")

    if start == -1:
        # Last resort: check if the content itself starts with [ and is an array
        if content.strip().startswith("["):
            arr_match = _re.search(r'\[[^\]]*\]', content)
            if arr_match:
                return {"recommended_numbers": _json.loads(arr_match.group()), "reasons": {}, "summary": ""}
        raise ValueError("No JSON object found in response. Raw: " + original[:300])

    # Brace matching from start
    depth = 0
    end = -1
    for i in range(start, len(content)):
        if content[i] == "{":
            depth += 1
        elif content[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break

    if end == -1:
        raise ValueError("Unmatched braces in JSON. Raw: " + original[:300])

    json_str = content[start:end + 1]
    json_str = _re.sub(r',(\s*[}\]])', r'\1', json_str)

    return _json.loads(json_str)

def ai_predict(analysis: Dict, select_type: int) -> Optional[Dict]:
    client = get_openai_client()
    if not client:
        return {
            "error": "No API key configured",
            "recommended_numbers": _fallback_predict(analysis, select_type),
            "reasons": {},
            "summary": "未配置API Key，使用备用算法。请在.env中设置OPENAI_API_KEY",
        }

    model = os.getenv("OPENAI_MODEL", "deepseek-chat")
    temperature = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    max_tokens = int(os.getenv("OPENAI_MAX_TOKENS", "2048"))
    prompt = build_prompt(analysis, select_type)

    # Try primary model, fallback to deepseek-chat
    models_to_try = [model]
    if model != "deepseek-chat":
        models_to_try.append("deepseek-chat")

    last_error = None
    for try_model in models_to_try:
        try:
            response = client.chat.completions.create(
                model=try_model,
                messages=[
                    {"role": "system", "content": "You are a data analyst. Reply ONLY with JSON. No extra text."},
                    {"role": "user", "content": prompt},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=90,
            )
            finish = getattr(response.choices[0], 'finish_reason', 'unknown')
            content = response.choices[0].message.content or ""

            if content:
                result = _parse_json_response(content)
                if try_model != model:
                    result["_note"] = f"Primary model {model} returned empty, used {try_model} instead"
                return result
            else:
                last_error = f"{try_model} returned empty (finish={finish})"
        except Exception as e:
            last_error = f"{try_model}: {str(e)[:100]}"
            continue

    # All models failed
    return {
        "error": last_error or "All models failed",
        "recommended_numbers": _fallback_predict(analysis, select_type),
        "reasons": {},
        "summary": f"AI调用失败: {last_error}。建议在.env中将OPENAI_MODEL改为deepseek-chat",
    }

def _fallback_predict(analysis: Dict, select_type: int) -> List[int]:
    base = analysis.get("basic_trend", {})
    freq = base.get("frequency", {})
    current_missing = base.get("current_missing", {})
    avg_missing = base.get("avg_missing", {})

    scores = {}
    max_freq = max(freq.values()) if freq else 1
    max_miss = max(current_missing.values()) if current_missing else 1
    max_avg_miss = max(avg_missing.values()) if avg_missing else 1

    for n in range(1, 81):
        f_score = freq.get(n, 0) / max(max_freq, 1) * 40
        m_score = current_missing.get(n, 0) / max(max_miss, 1) * 35
        a_score = (1 - avg_missing.get(n, 999) / max(max_avg_miss + 1, 1)) * 25
        scores[n] = f_score + m_score + a_score

    sorted_nums = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [n for n, _ in sorted_nums[:select_type]]







