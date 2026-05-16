import math
from collections import Counter
from typing import List, Dict, Tuple

TOTAL_NUMBERS = 80
DRAW_NUMBERS = 20


def basic_trend(draws: List[Dict]) -> Dict:
    if not draws:
        return {}
    numbers = list(range(1, TOTAL_NUMBERS + 1))
    total_periods = len(draws)
    
    appearance_matrix = {}
    for i, draw in enumerate(draws):
        for num in draw["red"]:
            if num not in appearance_matrix:
                appearance_matrix[num] = []
            appearance_matrix[num].append(i)

    frequency = {n: len(appearance_matrix.get(n, [])) for n in numbers}
    
    missing = {}
    for n in numbers:
        if n in appearance_matrix and appearance_matrix[n]:
            missing[n] = len(draws) - 1 - appearance_matrix[n][-1]
        else:
            missing[n] = total_periods

    avg_missing = {}
    for n in numbers:
        if n in appearance_matrix and appearance_matrix[n]:
            gaps = []
            prev = -1
            for pos in appearance_matrix[n]:
                gaps.append(pos - prev - 1)
                prev = pos
            avg_missing[n] = round(sum(gaps) / len(gaps), 2) if gaps else 0
        else:
            avg_missing[n] = total_periods

    max_missing = {}
    for n in numbers:
        if n in appearance_matrix and appearance_matrix[n]:
            gaps = []
            prev = -1
            for pos in appearance_matrix[n]:
                gaps.append(pos - prev - 1)
                prev = pos
            max_missing[n] = max(gaps) if gaps else 0
        else:
            max_missing[n] = total_periods

    return {
        "total_periods": total_periods,
        "frequency": frequency,
        "current_missing": missing,
        "avg_missing": avg_missing,
        "max_missing": max_missing,
    }


def size_trend(draws: List[Dict]) -> List[Dict]:
    result = []
    for draw in draws:
        big = sum(1 for n in draw["red"] if n >= 41)
        small = DRAW_NUMBERS - big
        result.append({
            "code": draw["code"],
            "big": big,
            "small": small,
        })
    return result


def odd_even_trend(draws: List[Dict]) -> List[Dict]:
    result = []
    for draw in draws:
        odd = sum(1 for n in draw["red"] if n % 2 == 1)
        even = DRAW_NUMBERS - odd
        result.append({
            "code": draw["code"],
            "odd": odd,
            "even": even,
        })
    return result


def is_prime(n: int) -> bool:
    if n < 2:
        return False
    for i in range(2, int(math.sqrt(n)) + 1):
        if n % i == 0:
            return False
    return True


def prime_composite_trend(draws: List[Dict]) -> List[Dict]:
    result = []
    for draw in draws:
        prime_count = sum(1 for n in draw["red"] if is_prime(n))
        composite_count = DRAW_NUMBERS - prime_count
        result.append({
            "code": draw["code"],
            "prime": prime_count,
            "composite": composite_count,
        })
    return result


def sum_trend(draws: List[Dict]) -> List[Dict]:
    result = []
    for draw in draws:
        total_sum = sum(draw["red"])
        result.append({
            "code": draw["code"],
            "sum": total_sum,
        })
    return result


def ac_value(numbers: List[int]) -> int:
    n = len(numbers)
    if n < 2:
        return 0
    diffs = set()
    for i in range(n):
        for j in range(i + 1, n):
            diff = abs(numbers[i] - numbers[j])
            if diff > 0:
                diffs.add(diff)
    return len(diffs) - (n - 1)


def ac_trend(draws: List[Dict]) -> List[Dict]:
    result = []
    for draw in draws:
        ac = ac_value(draw["red"])
        result.append({
            "code": draw["code"],
            "ac": ac,
        })
    return result


def mantissa_analysis(draws: List[Dict]) -> Dict:
    mantissa_counter = {i: 0 for i in range(10)}
    for draw in draws:
        for n in draw["red"]:
            mantissa_counter[n % 10] += 1
    total_draws = len(draws) if draws else 1
    return {
        "counts": mantissa_counter,
        "avg_per_draw": {k: round(v / total_draws, 2) for k, v in mantissa_counter.items()},
    }


def sum_tail_trend(draws: List[Dict]) -> List[Dict]:
    result = []
    for draw in draws:
        total_sum = sum(draw["red"])
        result.append({
            "code": draw["code"],
            "sum_tail": total_sum % 10,
        })
    return result


def zone_analysis(draws: List[Dict], zone_count: int) -> List[Dict]:
    zone_size = TOTAL_NUMBERS // zone_count
    result = []
    for draw in draws:
        zones = [0] * zone_count
        for n in draw["red"]:
            zone_idx = min((n - 1) // zone_size, zone_count - 1)
            zones[zone_idx] += 1
        row = {"code": draw["code"]}
        for i in range(zone_count):
            row[f"zone_{i+1}"] = zones[i]
        result.append(row)
    return result


def hot_cold_analysis(draws: List[Dict], top_n: int = 20) -> Dict:
    stats = basic_trend(draws)
    freq = stats["frequency"]
    missing = stats["current_missing"]

    sorted_by_freq = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    hot = [{"number": n, "appearances": c} for n, c in sorted_by_freq[:top_n]]
    cold = [{"number": n, "appearances": c} for n, c in sorted_by_freq[-top_n:]]

    sorted_by_missing = sorted(missing.items(), key=lambda x: x[1], reverse=True)
    most_missing = [{"number": n, "periods_missing": m} for n, m in sorted_by_missing[:top_n]]

    return {
        "hot": hot,
        "cold": cold,
        "most_missing": most_missing,
    }


def full_analysis(draws: List[Dict]) -> Dict:
    if not draws:
        return {"error": "No data available"}

    return {
        "total_periods": len(draws),
        "latest_draw": draws[0] if draws else None,
        "basic_trend": basic_trend(draws),
        "size_trend": size_trend(draws),
        "odd_even_trend": odd_even_trend(draws),
        "prime_composite_trend": prime_composite_trend(draws),
        "sum_trend": sum_trend(draws),
        "ac_trend": ac_trend(draws),
        "mantissa_analysis": mantissa_analysis(draws),
        "sum_tail_trend": sum_tail_trend(draws),
        "zone_4": zone_analysis(draws, 4),
        "zone_8": zone_analysis(draws, 8),
        "zone_5": zone_analysis(draws, 5),
        "zone_10": zone_analysis(draws, 10),
        "zone_16": zone_analysis(draws, 16),
        "zone_20": zone_analysis(draws, 20),
        "hot_cold_analysis": hot_cold_analysis(draws),
    }


if __name__ == "__main__":
    import json
    from scraper import fetch_draws
    draws = fetch_draws(10)
    analysis = full_analysis(draws)
    print(json.dumps(analysis, ensure_ascii=False, indent=2)[:2000])
