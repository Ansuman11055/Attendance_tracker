// Data Structures
let timetable = JSON.parse(localStorage.getItem('timetable')) || {};
let attendanceData = JSON.parse(localStorage.getItem('ece_attendance')) || {};
let attendanceTarget = parseInt(localStorage.getItem('ece_attendance_target') || '75', 10);

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('ece_theme') || 'light';
    const themeToggle = document.getElementById('themeToggle');
    
    setTheme(savedTheme);
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('ece_theme', newTheme);
    });
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeIcon = document.querySelector('.theme-icon');
        const themeText = document.getElementById('theme-text');

        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        if (themeText) {
            themeText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
        }
        
        window.dispatchEvent(new CustomEvent('themechanged'));

        document.documentElement.style.transition = 'all 0.3s ease';
        setTimeout(() => {
            document.documentElement.style.transition = '';
        }, 300);
    }
}

// Tab switching function
function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector(`.nav-tab[onclick="showTab('${tabName}')"]`).classList.add('active');

  if (tabName === 'dashboard') {
      triggerDashboardAnimations();
  }
}

// --- ANIMATION LOGIC ---

function triggerDashboardAnimations() {
    const cards = document.querySelectorAll('#dashboard .stat-card, #dashboard .subject-stat-card');
    
    cards.forEach(card => {
        card.style.opacity = '0';
        const percentageEl = card.querySelector('.attendance-percentage, .subject-percentage');
        const numberEl = card.querySelector('p:not([class])'); 
        if (percentageEl) animateCountUp(percentageEl);
        if (numberEl) animateCountUp(numberEl);
    });

    anime.timeline({
        easing: 'easeOutExpo',
    })
    .add({
        targets: cards,
        opacity: [0, 1],
        translateY: [40, 0],
        translateZ: [-300, 0],
        rotateX: ['-90deg', '0deg'],
        delay: anime.stagger(80),
        duration: 1200
    });
}

function animateCountUp(el) {
    const text = el.innerText;
    const target = parseFloat(text.replace('%', ''));
    if (isNaN(target)) return;

    el.innerText = '0';
    let current = 0;
    const increment = target / 100;
    const interval = setInterval(() => {
        current += increment;
        if (current >= target) {
            clearInterval(interval);
            el.innerText = text;
        } else {
            if (text.includes('.')) {
                el.innerText = `${current.toFixed(2)}%`;
            } else {
                el.innerText = Math.ceil(current);
            }
        }
    }, 15);
}

function initTimetableWaveEffect() {
    const cells = document.querySelectorAll('#timetable .subject-cell');

    cells.forEach(cell => {
        cell.addEventListener('mouseenter', function() {
            anime.remove(this);
            anime({
                targets: this,
                scale: 1.05,
                translateZ: 20,
                rotateY: anime.random(-10, 10),
                duration: 400,
                easing: 'easeOutSine'
            });
        });

        cell.addEventListener('mouseleave', function() {
            anime.remove(this);
            anime({
                targets: this,
                scale: 1,
                translateZ: 0,
                rotateY: 0,
                duration: 600,
                easing: 'easeOutElastic(1, .6)'
            });
        });
    });
}


// --- Main Application Logic ---

function renderTimetable() {
  const grid = document.getElementById('timetableGrid');
  const allTimeSlots = getAllTimeSlots();

  if (Object.keys(timetable).length === 0) {
    grid.innerHTML = '<p>No timetable data. Import your file in the "Timetable Setup" tab.</p>';
    return;
  }

  let tableHtml = '<table><thead><tr><th>Time</th>';
  days.forEach(day => tableHtml += `<th>${day}</th>`);
  tableHtml += '</tr></thead><tbody>';

  allTimeSlots.forEach(time => {
    tableHtml += `<tr><td>${time}</td>`;
    days.forEach(day => {
      const key = `${day}-${time}`;
      const subject = timetable[key];
      if (subject) {
        tableHtml += `<td class="subject-cell" data-key="${key}" title="Click to remove this class"><div class="subject-code">${subject.code}</div><div class="subject-name">${subject.name}</div></td>`;
      } else {
        tableHtml += '<td></td>';
      }
    });
    tableHtml += '</tr>';
  });

  tableHtml += '</tbody></table>';
  grid.innerHTML = tableHtml;
  initTimetableWaveEffect();
}

function handleTimetableCellClick(event) {
    const cell = event.target.closest('.subject-cell');
    if (!cell) return;

    const key = cell.dataset.key;
    if (!key || !timetable[key]) return;

    const subject = timetable[key];
    const confirmation = confirm(`Are you sure you want to remove the class "${subject.code}" on ${subject.day} at ${subject.time}?`);

    if (confirmation) {
        delete timetable[key];
        localStorage.setItem('timetable', JSON.stringify(timetable));
        renderTimetable();
        updateDashboard();
        alert(`Class "${subject.code}" has been removed.`);
    }
}

function getAttendanceClass(percentage) {
    if (percentage >= 85) return 'excellent';
    if (percentage >= 70) return 'good';
    return 'poor';
}

function getSubjectAttendanceClass(percentage) {
    if (percentage >= 85) return 'subject-excellent';
    if (percentage >= 70) return 'subject-good';
    return 'subject-poor';
}

function sortTimetableSlots(slotA, slotB) {
  const parseTime = (timeStr) => {
    if (!timeStr || !timeStr.includes(':')) return [99, 99];
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return [99, 99];
    return [hours, minutes];
  };

  const startTimeA = slotA.split('-')[0];
  const startTimeB = slotB.split('-')[0];
  const [hoursA, minutesA] = parseTime(startTimeA);
  const [hoursB, minutesB] = parseTime(startTimeB);

  if (hoursA !== hoursB) return hoursA - hoursB;
  return minutesA - minutesB;
}

function getAllTimeSlots() {
  const timeSlots = new Set();
  Object.values(timetable).forEach(subject => {
    if (subject.time) timeSlots.add(subject.time);
  });
  return Array.from(timeSlots).sort(sortTimetableSlots);
}

function clearTimetable() {
  if (confirm('Are you sure you want to clear all timetable data? This action cannot be undone.')) {
    timetable = {};
    localStorage.removeItem('timetable');
    renderTimetable();
    updateDashboard();
    alert('Timetable cleared.');
  }
}

function resetApplication() {
  if (confirm('DANGER: This will permanently delete ALL timetable and attendance data. This action cannot be undone. Are you sure you want to proceed?')) {
    localStorage.removeItem('timetable');
    localStorage.removeItem('ece_attendance');
    localStorage.removeItem('ece_attendance_target');
    location.reload();
  }
}

function importTimetable() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('Please select a timetable file first.');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const timetableRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (timetableRows.length < 2) {
            alert("Error: The file seems to be empty or has no data rows.");
            return;
        }

        const newTimetable = {};
        const header = timetableRows[0].map(h => String(h).trim().toUpperCase());
        const dataRows = timetableRows.slice(1);

        const timeColumnIndex = header.findIndex(h => h === 'TIME' || h === 'TIME SLOT');
        if (timeColumnIndex === -1) {
            alert("Error: Could not find a 'Time' column in the file.");
            return;
        }

        const dayMap = {
            MONDAY: 'Monday', MON: 'Monday', TUESDAY: 'Tuesday', TUE: 'Tuesday',
            WEDNESDAY: 'Wednesday', WED: 'Wednesday', THURSDAY: 'Thursday', THU: 'Thursday', THURS: 'Thursday',
            FRIDAY: 'Friday', FRI: 'Friday', SATURDAY: 'Saturday', SAT: 'Saturday',
            SUNDAY: 'Sunday', SUN: 'Sunday',
        };

        const columnDayMap = {};
        header.forEach((headerText, index) => {
            if (dayMap[headerText]) columnDayMap[index] = dayMap[headerText];
        });

        const normalizeTime = (timeStr) => {
            if (!timeStr) return null;
            timeStr = String(timeStr).trim();
            
            const convertTo24Hour = (time, period) => {
                let [hours, minutes] = time.split(':').map(Number);
                if (period.toUpperCase() === 'PM' && hours < 12) hours += 12;
                if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            };
            
            const timeMatch = timeStr.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i);
            if (timeMatch) {
                let [_, startTime, endTime, period] = timeMatch;
                if (period) return `${convertTo24Hour(startTime, period)}-${convertTo24Hour(endTime, period)}`;
                else return `${startTime}-${endTime}`;
            }
            return timeStr.replace(/\s/g, '');
        };
        
        dataRows.forEach(row => {
            const timeSlotRaw = row[timeColumnIndex];
            const timeSlot = normalizeTime(timeSlotRaw);
            if (!timeSlot) return;

            for (const colIndex in columnDayMap) {
                const subjectString = row[colIndex];
                if (subjectString) {
                    const day = columnDayMap[colIndex];
                    const subjectKey = `${day}-${timeSlot}`;
                    let code = '', name = '';
                    const trimmedSubject = String(subjectString).trim();

                    let match = trimmedSubject.match(/^([A-Z]{2,3}-\d{3})\s+(.*?)(?:\s+\(.*\))?$/i);
                    if (match) {
                        code = match[1].toUpperCase();
                        name = match[2].trim();
                    } else {
                        code = trimmedSubject;
                    }
                    
                    newTimetable[subjectKey] = { code, name, day, time: timeSlot };
                }
            }
        });

        timetable = newTimetable;
        localStorage.setItem('timetable', JSON.stringify(timetable));
        renderTimetable();
        updateDashboard();
        alert('Timetable imported successfully!');
    };
    reader.readAsArrayBuffer(file);
}

function addManualClass(event) {
    event.preventDefault();
    const code = document.getElementById('subjectCode').value.trim();
    const name = document.getElementById('subjectName').value.trim();
    const day = document.getElementById('subjectDay').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;

    if (!code || !day || !startTime || !endTime) {
        alert('Please fill in Subject Code, Day, Start Time, and End Time.');
        return;
    }

    const timeSlot = `${startTime}-${endTime}`;
    const subjectKey = `${day}-${timeSlot}`;
    if (timetable[subjectKey]) {
        if (!confirm(`A class already exists: ${timetable[subjectKey].code}. Overwrite it?`)) {
            return;
        }
    }

    const newClass = { code: code.toUpperCase(), name, day, time: timeSlot };
    timetable[subjectKey] = newClass;
    localStorage.setItem('timetable', JSON.stringify(timetable));
    
    const form = document.getElementById('manualAddForm');
    const successMessage = document.getElementById('form-success-message');
    
    anime.timeline({
        easing: 'easeOutExpo',
        complete: () => {
            renderTimetable();
        }
    })
    .add({
        targets: form.elements,
        opacity: [1, 0],
        translateY: [0, -20],
        duration: 500,
        delay: anime.stagger(50)
    })
    .add({
        targets: form,
        rotateX: ['0deg', '90deg'],
        opacity: [1, 0],
        duration: 600,
        begin: () => { form.style.transformOrigin = 'top'; }
    }, '-=800')
    .add({
        targets: successMessage,
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 800,
        begin: () => { successMessage.style.display = 'block'; }
    })
    .add({
        targets: successMessage,
        opacity: [1, 0],
        duration: 800,
        delay: 1000,
        complete: () => {
            successMessage.style.display = 'none';
            form.reset();
            anime.set(form, { rotateX: '0deg', opacity: 1, transformOrigin: '50% 50%'});
            anime.set(form.elements, { opacity: 1, translateY: 0 });
        }
    });
}

function markAttendance(subjectKey, date, status) {
  const attKey = `${date}_${subjectKey}`;
  attendanceData[attKey] = status;
  localStorage.setItem('ece_attendance', JSON.stringify(attendanceData));
  loadDailySchedule();
  updateDashboard();
}

function loadDailySchedule() {
    const date = document.getElementById('attendanceDate').value;
    if (!date) return;
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    const scheduleDiv = document.getElementById('dailySchedule');
    const subjectsForDay = Object.values(timetable)
        .filter(s => s.day === dayOfWeek)
        .sort((a, b) => sortTimetableSlots(a.time, b.time));
    if (subjectsForDay.length === 0) {
        scheduleDiv.innerHTML = `<p>No classes scheduled for ${dayOfWeek}.</p>`;
        return;
    }
    let scheduleHtml = '';
    subjectsForDay.forEach(subject => {
        const subjectKey = `${subject.day}-${subject.time}`;
        const attKey = `${date}_${subjectKey}`;
        const currentStatus = attendanceData[attKey];
        scheduleHtml += `<div class="schedule-item"><div><div class="subject-code">${subject.code} (${subject.time})</div><div class="subject-name">${subject.name}</div></div><div class="attendance-status"><button class="${currentStatus === 'present' ? 'present' : ''}" onclick="markAttendance('${subjectKey}', '${date}', 'present')">Present</button><button class="${currentStatus === 'absent' ? 'absent' : ''}" onclick="markAttendance('${subjectKey}', '${date}', 'absent')">Absent</button></div></div>`;
    });
    scheduleDiv.innerHTML = scheduleHtml;
}

function calculateSubjectWiseStats() {
    const stats = {};
    for (const attKey in attendanceData) {
        const [date, subjectKey] = attKey.split('_');
        const subject = timetable[subjectKey];
        if (subject && subject.code) {
            if (!stats[subject.code]) {
                stats[subject.code] = { name: subject.name, total: 0, present: 0 };
            }
            stats[subject.code].total++;
            if (attendanceData[attKey] === 'present') {
                stats[subject.code].present++;
            }
        }
    }
    for (const code in stats) {
        const subjectStat = stats[code];
        subjectStat.percentage = subjectStat.total > 0 ? ((subjectStat.present / subjectStat.total) * 100).toFixed(2) : '0.00';
    }
    return stats;
}

function updateDashboard() {
  const statsDiv = document.getElementById('dashboardStats');
  const subjectWiseStatsDiv = document.getElementById('subjectWiseStats');
  const totalClasses = Object.keys(attendanceData).length;
  const presentCount = Object.values(attendanceData).filter(s => s === 'present').length;
  const absentCount = Object.values(attendanceData).filter(s => s === 'absent').length;
  const overallPercentage = totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(2) : 0;
  
  const overallAttendanceClass = totalClasses > 0 ? getAttendanceClass(parseFloat(overallPercentage)) : '';
  const displayPercentage = totalClasses > 0 ? `${overallPercentage}%` : 'N/A';
  
  statsDiv.innerHTML = `
    <div class="stat-card attendance-gauge attendance-${overallAttendanceClass}">
      <h4>📈 Overall Attendance</h4>
      <p class="attendance-percentage">${displayPercentage}</p>
    </div>
    <div class="stat-card">
      <h4>📚 Total Classes</h4>
      <p>${totalClasses}</p>
    </div>
    <div class="stat-card">
      <h4>✔️ Classes Attended</h4>
      <p>${presentCount}</p>
    </div>
    <div class="stat-card">
      <h4>❌ Classes Missed</h4>
      <p>${absentCount}</p>
    </div>
  `;
  
  const subjectStats = calculateSubjectWiseStats();
  let subjectStatsHtml = '';
  if (Object.keys(subjectStats).length === 0) {
      subjectWiseStatsDiv.innerHTML = '<p>No attendance data recorded yet to show subject-wise stats.</p>';
      return;
  }

  const sortedSubjectCodes = Object.keys(subjectStats).sort();
  sortedSubjectCodes.forEach(subjectCode => {
      const stat = subjectStats[subjectCode];
      const percentage = parseFloat(stat.percentage);
      const subjectClass = getSubjectAttendanceClass(percentage);
      const isBelowTarget = stat.total > 0 && percentage < attendanceTarget;
      
      subjectStatsHtml += `
        <div class="stat-card subject-stat-card ${subjectClass} ${isBelowTarget ? 'below-target' : ''}">
          <h4>${subjectCode}</h4>
          <p class="subject-percentage">${stat.percentage}%</p>
          <p style="font-size: 0.9em; color: var(--text-secondary); margin-top: 5px;">
            ${stat.present} / ${stat.total} classes
          </p>
        </div>
      `;
  });
  subjectWiseStatsDiv.innerHTML = subjectStatsHtml;
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    const attendanceTargetSlider = document.getElementById('attendanceTarget');
    const targetValueSpan = document.getElementById('targetValue');
    attendanceTargetSlider.value = attendanceTarget;
    targetValueSpan.textContent = `${attendanceTarget}%`;

    attendanceTargetSlider.addEventListener('input', (event) => {
        attendanceTarget = parseInt(event.target.value, 10);
        targetValueSpan.textContent = `${attendanceTarget}%`;
        localStorage.setItem('ece_attendance_target', attendanceTarget);
        updateDashboard();
    });

    document.getElementById('attendanceDate').valueAsDate = new Date();

    renderTimetable();
    loadDailySchedule();
    updateDashboard();

    showTab('dashboard'); 

    initTimetableWaveEffect();

    document.getElementById('manualAddForm').addEventListener('submit', addManualClass);
    document.getElementById('attendanceDate').addEventListener('change', loadDailySchedule);
    document.getElementById('timetableGrid').addEventListener('click', handleTimetableCellClick);
    document.getElementById('importBtn').addEventListener('click', importTimetable);
});