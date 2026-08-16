document.addEventListener('DOMContentLoaded', () => {
  const today = new Date();
  let currentYear = 2026;
  let currentMonth = 7; // August (0-indexed: 0 = Jan, 7 = Aug)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // 1. DATA INGESTION (FETCH DIRECT FROM YOUR FLASK API)
  async function fetchTrades() {
    try {
      const res = await fetch('/api/trades');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.error('API Fetch error:', e);
    }

    // LocalStorage fallback
    const raw = localStorage.getItem('edgecraft_trades') || localStorage.getItem('trades');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (err) {}
    }

    return [];
  }

  // 2. ACCURATE PROCESS SCORE CALCULATOR (5 DISCIPLINE QUESTIONS)
  function getProcessPercentage(trade) {
    if (!trade || typeof trade !== 'object') return 0;

    // Check your backend's 5 exact discipline keys
    const backendDisciplineKeys = [
      'follow_plan',
      'follow_checklist',
      'exit_early',
      'move_stop',
      'overtraded'
    ];

    let yesCount = 0;
    let foundDisciplineField = false;

    backendDisciplineKeys.forEach(key => {
      if (trade[key] !== undefined) {
        foundDisciplineField = true;
        if (trade[key] === true || trade[key] === 1 || trade[key] === 'true' || trade[key] === 'YES') {
          yesCount++;
        }
      }
    });

    if (foundDisciplineField) {
      return Math.round((yesCount / 5) * 100);
    }

    // Fallback for star/score properties if logged differently
    if (trade.rating !== undefined) return (parseFloat(trade.rating) / 5) * 100;
    if (trade.processScore !== undefined) return parseFloat(trade.processScore);
    if (trade.checklistScore !== undefined) return (parseFloat(trade.checklistScore) / 5) * 100;

    return 0;
  }

  // 3. DATE PARSER (HANDLES "Aug 04, 2026", "2026-08-04", and "04-08-2026")
  function parseToStandardDate(dStr) {
    if (!dStr) return null;
    dStr = String(dStr).trim();

    // Standard JavaScript Date parsing (handles "Aug 04, 2026")
    const parsedDate = new Date(dStr);
    if (!isNaN(parsedDate.getTime())) {
      return {
        year: parsedDate.getFullYear(),
        month: parsedDate.getMonth(), // 0-indexed
        day: parsedDate.getDate()
      };
    }

    // DD-MM-YYYY format
    if (/^\d{2}-\d{2}-\d{4}$/.test(dStr)) {
      const parts = dStr.split('-');
      return {
        year: parseInt(parts[2], 10),
        month: parseInt(parts[1], 10) - 1,
        day: parseInt(parts[0], 10)
      };
    }

    return null;
  }

  function parseNumber(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
    return isNaN(num) ? 0 : num;
  }

  // 4. MAIN CALENDAR AGGREGATION & RENDER ENGINE
  async function renderCalendar() {
    const monthLabel = document.getElementById('currentMonthLabel');
    if (monthLabel) monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const trades = await fetchTrades();

    const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;

    const curTrades = [];
    const prevTrades = [];
    const dayMap = {};

    trades.forEach(t => {
      const dObj = parseToStandardDate(t.trade_date || t.date || t.entry_date);
      if (!dObj) return;

      if (dObj.year === currentYear && dObj.month === currentMonth) {
        curTrades.push(t);
        const dayNum = dObj.day;

        if (!dayMap[dayNum]) {
          dayMap[dayNum] = { tradesCount: 0, totalPnL: 0, totalR: 0, totalProcess: 0 };
        }

        dayMap[dayNum].tradesCount += 1;
        dayMap[dayNum].totalPnL += parseNumber(t.pnl || t.net_pnl || t.profit);
        dayMap[dayNum].totalR += parseNumber(t.r_multiple || t.rMultiple || t.r);
        dayMap[dayNum].totalProcess += getProcessPercentage(t);
      } else if (dObj.year === prevY && dObj.month === prevM) {
        prevTrades.push(t);
      }
    });

    let totalTrades = curTrades.length;
    let totalPnL = 0;
    let totalR = 0;
    let totalProcessSum = 0;
    let daysTraded = Object.keys(dayMap).length;
    let winningTrades = 0;

    let bestProcessVal = -1, bestProcessDay = null, bestProcessR = 0;
    let worstProcessVal = 999, worstProcessDay = null;
    let bestOutcomeVal = -999999, bestOutcomeDay = null, bestOutcomeR = 0;

    const tierCounts = { 90: 0, 70: 0, 50: 0, 30: 0, 0: 0 };

    Object.entries(dayMap).forEach(([dayStr, data]) => {
      const d = parseInt(dayStr, 10);
      const avgProc = Math.round(data.totalProcess / data.tradesCount);
      const dayNetR = data.totalR;

      totalPnL += data.totalPnL;
      totalR += data.totalR;
      totalProcessSum += avgProc;

      // Tier count for Breakdown Donut
      if (avgProc >= 90) tierCounts[90] += data.tradesCount;
      else if (avgProc >= 70) tierCounts[70] += data.tradesCount;
      else if (avgProc >= 50) tierCounts[50] += data.tradesCount;
      else if (avgProc >= 30) tierCounts[30] += data.tradesCount;
      else tierCounts[0] += data.tradesCount;

      // Best Process Day (100%)
      if (avgProc > bestProcessVal) {
        bestProcessVal = avgProc;
        bestProcessDay = d;
        bestProcessR = dayNetR;
      }
      // Worst Process Day (80%)
      if (avgProc < worstProcessVal) {
        worstProcessVal = avgProc;
        worstProcessDay = d;
      }
      // Best Outcome Day (+$200)
      if (data.totalPnL > bestOutcomeVal) {
        bestOutcomeVal = data.totalPnL;
        bestOutcomeDay = d;
        bestOutcomeR = dayNetR;
      }
    });

    curTrades.forEach(t => {
      if (parseNumber(t.pnl) > 0) winningTrades++;
    });

    const avgProcessScore = daysTraded > 0 ? Math.round(totalProcessSum / daysTraded) : 0;
    const avgRMultiple = totalTrades > 0 ? (totalR / totalTrades) : 0;
    const winRate = totalTrades > 0 ? Math.round((winningTrades / totalTrades) * 100) : 0;

    // Previous month comparisons
    const prevTradesCount = prevTrades.length;
    const prevPnL = prevTrades.reduce((acc, t) => acc + parseNumber(t.pnl), 0);
    const prevR = prevTrades.length > 0 ? prevTrades.reduce((acc, t) => acc + parseNumber(t.r_multiple), 0) / prevTrades.length : 0;

    // 1. UPDATE TOP KPI CARDS
    document.getElementById('kpiTotalTrades').textContent = totalTrades;
    updateTrendText('kpiTradesTrend', totalTrades - prevTradesCount, '', `vs ${monthNames[prevM].substring(0, 3)}`);

    const pnlEl = document.getElementById('kpiNetPnL');
    pnlEl.textContent = `${totalPnL >= 0 ? '+' : '-'}$${Math.abs(totalPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    pnlEl.className = totalPnL >= 0 ? 'text-green' : 'text-red';
    updateTrendText('kpiPnLTrend', totalPnL - prevPnL, '$', `vs ${monthNames[prevM].substring(0, 3)}`);

    const avgREl = document.getElementById('kpiAvgR');
    avgREl.textContent = `${avgRMultiple >= 0 ? '+' : ''}${avgRMultiple.toFixed(2)}R`;
    avgREl.className = avgRMultiple >= 0 ? 'text-cyan' : 'text-red';
    updateTrendText('kpiRTrend', avgRMultiple - prevR, 'R', '');

    const avgProcEl = document.getElementById('kpiAvgProcess');
    avgProcEl.textContent = `${avgProcessScore}%`;
    updateTrendText('kpiProcessTrend', avgProcessScore - 75, '%', 'vs target');

    document.getElementById('kpiBestProcess').textContent = bestProcessVal >= 0 ? `${bestProcessVal}%` : '--';
    document.getElementById('kpiBestProcessDate').textContent = bestProcessDay ? `${monthNames[currentMonth]} ${bestProcessDay}` : '--';

    document.getElementById('kpiWorstProcess').textContent = (worstProcessVal >= 0 && worstProcessVal <= 100) ? `${worstProcessVal}%` : '--';
    document.getElementById('kpiWorstProcessDate').textContent = worstProcessDay ? `${monthNames[currentMonth]} ${worstProcessDay}` : '--';

    // 2. UPDATE PROCESS VS OUTCOME SIDEBAR
    const sidePnLEl = document.getElementById('sideOutcomePnL');
    sidePnLEl.textContent = `${totalPnL >= 0 ? '+' : '-'}$${Math.abs(totalPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    sidePnLEl.className = totalPnL >= 0 ? 'text-green' : 'text-red';

    document.getElementById('sideProcessScore').textContent = `${avgProcessScore}%`;

    document.getElementById('sideBestOutcomeDate').textContent = bestOutcomeDay ? `${monthNames[currentMonth].substring(0, 3)} ${bestOutcomeDay}` : '--';
    document.getElementById('sideBestOutcomeVal').textContent = bestOutcomeVal !== -999999 ? `${bestOutcomeVal >= 0 ? '+' : '-'}$${Math.abs(bestOutcomeVal).toFixed(2)}` : '--';
    document.getElementById('sideBestOutcomeR').textContent = bestOutcomeDay ? `(${bestOutcomeR >= 0 ? '+' : ''}${bestOutcomeR.toFixed(2)}R)` : '';

    document.getElementById('sideBestProcessDate').textContent = bestProcessDay ? `${monthNames[currentMonth].substring(0, 3)} ${bestProcessDay}` : '--';
    document.getElementById('sideBestProcessVal').textContent = bestProcessVal >= 0 ? `${bestProcessVal}%` : '--';
    document.getElementById('sideBestProcessR').textContent = bestProcessDay ? `(${bestProcessR >= 0 ? '+' : ''}${bestProcessR.toFixed(2)}R)` : '';

    // 3. UPDATE DONUT BREAKDOWN
    document.getElementById('donutTotalTrades').textContent = totalTrades;
    updateBreakdownLegend(tierCounts, totalTrades);

    // 4. UPDATE BOTTOM BAR STATS
    document.getElementById('footDaysTraded').textContent = daysTraded;
    document.getElementById('footAvgProcess').textContent = `${avgProcessScore}%`;
    document.getElementById('footWinRate').textContent = `${winRate}%`;
    document.getElementById('footAvgR').textContent = `${avgRMultiple >= 0 ? '+' : ''}${avgRMultiple.toFixed(2)}R`;

    // 5. RENDER THE 7-COLUMN MONTHLY GRID
    renderGridDays(currentYear, currentMonth, dayMap, bestProcessDay, worstProcessDay);
  }

  function renderGridDays(year, month, dayMap, bestDay, worstDay) {
    const grid = document.getElementById('calendarDaysGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Previous month leading empty cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell empty-day';
      cell.innerHTML = `<span class="cal-day-num">${prevMonthDays - i}</span>`;
      grid.appendChild(cell);
    }

    // Selected Month Days
    for (let day = 1; day <= totalDaysInMonth; day++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';

      const isBest = day === bestDay;
      const isWorst = day === worstDay && !isBest;
      const dayData = dayMap[day];

      let badgeHtml = '';
      if (isBest) badgeHtml = `<span class="best-day-star" title="Best Process Day">★</span>`;
      else if (isWorst) badgeHtml = `<span class="worst-day-dot" title="Worst Process Day">●</span>`;

      if (dayData && dayData.tradesCount > 0) {
        const processPct = Math.round(dayData.totalProcess / dayData.tradesCount);
        const dayNetR = dayData.totalR.toFixed(2);
        const pnlStr = `${dayData.totalPnL >= 0 ? '+' : '-'}$${Math.abs(dayData.totalPnL).toFixed(0)}`;

        let colorClass = 'text-green';
        if (processPct < 30) colorClass = 'text-red';
        else if (processPct < 50) colorClass = 'text-orange';
        else if (processPct < 70) colorClass = 'text-amber';
        else if (processPct < 90) colorClass = 'text-cyan';

        cell.innerHTML = `
          <div class="cal-day-num">
            <span>${day}</span>
            ${badgeHtml}
          </div>
          <div class="cal-day-body">
            <span class="cal-process-pct ${colorClass}">${processPct}%</span>
            <span class="cal-r-multiple ${dayNetR >= 0 ? 'text-cyan' : 'text-red'}">${dayNetR >= 0 ? '+' : ''}${dayNetR}R</span>
            <span class="cal-day-pnl-trades">${pnlStr} • ${dayData.tradesCount} Trade${dayData.tradesCount > 1 ? 's' : ''}</span>
          </div>
        `;
      } else {
        cell.innerHTML = `
          <div class="cal-day-num"><span>${day}</span></div>
          <div class="cal-day-body">
            <span class="cal-no-trades">No Trades</span>
          </div>
        `;
      }

      grid.appendChild(cell);
    }

    // Trailing empty cells
    const totalRendered = firstDayIndex + totalDaysInMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const cell = document.createElement('div');
      cell.className = 'cal-day-cell empty-day';
      cell.innerHTML = `<span class="cal-day-num">${i}</span>`;
      grid.appendChild(cell);
    }
  }

  function updateTrendText(elementId, diff, unit, suffix) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (diff === 0) {
      el.textContent = `• 0${unit} ${suffix}`.trim();
      el.style.color = '#94a3b8';
      return;
    }
    const arrow = diff > 0 ? '↑' : '↓';
    const sign = diff > 0 ? '+' : '';
    let valStr = '';
    if (unit === '$') valStr = `$${Math.abs(diff).toFixed(0)}`;
    else if (unit === 'R') valStr = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}R`;
    else valStr = `${sign}${Math.round(diff)}${unit}`;

    el.textContent = `${arrow} ${valStr} ${suffix}`.trim();
    el.style.color = diff > 0 ? '#10b981' : '#ef4444';
  }

  function updateBreakdownLegend(counts, total) {
    const calcPct = cnt => total > 0 ? Math.round((cnt / total) * 100) : 0;
    
    const p90 = calcPct(counts[90]);
    const p70 = calcPct(counts[70]);
    const p50 = calcPct(counts[50]);
    const p30 = calcPct(counts[30]);
    const p0 = calcPct(counts[0]);

    document.getElementById('tierCount90').textContent = `${counts[90]} (${p90}%)`;
    document.getElementById('tierCount70').textContent = `${counts[70]} (${p70}%)`;
    document.getElementById('tierCount50').textContent = `${counts[50]} (${p50}%)`;
    document.getElementById('tierCount30').textContent = `${counts[30]} (${p30}%)`;
    document.getElementById('tierCount0').textContent = `${counts[0]} (${p0}%)`;

    const donut = document.getElementById('breakdownDonut');
    if (donut) {
      if (total === 0) {
        donut.style.background = 'conic-gradient(#1f2937 0% 100%)';
      } else {
        const stop1 = p90;
        const stop2 = stop1 + p70;
        const stop3 = stop2 + p50;
        const stop4 = stop3 + p30;
        donut.style.background = `conic-gradient(
          #10b981 0% ${stop1}%,
          #06b6d4 ${stop1}% ${stop2}%,
          #f59e0b ${stop2}% ${stop3}%,
          #f97316 ${stop3}% ${stop4}%,
          #ef4444 ${stop4}% 100%
        )`;
      }
    }
  }

  // 5. MONTH SWITCH LISTENERS
  document.getElementById('btnPrevMonth')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });

  document.getElementById('btnNextMonth')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });

  window.addEventListener('storage', renderCalendar);
  window.addEventListener('focus', renderCalendar);

  renderCalendar();
});