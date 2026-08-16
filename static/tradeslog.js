document.addEventListener('DOMContentLoaded', () => {
  const openAddTradeBtn = document.getElementById('openAddTradeBtn');
  const backToTradesBtn = document.getElementById('backToTradesBtn');
  const saveTradeBtn = document.getElementById('saveTradeBtn');
  const tradesListView = document.getElementById('tradesListView');
  const addTradeFormView = document.getElementById('addTradeFormView');
  const editingTradeIdInput = document.getElementById('editingTradeId');
  const formHeaderTitle = document.getElementById('formHeaderTitle');

  let pendingDeleteId = null;

  // Custom Toast Notification System
  window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Discipline Questions State (5 Process Questions)
  const disciplineState = {
    followPlan: true,
    aPlusSetup: true,
    respectRisk: true,
    exactExecution: true,
    repeatTrade: true
  };

  const screenshots = { before: '', during: '', after: '' };

  // Initial View State
  if (tradesListView) tradesListView.style.display = 'block';
  if (addTradeFormView) addTradeFormView.style.display = 'none';

  // Calculate Process Score, Stars, and Message Feedback
  const updateDisciplineScore = () => {
    let yesCount = 0;
    if (disciplineState.followPlan) yesCount++;
    if (disciplineState.aPlusSetup) yesCount++;
    if (disciplineState.respectRisk) yesCount++;
    if (disciplineState.exactExecution) yesCount++;
    if (disciplineState.repeatTrade) yesCount++;

    const starDisplay = document.getElementById('starDisplay');
    const scoreBadge = document.getElementById('scoreBadge');
    const scoreTierTitle = document.getElementById('scoreTierTitle');
    const scoreFeedbackMsg = document.getElementById('scoreFeedbackMsg');

    if (!starDisplay) return;

    const goldStars = '⭐'.repeat(yesCount);
    const emptyStars = '☆'.repeat(5 - yesCount);
    starDisplay.textContent = goldStars + emptyStars;

    const tiers = {
      5: { badge: '5/5 = 100% 🟢', title: 'A+ Process Trade', msg: 'Perfect execution. You followed your process completely.', color: '#00FF87' },
      4: { badge: '4/5 = 80% 🟢', title: 'A Process Trade', msg: 'Strong execution with one minor deviation.', color: '#00FF87' },
      3: { badge: '3/5 = 60% 🟡', title: 'B Process Trade', msg: 'Partially followed. Some execution issues need attention.', color: '#FFD700' },
      2: { badge: '2/5 = 40% 🟠', title: 'C Process Trade', msg: 'Significant deviation from the plan.', color: '#FF8C00' },
      1: { badge: '1/5 = 20% 🔴', title: 'D Process Trade', msg: 'Poor execution. The trade was largely outside your process.', color: '#FF4D4D' },
      0: { badge: '0/5 = 0% 🔴', title: 'Process Violation', msg: 'You essentially abandoned your trading process.', color: '#FF4D4D' }
    };

    const currentTier = tiers[yesCount];
    scoreBadge.textContent = currentTier.badge;
    scoreBadge.style.color = currentTier.color;
    scoreTierTitle.textContent = currentTier.title;
    scoreTierTitle.style.color = currentTier.color;
    scoreFeedbackMsg.textContent = currentTier.msg;
  };

  const setToggleState = (field, value) => {
    disciplineState[field] = value;
    const group = document.querySelector(`[data-toggle="${field}"]`);
    if (group) {
      group.querySelectorAll('.btn-toggle').forEach(btn => {
        const isTrue = btn.getAttribute('data-val') === 'true';
        btn.classList.toggle('active', isTrue === value);
      });
    }
    updateDisciplineScore();
  };

  // Reset Form for New Trade
  const resetForm = () => {
    if (editingTradeIdInput) editingTradeIdInput.value = '';
    if (formHeaderTitle) formHeaderTitle.textContent = 'Add New Trade';

    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dateInput = document.getElementById('tradeDate');
    if (dateInput) {
      dateInput.value = today;
      updateDay(today);
    }

    document.getElementById('symbol').value = 'XAUUSD';
    document.getElementById('direction').value = 'Long';
    document.getElementById('session').value = 'New York';
    document.getElementById('setup').value = '30Min S/R';
    if (document.getElementById('marketCondition')) {
      document.getElementById('marketCondition').value = 'Trending';
    }
    
    document.getElementById('lotSize').value = '0.10';
    document.getElementById('entryPrice').value = '';
    document.getElementById('stopLoss').value = '';
    document.getElementById('takeProfit').value = '';
    document.getElementById('exitPrice').value = '';
    document.getElementById('entryTime').value = '';
    document.getElementById('exitTime').value = '';

    document.getElementById('riskPercent').value = '1.0';
    document.getElementById('plannedRisk').value = '100';
    document.getElementById('pnlDisplay').value = '$0.00';
    document.getElementById('rMultipleDisplay').value = '0.00R';

    document.getElementById('emotionBefore').value = 'Calm';
    document.getElementById('emotionDuring').value = 'Calm';
    document.getElementById('emotionAfter').value = 'Calm';
    
    document.getElementById('confidenceLevel').value = 8;
    document.getElementById('stressLevel').value = 3;
    document.getElementById('fomoLevel').value = 2;
    document.getElementById('confVal').textContent = '8';
    document.getElementById('stressVal').textContent = '3';
    document.getElementById('fomoVal').textContent = '2';

    setToggleState('followPlan', true);
    setToggleState('aPlusSetup', true);
    setToggleState('respectRisk', true);
    setToggleState('exactExecution', true);
    setToggleState('repeatTrade', true);

    document.getElementById('tradeNotes').value = '';
    document.getElementById('whatWentWell').value = '';
    document.getElementById('whatWentWrong').value = '';
    document.getElementById('lessonLearned').value = '';

    screenshots.before = '';
    screenshots.during = '';
    screenshots.after = '';
    resetPreview('beforePreview', 'Click or Drag Image Here');
    resetPreview('duringPreview', 'Click or Drag Image Here');
    resetPreview('afterPreview', 'Click or Drag Image Here');
  };

  const resetPreview = (previewId, defaultText) => {
    const el = document.getElementById(previewId);
    if (el) {
      el.style.backgroundImage = 'none';
      el.textContent = defaultText;
    }
  };

  if (openAddTradeBtn) {
    openAddTradeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetForm();
      if (tradesListView) tradesListView.style.display = 'none';
      if (addTradeFormView) addTradeFormView.style.display = 'block';
    });
  }

  if (backToTradesBtn) {
    backToTradesBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (addTradeFormView) addTradeFormView.style.display = 'none';
      if (tradesListView) tradesListView.style.display = 'block';
    });
  }

  // Exact Array of Days
const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Timezone-safe date parser
function parseDateSafely(dateStr) {
  if (!dateStr) return null;
  dateStr = String(dateStr).trim();

  // If format is DD-MM-YYYY (e.g. 01-08-2026 or 03-08-2026)
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // If format is YYYY-MM-DD (e.g. 2026-08-01)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    } else {
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }
  }

  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Updated updateDay function
const updateDay = (dateStr) => {
  const dayInput = document.getElementById('dayOfWeek') || document.getElementById('dayAuto') || document.querySelector('input[name="day_of_week"]');
  if (!dayInput) return;

  const dateObj = parseDateSafely(dateStr);
  if (dateObj) {
    dayInput.value = dayOfWeekNames[dateObj.getDay()];
  } else {
    dayInput.value = '';
  }
};

  const dateInput = document.getElementById('tradeDate');
  if (dateInput) {
    dateInput.addEventListener('change', (e) => updateDay(e.target.value));
  }

  // Dynamic Performance Calculations
  const calculatePerformance = () => {
    const entry = parseFloat(document.getElementById('entryPrice')?.value) || 0;
    const exit = parseFloat(document.getElementById('exitPrice')?.value) || 0;
    const lots = parseFloat(document.getElementById('lotSize')?.value) || 0;
    const riskAmt = parseFloat(document.getElementById('plannedRisk')?.value) || 100;
    const direction = document.getElementById('direction')?.value || 'Long';

    if (entry > 0 && exit > 0) {
      const gainPerUnit = direction === 'Long' ? (exit - entry) : (entry - exit);
      const pnl = gainPerUnit * lots * 100;
      const rMultiple = riskAmt > 0 ? (pnl / riskAmt) : 0;

      const pnlEl = document.getElementById('pnlDisplay');
      const rEl = document.getElementById('rMultipleDisplay');

      if (pnlEl) pnlEl.value = `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`;
      if (rEl) rEl.value = `${rMultiple >= 0 ? '+' : ''}${rMultiple.toFixed(2)}R`;
    }
  };

  ['entryPrice', 'exitPrice', 'stopLoss', 'lotSize', 'plannedRisk', 'direction'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', calculatePerformance);
      el.addEventListener('change', calculatePerformance);
    }
  });

  // Slider Value Updates
  const bindSlider = (sliderId, valId) => {
    const slider = document.getElementById(sliderId);
    const valText = document.getElementById(valId);
    if (slider && valText) {
      slider.addEventListener('input', () => valText.textContent = slider.value);
    }
  };
  bindSlider('confidenceLevel', 'confVal');
  bindSlider('stressLevel', 'stressVal');
  bindSlider('fomoLevel', 'fomoVal');

  // Discipline Toggles Click Handler
  document.querySelectorAll('.btn-group').forEach(group => {
    const field = group.getAttribute('data-toggle');
    const btns = group.querySelectorAll('.btn-toggle');

    btns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const val = btn.getAttribute('data-val') === 'true';
        setToggleState(field, val);
      });
    });
  });

  // Image Upload Bindings
  const bindUpload = (inputId, previewId, key) => {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!input || !preview) return;

    preview.addEventListener('click', () => input.click());

    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          screenshots[key] = evt.target.result;
          preview.style.backgroundImage = `url(${evt.target.result})`;
          preview.style.backgroundSize = 'cover';
          preview.style.backgroundPosition = 'center';
          preview.textContent = '';
        };
        reader.readAsDataURL(file);
      }
    });
  };

  bindUpload('beforeImg', 'beforePreview', 'before');
  bindUpload('duringImg', 'duringPreview', 'during');
  bindUpload('afterImg', 'afterPreview', 'after');

  // Save Trade Action (Handles both Create [POST] & Edit [PUT])
  if (saveTradeBtn) {
    saveTradeBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const rawDate = document.getElementById('tradeDate')?.value || new Date().toISOString().split('T')[0];
      const formattedDate = new Date(rawDate).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

      const tradeData = {
        trade_date: formattedDate,
        day_of_week: document.getElementById('dayOfWeek')?.value || 'Sunday',
        symbol: document.getElementById('symbol')?.value || 'XAUUSD',
        direction: document.getElementById('direction')?.value || 'Long',
        session: document.getElementById('session')?.value || 'New York',
        setup: document.getElementById('setup')?.value || '30Min S/R',
        market_condition: document.getElementById('marketCondition')?.value || 'Trending',
        
        lot_size: parseFloat(document.getElementById('lotSize')?.value) || 0.10,
        entry_price: parseFloat(document.getElementById('entryPrice')?.value) || 0.0,
        stop_loss: parseFloat(document.getElementById('stopLoss')?.value) || 0.0,
        take_profit: parseFloat(document.getElementById('takeProfit')?.value) || 0.0,
        exit_price: parseFloat(document.getElementById('exitPrice')?.value) || 0.0,
        entry_time: document.getElementById('entryTime')?.value || '',
        exit_time: document.getElementById('exitTime')?.value || '',

        risk_percent: parseFloat(document.getElementById('riskPercent')?.value) || 1.0,
        planned_risk: parseFloat(document.getElementById('plannedRisk')?.value) || 100.0,

        emotion_before: document.getElementById('emotionBefore')?.value || 'Calm',
        emotion_during: document.getElementById('emotionDuring')?.value || 'Calm',
        emotion_after: document.getElementById('emotionAfter')?.value || 'Calm',
        confidence_level: parseInt(document.getElementById('confidenceLevel')?.value) || 8,
        stress_level: parseInt(document.getElementById('stressLevel')?.value) || 3,
        fomo_level: parseInt(document.getElementById('fomoLevel')?.value) || 2,

        follow_plan: disciplineState.followPlan,
        exit_early: disciplineState.aPlusSetup,
        follow_checklist: disciplineState.respectRisk,
        overtraded: disciplineState.exactExecution,
        move_stop: disciplineState.repeatTrade,

        trade_notes: document.getElementById('tradeNotes')?.value || '',
        what_went_well: document.getElementById('whatWentWell')?.value || '',
        what_went_wrong: document.getElementById('whatWentWrong')?.value || '',
        lesson_learned: document.getElementById('lessonLearned')?.value || '',

        before_screenshot: screenshots.before,
        during_screenshot: screenshots.during,
        after_screenshot: screenshots.after
      };

      const editingId = editingTradeIdInput?.value;
      const url = editingId ? `/api/trades/${editingId}` : '/api/trades';
      const method = editingId ? 'PUT' : 'POST';

      try {
        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tradeData)
        });

        const resData = await response.json();

        if (response.ok) {
          showToast(editingId ? 'Trade updated successfully!' : 'Trade logged successfully!', 'success');
          addTradeFormView.style.display = 'none';
          tradesListView.style.display = 'block';
          fetchAndRenderTrades();
        } else {
          showToast(resData.message || 'Failed to save trade.', 'error');
        }
      } catch (err) {
        console.error('Error saving trade:', err);
        showToast('Server connection error.', 'error');
      }
    });
  }

  // Delete Modal Confirmation Handlers
  const deleteModal = document.getElementById('deleteModal');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      if (deleteModal) deleteModal.style.display = 'none';
      pendingDeleteId = null;
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!pendingDeleteId) return;

      try {
        const response = await fetch(`/api/trades/${pendingDeleteId}`, { method: 'DELETE' });
        if (response.ok) {
          showToast('Trade deleted successfully!', 'success');
          fetchAndRenderTrades();
        } else {
          showToast('Error deleting trade.', 'error');
        }
      } catch (err) {
        console.error('Delete error:', err);
        showToast('Server connection error.', 'error');
      } finally {
        if (deleteModal) deleteModal.style.display = 'none';
        pendingDeleteId = null;
      }
    });
  }

  window.deleteTrade = function(tradeId) {
    pendingDeleteId = tradeId;
    if (deleteModal) deleteModal.style.display = 'flex';
  };

  fetchAndRenderTrades();
});

// Edit Trade Handler
window.editTrade = async function(tradeId) {
  try {
    const response = await fetch('/api/trades');
    const trades = await response.json();
    const trade = trades.find(t => t.id === tradeId);

    if (!trade) {
      showToast('Trade record not found.', 'error');
      return;
    }

    document.getElementById('editingTradeId').value = trade.id;
    document.getElementById('formHeaderTitle').textContent = `Edit Trade (ID: ${trade.id})`;

    if (trade.trade_date) {
      const parsedDate = new Date(trade.trade_date);
      if (!isNaN(parsedDate)) {
        document.getElementById('tradeDate').value = parsedDate.toISOString().split('T')[0];
      }
    }
    
    document.getElementById('dayOfWeek').value = trade.day_of_week || '';
    document.getElementById('symbol').value = trade.symbol || 'XAUUSD';
    document.getElementById('marketCondition').value = trade.market_condition || 'Trending';
    document.getElementById('direction').value = trade.direction || 'Long';
    document.getElementById('session').value = trade.session || 'New York';
    document.getElementById('setup').value = trade.setup || '30Min S/R';
    if (document.getElementById('marketCondition')) {
      document.getElementById('marketCondition').value = trade.market_condition || 'Trending';
    }

    document.getElementById('lotSize').value = trade.lot_size || 0.10;
    document.getElementById('entryPrice').value = trade.entry_price || '';
    document.getElementById('stopLoss').value = trade.stop_loss || '';
    document.getElementById('takeProfit').value = trade.take_profit || '';
    document.getElementById('exitPrice').value = trade.exit_price || '';
    document.getElementById('entryTime').value = trade.entry_time || '';
    document.getElementById('exitTime').value = trade.exit_time || '';

    document.getElementById('riskPercent').value = trade.risk_percent || 1.0;
    document.getElementById('plannedRisk').value = trade.planned_risk || 100;

    const pnlEl = document.getElementById('pnlDisplay');
    const rEl = document.getElementById('rMultipleDisplay');
    if (pnlEl) pnlEl.value = `${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)}`;
    if (rEl) rEl.value = `${trade.r_multiple >= 0 ? '+' : ''}${trade.r_multiple.toFixed(2)}R`;

    document.getElementById('emotionBefore').value = trade.emotion_before || 'Calm';
    document.getElementById('emotionDuring').value = trade.emotion_during || 'Calm';
    document.getElementById('emotionAfter').value = trade.emotion_after || 'Calm';

    document.getElementById('confidenceLevel').value = trade.confidence_level || 8;
    document.getElementById('stressLevel').value = trade.stress_level || 3;
    document.getElementById('fomoLevel').value = trade.fomo_level || 2;
    document.getElementById('confVal').textContent = trade.confidence_level || 8;
    document.getElementById('stressVal').textContent = trade.stress_level || 3;
    document.getElementById('fomoVal').textContent = trade.fomo_level || 2;

    const setToggle = (field, val) => {
      const group = document.querySelector(`[data-toggle="${field}"]`);
      if (group) {
        group.querySelectorAll('.btn-toggle').forEach(btn => {
          const isTrue = btn.getAttribute('data-val') === 'true';
          btn.classList.toggle('active', isTrue === Boolean(val));
        });
      }
    };

    setToggle('followPlan', trade.follow_plan);
    setToggle('aPlusSetup', trade.exit_early);
    setToggle('respectRisk', trade.follow_checklist);
    setToggle('exactExecution', trade.overtraded);
    setToggle('repeatTrade', trade.move_stop);

    document.getElementById('tradeNotes').value = trade.trade_notes || '';
    document.getElementById('whatWentWell').value = trade.what_went_well || '';
    document.getElementById('whatWentWrong').value = trade.what_went_wrong || '';
    document.getElementById('lessonLearned').value = trade.lesson_learned || '';

    const loadPreview = (previewId, imgData) => {
      const el = document.getElementById(previewId);
      if (el && imgData) {
        el.style.backgroundImage = `url(${imgData})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
      }
    };
    loadPreview('beforePreview', trade.before_screenshot);
    loadPreview('duringPreview', trade.during_screenshot);
    loadPreview('afterPreview', trade.after_screenshot);

    document.getElementById('tradesListView').style.display = 'none';
    document.getElementById('addTradeFormView').style.display = 'block';

  } catch (err) {
    console.error('Failed to open trade for editing:', err);
    showToast('Failed to load trade details.', 'error');
  }
};

// Fetch & Render Trades Table with Date Range Filters
async function fetchAndRenderTrades() {
  try {
    const startDate = document.getElementById('tradeLogStartDate')?.value;
    const endDate = document.getElementById('tradeLogEndDate')?.value;

    let url = '/api/trades';
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url);
    const trades = await response.json();

    const tbody = document.querySelector('.trades-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (trades.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#8E9BAE;">No trades found for the selected date range.</td></tr>`;
      return;
    }

    trades.forEach((trade, index) => {
      const row = document.createElement('tr');
      const isWin = trade.pnl > 0;
      const pnlColor = isWin ? '#00FF87' : (trade.pnl < 0 ? '#FF4D4D' : '#8E9BAE');
      const dirBg = trade.direction === 'Long' ? 'rgba(0, 255, 135, 0.15)' : 'rgba(255, 77, 77, 0.15)';
      const dirColor = trade.direction === 'Long' ? '#00FF87' : '#FF4D4D';

      row.innerHTML = `
        <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${index + 1}</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${trade.trade_date}</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);"><strong>${trade.symbol}</strong></td>
        <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);"><span style="background:${dirBg}; color:${dirColor}; padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px;">${trade.direction}</span></td>
        <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${trade.session}</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">${trade.setup}</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); color:${pnlColor}; font-weight:700;">
          ${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)} (${trade.r_multiple >= 0 ? '+' : ''}${trade.r_multiple.toFixed(2)}R)
        </td>
        <td style="padding: 14px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); display: flex; gap: 8px;">
          <button onclick="window.editTrade(${trade.id})" class="btn-edit-trade" style="background: rgba(0, 255, 135, 0.15); color: #00FF87; border: 1px solid rgba(0, 255, 135, 0.3); padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">View / Edit</button>
          <button onclick="window.deleteTrade(${trade.id})" class="btn-delete-trade" style="background: rgba(255, 77, 77, 0.15); color: #ff4d4d; border: 1px solid rgba(255, 77, 77, 0.3); padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error('Error loading trades:', err);
  }
}

// Bind Filter Buttons and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  const startDateInput = document.getElementById('tradeLogStartDate');
  const endDateInput = document.getElementById('tradeLogEndDate');
  const thisWeekBtn = document.getElementById('thisWeekBtn');
  const thisMonthBtn = document.getElementById('thisMonthBtn');
  const resetBtn = document.getElementById('resetTradeLogFilterBtn');

  if (startDateInput) startDateInput.addEventListener('change', fetchAndRenderTrades);
  if (endDateInput) endDateInput.addEventListener('change', fetchAndRenderTrades);

  // Preset: This Week
  if (thisWeekBtn) {
    thisWeekBtn.addEventListener('click', () => {
      const now = new Date();
      const first = now.getDate() - now.getDay();
      const firstDay = new Date(now.setDate(first)).toISOString().split('T')[0];
      const lastDay = new Date().toISOString().split('T')[0];

      if (startDateInput) startDateInput.value = firstDay;
      if (endDateInput) endDateInput.value = lastDay;
      fetchAndRenderTrades();
    });
  }

  // Preset: This Month
  if (thisMonthBtn) {
    thisMonthBtn.addEventListener('click', () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      if (startDateInput) startDateInput.value = firstDay;
      if (endDateInput) endDateInput.value = lastDay;
      fetchAndRenderTrades();
    });
  }

  // Reset Filters
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (startDateInput) startDateInput.value = '';
      if (endDateInput) endDateInput.value = '';
      fetchAndRenderTrades();
    });
  }
});