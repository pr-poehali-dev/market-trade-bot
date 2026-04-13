import { useState, useEffect, useRef, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ─── Binance API ──────────────────────────────────────────────────────────────

const API_URL = "https://functions.poehali.dev/49fc3840-8388-42c6-8b18-4f3bb842fa44";

interface TickerData {
  symbol: string;
  price: number;
  change: number;
  high: number;
  low: number;
  volume: number;
  quoteVolume: number;
}

interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function useTickers(refreshMs = 5000) {
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  const fetchTickers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}?type=ticker`);
      const json = await res.json();
      if (json.ok) {
        setTickers(json.data);
        setConnected(true);
        setLoading(false);
      }
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    const t = setInterval(fetchTickers, refreshMs);
    return () => clearInterval(t);
  }, [fetchTickers, refreshMs]);

  return { tickers, loading, connected };
}

function useKlines(symbol: string, interval: string, limit = 60) {
  const [candles, setCandles] = useState<KlineData[]>([]);
  const [loading, setLoading] = useState(true);
  const prevRef = useRef({ symbol, interval });

  useEffect(() => {
    setLoading(true);
    const sym = symbol.replace("/", "");
    fetch(`${API_URL}?type=klines&symbol=${sym}&interval=${interval}&limit=${limit}`)
      .then(r => r.json())
      .then(json => {
        if (json.ok) setCandles(json.data);
      })
      .finally(() => setLoading(false));
    prevRef.current = { symbol, interval };
  }, [symbol, interval, limit]);

  return { candles, loading };
}

function useDepth(symbol: string) {
  const [bids, setBids] = useState<[number, number][]>([]);
  const [asks, setAsks] = useState<[number, number][]>([]);

  useEffect(() => {
    const sym = symbol.replace("/", "");
    const fetch_ = () =>
      fetch(`${API_URL}?type=depth&symbol=${sym}`)
        .then(r => r.json())
        .then(json => {
          if (json.ok) { setBids(json.bids); setAsks(json.asks); }
        });
    fetch_();
    const t = setInterval(fetch_, 3000);
    return () => clearInterval(t);
  }, [symbol]);

  return { bids, asks };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type NavSection = "dashboard" | "charts" | "portfolio" | "history" | "analytics" | "logs" | "alerts" | "settings";

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: string;
}

interface Asset {
  symbol: string;
  name: string;
  price: number;
  change: number;
  pnl: number;
  pnlPct: number;
  allocation: number;
  status: "long" | "short" | "idle";
  color: string;
}

interface Signal {
  id: number;
  symbol: string;
  type: "BUY" | "SELL";
  indicator: string;
  strength: number;
  price: number;
  time: string;
  executed: boolean;
}

interface Trade {
  id: number;
  symbol: string;
  side: "BUY" | "SELL";
  qty: number;
  price: number;
  pnl: number;
  time: string;
  strategy: string;
}

interface LogEntry {
  id: number;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  message: string;
  time: string;
  module: string;
}

interface Alert {
  id: number;
  type: "signal" | "risk" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

function genCandles(count = 60, basePrice = 43200): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    const open = price;
    const change = (Math.random() - 0.49) * price * 0.012;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * price * 0.005;
    const low = Math.min(open, close) - Math.random() * price * 0.005;
    const volume = Math.floor(Math.random() * 500 + 100);
    const h = 9 + Math.floor(i / 4);
    const m = (i % 4) * 15;
    candles.push({ open, high, low, close, volume, time: `${h}:${m.toString().padStart(2, "0")}` });
    price = close;
  }
  return candles;
}

const BASE_ASSETS: Asset[] = [
  { symbol: "BTC/USDT", name: "Bitcoin", price: 0, change: 0, pnl: 1842.5, pnlPct: 4.27, allocation: 35, status: "long", color: "#00e676" },
  { symbol: "ETH/USDT", name: "Ethereum", price: 0, change: 0, pnl: -234.8, pnlPct: -1.12, allocation: 22, status: "short", color: "#448aff" },
  { symbol: "SOL/USDT", name: "Solana", price: 0, change: 0, pnl: 456.2, pnlPct: 5.87, allocation: 18, status: "long", color: "#e040fb" },
  { symbol: "BNB/USDT", name: "Binance Coin", price: 0, change: 0, pnl: 128.9, pnlPct: 0.34, allocation: 15, status: "idle", color: "#ffd740" },
  { symbol: "XRP/USDT", name: "Ripple", price: 0, change: 0, pnl: -45.3, pnlPct: -0.87, allocation: 10, status: "short", color: "#ff6e40" },
];

function mergeWithTickers(tickers: TickerData[]): Asset[] {
  return BASE_ASSETS.map(a => {
    const sym = a.symbol.replace("/", "");
    const t = tickers.find(t => t.symbol === sym);
    if (!t) return a;
    return { ...a, price: t.price, change: t.change };
  });
}

const ASSETS = BASE_ASSETS;

const SIGNALS: Signal[] = [
  { id: 1, symbol: "BTC/USDT", type: "BUY", indicator: "RSI + MACD", strength: 87, price: 43218.5, time: "14:32", executed: true },
  { id: 2, symbol: "SOL/USDT", type: "BUY", indicator: "Bollinger", strength: 74, price: 98.74, time: "14:28", executed: true },
  { id: 3, symbol: "ETH/USDT", type: "SELL", indicator: "EMA Cross", strength: 68, price: 2641.2, time: "14:15", executed: false },
  { id: 4, symbol: "BNB/USDT", type: "BUY", indicator: "VWAP", strength: 81, price: 312.45, time: "13:58", executed: false },
  { id: 5, symbol: "XRP/USDT", type: "SELL", indicator: "RSI OB", strength: 91, price: 0.6234, time: "13:44", executed: true },
];

const TRADES: Trade[] = [
  { id: 1, symbol: "BTC/USDT", side: "BUY", qty: 0.05, price: 42150.0, pnl: 534.3, time: "13:22", strategy: "RSI+MACD" },
  { id: 2, symbol: "ETH/USDT", side: "SELL", qty: 1.2, price: 2680.0, pnl: -46.1, time: "12:47", strategy: "EMA Cross" },
  { id: 3, symbol: "SOL/USDT", side: "BUY", qty: 15, price: 93.2, pnl: 82.1, time: "12:15", strategy: "Bollinger" },
  { id: 4, symbol: "BNB/USDT", side: "BUY", qty: 3, price: 308.9, pnl: 10.7, time: "11:54", strategy: "VWAP" },
  { id: 5, symbol: "XRP/USDT", side: "SELL", qty: 500, price: 0.641, pnl: 88.0, time: "11:30", strategy: "RSI OB" },
  { id: 6, symbol: "BTC/USDT", side: "SELL", qty: 0.03, price: 43500.0, pnl: 392.4, time: "10:58", strategy: "Trend" },
  { id: 7, symbol: "ETH/USDT", side: "BUY", qty: 0.8, price: 2590.0, pnl: 40.9, time: "10:33", strategy: "RSI+MACD" },
];

const LOGS: LogEntry[] = [
  { id: 1, level: "INFO", message: "Сигнал BUY получен для BTC/USDT (RSI=32, MACD cross)", time: "14:32:18", module: "SignalEngine" },
  { id: 2, level: "INFO", message: "Ордер #4821 исполнен: BUY BTC/USDT 0.05 @ 43218.5", time: "14:32:21", module: "OrderManager" },
  { id: 3, level: "WARN", message: "Риск-лимит достигает 78% — проверьте позиции", time: "14:28:05", module: "RiskManager" },
  { id: 4, level: "INFO", message: "Сигнал BUY для SOL/USDT (Bollinger Band squeeze)", time: "14:28:12", module: "SignalEngine" },
  { id: 5, level: "DEBUG", message: "RSI(14) BTC/USDT = 58.3, EMA(20) = 42980", time: "14:27:00", module: "Indicators" },
  { id: 6, level: "ERROR", message: "Превышен лимит ретраев для XRP/USDT — пропускаем", time: "14:15:33", module: "OrderManager" },
  { id: 7, level: "INFO", message: "Бот успешно запущен. Мониторинг 5 активов", time: "09:00:00", module: "Core" },
];

const ALERTS_DATA: Alert[] = [
  { id: 1, type: "signal", title: "Сильный сигнал покупки", message: "BTC/USDT: RSI(14)=32 + MACD crossover. Сила 87%", time: "14:32", read: false },
  { id: 2, type: "risk", title: "Предупреждение риска", message: "Общий drawdown достиг 2.8%. Порог: 3%", time: "14:28", read: false },
  { id: 3, type: "signal", title: "Сигнал продажи", message: "XRP/USDT: RSI перекуплен (91). Сила 91%", time: "13:44", read: true },
  { id: 4, type: "system", title: "Бот активен", message: "Все системы работают нормально. 5 активов мониторятся", time: "09:00", read: true },
];

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ data, color, width = 80, height = 30 }: { data: number[]; color: string; width?: number; height?: number }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;
  const uid = color.replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#sg${uid})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Candle Chart ─────────────────────────────────────────────────────────────

type AnyCandle = { open: number; high: number; low: number; close: number; volume: number; time?: string | number };

function formatCandleTime(c: AnyCandle): string {
  if (!c.time) return "";
  if (typeof c.time === "number") {
    const d = new Date(c.time);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
  }
  return c.time as string;
}

function CandleChart({ candles, width = 640, height = 280 }: { candles: AnyCandle[]; width?: number; height?: number }) {
  if (!candles.length) return (
    <div className="flex items-center justify-center h-[280px] text-muted-foreground text-xs font-mono">
      <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />Загрузка данных...</div>
    </div>
  );
  const padding = { top: 12, right: 12, bottom: 28, left: 62 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const prices = candles.flatMap(c => [c.high, c.low]);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const cw = Math.max(3, chartW / candles.length - 1);
  const toY = (p: number) => padding.top + chartH - ((p - minP) / range) * chartH;
  const toX = (i: number) => padding.left + i * (chartW / candles.length) + (chartW / candles.length) / 2;
  const gridPrices = Array.from({ length: 5 }, (_, i) => minP + (range / 4) * i);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      {gridPrices.map((p, i) => (
        <g key={i}>
          <line x1={padding.left} y1={toY(p)} x2={width - padding.right} y2={toY(p)} stroke="hsla(220,16%,25%,0.5)" strokeWidth="1" strokeDasharray="4,4" />
          <text x={padding.left - 6} y={toY(p) + 4} textAnchor="end" fontSize="10" fill="hsl(215,15%,45%)" fontFamily="IBM Plex Mono">
            {p >= 1000 ? (p / 1000).toFixed(1) + "k" : p.toFixed(2)}
          </text>
        </g>
      ))}
      {candles.map((c, i) => {
        const x = toX(i);
        const isBull = c.close >= c.open;
        const col = isBull ? "#00e676" : "#ff5252";
        const bodyTop = Math.min(toY(c.open), toY(c.close));
        const bodyH = Math.max(1, Math.abs(toY(c.close) - toY(c.open)));
        return (
          <g key={i}>
            <line x1={x} y1={toY(c.high)} x2={x} y2={toY(c.low)} stroke={col} strokeWidth="1" />
            <rect x={x - cw / 2} y={bodyTop} width={cw} height={bodyH} fill={col} opacity="0.88" rx="0.5" />
          </g>
        );
      })}
      {candles.filter((_, i) => i % 10 === 0).map((c, idx) => (
        <text key={idx} x={toX(idx * 10)} y={height - 6} textAnchor="middle" fontSize="9" fill="hsl(215,15%,40%)" fontFamily="IBM Plex Mono">
          {formatCandleTime(c)}
        </text>
      ))}
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────

function DonutChart({ assets }: { assets: Asset[] }) {
  const cx = 80, cy = 80, r = 58, sw = 16;
  const circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width="160" height="160">
      {assets.map((a, i) => {
        const dash = (a.allocation / 100) * circ;
        const seg = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={a.color} strokeWidth={sw}
            strokeDasharray={`${dash - 2} ${circ - dash + 2}`}
            strokeDashoffset={-off + circ / 4} opacity="0.85" />
        );
        off += dash;
        return seg;
      })}
      <circle cx={cx} cy={cy} r={r - sw / 2} fill="hsl(220,16%,7%)" />
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="18" fill="white" fontWeight="700" fontFamily="IBM Plex Mono">5</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fontSize="10" fill="hsl(215,15%,50%)" fontFamily="IBM Plex Sans">активов</text>
    </svg>
  );
}

// ─── Ticker Bar ───────────────────────────────────────────────────────────────

function TickerBar({ assets }: { assets: Asset[] }) {
  const items = [...assets, ...assets, ...assets];
  return (
    <div className="overflow-hidden border-b border-border bg-card/40 h-8 flex-shrink-0">
      <div className="flex items-center h-full animate-ticker whitespace-nowrap">
        {items.map((a, i) => (
          <span key={i} className="inline-flex items-center gap-2 px-5 text-xs font-mono border-r border-border/30 h-full">
            <span className="text-foreground/50">{a.symbol}</span>
            <span className="text-foreground font-medium">${a.price >= 1 ? a.price.toLocaleString() : a.price.toFixed(4)}</span>
            <span style={{ color: a.change >= 0 ? "#00e676" : "#ff5252" }}>
              {a.change >= 0 ? "▲" : "▼"} {Math.abs(a.change)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon, delay = 0 }: {
  label: string; value: string; sub?: string; color: string; icon: string; delay?: number
}) {
  return (
    <div className="card-glass rounded-xl p-4 flex flex-col gap-2 animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color + "20" }}>
          <Icon name={icon as unknown as Parameters<typeof Icon>[0]["name"]} size={13} style={{ color }} />
        </div>
      </div>
      <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ assets, signals }: { assets: Asset[]; signals: Signal[] }) {
  const totalPnl = assets.reduce((s, a) => s + a.pnl, 0);
  const winSignals = signals.filter(s => s.executed).length;
  const { candles, loading: candlesLoading } = useKlines("BTCUSDT", "15m", 60);
  const btc = assets.find(a => a.symbol === "BTC/USDT");
  const btcPrice = btc?.price || 0;
  const btcChange = btc?.change || 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Баланс" value="$48,234" sub="+$2,147 сегодня" color="#00e676" icon="Wallet" delay={0} />
        <StatCard label="PnL сегодня" value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(0)}`} sub="4 актива в плюс" color={totalPnl >= 0 ? "#00e676" : "#ff5252"} icon="TrendingUp" delay={60} />
        <StatCard label="Открытых сделок" value="3" sub="2 лонг · 1 шорт" color="#448aff" icon="Layers" delay={120} />
        <StatCard label="Сигналов" value={`${winSignals}/${signals.length}`} sub="Исполнено" color="#ffd740" icon="Zap" delay={180} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 card-glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00e676] animate-pulse-neon" />
              <span className="text-sm font-semibold">BTC/USDT</span>
              <span className="text-xs text-muted-foreground font-mono">15m · Binance</span>
              {candlesLoading && <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin text-muted-foreground" />}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold font-mono" style={{ color: "#00e676" }}>
                {btcPrice > 0 ? `$${btcPrice.toLocaleString("en", { maximumFractionDigits: 2 })}` : "—"}
              </span>
              {btcPrice > 0 && (
                <span className="text-xs px-2 py-0.5 rounded font-mono" style={{ color: btcChange >= 0 ? "#00e676" : "#ff5252", background: btcChange >= 0 ? "#00e67618" : "#ff525218" }}>
                  {btcChange >= 0 ? "+" : ""}{btcChange.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
          <CandleChart candles={candles} />
        </div>

        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="Zap" size={13} style={{ color: "#ffd740" }} />
            <span className="text-sm font-semibold">Сигналы</span>
            <span className="ml-auto text-xs font-mono animate-pulse-neon" style={{ color: "#00e676" }}>● LIVE</span>
          </div>
          <div className="space-y-2">
            {signals.map((sig, i) => (
              <div key={sig.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40 animate-slide-right" style={{ animationDelay: `${i * 60}ms` }}>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0"
                  style={{ color: sig.type === "BUY" ? "#00e676" : "#ff5252", background: sig.type === "BUY" ? "#00e67618" : "#ff525218" }}>
                  {sig.type}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold truncate">{sig.symbol}</div>
                  <div className="text-[10px] text-muted-foreground">{sig.indicator}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold" style={{ color: sig.strength > 80 ? "#00e676" : sig.strength > 60 ? "#ffd740" : "#ff6e40" }}>{sig.strength}%</div>
                  {sig.executed && <Icon name="CheckCircle" size={10} style={{ color: "#00e676", marginLeft: "auto" }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="BarChart2" size={13} style={{ color: "#448aff" }} />
          <span className="text-sm font-semibold">Мониторинг активов</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-left">
                <th className="py-2 pr-4 font-medium">Актив</th>
                <th className="text-right pr-4 font-medium">Цена</th>
                <th className="text-right pr-4 font-medium">Изм. 24ч</th>
                <th className="text-right pr-4 font-medium">PnL</th>
                <th className="text-right pr-4 font-medium">График</th>
                <th className="text-right font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a, i) => {
                const sdata = Array.from({ length: 20 }, () => a.price * (1 + (Math.random() - 0.5) * 0.025));
                return (
                  <tr key={a.symbol} className="border-b border-border/30 hover:bg-secondary/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                        <span className="font-semibold">{a.symbol}</span>
                      </div>
                    </td>
                    <td className="text-right pr-4 font-mono font-semibold">${a.price >= 1 ? a.price.toLocaleString() : a.price.toFixed(4)}</td>
                    <td className="text-right pr-4 font-mono" style={{ color: a.change >= 0 ? "#00e676" : "#ff5252" }}>{a.change >= 0 ? "+" : ""}{a.change}%</td>
                    <td className="text-right pr-4 font-mono" style={{ color: a.pnl >= 0 ? "#00e676" : "#ff5252" }}>{a.pnl >= 0 ? "+" : ""}${a.pnl.toFixed(0)}</td>
                    <td className="text-right pr-4"><Sparkline data={sdata} color={a.color} /></td>
                    <td className="text-right">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono"
                        style={{ color: a.status === "long" ? "#00e676" : a.status === "short" ? "#ff5252" : "hsl(215,15%,50%)", background: a.status === "long" ? "#00e67618" : a.status === "short" ? "#ff525218" : "hsl(220,16%,16%)" }}>
                        {a.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function Charts({ assets }: { assets: Asset[] }) {
  const [activeAsset, setActiveAsset] = useState("BTC/USDT");
  const [timeframe, setTimeframe] = useState("15m");
  const [activeInds, setActiveInds] = useState<string[]>(["RSI", "MACD"]);
  const assetConfs = [
    { symbol: "BTC/USDT", color: "#00e676" },
    { symbol: "ETH/USDT", color: "#448aff" },
    { symbol: "SOL/USDT", color: "#e040fb" },
    { symbol: "BNB/USDT", color: "#ffd740" },
  ];
  const conf = assetConfs.find(a => a.symbol === activeAsset) || assetConfs[0];
  const binanceSym = activeAsset.replace("/", "");
  const { candles, loading: kloading } = useKlines(binanceSym, timeframe, 60);
  const tfs = ["1m", "5m", "15m", "1h", "4h", "1d"];
  const indicators = ["RSI", "MACD"];
  const toggleInd = (ind: string) => setActiveInds(p => p.includes(ind) ? p.filter(i => i !== ind) : [...p, ind]);
  const last = candles[candles.length - 1];

  // RSI вычисляем из реальных цен закрытия
  const rsiData = (() => {
    if (candles.length < 15) return Array.from({ length: 60 }, (_, i) => 30 + Math.sin(i / 5) * 20 + 30);
    const closes = candles.map(c => c.close);
    const period = 14;
    const rsis: number[] = [];
    for (let i = period; i < closes.length; i++) {
      let gains = 0, losses = 0;
      for (let j = i - period; j < i; j++) {
        const diff = closes[j + 1] - closes[j];
        if (diff > 0) gains += diff; else losses -= diff;
      }
      const rs = losses === 0 ? 100 : gains / losses;
      rsis.push(100 - 100 / (1 + rs));
    }
    return rsis;
  })();

  const macdData = (() => {
    if (candles.length < 30) return Array.from({ length: 60 }, (_, i) => (Math.random() - 0.5) * 200);
    const closes = candles.map(c => c.close);
    const ema = (data: number[], p: number) => {
      const k = 2 / (p + 1);
      return data.reduce((acc: number[], v, i) => {
        acc.push(i === 0 ? v : v * k + acc[i - 1] * (1 - k));
        return acc;
      }, []);
    };
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    return ema12.map((v, i) => v - ema26[i]);
  })();

  const activeTicker = assets.find(a => a.symbol === activeAsset);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
          {assetConfs.map(a => (
            <button key={a.symbol} onClick={() => setActiveAsset(a.symbol)}
              className="px-3 py-1.5 rounded-md text-xs font-mono transition-all"
              style={activeAsset === a.symbol ? { background: a.color, color: "#0a0e12", fontWeight: 700 } : { color: "hsl(215,15%,50%)" }}>
              {a.symbol.split("/")[0]}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-secondary/50 rounded-lg p-1">
          {tfs.map(tf => (
            <button key={tf} onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${timeframe === tf ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"}`}>
              {tf}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto flex-wrap">
          {indicators.map(ind => (
            <button key={ind} onClick={() => toggleInd(ind)}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-all ${activeInds.includes(ind) ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"}`}>
              {ind}
            </button>
          ))}
        </div>
      </div>

      <div className="card-glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full animate-pulse-neon" style={{ background: conf.color }} />
            <span className="text-sm font-semibold">{activeAsset}</span>
            <span className="text-xs text-muted-foreground">{timeframe} · Binance</span>
            {kloading && <div className="w-3 h-3 border border-muted-foreground border-t-transparent rounded-full animate-spin" />}
            {activeTicker && (
              <span className="text-xs font-mono ml-2" style={{ color: activeTicker.change >= 0 ? "#00e676" : "#ff5252" }}>
                {activeTicker.change >= 0 ? "+" : ""}{activeTicker.change.toFixed(2)}%
              </span>
            )}
          </div>
          {last && (
            <div className="flex gap-4 text-xs font-mono">
              <span className="text-muted-foreground">O <span className="text-foreground">{last.open.toFixed(2)}</span></span>
              <span className="text-muted-foreground">H <span style={{ color: "#00e676" }}>{last.high.toFixed(2)}</span></span>
              <span className="text-muted-foreground">L <span style={{ color: "#ff5252" }}>{last.low.toFixed(2)}</span></span>
              <span className="text-muted-foreground">C <span className="text-foreground">{last.close.toFixed(2)}</span></span>
            </div>
          )}
        </div>
        <CandleChart candles={candles} width={700} height={300} />
      </div>

      {activeInds.includes("RSI") && (
        <div className="card-glass rounded-xl p-4 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: "#e040fb" }}>RSI (14)</span>
            <span className="text-xs font-mono" style={{ color: "#e040fb" }}>{rsiData[rsiData.length - 1].toFixed(1)}</span>
          </div>
          <div className="relative h-14">
            <div className="absolute inset-x-0 top-[25%] border-t border-dashed" style={{ borderColor: "rgba(255,82,82,0.25)" }} />
            <div className="absolute inset-x-0 bottom-[25%] border-t border-dashed" style={{ borderColor: "rgba(0,230,118,0.25)" }} />
            <svg width="100%" height="100%" viewBox="0 0 700 56" preserveAspectRatio="none">
              <polyline points={rsiData.map((v, i) => `${(i / (rsiData.length - 1)) * 700},${56 - (v / 100) * 56}`).join(" ")}
                fill="none" stroke="#e040fb" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      )}

      {activeInds.includes("MACD") && (
        <div className="card-glass rounded-xl p-4 animate-fade-in">
          <span className="text-xs font-semibold" style={{ color: "#448aff" }}>MACD (12, 26, 9)</span>
          <div className="h-14 mt-2">
            <svg width="100%" height="100%" viewBox="0 0 700 56" preserveAspectRatio="none">
              {macdData.map((v, i) => {
                const x = (i / macdData.length) * 700;
                const bh = Math.abs(v) / 4;
                return <rect key={i} x={x} y={v >= 0 ? 28 - bh : 28} width={700 / macdData.length - 1} height={bh}
                  fill={v >= 0 ? "#00e676" : "#ff5252"} opacity="0.75" />;
              })}
              <line x1="0" y1="28" x2="700" y2="28" stroke="hsl(215,15%,30%)" strokeWidth="1" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Portfolio ────────────────────────────────────────────────────────────────

function Portfolio({ assets }: { assets: Asset[] }) {
  const totalValue = 48234;
  const totalPnl = assets.reduce((s, a) => s + a.pnl, 0);
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card-glass rounded-xl p-6 flex flex-col items-center gap-4">
          <DonutChart assets={assets} />
          <div className="text-center">
            <div className="text-2xl font-bold font-mono">${totalValue.toLocaleString()}</div>
            <div className="text-sm font-mono mt-1" style={{ color: totalPnl >= 0 ? "#00e676" : "#ff5252" }}>
              {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(0)} PnL
            </div>
          </div>
          <div className="w-full space-y-2">
            {assets.map(a => (
              <div key={a.symbol} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: a.color }} />
                <span className="text-muted-foreground flex-1">{a.symbol}</span>
                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${a.allocation}%`, background: a.color }} />
                </div>
                <span className="font-mono w-7 text-right text-muted-foreground">{a.allocation}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 card-glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Layers" size={13} style={{ color: "#448aff" }} />
            <span className="text-sm font-semibold">Открытые позиции</span>
          </div>
          <div className="space-y-3">
            {assets.filter(a => a.status !== "idle").map((a, i) => (
              <div key={a.symbol} className="border border-border rounded-xl p-4 hover:border-border/80 transition-colors animate-fade-in" style={{ animationDelay: `${i * 70}ms` }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: a.color }} />
                    <span className="font-semibold text-sm">{a.symbol}</span>
                    <span className="text-xs px-2 py-0.5 rounded font-mono"
                      style={{ color: a.status === "long" ? "#00e676" : "#ff5252", background: a.status === "long" ? "#00e67618" : "#ff525218" }}>
                      {a.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-bold font-mono" style={{ color: a.pnl >= 0 ? "#00e676" : "#ff5252" }}>
                    {a.pnl >= 0 ? "+" : ""}${a.pnl.toFixed(1)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div><span className="text-muted-foreground block mb-0.5">Цена</span><span className="font-mono">${a.price >= 1 ? a.price.toLocaleString() : a.price.toFixed(4)}</span></div>
                  <div><span className="text-muted-foreground block mb-0.5">Изм 24ч</span><span className="font-mono" style={{ color: a.change >= 0 ? "#00e676" : "#ff5252" }}>{a.change >= 0 ? "+" : ""}{a.change}%</span></div>
                  <div><span className="text-muted-foreground block mb-0.5">Доля</span><span className="font-mono">{a.allocation}%</span></div>
                </div>
                <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.abs(a.pnlPct) * 6 + 20}%`, background: a.pnl >= 0 ? "#00e676" : "#ff5252" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── History ──────────────────────────────────────────────────────────────────

function History({ trades }: { trades: Trade[] }) {
  const [filter, setFilter] = useState<"all" | "BUY" | "SELL">("all");
  const filtered = filter === "all" ? trades : trades.filter(t => t.side === filter);
  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter(t => t.pnl > 0).length;
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Всего сделок" value={`${trades.length}`} sub="За сегодня" color="#448aff" icon="List" />
        <StatCard label="Прибыльных" value={`${wins}/${trades.length}`} sub={`${((wins / trades.length) * 100).toFixed(0)}% винрейт`} color="#00e676" icon="TrendingUp" />
        <StatCard label="Итоговый PnL" value={`${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(0)}`} sub="Чистая прибыль" color={totalPnl >= 0 ? "#00e676" : "#ff5252"} icon="DollarSign" />
      </div>
      <div className="card-glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="History" size={13} style={{ color: "#ffd740" }} />
          <span className="text-sm font-semibold">История сделок</span>
          <div className="ml-auto flex gap-1 bg-secondary/50 rounded-lg p-1">
            {(["all", "BUY", "SELL"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1 rounded text-xs font-mono transition-all"
                style={filter === f ? { background: f === "BUY" ? "#00e67620" : f === "SELL" ? "#ff525220" : "hsl(var(--primary))", color: f === "BUY" ? "#00e676" : f === "SELL" ? "#ff5252" : "hsl(var(--primary-foreground))" } : { color: "hsl(215,15%,50%)" }}>
                {f === "all" ? "Все" : f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-b border-border text-left">
                {["#", "Актив", "Сторона", "Кол-во", "Цена", "PnL", "Стратегия", "Время"].map((h, i) => (
                  <th key={h} className={`py-2 pr-4 font-medium ${i >= 3 ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => (
                <tr key={t.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
                  <td className="py-2.5 pr-4 text-muted-foreground font-mono">{t.id}</td>
                  <td className="pr-4 font-semibold">{t.symbol}</td>
                  <td className="pr-4"><span className="px-1.5 py-0.5 rounded font-mono text-[11px]" style={{ color: t.side === "BUY" ? "#00e676" : "#ff5252", background: t.side === "BUY" ? "#00e67618" : "#ff525218" }}>{t.side}</span></td>
                  <td className="text-right pr-4 font-mono">{t.qty}</td>
                  <td className="text-right pr-4 font-mono">${t.price.toLocaleString()}</td>
                  <td className="text-right pr-4 font-mono font-semibold" style={{ color: t.pnl >= 0 ? "#00e676" : "#ff5252" }}>{t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(1)}</td>
                  <td className="pr-4 text-muted-foreground">{t.strategy}</td>
                  <td className="text-right font-mono text-muted-foreground">{t.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function Analytics({ trades }: { trades: Trade[] }) {
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const pnlByDay = days.map(d => ({ day: d, pnl: (Math.random() - 0.35) * 800 }));
  const maxAbsPnl = Math.max(...pnlByDay.map(d => Math.abs(d.pnl)));
  const strategies = ["RSI+MACD", "EMA Cross", "Bollinger", "VWAP", "Trend"];
  const stratData = strategies.map(s => ({ name: s, trades: Math.floor(Math.random() * 20 + 5), pnl: (Math.random() - 0.3) * 600 }));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Профит-фактор" value="2.14" sub="Хорошо" color="#00e676" icon="Activity" />
        <StatCard label="Макс. просадка" value="-3.2%" sub="Приемлемо" color="#ffd740" icon="TrendingDown" />
        <StatCard label="Sharpe Ratio" value="1.87" sub="Выше нормы" color="#448aff" icon="BarChart2" />
        <StatCard label="Винрейт" value="71.4%" sub="14/7 сделок" color="#00e676" icon="Target" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="BarChart2" size={13} style={{ color: "#448aff" }} />
            <span className="text-sm font-semibold">PnL по дням недели</span>
          </div>
          <div className="flex items-end gap-2 h-36">
            {pnlByDay.map((d, i) => {
              const barH = (Math.abs(d.pnl) / maxAbsPnl) * 90;
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1 animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="text-[10px] font-mono" style={{ color: d.pnl >= 0 ? "#00e676" : "#ff5252" }}>{d.pnl >= 0 ? "+" : ""}{Math.round(d.pnl)}</div>
                  <div className="w-full flex items-end" style={{ height: "80px" }}>
                    <div className="w-full rounded-t" style={{ height: `${barH}%`, background: d.pnl >= 0 ? "#00e676" : "#ff5252", opacity: 0.8 }} />
                  </div>
                  <div className="text-[10px] text-muted-foreground">{d.day}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="card-glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Target" size={13} style={{ color: "#e040fb" }} />
            <span className="text-sm font-semibold">Эффективность стратегий</span>
          </div>
          <div className="space-y-3">
            {stratData.map((s, i) => (
              <div key={s.name} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-foreground/80">{s.name}</span>
                  <div className="flex gap-3">
                    <span className="text-muted-foreground">{s.trades} сд.</span>
                    <span className="font-mono font-semibold" style={{ color: s.pnl >= 0 ? "#00e676" : "#ff5252" }}>{s.pnl >= 0 ? "+" : ""}${s.pnl.toFixed(0)}</span>
                  </div>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(s.trades / 25) * 100}%`, background: s.pnl >= 0 ? "#00e676" : "#ff5252" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Logs ─────────────────────────────────────────────────────────────────────

function Logs({ logs }: { logs: LogEntry[] }) {
  const levelColor: Record<string, string> = { INFO: "#448aff", WARN: "#ffd740", ERROR: "#ff5252", DEBUG: "hsl(215,15%,45%)" };
  const levelBg: Record<string, string> = { INFO: "rgba(68,138,255,0.12)", WARN: "rgba(255,215,64,0.12)", ERROR: "rgba(255,82,82,0.12)", DEBUG: "rgba(100,100,120,0.12)" };
  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00e676] animate-blink" />
          <span className="text-sm font-semibold">Системные логи</span>
          <span className="text-xs text-muted-foreground font-mono">— реальное время</span>
        </div>
        <div className="flex gap-3 text-xs">
          {Object.entries(levelColor).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ background: c }} />
              <span className="text-muted-foreground">{k}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="card-glass rounded-xl p-2 font-mono text-xs space-y-0.5">
        {[...logs].reverse().map((log, i) => (
          <div key={log.id} className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-secondary/30 transition-colors animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
            <span className="text-muted-foreground flex-shrink-0 w-16">{log.time}</span>
            <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold w-14 text-center" style={{ color: levelColor[log.level], background: levelBg[log.level] }}>{log.level}</span>
            <span className="text-muted-foreground flex-shrink-0 w-28 text-[10px]">[{log.module}]</span>
            <span className="text-foreground/75 flex-1">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

function Alerts({ alerts }: { alerts: Alert[] }) {
  const [items, setItems] = useState(alerts);
  const typeIcon: Record<string, string> = { signal: "Zap", risk: "AlertTriangle", system: "Info" };
  const typeColor: Record<string, string> = { signal: "#ffd740", risk: "#ff5252", system: "#448aff" };
  const unread = items.filter(a => !a.read).length;
  const markRead = (id: number) => setItems(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <Icon name="Bell" size={15} style={{ color: "#ffd740" }} />
        <span className="text-sm font-semibold">Оповещения</span>
        {unread > 0 && <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold" style={{ background: "rgba(255,82,82,0.2)", color: "#ff5252" }}>{unread} новых</span>}
      </div>
      <div className="space-y-2">
        {items.map((alert, i) => (
          <div key={alert.id} onClick={() => markRead(alert.id)}
            className="card-glass rounded-xl p-4 cursor-pointer hover:bg-secondary/30 transition-all animate-fade-in"
            style={{ borderLeft: !alert.read ? `2px solid ${typeColor[alert.type]}` : undefined, animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: typeColor[alert.type] + "20" }}>
                <Icon name={typeIcon[alert.type] as unknown as Parameters<typeof Icon>[0]["name"]} size={13} style={{ color: typeColor[alert.type] }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-semibold ${!alert.read ? "text-foreground" : "text-muted-foreground"}`}>{alert.title}</span>
                  <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{alert.time}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
              </div>
              {!alert.read && <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: typeColor[alert.type] }} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function Settings() {
  const [botActive, setBotActive] = useState(true);
  const [riskPct, setRiskPct] = useState(2);
  const [maxPos, setMaxPos] = useState(5);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Settings" size={13} style={{ color: "#448aff" }} />
            <span className="text-sm font-semibold">Управление ботом</span>
          </div>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Состояние бота</div>
                <div className="text-xs text-muted-foreground">Торговля {botActive ? "активна" : "остановлена"}</div>
              </div>
              <button onClick={() => setBotActive(v => !v)}
                className="relative w-12 h-6 rounded-full transition-all cursor-pointer"
                style={{ background: botActive ? "#00e67680" : "hsl(var(--secondary))" }}>
                <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm" style={{ left: botActive ? "28px" : "4px" }} />
              </button>
            </div>
            <div className="h-px bg-border" />
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Риск на сделку</span>
                <span className="font-mono" style={{ color: "#ffd740" }}>{riskPct}%</span>
              </div>
              <input type="range" min="0.5" max="5" step="0.5" value={riskPct} onChange={e => setRiskPct(+e.target.value)}
                className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer" style={{ accentColor: "#ffd740" }} />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Макс. позиций</span>
                <span className="font-mono" style={{ color: "#448aff" }}>{maxPos}</span>
              </div>
              <input type="range" min="1" max="10" step="1" value={maxPos} onChange={e => setMaxPos(+e.target.value)}
                className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer" style={{ accentColor: "#448aff" }} />
            </div>
          </div>
        </div>

        <div className="card-glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="Sliders" size={13} style={{ color: "#e040fb" }} />
            <span className="text-sm font-semibold">Параметры индикаторов</span>
          </div>
          <div className="space-y-3">
            {[
              { label: "RSI период", value: "14" },
              { label: "MACD быстрый", value: "12" },
              { label: "MACD медленный", value: "26" },
              { label: "MACD сигнал", value: "9" },
              { label: "EMA период", value: "20" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="flex-1 text-xs text-muted-foreground">{label}</span>
                <input defaultValue={value} className="w-16 text-right bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card-glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="Coins" size={13} style={{ color: "#ffd740" }} />
          <span className="text-sm font-semibold">Торгуемые активы</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT", "ADA/USDT", "DOGE/USDT", "DOT/USDT"].map(s => {
            const active = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "XRP/USDT"].includes(s);
            return (
              <button key={s} className="px-3 py-1.5 rounded-lg text-xs font-mono border transition-all"
                style={active ? { borderColor: "rgba(0,230,118,0.5)", background: "rgba(0,230,118,0.08)", color: "#00e676" } : { borderColor: "hsl(var(--border))", color: "hsl(215,15%,50%)" }}>
                {s}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Navigation config ────────────────────────────────────────────────────────

const NAV: { id: NavSection; label: string; icon: string }[] = [
  { id: "dashboard", label: "Дашборд", icon: "LayoutDashboard" },
  { id: "charts", label: "Графики", icon: "CandlestickChart" },
  { id: "portfolio", label: "Портфель", icon: "PieChart" },
  { id: "history", label: "История", icon: "History" },
  { id: "analytics", label: "Аналитика", icon: "BarChart2" },
  { id: "logs", label: "Логи", icon: "Terminal" },
  { id: "alerts", label: "Оповещения", icon: "Bell" },
  { id: "settings", label: "Настройки", icon: "Settings" },
];

const SECTION_TITLE: Record<NavSection, string> = {
  dashboard: "Дашборд",
  charts: "Графики",
  portfolio: "Портфель",
  history: "История сделок",
  analytics: "Аналитика",
  logs: "Системные логи",
  alerts: "Оповещения",
  settings: "Настройки",
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function Index() {
  const [section, setSection] = useState<NavSection>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [time, setTime] = useState(new Date());
  const { tickers, connected } = useTickers(5000);
  const liveAssets = tickers.length > 0 ? mergeWithTickers(tickers) : ASSETS;

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const unreadAlerts = ALERTS_DATA.filter(a => !a.read).length;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-border transition-all duration-300 flex-shrink-0 ${collapsed ? "w-14" : "w-52"}`}
        style={{ background: "hsl(220,16%,8%)" }}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3.5 h-12 border-b border-border flex-shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(0,230,118,0.12)", border: "1px solid rgba(0,230,118,0.3)" }}>
            <Icon name="Bot" size={13} style={{ color: "#00e676" }} />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-bold leading-tight">TradeBot</div>
              <div className="text-[10px] font-mono flex items-center gap-1" style={{ color: connected ? "#00e676" : "#ffd740" }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse-neon" style={{ background: connected ? "#00e676" : "#ffd740" }} />
                {connected ? "АКТИВЕН" : "ПОДКЛЮЧЕНИЕ…"}
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto">
          {NAV.map(item => {
            const isActive = section === item.id;
            return (
              <button key={item.id} onClick={() => setSection(item.id)}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all relative"
                style={isActive ? { background: "rgba(0,230,118,0.1)", color: "#00e676" } : { color: "hsl(215,15%,55%)" }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "hsl(220,16%,13%)" }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "" }}>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r" style={{ background: "#00e676" }} />}
                <Icon name={item.icon as unknown as Parameters<typeof Icon>[0]["name"]} size={14} />
                {!collapsed && <span className="text-xs font-medium">{item.label}</span>}
                {item.id === "alerts" && unreadAlerts > 0 && (
                  <span className={`${collapsed ? "absolute top-1 right-1" : "ml-auto"} w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold`}
                    style={{ background: "#ff5252" }}>{unreadAlerts}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse */}
        <div className="p-2 border-t border-border">
          <button onClick={() => setCollapsed(v => !v)}
            className="w-full flex items-center justify-center py-2 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "hsl(220,16%,13%)" }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "" }}>
            <Icon name={collapsed ? "ChevronRight" : "ChevronLeft"} size={13} />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TickerBar assets={liveAssets} />

        {/* Header */}
        <header className="flex items-center justify-between px-5 h-11 border-b border-border flex-shrink-0" style={{ background: "hsla(220,16%,9%,0.8)" }}>
          <span className="text-sm font-semibold">{SECTION_TITLE[section]}</span>
          <div className="flex items-center gap-5 text-xs font-mono">
            <span className="text-muted-foreground">{time.toLocaleTimeString("ru-RU")}</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full animate-pulse-neon" style={{ background: connected ? "#00e676" : "#ffd740" }} />
              <span style={{ color: connected ? "#00e676" : "#ffd740" }}>{connected ? "Binance онлайн" : "Подключение…"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon name="RefreshCw" size={10} />
              <span>обновл. 5с</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="max-w-6xl mx-auto">
            {section === "dashboard" && <Dashboard assets={liveAssets} signals={SIGNALS} />}
            {section === "charts" && <Charts assets={liveAssets} />}
            {section === "portfolio" && <Portfolio assets={liveAssets} />}
            {section === "history" && <History trades={TRADES} />}
            {section === "analytics" && <Analytics trades={TRADES} />}
            {section === "logs" && <Logs logs={LOGS} />}
            {section === "alerts" && <Alerts alerts={ALERTS_DATA} />}
            {section === "settings" && <Settings />}
          </div>
        </main>
      </div>
    </div>
  );
}