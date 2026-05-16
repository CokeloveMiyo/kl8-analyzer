import json
from flask import Flask, render_template, request, jsonify
from scraper import fetch_draws
from analyzer import full_analysis
from ai_predictor import ai_predict

app = Flask(__name__)

CACHE = {}


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/fetch", methods=["POST"])
def api_fetch():
    data = request.get_json() or {}
    issue_count = min(int(data.get("issue_count", 30)), 500)

    cache_key = f"draws_{issue_count}"
    if cache_key in CACHE:
        draws = CACHE[cache_key]
    else:
        draws = fetch_draws(issue_count)
        CACHE[cache_key] = draws

    analysis = full_analysis(draws)
    CACHE[f"analysis_{issue_count}"] = analysis

    return jsonify({"success": True, "total_fetched": len(draws), "analysis": analysis, "recent_draws": draws})


@app.route("/api/predict", methods=["POST"])
def api_predict():
    data = request.get_json() or {}
    issue_count = min(int(data.get("issue_count", 30)), 500)
    select_type = min(max(int(data.get("select_type", 5)), 1), 10)

    cache_key = f"analysis_{issue_count}"
    if cache_key in CACHE:
        analysis = CACHE[cache_key]
    else:
        draws = fetch_draws(issue_count)
        analysis = full_analysis(draws)
        CACHE[cache_key] = analysis

    prediction = ai_predict(analysis, select_type)

    return jsonify({
        "success": True,
        "select_type": select_type,
        "select_name": f"选{select_type}",
        "prediction": prediction,
    })


@app.route("/api/analysis/<int:issue_count>")
def api_analysis(issue_count):
    issue_count = min(issue_count, 500)
    cache_key = f"analysis_{issue_count}"
    if cache_key in CACHE:
        analysis = CACHE[cache_key]
    else:
        draws = fetch_draws(issue_count)
        analysis = full_analysis(draws)
        CACHE[cache_key] = analysis
    return jsonify({"success": True, "analysis": analysis})


if __name__ == "__main__":
    import socket
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    print()
    print("  ┌──────────────────────────────────────────┐")
    print("  │  K8 Analyzer │")
    print(f"  │  Local:   http://127.0.0.1:5000          │")
    print(f"  │  Network: http://{local_ip}:5000   │")
    print("  └──────────────────────────────────────────┘")
    print()
    app.run(debug=True, host="0.0.0.0", port=5000)



