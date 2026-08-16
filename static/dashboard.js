document.addEventListener('DOMContentLoaded', () => {
  let allTrades = [];
  let currentCalDate = new Date(); // Active displayed month for P&L calendar

  // 1. DYNAMIC USER PROFILE & TIME-BASED GREETING
  function renderDynamicGreeting() {
    let fullName = 'Jagan';
    
    // Check saved user profile in localStorage / API
    const storedUser = localStorage.getItem('edgecraft_user') || localStorage.getItem('profile_data');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.fullName || u.full_name) fullName = u.fullName || u.full_name;
        else if (u.firstName && u.lastName) fullName = `${u.firstName} ${u.lastName}`;
        else if (u.name) fullName = u.name;
      } catch (e) {}
    }

    const hour = new Date().getHours();
    let timeGreeting = 'Good Morning';
    let icon = '☀️';

    if (hour >= 12 && hour < 17) {
      timeGreeting = 'Good Afternoon';
      icon = '👋';
    } else if (hour >= 17 && hour < 21) {
      timeGreeting = 'Good Evening';
      icon = '🌆';
    } else if (hour >= 21 || hour < 5) {
      timeGreeting = 'Good Night';
      icon = '🌙';
    }

    const greetingEl = document.getElementById('dynamicGreeting');
    if (greetingEl) {
      greetingEl.textContent = `${timeGreeting}, ${fullName}! ${icon}`;
    }

    const sidebarNameEl = document.getElementById('dashSidebarName');
    if (sidebarNameEl) sidebarNameEl.textContent = fullName.split(' ')[0].toUpperCase();
  }

  // 2. DATA INGESTION (TRADES & HABITS)
  async function fetchTrades() {
    try {
      const res = await fetch('/api/trades');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.trades)) return data.trades;
      }
    } catch (e) {
      console.warn('API fallback to storage:', e);
    }

    const keys = ['edgecraft_trades', 'trades', 'trade_logs'];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return [];
  }

  function parseNumber(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  }

  function parseTradeDate(dStr) {
    if (!dStr) return null;
    dStr = String(dStr).trim();
    if (/^\d{2}-\d{2}-\d{4}$/.test(dStr)) {
      const [d, m, y] = dStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
      const [y, m, d] = dStr.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // 3. DATE FILTER ENGINE
  function getFilteredTrades() {
    const fromInput = document.getElementById('dashDateFrom')?.value;
    const toInput = document.getElementById('dashDateTo')?.value;

    const fromDate = fromInput ? parseTradeDate(fromInput) : null;
    const toDate = toInput ? parseTradeDate(toInput) : null;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    return allTrades.filter(t => {
      const tDate = parseTradeDate(t.trade_date || t.date || t.entry_date);
      if (!tDate) return true;
      if (fromDate && tDate < fromDate) return false;
      if (toDate && tDate > toDate) return false;
      return true;
    });
  }

  // 4. TOP 5 KPI AGGREGATION & PRIOR 7-DAY COMPARISON
  function renderKPICards(currentTrades) {
    const totalTrades = currentTrades.length;
    let totalPnL = 0;
    let totalR = 0;
    let winningTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;

    currentTrades.forEach(t => {
      const pnl = parseNumber(t.pnl || t.net_pnl || 0);
      const r = parseNumber(t.r_multiple || t.rMultiple || 0);

      totalPnL += pnl;
      totalR += r;

      if (pnl > 0 || r > 0) {
        winningTrades++;
        grossProfit += pnl;
      } else if (pnl < 0 || r < 0) {
        grossLoss += Math.abs(pnl);
      }
    });

    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const winRateFrac = winRate / 100;
    const avgWinR = winningTrades > 0 ? currentTrades.filter(t => parseNumber(t.r_multiple) > 0).reduce((a, b) => a + parseNumber(b.r_multiple), 0) / winningTrades : 0;
    const losingTrades = totalTrades - winningTrades;
    const avgLossR = losingTrades > 0 ? currentTrades.filter(t => parseNumber(t.r_multiple) < 0).reduce((a, b) => a + parseNumber(b.r_multiple), 0) / losingTrades : 0;
    const expectancy = totalTrades > 0 ? (winRateFrac * avgWinR) + ((1 - winRateFrac) * avgLossR) : 0;
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? 'MAX' : '0.00');

    // UI Updates
    const pnlEl = document.getElementById('kpiDashPnL');
    pnlEl.textContent = `${totalPnL >= 0 ? '+' : '-'}$${Math.abs(totalPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    pnlEl.className = `kpi-num ${totalPnL >= 0 ? 'text-green' : 'text-red'}`;

    document.getElementById('kpiDashWinRate').textContent = `${winRate.toFixed(1)}%`;
    document.getElementById('kpiDashTrades').textContent = totalTrades;
    document.getElementById('kpiDashPF').textContent = profitFactor;

    const expEl = document.getElementById('kpiDashExpectancy');
    expEl.textContent = `${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}R`;
    expEl.className = `kpi-num ${expectancy >= 0 ? 'text-amber' : 'text-red'}`;

    // Comparison vs Prior 7 Days
    calculatePrior7DaysComparison(totalPnL, winRate, totalTrades);
  }

  function calculatePrior7DaysComparison(currPnL, currWR, currTradesCount) {
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const prevTrades = allTrades.filter(t => {
      const d = parseTradeDate(t.trade_date || t.date);
      return d && d >= fourteenDaysAgo && d < sevenDaysAgo;
    });

    if (prevTrades.length === 0) {
      document.getElementById('kpiDashPnLComp').textContent = 'No previous data';
      document.getElementById('kpiDashWinRateComp').textContent = 'No previous data';
      document.getElementById('kpiDashTradesComp').textContent = 'Selected period';
      return;
    }

    const prevPnL = prevTrades.reduce((acc, t) => acc + parseNumber(t.pnl || t.net_pnl), 0);
    const prevWins = prevTrades.filter(t => parseNumber(t.pnl || t.r_multiple) > 0).length;
    const prevWR = (prevWins / prevTrades.length) * 100;

    // PnL % change
    const pnlDiff = currPnL - prevPnL;
    const pnlPct = prevPnL !== 0 ? Math.abs((pnlDiff / Math.abs(prevPnL)) * 100).toFixed(1) : 0;
    document.getElementById('kpiDashPnLComp').innerHTML = `${pnlDiff >= 0 ? '↑' : '↓'} ${pnlPct}% vs prev 7 days`;
    document.getElementById('kpiDashPnLComp').className = `kpi-subtext ${pnlDiff >= 0 ? 'text-green' : 'text-red'}`;

    // WR pts change
    const wrDiff = (currWR - prevWR).toFixed(1);
    document.getElementById('kpiDashWinRateComp').innerHTML = `${wrDiff >= 0 ? '↑' : '↓'} ${Math.abs(wrDiff)} pts vs prev 7 days`;
    document.getElementById('kpiDashWinRateComp').className = `kpi-subtext ${wrDiff >= 0 ? 'text-green' : 'text-red'}`;
  }

  // 5. TRUE CUMULATIVE SMOOTH EQUITY CURVE WITH PROFESSIONAL FLOATING TOOLTIP
  function renderEquityCurve(trades) {
    const container = document.getElementById('equityChartContainer');
    if (!container) return;

    // Prepare custom floating tooltip
    let tooltip = container.querySelector('.chart-floating-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.className = 'chart-floating-tooltip';
      container.appendChild(tooltip);
    }
    tooltip.style.opacity = '0';

    if (trades.length === 0) {
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#64748b;font-size:12px;">No trade execution data for this period</div>`;
      return;
    }

    // 1. Chronological Sorting
    const sorted = [...trades].sort((a, b) => {
      const da = parseTradeDate(a.trade_date || a.date) || new Date(0);
      const db = parseTradeDate(b.trade_date || b.date) || new Date(0);
      return da - db;
    });

    const mode = document.getElementById('equityModeSelect')?.value || 'R';
    let runningCumulative = 0;
    
    // Baseline Point (T0 = 0)
    const firstDate = parseTradeDate(sorted[0].trade_date || sorted[0].date) || new Date();
    const points = [{
      tradeNum: 'Base',
      dateLabel: firstDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      cumVal: 0,
      tradeVal: 0
    }];

    // Compute Running Cumulative Balance
    sorted.forEach((t, i) => {
      const tradeVal = mode === 'USD' ? parseNumber(t.pnl || t.net_pnl) : parseNumber(t.r_multiple || t.rMultiple);
      runningCumulative += tradeVal;
      const d = parseTradeDate(t.trade_date || t.date) || new Date();
      points.push({
        tradeNum: `Trade #${i + 1}`,
        dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cumVal: runningCumulative,
        tradeVal: tradeVal
      });
    });

    const width = 560;
    const height = 240;
    const padL = 65;
    const padR = 30;
    const padT = 20;
    const padB = 35;

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const vals = points.map(p => p.cumVal);
    const rawMin = Math.min(...vals);
    const rawMax = Math.max(...vals);

    // 2. Fixed Step Ticks: $100 intervals for USD, 1.0R intervals for R-Multiple
    let ticks = [];
    if (mode === 'R') {
      const minStep = Math.min(0, Math.floor(rawMin));
      const maxStep = Math.max(1, Math.ceil(rawMax));
      for (let r = minStep; r <= maxStep; r += 1) {
        ticks.push(r);
      }
    } else {
      const minStep = Math.min(0, Math.floor(rawMin / 100) * 100);
      const maxStep = Math.max(100, Math.ceil(rawMax / 100) * 100);
      for (let usd = minStep; usd <= maxStep; usd += 100) {
        ticks.push(usd);
      }
    }

    const plotMin = ticks[0];
    const plotMax = ticks[ticks.length - 1];
    const range = (plotMax - plotMin) || 1;

    const getX = idx => padL + (idx / (points.length - 1)) * plotW;
    const getY = val => padT + plotH - ((val - plotMin) / range) * plotH;
    const zeroY = getY(0);

    const zeroPercent = Math.max(0, Math.min(100, ((zeroY - padT) / plotH) * 100));

    // Monotonic Cubic Smoothing
    let pathD = `M ${getX(0)} ${getY(points[0].cumVal)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const pCurrent = points[i];
      const pNext = points[i + 1];
      
      const x0 = getX(i);
      const y0 = getY(pCurrent.cumVal);
      const x1 = getX(i + 1);
      const y1 = getY(pNext.cumVal);

      const cx = (x0 + x1) / 2;
      pathD += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }

    const areaD = `${pathD} L ${getX(points.length - 1)} ${padT + plotH} L ${getX(0)} ${padT + plotH} Z`;
    const isLight = document.body.classList.contains('theme-light');

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:100%;display:block;overflow:visible;">
      <defs>
        <linearGradient id="splitStrokeGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10b981"/>
          <stop offset="${zeroPercent}%" stop-color="#10b981"/>
          <stop offset="${zeroPercent}%" stop-color="#ef4444"/>
          <stop offset="100%" stop-color="#ef4444"/>
        </linearGradient>

        <linearGradient id="splitAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
          <stop offset="${zeroPercent}%" stop-color="#10b981" stop-opacity="0.03"/>
          <stop offset="${zeroPercent}%" stop-color="#ef4444" stop-opacity="0.03"/>
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0.25"/>
        </linearGradient>
      </defs>
    `;

    // 3. Render Every Step Grid Line & Numerical Label
    ticks.forEach(tVal => {
      const yPos = getY(tVal);
      const isZero = tVal === 0;
      const isPos = tVal > 0;
      
      let labelText = '';
      let labelColor = isPos ? '#10b981' : (isZero ? (isLight ? '#0f172a' : '#ffffff') : '#ef4444');
      
      if (mode === 'USD') {
        labelText = isZero ? '$0' : (isPos ? `+$${tVal}` : `-$${Math.abs(tVal)}`);
      } else {
        labelText = isZero ? '0R' : (isPos ? `+${tVal.toFixed(1)}R` : `${tVal.toFixed(1)}R`);
      }

      svg += `
        <line x1="${padL}" y1="${yPos}" x2="${padL + plotW}" y2="${yPos}" 
              stroke="${isZero ? 'rgba(148,163,184,0.45)' : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)')}" 
              stroke-dasharray="${isZero ? '3,3' : '2,2'}" 
              stroke-width="${isZero ? '1.4' : '1'}"/>
        
        <text x="${padL - 8}" y="${yPos + 3.5}" fill="${labelColor}" font-size="9.5" font-weight="${isZero ? '800' : '700'}" text-anchor="end">
          ${labelText}
        </text>
      `;
    });

    // Shaded Area & Trendline Path
    svg += `
      <path d="${areaD}" fill="url(#splitAreaGrad)" />
      <path d="${pathD}" fill="none" stroke="url(#splitStrokeGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    `;

    // 4. Render Bottom Date Ticks & Interactive Nodes (Without ugly browser <title>)
    points.forEach((p, idx) => {
      const cx = getX(idx);
      const cy = getY(p.cumVal);
      const pointColor = p.cumVal >= 0 ? '#10b981' : '#ef4444';

      svg += `
        <text x="${cx}" y="${height - 8}" fill="#94a3b8" font-size="9.5" font-weight="600" text-anchor="middle">
          ${p.dateLabel}
        </text>
        <circle cx="${cx}" cy="${cy}" r="4.5" 
                fill="${pointColor}" 
                stroke="${isLight ? '#ffffff' : '#070d1e'}" 
                stroke-width="2"
                class="chart-node-circle"
                data-date="${p.dateLabel}"
                data-trade="${p.tradeNum}"
                data-cum="${p.cumVal >= 0 ? '+' : ''}${p.cumVal.toFixed(2)}${mode === 'USD' ? '$' : 'R'}"
                data-tradeval="${p.tradeVal >= 0 ? '+' : ''}${p.tradeVal.toFixed(2)}${mode === 'USD' ? '$' : 'R'}"
                data-ispos="${p.cumVal >= 0}">
        </circle>
      `;
    });

    svg += `</svg>`;
    container.innerHTML = svg;
    container.appendChild(tooltip);

    // 5. Attach Smooth Tooltip Hover Handlers
    const svgEl = container.querySelector('svg');
    container.querySelectorAll('.chart-node-circle').forEach(circle => {
      circle.addEventListener('mouseenter', (e) => {
        const d = circle.getAttribute('data-date');
        const trade = circle.getAttribute('data-trade');
        const cum = circle.getAttribute('data-cum');
        const tradeVal = circle.getAttribute('data-tradeval');
        const isPos = circle.getAttribute('data-ispos') === 'true';

        tooltip.innerHTML = `
          <div class="tooltip-date">${d} • ${trade}</div>
          <div class="tooltip-row">
            <span>Cumulative:</span>
            <strong class="tooltip-val ${isPos ? 'text-green' : 'text-red'}">${cum}</strong>
          </div>
          <div class="tooltip-row">
            <span>Trade Impact:</span>
            <strong class="tooltip-val">${tradeVal}</strong>
          </div>
        `;

        const rect = circle.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        tooltip.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - containerRect.top}px`;
        tooltip.style.opacity = '1';
      });

      circle.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });
    });
  }
  // 6. HABIT SCORE (REPLACING DISCIPLINE SCORE WITH 4 CORE HABITS)
  function renderHabitScore() {
    const rawHabits = localStorage.getItem('edgecraft_habits') || localStorage.getItem('habits_data');
    let habitData = {};
    if (rawHabits) {
      try { habitData = JSON.parse(rawHabits); } catch (e) {}
    }

    const CRITICAL_HABITS = [
      { name: 'Breathing 10 cycles', key: 'breathing', defaultPct: 95 },
      { name: 'Mark Levels D→4H→1H', key: 'mark_levels', defaultPct: 100 },
      { name: '1% risk per trade', key: 'risk_management', defaultPct: 100 },
      { name: 'Step away after T1 loss', key: 'step_away', defaultPct: 85 }
    ];

    let totalPct = 0;
    const barsContainer = document.getElementById('habitBreakdownBars');
    if (barsContainer) barsContainer.innerHTML = '';

    let weakest = { name: '', pct: 101 };

    CRITICAL_HABITS.forEach(h => {
      const pct = h.defaultPct;
      totalPct += pct;

      if (pct < weakest.pct) {
        weakest = { name: h.name, pct: pct };
      }

      if (barsContainer) {
        const row = document.createElement('div');
        row.className = 'habit-bar-row';
        row.innerHTML = `
          <span class="habit-bar-name">${h.name}</span>
          <div class="habit-bar-track">
            <div class="habit-bar-fill" style="width: ${pct}%;"></div>
          </div>
          <span class="habit-bar-pct">${pct}%</span>
        `;
        barsContainer.appendChild(row);
      }
    });

    const score = Math.round(totalPct / CRITICAL_HABITS.length);
    document.getElementById('habitScoreNum').textContent = score;
    
    const ringEl = document.getElementById('habitScoreRing');
    if (ringEl) {
      ringEl.style.background = `conic-gradient(#10b981 0% ${score}%, var(--bg-inner) ${score}% 100%)`;
    }

    let tier = 'Excellent';
    let msg = 'Excellent process consistency. Keep protecting the routine.';
    if (score >= 90 && score < 95) {
      tier = 'Strong';
      msg = 'Strong habit consistency. Tighten the few slipping areas.';
    } else if (score >= 80 && score < 90) {
      tier = 'Good';
      msg = 'Good foundation, but consistency has room to improve.';
    } else if (score < 80) {
      tier = 'Needs Attention';
      msg = 'Process consistency is weakening. Focus on core habits.';
    }

    document.getElementById('habitScoreTier').textContent = tier;
    document.getElementById('habitScoreMessage').textContent = msg;

    const weakEl = document.getElementById('weakestHabitText');
    if (weakEl) {
      weakEl.textContent = `${weakest.name} (${weakest.pct}%) — biggest process gap.`;
    }
  }

  // 7. PERFORMANCE BY SETUP (DONUT & ROWS)
  function renderSetupPerformance(trades) {
    const listEl = document.getElementById('setupRowsList');
    const donutEl = document.getElementById('setupDonutContainer');
    if (!listEl || !donutEl) return;

    listEl.innerHTML = '';

    const setupMap = {};
    const COLORS = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6'];

    trades.forEach(t => {
      const sName = t.setup || t.model || 'A+ Setup';
      const r = parseNumber(t.r_multiple || t.rMultiple);

      if (!setupMap[sName]) setupMap[sName] = { count: 0, netR: 0 };
      setupMap[sName].count += 1;
      setupMap[sName].netR += r;
    });

    const setups = Object.keys(setupMap).map((k, idx) => ({
      name: k,
      count: setupMap[k].count,
      netR: setupMap[k].netR,
      color: COLORS[idx % COLORS.length]
    }));

    if (setups.length === 0) {
      donutEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#64748b;">No Setups</div>`;
      return;
    }

    // Populate Rows
    setups.forEach(s => {
      const row = document.createElement('div');
      row.className = 'setup-data-row';
      row.innerHTML = `
        <div class="setup-tag-box">
          <span class="setup-dot" style="background: ${s.color};"></span>
          <span class="setup-name">${s.name}</span>
          <span class="setup-trades-count">${s.count} trades</span>
        </div>
        <span class="setup-r-val ${s.netR >= 0 ? 'text-green' : 'text-red'}">
          ${s.netR >= 0 ? '+' : ''}${s.netR.toFixed(2)}R
        </span>
      `;
      listEl.appendChild(row);
    });

    // Donut SVG
    const total = trades.length;
    let accumulated = 0;
    let gradParts = [];

    setups.forEach(s => {
      const pct = (s.count / total) * 100;
      gradParts.push(`${s.color} ${accumulated}% ${accumulated + pct}%`);
      accumulated += pct;
    });

    donutEl.innerHTML = `
      <div style="width:100%;height:100%;border-radius:50%;background:conic-gradient(${gradParts.join(', ')});display:flex;align-items:center;justify-content:center;position:relative;">
        <div style="width:75%;height:75%;border-radius:50%;background:var(--bg-card);display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <strong style="font-size:16px;color:var(--text-primary);">${total}</strong>
          <span style="font-size:9px;color:var(--text-dim);">Trades</span>
        </div>
      </div>
    `;
  }

  // 8. MONTHLY P&L CALENDAR
  function renderPnLCalendar() {
    const gridEl = document.getElementById('dashCalGrid');
    const titleEl = document.getElementById('calMonthTitle');
    if (!gridEl || !titleEl) return;

    gridEl.innerHTML = '';
    const y = currentCalDate.getFullYear();
    const m = currentCalDate.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    titleEl.textContent = `${monthNames[m]} ${y}`;

    const firstDayIndex = (new Date(y, m, 1).getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(y, m + 1, 0).getDate();

    // Map daily R sums
    const dailyRMap = {};
    allTrades.forEach(t => {
      const d = parseTradeDate(t.trade_date || t.date);
      if (d && d.getFullYear() === y && d.getMonth() === m) {
        const dayNum = d.getDate();
        dailyRMap[dayNum] = (dailyRMap[dayNum] || 0) + parseNumber(t.r_multiple || t.rMultiple);
      }
    });

    // Empty leading cells
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      emptyCell.className = 'dash-cal-cell empty';
      gridEl.appendChild(emptyCell);
    }

    // Days
    for (let day = 1; day <= totalDays; day++) {
      const cell = document.createElement('div');
      cell.className = 'dash-cal-cell';

      const hasTrades = dailyRMap[day] !== undefined;
      const rVal = dailyRMap[day] || 0;

      if (hasTrades) {
        cell.classList.add(rVal >= 0 ? 'pos' : 'neg');
      }

      cell.innerHTML = `
        <span class="dash-cal-num">${day}</span>
        ${hasTrades ? `<span class="dash-cal-r">${rVal >= 0 ? '+' : ''}${rVal.toFixed(2)}R</span>` : ''}
      `;
      gridEl.appendChild(cell);
    }
  }

  // 9. 5 RECENT TRADES
  function renderRecentTrades(trades) {
    const listEl = document.getElementById('recentTradesList');
    if (!listEl) return;

    listEl.innerHTML = '';
    if (trades.length === 0) {
      listEl.innerHTML = `<div style="color:#64748b;font-size:11.5px;padding:12px;text-align:center;">No trades in this period.</div>`;
      return;
    }

    // 5 Most Recent
    const recentFive = [...trades].slice(0, 5);

    recentFive.forEach(t => {
      const sym = t.instrument || t.pair || 'XAUUSD';
      const dir = (t.direction || 'Long').toLowerCase();
      const setup = t.setup || t.model || 'A+ Setup';
      const r = parseNumber(t.r_multiple || t.rMultiple);
      const dateStr = t.trade_date || t.date || 'Recent';

      const item = document.createElement('div');
      item.className = 'recent-trade-item';
      item.innerHTML = `
        <div class="recent-trade-left">
          <div class="recent-trade-top">
            <span class="recent-symbol">${sym}</span>
            <span class="dir-badge ${dir}">${dir.toUpperCase()}</span>
          </div>
          <span class="recent-date-sub">${dateStr}</span>
        </div>
        <div class="recent-trade-right">
          <span class="recent-setup-tag">${setup}</span>
          <span class="recent-trade-r ${r >= 0 ? 'text-green' : 'text-red'}">
            ${r >= 0 ? '+' : ''}${r.toFixed(2)}R
          </span>
        </div>
      `;
      listEl.appendChild(item);
    });
  }

  // 10. DYNAMIC STATISTICAL INSIGHTS ENGINE
  function renderDynamicInsights(trades) {
    const gridEl = document.getElementById('dashInsightsGrid');
    if (!gridEl) return;

    if (trades.length === 0) {
      gridEl.innerHTML = `<div style="color:#64748b;font-size:12px;">Log closed trades to generate dynamic insights.</div>`;
      return;
    }

    const cards = [];

    // 1. Setup Strength
    const setupRMap = {};
    trades.forEach(t => {
      const s = t.setup || 'General';
      setupRMap[s] = (setupRMap[s] || 0) + parseNumber(t.r_multiple);
    });
    const bestSetup = Object.keys(setupRMap).sort((a, b) => setupRMap[b] - setupRMap[a])[0];
    if (bestSetup) {
      cards.push(`
        <div class="dash-insight-box">
          <div class="dash-insight-head">
            <span class="text-green">✓</span>
            <span>TOP SETUP STRENGTH</span>
          </div>
          <p class="dash-insight-p">
            <strong>${bestSetup}</strong> is your strongest model with <strong>${setupRMap[bestSetup] >= 0 ? '+' : ''}${setupRMap[bestSetup].toFixed(2)}R</strong> return.
          </p>
        </div>
      `);
    }

    // 2. Risk Expectancy
    const totalR = trades.reduce((a, b) => a + parseNumber(b.r_multiple), 0);
    const avgR = (totalR / trades.length).toFixed(2);
    cards.push(`
      <div class="dash-insight-box">
        <div class="dash-insight-head">
          <span class="text-cyan">⚡</span>
          <span>SYSTEM EXPECTANCY</span>
        </div>
        <p class="dash-insight-p">
          System is delivering <strong>${avgR >= 0 ? '+' : ''}${avgR}R per trade</strong> across ${trades.length} executions.
        </p>
      </div>
    `);

    // 3. Process Discipline
    cards.push(`
      <div class="dash-insight-box">
        <div class="dash-insight-head">
          <span class="text-amber">🛡️</span>
          <span>PROCESS DISCIPLINE</span>
        </div>
        <p class="dash-insight-p">
          Maintaining pre-market routines directly protects your profit factor. Keep checklist execution above 90%.
        </p>
      </div>
    `);

    gridEl.innerHTML = cards.join('');
  }

  // 11. CENTRAL DASHBOARD REFRESH
  function refreshDashboard() {
    renderDynamicGreeting();
    const trades = getFilteredTrades();
    renderKPICards(trades);
    renderEquityCurve(trades);
    renderHabitScore();
    renderSetupPerformance(trades);
    renderPnLCalendar();
    renderRecentTrades(trades);
    renderDynamicInsights(trades);
  }

  // 12. EVENT LISTENERS
  document.getElementById('dashDateFrom')?.addEventListener('change', refreshDashboard);
  document.getElementById('dashDateTo')?.addEventListener('change', refreshDashboard);
  document.getElementById('equityModeSelect')?.addEventListener('change', () => renderEquityCurve(getFilteredTrades()));

  document.getElementById('btnDashThisMonth')?.addEventListener('click', () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastD = String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0');

    document.getElementById('dashDateFrom').value = `${y}-${m}-01`;
    document.getElementById('dashDateTo').value = `${y}-${m}-${lastD}`;
    refreshDashboard();
  });

  document.getElementById('btnDashReset')?.addEventListener('click', () => {
    document.getElementById('dashDateFrom').value = '';
    document.getElementById('dashDateTo').value = '';
    refreshDashboard();
  });

  document.getElementById('btnCalPrev')?.addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() - 1);
    renderPnLCalendar();
  });

  document.getElementById('btnCalNext')?.addEventListener('click', () => {
    currentCalDate.setMonth(currentCalDate.getMonth() + 1);
    renderPnLCalendar();
  });

 // DYNAMIC NOTIFICATION SYSTEM (ANCHORED DROPDOWN)
  function getNotifications() {
    const raw = localStorage.getItem('edgecraft_notifications');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  function saveNotifications(list) {
    localStorage.setItem('edgecraft_notifications', JSON.stringify(list));
    renderNotifications();
  }

  // Global helper to post security / password / email change alerts from anywhere
  window.postAppNotification = function(title, desc, icon = '🛡️') {
    const list = getNotifications();
    list.unshift({
      id: Date.now(),
      title: title,
      desc: desc,
      icon: icon,
      time: 'Just now'
    });
    saveNotifications(list);
  };

  function renderNotifications() {
    const list = getNotifications();
    const badgeEl = document.getElementById('notifBadgeCount');
    const bodyEl = document.getElementById('notifListBody');

    // Update Badge Count
    if (badgeEl) {
      if (list.length > 0) {
        badgeEl.textContent = list.length;
        badgeEl.style.display = 'flex';
      } else {
        badgeEl.style.display = 'none';
      }
    }

    // Render Dropdown List
    if (bodyEl) {
      if (list.length === 0) {
        bodyEl.innerHTML = `
          <div class="notif-empty">
            <span>🎉</span>
            <strong style="color: var(--text-primary); font-size: 12px; display: block;">No notifications</strong>
            <p style="font-size: 11px; margin-top: 2px;">Security alerts and account updates will appear here.</p>
          </div>
        `;
      } else {
        bodyEl.innerHTML = list.map(item => `
          <div class="notif-item">
            <div class="notif-icon-circle">${item.icon || '🔔'}</div>
            <div class="notif-content">
              <div class="notif-top-line">
                <strong>${item.title}</strong>
                <span class="notif-time">${item.time || ''}</span>
              </div>
              <p class="notif-desc">${item.desc || ''}</p>
            </div>
          </div>
        `).join('');
      }
    }
  }

  // Bind Open / Close & Clear Handlers
  const btnBell = document.getElementById('btnNotifications');
  const popover = document.getElementById('notifPopover');
  const btnClearAll = document.getElementById('btnNotifClearAll');

  if (btnBell && popover) {
    btnBell.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      popover.classList.toggle('active');
    });

    // Close when clicking anywhere outside
    document.addEventListener('click', (e) => {
      if (!popover.contains(e.target) && !btnBell.contains(e.target)) {
        popover.classList.remove('active');
      }
    });
  }

  if (btnClearAll) {
    btnClearAll.addEventListener('click', (e) => {
      e.stopPropagation();
      saveNotifications([]);
    });
  }

  // Initial Load
  renderNotifications();

  // INITIALIZE
  fetchTrades().then(trades => {
    allTrades = trades;
    refreshDashboard();
  });
});