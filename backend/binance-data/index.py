"""
Прокси к Binance Public API: цены, свечи (klines), статистика 24h.
Не требует API-ключей — использует только публичные эндпоинты.
"""

import json
import urllib.request
import urllib.parse
import urllib.error

BINANCE_BASE = "https://api.binance.com/api/v3"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


def fetch_json(url: str) -> dict | list:
    req = urllib.request.Request(url, headers={"User-Agent": "TradeBot/1.0"})
    with urllib.request.urlopen(req, timeout=8) as resp:
        return json.loads(resp.read().decode())


def handler(event: dict, context) -> dict:
    """Получить рыночные данные с Binance: тип запроса передаётся через ?type="""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    params = event.get("queryStringParameters") or {}
    req_type = params.get("type", "ticker")
    symbol = params.get("symbol", "BTCUSDT").upper()
    interval = params.get("interval", "15m")
    limit = min(int(params.get("limit", "60")), 200)

    try:
        if req_type == "ticker":
            # Статистика 24h для всех нужных символов
            symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]
            results = []
            for sym in symbols:
                url = f"{BINANCE_BASE}/ticker/24hr?symbol={sym}"
                data = fetch_json(url)
                results.append({
                    "symbol": sym,
                    "price": float(data["lastPrice"]),
                    "change": float(data["priceChangePercent"]),
                    "high": float(data["highPrice"]),
                    "low": float(data["lowPrice"]),
                    "volume": float(data["volume"]),
                    "quoteVolume": float(data["quoteVolume"]),
                })
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"ok": True, "data": results}),
            }

        elif req_type == "klines":
            # Свечные данные
            url = f"{BINANCE_BASE}/klines?symbol={symbol}&interval={interval}&limit={limit}"
            raw = fetch_json(url)
            candles = [
                {
                    "time": c[0],
                    "open": float(c[1]),
                    "high": float(c[2]),
                    "low": float(c[3]),
                    "close": float(c[4]),
                    "volume": float(c[5]),
                }
                for c in raw
            ]
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"ok": True, "symbol": symbol, "interval": interval, "data": candles}),
            }

        elif req_type == "depth":
            # Стакан (топ-10)
            url = f"{BINANCE_BASE}/depth?symbol={symbol}&limit=10"
            data = fetch_json(url)
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "ok": True,
                    "bids": [[float(p), float(q)] for p, q in data["bids"]],
                    "asks": [[float(p), float(q)] for p, q in data["asks"]],
                }),
            }

        else:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"ok": False, "error": "Unknown type. Use: ticker, klines, depth"}),
            }

    except urllib.error.URLError as e:
        return {
            "statusCode": 502,
            "headers": CORS_HEADERS,
            "body": json.dumps({"ok": False, "error": f"Binance unreachable: {str(e)}"}),
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"ok": False, "error": str(e)}),
        }
