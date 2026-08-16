document.addEventListener('DOMContentLoaded', () => {
  // 1. EXACT 9 PRE-TRADE EMOTIONS FROM YOUR TRADE LOG
  const EMOTIONS_CONFIG = [
    { key: 'calm', name: 'Calm', color: '#10b981' },
    { key: 'overconfidence', name: 'Overconfidence', color: '#06b6d4' },
    { key: 'hope', name: 'Hope', color: '#eab308' },
    { key: 'greed', name: 'Greed', color: '#f59e0b' },
    { key: 'boredom', name: 'Boredom', color: '#186bf0' },
    { key: 'fomo', name: 'FOMO', color: '#f97316' },
    { key: 'fear', name: 'Fear', color: '#ef4444' },
    { key: 'frustration', name: 'Frustration', color: '#dc2626' },
    { key: 'revenge', name: 'Revenge', color: '#b91c1c' }
  ];

  let rawTrades = [];

  // Match raw emotion string to the exact key
  function matchEmotionKey(raw) {
    if (!raw) return null;
    const s = String(raw).toLowerCase().trim();
    if (s.includes('calm')) return 'calm';
    if (s.includes('overconf') || s.includes('confid')) return 'overconfidence';
    if (s.includes('hope')) return 'hope';
    if (s.includes('greed')) return 'greed';
    if (s.includes('bored')) return 'boredom';
    if (s.includes('fomo')) return 'fomo';
    if (s.includes('fear')) return 'fear';
    if (s.includes('frustrat')) return 'frustration';
    if (s.includes('reveng')) return 'revenge';
    return null;
  }

  // 2. FETCH TRADES (SUPPORTS BOTH API & LOCALSTORAGE)
  async function fetchTrades() {
    try {
      const res = await fetch('/api/trades');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.trades)) return data.trades;
        if (data && Array.isArray(data.data)) return data.data;
      }
    } catch (e) {
      console.error('API Fetch error:', e);
    }

    const keys = ['edgecraft_trades', 'trades', 'trade_logs'];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

  function filterTradesByDate(trades) {
    const fromInput = document.getElementById('psyDateFrom')?.value;
    const toInput = document.getElementById('psyDateTo')?.value;

    const fromDate = fromInput ? parseTradeDate(fromInput) : null;
    const toDate = toInput ? parseTradeDate(toInput) : null;

    if (fromDate) fromDate.setHours(0, 0, 0, 0);
    if (toDate) toDate.setHours(23, 59, 59, 999);

    return trades.filter(t => {
      const tDate = parseTradeDate(t.trade_date || t.date || t.entry_date);
      if (!tDate) return true;
      if (fromDate && tDate < fromDate) return false;
      if (toDate && tDate > toDate) return false;
      return true;
    });
  }

  // 3. MAIN PSYCHOLOGY CALCULATION ENGINE
  function runPsychologyAnalytics() {
    const trades = filterTradesByDate(rawTrades);
    const totalTrades = trades.length;

    let totalPnL = 0;
    let totalR = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let winningTradesCount = 0;
    let sumConfidence = 0;
    let sumStress = 0;
    let sumFomo = 0;

    const statsMap = {};
    EMOTIONS_CONFIG.forEach(cfg => {
      statsMap[cfg.key] = {
        key: cfg.key,
        name: cfg.name,
        color: cfg.color,
        count: 0,
        wins: 0,
        losses: 0,
        breakEvens: 0,
        totalPnL: 0,
        totalR: 0,
        grossProfit: 0,
        grossLoss: 0,
        posRSum: 0,
        negRSum: 0
      };
    });

    trades.forEach(t => {
      const pnl = parseNumber(t.pnl || t.net_pnl || 0);
      const r = parseNumber(t.r_multiple || t.rMultiple || 0);

      totalPnL += pnl;
      totalR += r;

      if (pnl > 0 || r > 0) {
        winningTradesCount++;
        grossProfit += pnl;
      } else if (pnl < 0 || r < 0) {
        grossLoss += Math.abs(pnl);
      }

      sumConfidence += parseNumber(t.confidence_level || 5);
      sumStress += parseNumber(t.stress_level || 3);
      sumFomo += parseNumber(t.fomo_level || 2);

      // ONLY USE EMOTION BEFORE TRADE
      const rawEmotion = t.emotion_before || t.emotion_before_trade || t.emotion || 'Calm';
      const matchedKey = matchEmotionKey(rawEmotion);
      
      if (matchedKey && statsMap[matchedKey]) {
        const stat = statsMap[matchedKey];
        stat.count += 1;
        stat.totalPnL += pnl;
        stat.totalR += r;

        if (pnl > 0 || r > 0) {
          stat.wins += 1;
          stat.grossProfit += pnl;
          stat.posRSum += r;
        } else if (pnl < 0 || r < 0) {
          stat.losses += 1;
          stat.grossLoss += Math.abs(pnl);
          stat.negRSum += r;
        } else {
          stat.breakEvens += 1;
        }
      }
    });

    // 1. TOP KPI METRIC CARDS
    const overallWinRate = totalTrades > 0 ? (winningTradesCount / totalTrades) * 100 : 0;
    const overallAvgR = totalTrades > 0 ? totalR / totalTrades : 0;
    
    const winRateFrac = overallWinRate / 100;
    const avgWinR = winningTradesCount > 0 ? trades.filter(t => parseNumber(t.r_multiple) > 0).reduce((acc, t) => acc + parseNumber(t.r_multiple), 0) / winningTradesCount : 0;
    const losingTradesCount = totalTrades - winningTradesCount;
    const avgLossR = losingTradesCount > 0 ? trades.filter(t => parseNumber(t.r_multiple) < 0).reduce((acc, t) => acc + parseNumber(t.r_multiple), 0) / losingTradesCount : 0;
    const overallExpectancy = totalTrades > 0 ? (winRateFrac * avgWinR) + ((1 - winRateFrac) * avgLossR) : 0;
    const overallProfitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? 'MAX' : '0.00');

    document.getElementById('kpiTotalTrades').textContent = totalTrades;
    document.getElementById('kpiAvgWinRate').textContent = `${overallWinRate.toFixed(1)}%`;
    
    const avgREl = document.getElementById('kpiAvgR');
    avgREl.textContent = `${overallAvgR >= 0 ? '+' : ''}${overallAvgR.toFixed(2)}R`;
    avgREl.className = `kpi-num ${overallAvgR >= 0 ? 'text-cyan' : 'text-red'}`;

    const expEl = document.getElementById('kpiExpectancy');
    expEl.textContent = `${overallExpectancy >= 0 ? '+' : ''}${overallExpectancy.toFixed(2)}R`;
    expEl.className = `kpi-num ${overallExpectancy >= 0 ? 'text-amber' : 'text-red'}`;

    const pnlEl = document.getElementById('kpiNetPnL');
    pnlEl.textContent = `${totalPnL >= 0 ? '+' : '-'}$${Math.abs(totalPnL).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    pnlEl.className = `kpi-num ${totalPnL >= 0 ? 'text-green' : 'text-red'}`;
    document.getElementById('kpiNetR').textContent = `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R Total`;

    document.getElementById('kpiProfitFactor').textContent = overallProfitFactor;

    // 2. PERFORMANCE TABLE
    const tableBody = document.getElementById('emotionTableBody');
    tableBody.innerHTML = '';

    Object.values(statsMap).forEach(st => {
      if (st.count === 0 && totalTrades > 0) return;

      const freqPct = totalTrades > 0 ? ((st.count / totalTrades) * 100).toFixed(1) : '0.0';
      const winRate = st.count > 0 ? ((st.wins / st.count) * 100).toFixed(2) : '0.00';
      const avgR = st.count > 0 ? (st.totalR / st.count).toFixed(2) : '0.00';

      const emAvgWinR = st.wins > 0 ? st.posRSum / st.wins : 0;
      const emAvgLossR = st.losses > 0 ? st.negRSum / st.losses : 0;
      const emExp = st.count > 0 ? (((st.wins / st.count) * emAvgWinR) + ((st.losses / st.count) * emAvgLossR)).toFixed(2) : '0.00';

      const pf = st.grossLoss > 0 ? (st.grossProfit / st.grossLoss).toFixed(2) : (st.grossProfit > 0 ? 'MAX' : (st.count > 0 ? '0.00' : '-'));
      const sampleWarning = (st.count > 0 && st.count < 5) ? `<span class="sample-warning-badge" title="Low Sample Size">Low N</span>` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div class="emotion-cell">
            <span class="emotion-dot" style="background: ${st.color};"></span>
            <span>${st.name}</span>
            ${sampleWarning}
          </div>
        </td>
        <td><strong>${st.count}</strong> <span style="color:#64748b; font-size:11px;">(${freqPct}%)</span></td>
        <td class="${parseFloat(winRate) >= 50 ? 'text-green' : 'text-red'}">${st.count > 0 ? winRate + '%' : '-'}</td>
        <td class="${parseFloat(avgR) >= 0 ? 'text-cyan' : 'text-red'}">${st.count > 0 ? (parseFloat(avgR) >= 0 ? '+' : '') + avgR + 'R' : '-'}</td>
        <td class="${parseFloat(emExp) >= 0 ? 'text-amber' : 'text-red'}">${st.count > 0 ? (parseFloat(emExp) >= 0 ? '+' : '') + emExp + 'R' : '-'}</td>
        <td class="${st.totalPnL >= 0 ? 'text-green' : 'text-red'}">${st.count > 0 ? (st.totalPnL >= 0 ? '+' : '-') + '$' + Math.abs(st.totalPnL).toFixed(2) : '-'}</td>
        <td><strong>${pf}</strong></td>
      `;
      tableBody.appendChild(tr);
    });

    // 3. WIN RATE BARS
    const barsContainer = document.getElementById('emotionBarsList');
    barsContainer.innerHTML = '';

    Object.values(statsMap).forEach(st => {
      if (st.count === 0 && totalTrades > 0) return;
      const winRate = st.count > 0 ? Math.round((st.wins / st.count) * 100) : 0;

      const barRow = document.createElement('div');
      barRow.className = 'bar-row';
      barRow.innerHTML = `
        <span class="bar-lbl">${st.name}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width: ${winRate}%; background: ${st.color};">
            ${st.count > 0 ? winRate + '%' : ''}
          </div>
        </div>
      `;
      barsContainer.appendChild(barRow);
    });

    // 4. EMOTIONAL CONSISTENCY CALCULATION
    const consistencyPct = calculateEmotionalConsistency(trades);
    const donutEl = document.getElementById('consistencyDonut');
    const pctLabel = document.getElementById('consistencyPct');
    const detailText = document.getElementById('consistencyDetailText');

    if (consistencyPct !== null) {
      pctLabel.textContent = `${consistencyPct}%`;
      if (donutEl) donutEl.style.background = `conic-gradient(#10b981 0% ${consistencyPct}%, rgba(255,255,255,0.06) ${consistencyPct}% 100%)`;
      detailText.textContent = `You maintained consistent pre-trade emotional state in ${consistencyPct}% of trade sequences.`;
    } else {
      pctLabel.textContent = `N/A`;
      if (donutEl) donutEl.style.background = `conic-gradient(rgba(255,255,255,0.06) 0% 100%)`;
      detailText.textContent = `Need at least 2 trades on the same day to evaluate sequence consistency.`;
    }

    // 5. 3 RATINGS (CONFIDENCE, STRESS, FOMO)
    const avgConf = totalTrades > 0 ? (sumConfidence / totalTrades).toFixed(1) : '0';
    const avgStr = totalTrades > 0 ? (sumStress / totalTrades).toFixed(1) : '0';
    const avgFom = totalTrades > 0 ? (sumFomo / totalTrades).toFixed(1) : '0';

    document.getElementById('avgConfidenceScore').textContent = `${avgConf}/10`;
    document.getElementById('avgStressScore').textContent = `${avgStr}/10`;
    document.getElementById('avgFomoScore').textContent = `${avgFom}/10`;

    // 6. SCATTER / BUBBLE CHART
    renderScatterChart(statsMap);

    // 7. HEATMAP MATRIX
    renderHeatmapMatrix(statsMap);

    // 8. DYNAMIC INSIGHTS ENGINE
    generateDynamicInsights(statsMap, totalTrades, consistencyPct);
  }

  function calculateEmotionalConsistency(trades) {
    if (trades.length < 2) return null;

    const dayGroups = {};
    trades.forEach(t => {
      const d = String(t.trade_date || t.date || 'default');
      if (!dayGroups[d]) dayGroups[d] = [];
      dayGroups[d].push(t);
    });

    let sameTransitions = 0;
    let totalTransitions = 0;

    Object.values(dayGroups).forEach(dayTrades => {
      if (dayTrades.length < 2) return;
      dayTrades.sort((a, b) => String(a.entry_time || '').localeCompare(String(b.entry_time || '')));

      for (let i = 0; i < dayTrades.length - 1; i++) {
        const currKey = matchEmotionKey(dayTrades[i].emotion_before || dayTrades[i].emotion);
        const nextKey = matchEmotionKey(dayTrades[i + 1].emotion_before || dayTrades[i + 1].emotion);

        if (currKey && nextKey) {
          totalTransitions++;
          if (currKey === nextKey) {
            sameTransitions++;
          }
        }
      }
    });

    if (totalTransitions === 0) return null;
    return Math.round((sameTransitions / totalTransitions) * 100);
  }

  // THEME-AWARE DUAL-MODE SCATTER PLOT RENDERER
  function renderScatterChart(statsMap) {
    const container = document.getElementById('scatterChartContainer');
    if (!container) return;

    const isLight = document.body.classList.contains('theme-light') || 
                    document.documentElement.classList.contains('theme-light');

    const activeEmotions = Object.values(statsMap).filter(s => s.count > 0);
    if (activeEmotions.length === 0) {
      container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:${isLight ? '#64748b' : '#94a3b8'};font-size:12px;">No logged trade emotions for this period</div>`;
      return;
    }

    const width = 560;
    const height = 280;
    const padL = 58;
    const padR = 40;
    const padT = 28;
    const padB = 42;

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const zeroY = padT + plotH / 2;

    const colors = {
      plotBg: isLight ? '#f1f5f9' : 'rgba(15, 23, 42, 0.45)',
      plotBorder: isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.12)',
      gridLines: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
      zeroLine: isLight ? '#64748b' : 'rgba(148, 163, 184, 0.5)',
      axisText: isLight ? '#475569' : '#94a3b8',
      zeroText: isLight ? '#0f172a' : '#ffffff',
      labelText: isLight ? '#0f172a' : '#ffffff',
      subText: isLight ? '#64748b' : '#94a3b8',
      textShadow: isLight ? '0 1px 3px rgba(255,255,255,0.9)' : '0 2px 4px rgba(0,0,0,0.9)'
    };

    let svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:100%;display:block;overflow:visible;">
      <rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="${colors.plotBg}" stroke="${colors.plotBorder}" rx="6"/>

      <line x1="${padL}" y1="${padT + plotH * 0.25}" x2="${padL + plotW}" y2="${padT + plotH * 0.25}" stroke="${colors.gridLines}" stroke-dasharray="3,3"/>
      <line x1="${padL}" y1="${zeroY}" x2="${padL + plotW}" y2="${zeroY}" stroke="${colors.zeroLine}" stroke-width="1.5"/>
      <line x1="${padL}" y1="${padT + plotH * 0.75}" x2="${padL + plotW}" y2="${padT + plotH * 0.75}" stroke="${colors.gridLines}" stroke-dasharray="3,3"/>

      <line x1="${padL + plotW * 0.25}" y1="${padT}" x2="${padL + plotW * 0.25}" y2="${padT + plotH}" stroke="${colors.gridLines}" stroke-dasharray="3,3"/>
      <line x1="${padL + plotW * 0.5}" y1="${padT}" x2="${padL + plotW * 0.5}" y2="${padT + plotH}" stroke="${colors.gridLines}" stroke-dasharray="4,4"/>
      <line x1="${padL + plotW * 0.75}" y1="${padT}" x2="${padL + plotW * 0.75}" y2="${padT + plotH}" stroke="${colors.gridLines}" stroke-dasharray="3,3"/>

      <text x="${padL - 8}" y="${padT + 4}" fill="${isLight ? '#059669' : '#10b981'}" font-size="10.5" font-weight="800" text-anchor="end">+2.0R</text>
      <text x="${padL - 8}" y="${padT + plotH * 0.25 + 3.5}" fill="${isLight ? '#0284c7' : '#38bdf8'}" font-size="10" font-weight="700" text-anchor="end">+1.0R</text>
      <text x="${padL - 8}" y="${zeroY + 3.5}" fill="${colors.zeroText}" font-size="10.5" font-weight="800" text-anchor="end">0.0R</text>
      <text x="${padL - 8}" y="${padT + plotH * 0.75 + 3.5}" fill="${isLight ? '#d97706' : '#f59e0b'}" font-size="10" font-weight="700" text-anchor="end">-1.0R</text>
      <text x="${padL - 8}" y="${padT + plotH + 2}" fill="${isLight ? '#dc2626' : '#ef4444'}" font-size="10.5" font-weight="800" text-anchor="end">-2.0R</text>

      <text x="${padL}" y="${height - 20}" fill="${colors.axisText}" font-size="10" font-weight="700" text-anchor="middle">0%</text>
      <text x="${padL + plotW * 0.25}" y="${height - 20}" fill="${colors.axisText}" font-size="10" font-weight="700" text-anchor="middle">25%</text>
      <text x="${padL + plotW * 0.5}" y="${height - 20}" fill="${colors.axisText}" font-size="10" font-weight="700" text-anchor="middle">50%</text>
      <text x="${padL + plotW * 0.75}" y="${height - 20}" fill="${colors.axisText}" font-size="10" font-weight="700" text-anchor="middle">75%</text>
      <text x="${padL + plotW}" y="${height - 20}" fill="${colors.axisText}" font-size="10" font-weight="700" text-anchor="middle">100%</text>
      
      <text x="${padL + plotW / 2}" y="${height - 4}" fill="${colors.axisText}" font-size="11" font-weight="800" letter-spacing="0.5" text-anchor="middle">WIN RATE (%)</text>
    `;

    activeEmotions.forEach((st, idx) => {
      const winRate = (st.wins / st.count) * 100;
      const avgR = st.totalR / st.count;

      const cx = padL + (winRate / 100) * plotW;
      const clampedR = Math.max(-2, Math.min(2, avgR));
      const cy = zeroY - (clampedR / 2) * (plotH / 2);
      const rSize = Math.min(20, Math.max(10, st.count * 3.5));

      const placeAbove = cy > zeroY || (idx % 2 === 0 && cy >= padT + 25);
      const labelY = placeAbove ? (cy - rSize - 6) : (cy + rSize + 14);
      const labelAnchor = cx < padL + 45 ? 'start' : (cx > padL + plotW - 45 ? 'end' : 'middle');

      svg += `
        <g>
          <circle cx="${cx}" cy="${cy}" r="${rSize + 3}" fill="${st.color}" fill-opacity="${isLight ? '0.3' : '0.2'}"/>
          <circle cx="${cx}" cy="${cy}" r="${rSize}" fill="${st.color}" fill-opacity="0.9" stroke="${isLight ? '#ffffff' : '#0b1329'}" stroke-width="2">
            <title>${st.name}: ${st.count} trade(s) | ${winRate.toFixed(1)}% Win Rate | ${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R</title>
          </circle>
          <text x="${cx}" y="${labelY}" fill="${colors.labelText}" font-size="10.5" font-weight="800" text-anchor="${labelAnchor}" style="text-shadow: ${colors.textShadow};">
            ${st.name} <tspan fill="${colors.subText}" font-size="9">(${avgR >= 0 ? '+' : ''}${avgR.toFixed(1)}R)</tspan>
          </text>
        </g>
      `;
    });

    svg += `</svg>`;
    container.innerHTML = svg;
  }

  function renderHeatmapMatrix(statsMap) {
    const wrap = document.getElementById('heatmapMatrixContainer');
    if (!wrap) return;

    const emotions = Object.values(statsMap).filter(s => s.count > 0);
    if (emotions.length === 0) {
      wrap.innerHTML = `<div style="color:#64748b;font-size:11.5px;padding:12px;text-align:center;">No trade data available</div>`;
      return;
    }

    let html = `<table class="heatmap-table"><thead><tr><th class="heatmap-row-label">METRIC</th>`;
    emotions.forEach(e => {
      html += `<th>${e.name}</th>`;
    });
    html += `</tr></thead><tbody>`;

    // Row 1: Avg R
    html += `<tr><td class="heatmap-row-label">AVG R</td>`;
    emotions.forEach(e => {
      const avgR = (e.totalR / e.count);
      const bg = avgR > 0 ? 'rgba(16, 185, 129, 0.2)' : (avgR < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)');
      const col = avgR > 0 ? '#10b981' : (avgR < 0 ? '#ef4444' : '#94a3b8');
      html += `<td style="background:${bg}; color:${col};">${avgR >= 0 ? '+' : ''}${avgR.toFixed(2)}R</td>`;
    });
    html += `</tr>`;

    // Row 2: Expectancy
    html += `<tr><td class="heatmap-row-label">EXPECTANCY</td>`;
    emotions.forEach(e => {
      const emAvgWin = e.wins > 0 ? e.posRSum / e.wins : 0;
      const emAvgLoss = e.losses > 0 ? e.negRSum / e.losses : 0;
      const exp = ((e.wins / e.count) * emAvgWin) + ((e.losses / e.count) * emAvgLoss);
      const bg = exp > 0 ? 'rgba(16, 185, 129, 0.2)' : (exp < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)');
      const col = exp > 0 ? '#10b981' : (exp < 0 ? '#ef4444' : '#94a3b8');
      html += `<td style="background:${bg}; color:${col};">${exp >= 0 ? '+' : ''}${exp.toFixed(2)}R</td>`;
    });
    html += `</tr>`;

    // Row 3: Net P&L
    html += `<tr><td class="heatmap-row-label">NET P&L</td>`;
    emotions.forEach(e => {
      const bg = e.totalPnL > 0 ? 'rgba(16, 185, 129, 0.2)' : (e.totalPnL < 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)');
      const col = e.totalPnL > 0 ? '#10b981' : (e.totalPnL < 0 ? '#ef4444' : '#94a3b8');
      html += `<td style="background:${bg}; color:${col};">${e.totalPnL >= 0 ? '+' : '-'}$${Math.abs(e.totalPnL).toFixed(0)}</td>`;
    });
    html += `</tr>`;

    // Row 4: Profit Factor
    html += `<tr><td class="heatmap-row-label">PROFIT FACTOR</td>`;
    emotions.forEach(e => {
      const pf = e.grossLoss > 0 ? (e.grossProfit / e.grossLoss).toFixed(2) : (e.grossProfit > 0 ? 'MAX' : '0.00');
      const col = parseFloat(pf) >= 1.5 || pf === 'MAX' ? '#10b981' : (parseFloat(pf) < 1 ? '#ef4444' : '#f59e0b');
      html += `<td style="color:${col};">${pf}</td>`;
    });
    html += `</tr></tbody></table>`;

    wrap.innerHTML = html;
  }

  function generateDynamicInsights(statsMap, totalTrades, consistency) {
    const list = document.getElementById('dynamicInsightsList');
    if (!list) return;

    if (totalTrades === 0) {
      list.innerHTML = `<div class="insight-item"><span class="insight-ico">ℹ️</span><span>Log trades with pre-trade emotions to generate statistical insights.</span></div>`;
      return;
    }

    const items = [];
    const active = Object.values(statsMap).filter(s => s.count > 0);

    const bestWinEm = [...active].sort((a, b) => (b.wins / b.count) - (a.wins / a.count))[0];
    if (bestWinEm && bestWinEm.count >= 3) {
      const wr = ((bestWinEm.wins / bestWinEm.count) * 100).toFixed(1);
      items.push(`
        <div class="insight-item">
          <span class="insight-ico text-green">✓</span>
          <span><strong>${bestWinEm.name}</strong> states are associated with your highest win rate at <strong>${wr}%</strong>.</span>
        </div>
      `);
    } else if (bestWinEm) {
      items.push(`
        <div class="insight-item">
          <span class="insight-ico text-amber">⚠️</span>
          <span>${bestWinEm.name} trades show positive expectancy, but sample size (${bestWinEm.count} trades) is currently limited.</span>
        </div>
      `);
    }

    const negativeEmotions = active.filter(s => (s.totalR / s.count) < 0);
    if (negativeEmotions.length > 0) {
      const names = negativeEmotions.map(e => e.name).join(' or ');
      items.push(`
        <div class="insight-item">
          <span class="insight-ico text-red">⚠️</span>
          <span>Trades entered under <strong>${names}</strong> correlate with negative average return.</span>
        </div>
      `);
    }

    if (consistency !== null) {
      if (consistency >= 70) {
        items.push(`
          <div class="insight-item">
            <span class="insight-ico text-green">✓</span>
            <span>Strong emotional consistency (<strong>${consistency}%</strong>) across consecutive trade executions.</span>
          </div>
        `);
      } else {
        items.push(`
          <div class="insight-item">
            <span class="insight-ico text-amber">⚠️</span>
            <span>Pre-trade emotional variance detected (${consistency}% consistency). Focus on breathing or pause routines between trades.</span>
          </div>
        `);
      }
    }

    list.innerHTML = items.join('');
  }

  document.getElementById('psyDateFrom')?.addEventListener('change', runPsychologyAnalytics);
  document.getElementById('psyDateTo')?.addEventListener('change', runPsychologyAnalytics);

  document.getElementById('btnThisMonth')?.addEventListener('click', () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastD = String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0');

    document.getElementById('psyDateFrom').value = `${y}-${m}-01`;
    document.getElementById('psyDateTo').value = `${y}-${m}-${lastD}`;
    runPsychologyAnalytics();
  });

  document.getElementById('btnResetFilter')?.addEventListener('click', () => {
    document.getElementById('psyDateFrom').value = '';
    document.getElementById('psyDateTo').value = '';
    runPsychologyAnalytics();
  });

  fetchTrades().then(trades => {
    rawTrades = trades;
    runPsychologyAnalytics();
  });
});