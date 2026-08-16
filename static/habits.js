document.addEventListener('DOMContentLoaded', () => {
  // 1. Sync Profile Avatar and Username from Settings
  const storedAvatar = localStorage.getItem('edgecraft_avatar') || localStorage.getItem('user_profile_img') || localStorage.getItem('profileImage');
  const storedName = localStorage.getItem('edgecraft_username') || localStorage.getItem('user_name');

  const avatarImg = document.getElementById('sidebarAvatar');
  const nameEl = document.getElementById('sidebarName');

  if (storedAvatar && avatarImg) avatarImg.src = storedAvatar;
  if (storedName && nameEl) nameEl.textContent = storedName;

  // 2. Routines List
  const habits = [
    "Desk 30min before session",
    "Breathing 10 cycles",
    "Mark Levels D→4H→1H→30M",
    "Bias decided",
    "4Q's clarity checklist",
    "Max 2 trades",
    "1% risk per trade",
    "No rule breaks",
    "Step away after T1 loss",
    "Waited 30+ min"
  ];

  const STATES = ['empty', 'yes', 'no', 'na'];
  const ICONS = { empty: '•', yes: '✓', no: '✕', na: '⊘' };
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  let habitData = JSON.parse(localStorage.getItem('edgecraft_habits_db') || '{}');
  let currentTradingDays = [];

  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  // Dynamic Generator: Only Monday to Friday (Trading Days)
  function getTradingDays(startStr, endStr) {
    const list = [];
    if (!startStr || !endStr) return list;

    let curr = new Date(startStr + 'T00:00:00');
    const end = new Date(endStr + 'T00:00:00');

    while (curr <= end) {
      const dayOfWeek = curr.getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Mon=1, Fri=5
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        const iso = `${yyyy}-${mm}-${dd}`;
        list.push({
          iso: iso,
          day: dd,
          label: dayNames[dayOfWeek]
        });
      }
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  }

  // Set "This Month" Mon-Fri Range
  function setThisMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);

    const fStr = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-01`;
    const lStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

    if (startDateInput && endDateInput) {
      startDateInput.value = fStr;
      endDateInput.value = lStr;
    }
    renderGrid();
  }

  // Render Grid Columns & Rows Dynamically
  function renderGrid() {
    if (!startDateInput || !endDateInput) return;
    currentTradingDays = getTradingDays(startDateInput.value, endDateInput.value);

    const thead = document.getElementById('tableHeaderRow');
    const tbody = document.getElementById('tableBody');
    const tfoot = document.getElementById('tableFooterScores');

    if (!thead || !tbody || !tfoot) return;

    thead.innerHTML = '<th class="th-routine">ROUTINES</th><th class="th-score">SCORE</th>';
    tbody.innerHTML = '';
    tfoot.innerHTML = '<td class="th-routine"><strong>Daily Score</strong></td><td class="th-score" id="totalAvgFooterScore">0%</td>';

    // Header Columns
    currentTradingDays.forEach(d => {
      const th = document.createElement('th');
      th.innerHTML = `${d.day}<br><span style="font-size: 9px; opacity: 0.7;">${d.label}</span>`;
      thead.insertBefore(th, thead.lastElementChild);
    });

    // Habit Rows
    habits.forEach((habit, rIdx) => {
      const tr = document.createElement('tr');
      const tdTitle = document.createElement('td');
      tdTitle.className = 'th-routine';
      tdTitle.textContent = habit;
      tr.appendChild(tdTitle);

      currentTradingDays.forEach(d => {
        const td = document.createElement('td');
        const btn = document.createElement('button');
        const dayState = (habitData[d.iso] && habitData[d.iso][rIdx]) ? habitData[d.iso][rIdx] : 'empty';

        btn.className = `bubble-btn ${dayState}`;
        btn.textContent = ICONS[dayState];

        btn.addEventListener('click', () => {
          const curr = (habitData[d.iso] && habitData[d.iso][rIdx]) ? habitData[d.iso][rIdx] : 'empty';
          const next = STATES[(STATES.indexOf(curr) + 1) % STATES.length];

          if (!habitData[d.iso]) habitData[d.iso] = {};
          habitData[d.iso][rIdx] = next;

          btn.className = `bubble-btn ${next}`;
          btn.textContent = ICONS[next];

          recalculateAllMetrics();
        });

        td.appendChild(btn);
        tr.appendChild(td);
      });

      const tdScore = document.createElement('td');
      tdScore.className = 'th-score habit-row-score';
      tdScore.id = `habitScore_${rIdx}`;
      tdScore.textContent = '-';
      tr.appendChild(tdScore);

      tbody.appendChild(tr);
    });

    // Footer Columns
    currentTradingDays.forEach((d, i) => {
      const td = document.createElement('td');
      td.className = 'th-score day-col-score';
      td.id = `dayScore_${i}`;
      td.textContent = '-';
      tfoot.insertBefore(td, tfoot.lastElementChild);
    });

    recalculateAllMetrics();
  }

  // Master Dynamic Calculations & Streak Logic
  function recalculateAllMetrics() {
    let totalLogged = 0;
    let totalCompleted = 0;
    let habitSuccessCounts = Array(habits.length).fill(0);
    let habitLoggedCounts = Array(habits.length).fill(0);

    let dayMissSummary = {};
    let perfectDaysCount = 0;
    let perfectDaysList = [];

    currentTradingDays.forEach((d, cIdx) => {
      let dLogged = 0;
      let dSuccess = 0;
      let dMissed = 0;

      habits.forEach((_, rIdx) => {
        const val = (habitData[d.iso] && habitData[d.iso][rIdx]) ? habitData[d.iso][rIdx] : 'empty';
        if (val === 'yes') {
          totalLogged++;
          totalCompleted++;
          dLogged++;
          dSuccess++;
          habitSuccessCounts[rIdx]++;
          habitLoggedCounts[rIdx]++;
        } else if (val === 'no') {
          totalLogged++;
          dLogged++;
          dMissed++;
          habitLoggedCounts[rIdx]++;
          dayMissSummary[d.label] = (dayMissSummary[d.label] || 0) + 1;
        }
      });

      // Update Column Score in Footer
      const dayEl = document.getElementById(`dayScore_${cIdx}`);
      if (dayEl) {
        if (dLogged === 0) {
          dayEl.textContent = '-';
          dayEl.style.color = 'var(--txt-dim)';
        } else {
          const dayPct = Math.round((dSuccess / dLogged) * 100);
          dayEl.textContent = `${dayPct}%`;
          dayEl.style.color = dayPct >= 70 ? 'var(--accent-emerald-text)' : '#ef4444';
        }
      }

      // Classification: Perfect (all done), Broken (has misses), In-Progress (partially filled today)
      const isPerfectDay = (dLogged === habits.length) && (dSuccess === habits.length) && (dMissed === 0);
      const isBrokenDay = (dMissed > 0);

      if (isPerfectDay) {
        perfectDaysList.push({ iso: d.iso, status: 'pass' });
        perfectDaysCount++;
      } else if (isBrokenDay) {
        perfectDaysList.push({ iso: d.iso, status: 'fail' });
      } else if (dLogged > 0 && dLogged < habits.length) {
        perfectDaysList.push({ iso: d.iso, status: 'in_progress' });
      } else {
        perfectDaysList.push({ iso: d.iso, status: 'empty' });
      }
    });

    // Update Routine Row Scores
    habits.forEach((_, rIdx) => {
      const el = document.getElementById(`habitScore_${rIdx}`);
      if (el) {
        if (habitLoggedCounts[rIdx] === 0) {
          el.textContent = '-';
          el.style.color = 'var(--txt-dim)';
        } else {
          const score = Math.round((habitSuccessCounts[rIdx] / habitLoggedCounts[rIdx]) * 100);
          el.textContent = `${score}%`;
          el.style.color = score >= 70 ? 'var(--accent-emerald-text)' : '#ef4444';
        }
      }
    });

    // 1. Best Streak: Longest consecutive chain of perfect days
    let bestStreak = 0;
    let tempStreak = 0;
    perfectDaysList.forEach(item => {
      if (item.status === 'pass') {
        tempStreak++;
        if (tempStreak > bestStreak) bestStreak = tempStreak;
      } else if (item.status === 'fail' || item.status === 'empty') {
        tempStreak = 0;
      }
    });

    // 2. Current Streak: Consecutive passes backwards, skipping in-progress days
    let currentStreak = 0;
    for (let i = perfectDaysList.length - 1; i >= 0; i--) {
      const st = perfectDaysList[i].status;
      if (st === 'empty' || st === 'in_progress') {
        continue;
      }
      if (st === 'pass') {
        currentStreak++;
      } else if (st === 'fail') {
        break;
      }
    }

    // Update Metric Cards
    const overallRate = totalLogged > 0 ? Math.round((totalCompleted / totalLogged) * 100) : 0;

    const totalHabitsEl = document.getElementById('totalHabitsCount');
    const compRateEl = document.getElementById('completionRateVal');
    const bestStreakEl = document.getElementById('bestStreakVal');
    const currentStreakEl = document.getElementById('currentStreakVal');
    const checkinEl = document.getElementById('checkinCount');
    const miniRing = document.getElementById('checkinMiniRing');
    const miniRingText = document.getElementById('miniRingPercent');

    if (totalHabitsEl) totalHabitsEl.textContent = habits.length;
    if (compRateEl) compRateEl.textContent = `${overallRate}%`;
    if (bestStreakEl) bestStreakEl.innerHTML = `${bestStreak} <small>Days</small>`;
    if (currentStreakEl) currentStreakEl.innerHTML = `${currentStreak} <small>Days</small>`;
    if (checkinEl) checkinEl.textContent = `${totalCompleted} / ${totalLogged}`;
    if (miniRing) miniRing.style.setProperty('--progress', overallRate);
    if (miniRingText) miniRingText.textContent = `${overallRate}%`;

    // Bottom Cards
    const gauge = document.getElementById('overallGauge');
    const gaugeNum = document.getElementById('gaugeNumText');
    const sRowBest = document.getElementById('streakRowBest');
    const sRowCurrent = document.getElementById('streakRowCurrent');
    const sRowPerfect = document.getElementById('streakRowPerfect');

    if (gauge) gauge.style.setProperty('--progress', overallRate);
    if (gaugeNum) gaugeNum.textContent = `${overallRate}%`;
    if (sRowBest) sRowBest.textContent = `${bestStreak} days`;
    if (sRowCurrent) sRowCurrent.textContent = `${currentStreak} days`;
    if (sRowPerfect) sRowPerfect.textContent = `${perfectDaysCount} days`;

    // Insights Engine
    updateDynamicInsights(overallRate, habitSuccessCounts, habitLoggedCounts, dayMissSummary);
  }

  function updateDynamicInsights(rate, hSuccess, hLogged, dayMisses) {
    const container = document.querySelector('.insights-stack');
    if (!container) return;

    let worstHabitIndex = -1;
    let worstHabitScore = 101;
    habits.forEach((_, i) => {
      if (hLogged[i] > 0) {
        const score = (hSuccess[i] / hLogged[i]) * 100;
        if (score < worstHabitScore) {
          worstHabitScore = score;
          worstHabitIndex = i;
        }
      }
    });

    let mostMissedDay = 'None';
    let maxMisses = 0;
    for (const [day, count] of Object.entries(dayMisses)) {
      if (count > maxMisses) {
        maxMisses = count;
        mostMissedDay = day;
      }
    }

    let html = '';
    if (rate >= 80) {
      html += `<p>🔥 <strong style="color:var(--accent-emerald-text);">Strong Consistency!</strong> Execution is solid at ${rate}% discipline.</p>`;
    } else if (rate >= 50) {
      html += `<p>⚖️ <strong>Moderate Execution.</strong> Focus on maintaining pre-market routines without cutting corners.</p>`;
    } else {
      html += `<p>⚠️ <strong style="color:#ef4444;">High Execution Leakage.</strong> Tighten discipline follow-through across trading sessions.</p>`;
    }

    if (maxMisses > 0) {
      html += `<p>⚠️ Most missed day: <strong>${mostMissedDay}s</strong> (${maxMisses} missed routines).</p>`;
    } else {
      html += `<p>✨ No routine misses recorded in this period!</p>`;
    }

    if (worstHabitIndex !== -1 && worstHabitScore < 100) {
      html += `<p>🎯 Routine to focus on: <strong>"${habits[worstHabitIndex]}"</strong> (${Math.round(worstHabitScore)}% completion).</p>`;
    }

    container.innerHTML = html;
  }

  // Toast Notification
  function showProfessionalToast(title, subtitle) {
    let toast = document.getElementById('edgecraftToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'edgecraftToast';
      toast.className = 'edgecraft-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `
      <div class="toast-icon">✓</div>
      <div class="toast-text">
        <strong>${title}</strong>
        <span>${subtitle}</span>
      </div>
    `;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }

  // Event Listeners
  startDateInput?.addEventListener('change', renderGrid);
  endDateInput?.addEventListener('change', renderGrid);
  document.getElementById('btnThisMonth')?.addEventListener('click', setThisMonth);

  // Save Log Handler
  document.getElementById('btnSaveLog')?.addEventListener('click', () => {
    localStorage.setItem('edgecraft_habits_db', JSON.stringify(habitData));
    showProfessionalToast(
      'Discipline Log Saved Successfully',
      'All routine entries and execution metrics have been saved to local memory.'
    );
  });

  // Default Init
  setThisMonth();
});