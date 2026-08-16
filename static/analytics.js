document.addEventListener('DOMContentLoaded', () => {
  const startDateInput = document.getElementById('startDateInput');
  const endDateInput = document.getElementById('endDateInput');
  const applyMonthBtn = document.getElementById('applyCurrentMonthBtn');
  const categoryFilterSelect = document.getElementById('categoryFilterSelect');
  const resetBtn = document.getElementById('resetAnalyticsBtn');

  let currentAnalyticsData = null;
  let modalChartInstance = null;
  const chartInstances = {};

  // Destroy previous Chart instance before re-rendering
  const safeCreateChart = (canvasId, config) => {
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
    }
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), config);
  };

  // Center Text Doughnut Plugin
  const centerTextPlugin = {
    id: 'centerTextPlugin',
    beforeDraw(chart) {
      if (chart.config.type === 'doughnut') {
        const { ctx, chartArea: { top, bottom, left, right } } = chart;
        ctx.save();
        const total = currentAnalyticsData ? currentAnalyticsData.total_trades : 0;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = (left + right) / 2;
        const centerY = (top + bottom) / 2;

        const isLight = document.documentElement.classList.contains('theme-light') || localStorage.getItem('edgecraft_theme') === 'light';

      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.fillStyle = isLight ? '#0F172A' : '#FFFFFF';
      ctx.fillText(total, centerX, centerY - 8);

      ctx.font = '600 11px Inter, sans-serif';
      ctx.fillStyle = isLight ? '#475569' : '#8E9BAE';
      ctx.fillText('Trades', centerX, centerY + 10);
      ctx.restore();
      }
    }
  };

  Chart.register(centerTextPlugin);

  // Fetch Analytics API
  const loadAnalytics = async () => {
    try {
      let url = '/api/analytics';
      const params = new URLSearchParams();
      if (startDateInput && startDateInput.value) params.append('start_date', startDateInput.value);
      if (endDateInput && endDateInput.value) params.append('end_date', endDateInput.value);

      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      currentAnalyticsData = data;

      renderDashboard(data);
    } catch (err) {
      console.error('Analytics load error:', err);
    }
  };

  // Render Charts & Cards
  const renderDashboard = (data) => {
    // 1. KPI Header
    document.getElementById('kpiTotalTrades').textContent = data.total_trades || 0;
    document.getElementById('kpiWinRate').textContent = `${data.win_rate || 0}%`;
    document.getElementById('kpiAvgR').textContent = `${(data.avg_r || 0) >= 0 ? '+' : ''}${data.avg_r || 0}R`;
    document.getElementById('kpiExpectancy').textContent = `${(data.expectancy || 0) >= 0 ? '+' : ''}${data.expectancy || 0}R`;
    document.getElementById('kpiNetPnlR').textContent = `${(data.net_pnl_r || 0) >= 0 ? '+' : ''}${data.net_pnl_r || 0}R`;
    document.getElementById('kpiProfitFactor').textContent = data.profit_factor || 0;

   // Render Uniform Bottom Summary Bar for ALL 10 Cards
  for (let i = 1; i <= 10; i++) {
    const footer = document.getElementById(`footer${i}`);
    if (footer) {
      const isWinRateGreen = (data.win_rate || 0) > 0;
      const isAvgRGreen = (data.avg_r || 0) >= 0;
      const isExpectancyGreen = (data.expectancy || 0) >= 0;
      const isNetPnlGreen = (data.net_pnl_r || 0) >= 0;

      footer.innerHTML = `
        <div class="footer-stat">
          <span class="stat-label">Trades</span>
          <strong class="stat-val text-white">${data.total_trades || 0}</strong>
        </div>
        <div class="footer-stat">
          <span class="stat-label">Win Rate</span>
          <strong class="stat-val ${isWinRateGreen ? 'text-green' : 'text-red'}">${(data.win_rate || 0).toFixed(0)}%</strong>
        </div>
        <div class="footer-stat">
          <span class="stat-label">Avg R</span>
          <strong class="stat-val ${isAvgRGreen ? 'text-green' : 'text-red'}">${isAvgRGreen ? '+' : ''}${(data.avg_r || 0).toFixed(2)}R</strong>
        </div>
        <div class="footer-stat">
          <span class="stat-label">Expectancy</span>
          <strong class="stat-val ${isExpectancyGreen ? 'text-green' : 'text-red'}">${isExpectancyGreen ? '+' : ''}${(data.expectancy || 0).toFixed(2)}R</strong>
        </div>
        <div class="footer-stat">
          <span class="stat-label">Net P&L</span>
          <strong class="stat-val ${isNetPnlGreen ? 'text-green' : 'text-red'}">${isNetPnlGreen ? '+' : ''}${(data.net_pnl_r || 0).toFixed(2)}R</strong>
        </div>
        <div class="footer-stat">
          <span class="stat-label">Profit Factor</span>
          <strong class="stat-val text-white">${(data.profit_factor || 0).toFixed(2)}</strong>
        </div>
      `;
    }
  }
    // Render Key Insights
  const insightsContainer = document.getElementById('insightsContainer');
  if (insightsContainer && data.insights) {
    insightsContainer.innerHTML = '';

    if (data.insights.length === 0) {
      insightsContainer.innerHTML = `<p style="color: #8E9BAE; font-size: 13px; margin: 0;">No key insights generated yet. Log more trades to reveal patterns!</p>`;
    } else {
      data.insights.forEach(item => {
        const row = document.createElement('div');
        row.className = 'insight-row';

        const isPositive = item.type === 'positive';
        const icon = isPositive ? '✓' : '⚠️';
        const color = isPositive ? '#00FF87' : '#FFB703';

        row.innerHTML = `
          <span style="color: ${color}; font-weight: 700;">${icon}</span>
          <span style="color: ${color};">${item.text}</span>
        `;
        insightsContainer.appendChild(row);
      });
    }
  }

    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { enabled: true }
      }
    };

    const barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: '#8E9BAE', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
        y: { ticks: { color: '#8E9BAE', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
      }
    };

    const renderLegend = (legendId, obj, colors) => {
      const el = document.getElementById(legendId);
      if (!el || !obj) return;
      const keys = Object.keys(obj);
      el.innerHTML = keys.map((k, idx) => {
        const cnt = obj[k].count !== undefined ? obj[k].count : obj[k];
        const pct = data.total_trades > 0 ? ((cnt / data.total_trades) * 100).toFixed(1) : 0;
        return `
          <div class="legend-item">
            <span><span class="legend-dot" style="background:${colors[idx % colors.length]}"></span>${k}</span>
            <strong style="color: #FFFFFF;">${cnt} (${pct}%)</strong>
          </div>
        `;
      }).join('');
    };

    // 1. Setup Doughnut
    const setupColors = ['#00FF87', '#00E5FF', '#7C3AED', '#FFB703', '#FF4D4D'];
    safeCreateChart('setupChart', {
      type: 'doughnut',
      data: { labels: Object.keys(data.by_setup), datasets: [{ data: Object.values(data.by_setup).map(s => s.count), backgroundColor: setupColors, borderWidth: 0 }] },
      options: doughnutOptions
    });
    renderLegend('setupLegend', data.by_setup, setupColors);

    // 2. Performance by Instrument (Vertical Bar Chart)
const symbolObj = data.by_symbol || {};
safeCreateChart('symbolChart', {
  type: 'bar',
  data: {
    labels: Object.keys(symbolObj),
    datasets: [{
      label: 'Trades',
      data: Object.values(symbolObj).map(s => (s && typeof s === 'object') ? (s.count || 0) : (Number(s) || 0)),
      backgroundColor: '#00FF87',
      borderRadius: 4
    }]
  },
  options: {
    ...barOptions,
    indexAxis: 'x' /* Set to 'x' (or omit) for vertical bars */
  }
});

    // 3. Session Doughnut
    const sessionColors = ['#00FF87', '#00E5FF', '#7C3AED', '#FFB703'];
    safeCreateChart('sessionChart', {
      type: 'doughnut',
      data: { labels: Object.keys(data.by_session), datasets: [{ data: Object.values(data.by_session).map(s => s.count), backgroundColor: sessionColors, borderWidth: 0 }] },
      options: doughnutOptions
    });
    renderLegend('sessionLegend', data.by_session, sessionColors);

    // 4. Day Bar
    safeCreateChart('dayChart', {
      type: 'bar',
      data: { labels: Object.keys(data.by_day), datasets: [{ data: Object.values(data.by_day).map(s => s.count), backgroundColor: '#7C3AED', borderRadius: 4 }] },
      options: barOptions
    });

    // 5. Time Area Line
    safeCreateChart('timeChart', {
      type: 'line',
      data: {
        labels: Object.keys(data.by_time_of_day),
        datasets: [{ data: Object.values(data.by_time_of_day), borderColor: '#00E5FF', backgroundColor: 'rgba(0, 229, 255, 0.15)', fill: true, tension: 0.4 }]
      },
      options: barOptions
    });

    // 6. Performance by Emotion
    const emotionObj = data.by_emotion || {};
    safeCreateChart('emotionChart', {
      type: 'bar',
      data: {
        labels: Object.keys(emotionObj),
        datasets: [{
          label: 'Trades',
          data: Object.values(emotionObj).map(e => (e && typeof e === 'object') ? (e.count || 0) : (Number(e) || 0)),
          backgroundColor: '#FFB703',
          borderRadius: 4
        }]
      },
      options: {
        ...barOptions,
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#8E9BAE', stepSize: 1 }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#8E9BAE' }
          }
        }
      }
    });
    // 7. Risk Doughnut
    const riskColors = ['#00FF87', '#00E5FF', '#FFB703', '#FF4D4D'];
    safeCreateChart('riskChart', {
      type: 'doughnut',
      data: { labels: Object.keys(data.by_risk), datasets: [{ data: Object.values(data.by_risk), backgroundColor: riskColors, borderWidth: 0 }] },
      options: doughnutOptions
    });
    renderLegend('riskLegend', data.by_risk, riskColors);

    // 8. Compliance Doughnut
    const compColors = ['#00FF87', '#FFB703', '#FF4D4D'];
    safeCreateChart('complianceChart', {
      type: 'doughnut',
      data: { labels: Object.keys(data.by_compliance), datasets: [{ data: Object.values(data.by_compliance), backgroundColor: compColors, borderWidth: 0 }] },
      options: doughnutOptions
    });
    renderLegend('complianceLegend', data.by_compliance, compColors);
// 9. Performance by Market Condition
    const marketObj = data.by_market || {};
    safeCreateChart('marketChart', {
      type: 'bar',
      data: {
        labels: Object.keys(marketObj),
        datasets: [{
          label: 'Trades',
          data: Object.values(marketObj).map(m => (m && typeof m === 'object') ? (m.count || 0) : (Number(m) || 0)),
          backgroundColor: '#00E5FF',
          borderRadius: 4
        }]
      },
      options: {
        ...barOptions,
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#8E9BAE', stepSize: 1 }
          },
          y: {
            grid: { display: false },
            ticks: { color: '#8E9BAE' }
          }
        }
      }
    });

    // 10. Long vs Short Doughnut
    safeCreateChart('longShortChart', {
      type: 'doughnut',
      data: { labels: ['Long', 'Short'], datasets: [{ data: [data.long_vs_short.long.count, data.long_vs_short.short.count], backgroundColor: ['#00FF87', '#FF4D4D'], borderWidth: 0 }] },
      options: doughnutOptions
    });

    const lsStats = document.getElementById('longShortStats');
    if (lsStats) {
      const l = data.long_vs_short.long || {};
      const s = data.long_vs_short.short || {};
      lsStats.innerHTML = `
        <div class="ls-header">
          <span>Metric</span>
          <div><span style="color:#00FF87">Long</span> / <span style="color:#FF4D4D">Short</span></div>
        </div>
        <div class="ls-row"><span>Win Rate:</span> <span>${l.win_rate || 0}% / ${s.win_rate || 0}%</span></div>
        <div class="ls-row"><span>Avg R:</span> <span>+${l.avg_r || 0}R / +${s.avg_r || 0}R</span></div>
        <div class="ls-row"><span>Net P&L:</span> <strong>+${l.pnl_r || 0}R / +${s.pnl_r || 0}R</strong></div>
        <div class="ls-row"><span>Profit Factor:</span> <span>${l.pf || 0} / ${s.pf || 0}</span></div>
      `;
    }

    // Dynamic Key Insights
    const insightsList = document.getElementById('insightsList');
    if (insightsList) {
      insightsList.innerHTML = '';
      if (!data.insights || data.insights.length === 0) {
        insightsList.innerHTML = `<p style="color:#8E9BAE;">Log trades to unlock automated performance insights.</p>`;
      } else {
        data.insights.forEach(item => {
          const div = document.createElement('div');
          div.className = `insight-item ${item.type}`;
          const icon = item.type === 'positive' ? '✔' : '⚠';
          div.innerHTML = `<span style="font-size:14px;">${icon}</span> <span>${item.text}</span>`;
          insightsList.appendChild(div);
        });
      }
    }
  };

  // Preset: Current Month
  if (applyMonthBtn) {
    applyMonthBtn.addEventListener('click', () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      if (startDateInput) startDateInput.value = firstDay;
      if (endDateInput) endDateInput.value = lastDay;

      loadAnalytics();
    });
  }

  // Category Filter Dropdown
  if (categoryFilterSelect) {
    categoryFilterSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      document.querySelectorAll('.chart-card').forEach(card => {
        const cat = card.getAttribute('data-cat');
        if (val === 'all' || !cat || cat === val) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // Reset Filters
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (startDateInput) startDateInput.value = '';
      if (endDateInput) endDateInput.value = '';
      if (categoryFilterSelect) categoryFilterSelect.value = 'all';
      document.querySelectorAll('.chart-card').forEach(card => card.style.display = 'flex');
      loadAnalytics();
    });
  }

  if (startDateInput) startDateInput.addEventListener('change', loadAnalytics);
  if (endDateInput) endDateInput.addEventListener('change', loadAnalytics);

  // View Details Modal
  window.openDetailModal = function(title, sourceCanvasId) {
    const modal = document.getElementById('viewDetailsModal');
    const modalTitle = document.getElementById('modalMetricTitle');
    const modalCanvas = document.getElementById('modalCanvas');
    const sourceCanvas = document.getElementById(sourceCanvasId);

    if (!modal || !sourceCanvas) return;

    modalTitle.textContent = title;
    modal.style.display = 'flex';

    const sourceChart = Chart.getChart(sourceCanvas);
    if (sourceChart && modalCanvas) {
      if (modalChartInstance) modalChartInstance.destroy();
      modalChartInstance = new Chart(modalCanvas.getContext('2d'), {
        type: sourceChart.config.type,
        data: sourceChart.config.data,
        options: { responsive: true, maintainAspectRatio: false }
      });
    }
  };

  const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
  if (closeDetailModalBtn) {
    closeDetailModalBtn.addEventListener('click', () => {
      document.getElementById('viewDetailsModal').style.display = 'none';
    });
  }

  loadAnalytics();
});