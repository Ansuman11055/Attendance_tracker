// Data Structures
let timetable = JSON.parse(localStorage.getItem('ece_timetable')) || {};
let attendanceData = JSON.parse(localStorage.getItem('ece_attendance')) || {};
let attendanceTarget = parseInt(localStorage.getItem('ece_attendance_target') || '75', 10);

// --- 3D GAUGE GLOBALS ---
let gaugeScene, gaugeCamera, gaugeRenderer, gaugeForegroundRing;
const COLOR_GOOD = 0x28a745;
const COLOR_BAD = 0xdc3545;

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// --- NEW: 3D ATTENDANCE GAUGE ---
function initAttendanceGauge() {
    gaugeScene = new THREE.Scene();
    const container = document.getElementById('attendanceGaugeContainer');
    const canvas = document.getElementById('attendanceGaugeCanvas');

    gaugeCamera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    gaugeRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });

    gaugeRenderer.setSize(container.clientWidth, container.clientHeight);
    gaugeRenderer.setPixelRatio(window.devicePixelRatio);

    // --- Create Gauge Rings ---
    const ringGeometry = new THREE.RingGeometry(2, 2.3, 64);
    
    // Background Ring
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0xeeeeee, side: THREE.DoubleSide });
    const bgRing = new THREE.Mesh(ringGeometry, bgMaterial);
    gaugeScene.add(bgRing);

    // Foreground (Dynamic) Ring
    const fgGeometry = new THREE.RingGeometry(2, 2.3, 64, 1, 0, 0); // Start at 0 length
    const fgMaterial = new THREE.MeshBasicMaterial({ color: COLOR_GOOD, side: THREE.DoubleSide });
    gaugeForegroundRing = new THREE.Mesh(fgGeometry, fgMaterial);
    gaugeForegroundRing.rotation.z = Math.PI / 2; // Start from the top
    gaugeScene.add(gaugeForegroundRing);
    
    gaugeCamera.position.z = 5;

    // Handle resizing
    new ResizeObserver(() => {
        gaugeRenderer.setSize(container.clientWidth, container.clientHeight);
        gaugeCamera.aspect = container.clientWidth / container.clientHeight;
        gaugeCamera.updateProjectionMatrix();
    }).observe(container);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        gaugeForegroundRing.rotation.z -= 0.005;
        bgRing.rotation.z = gaugeForegroundRing.rotation.z;
        gaugeRenderer.render(gaugeScene, gaugeCamera);
    }
    animate();
}

/**
 * A dedicated, robust function to sort timetable slots chronologically.
 */
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
      const subject = timetable[`${day}-${time}`];
      if (subject) {
        tableHtml += `<td class="subject-cell"><div class="subject-code">${subject.code}</div><div class="subject-name">${subject.name}</div></td>`;
      } else {
        tableHtml += '<td></td>';
      }
    });
    tableHtml += '</tr>';
  });
  tableHtml += '</tbody></table>';
  grid.innerHTML = tableHtml;
}

function showTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.getElementById(tabName).classList.add('active');
  document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector(`.nav-tab[onclick="showTab('${tabName}')"]`).classList.add('active');
}

function clearTimetable() {
  if (confirm('Are you sure you want to clear all timetable data? This action cannot be undone.')) {
    timetable = {};
    localStorage.removeItem('ece_timetable');
    renderTimetable();
    updateDashboard();
    alert('Timetable cleared.');
  }
}

function resetApplication() {
  if (confirm('DANGER: This will permanently delete ALL timetable and attendance data. This action cannot be undone. Are you sure you want to proceed?')) {
    localStorage.removeItem('ece_timetable');
    localStorage.removeItem('ece_attendance');
    localStorage.removeItem('ece_attendance_target');
    location.reload();
  }
}

document.getElementById('importFile').addEventListener('change', function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const timetableRows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        if (timetableRows.length < 2) { alert("Error: The file seems to be empty or has no data rows."); return; }
        const newTimetable = {};
        const header = timetableRows[0].map(h => String(h).trim().toUpperCase());
        const dataRows = timetableRows.slice(1);
        const timeColumnIndex = header.findIndex(h => h === 'TIME' || h === 'TIME SLOT');
        if (timeColumnIndex === -1) { alert("Error: Could not find a 'Time' column in the file."); return; }
        const dayMap = { MONDAY: 'Monday', MON: 'Monday', TUESDAY: 'Tuesday', TUE: 'Tuesday', WEDNESDAY: 'Wednesday', WED: 'Wednesday', THURSDAY: 'Thursday', THU: 'Thursday', THURS: 'Thursday', FRIDAY: 'Friday', FRI: 'Friday', SATURDAY: 'Saturday', SAT: 'Saturday', SUNDAY: 'Sunday', SUN: 'Sunday' };
        const columnDayMap = {};
        header.forEach((headerText, index) => { if (dayMap[headerText]) columnDayMap[index] = dayMap[headerText]; });
        const normalizeTime = (timeStr) => {
            if (!timeStr) return null;
            timeStr = String(timeStr).trim();
            const convertTo24Hour = (time, period) => { let [hours, minutes] = time.split(':').map(Number); if (period.toUpperCase() === 'PM' && hours < 12) hours += 12; if (period.toUpperCase() === 'AM' && hours === 12) hours = 0; return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`; };
            const timeMatch = timeStr.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})\s*(AM|PM)?/i);
            if (timeMatch) { let [_, startTime, endTime, period] = timeMatch; if (period) return `${convertTo24Hour(startTime, period)}-${convertTo24Hour(endTime, period)}`; else return `${startTime}-${endTime}`; }
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
                    if (match) { code = match[1].toUpperCase(); name = match[2].trim(); } else { code = trimmedSubject; }
                    newTimetable[subjectKey] = { code, name, day, time: timeSlot };
                }
            }
        });
        timetable = newTimetable;
        localStorage.setItem('ece_timetable', JSON.stringify(timetable));
        renderTimetable(); updateDashboard();
        alert('Timetable imported successfully!');
    };
    reader.readAsArrayBuffer(file);
});

function addManualClass(event) {
    event.preventDefault();
    const code = document.getElementById('subjectCode').value.trim();
    const name = document.getElementById('subjectName').value.trim();
    const day = document.getElementById('subjectDay').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    if (!code || !day || !startTime || !endTime) { alert('Please fill in Subject Code, Day, Start Time, and End Time.'); return; }
    const timeSlot = `${startTime}-${endTime}`;
    const subjectKey = `${day}-${timeSlot}`;
    if (timetable[subjectKey] && !confirm(`A class already exists: ${timetable[subjectKey].code}. Overwrite it?`)) { return; }
    timetable[subjectKey] = { code: code.toUpperCase(), name, day, time: timeSlot };
    localStorage.setItem('ece_timetable', JSON.stringify(timetable));
    renderTimetable();
    alert(`Class "${code}" added successfully.`);
    document.getElementById('manualAddForm').reset();
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
    const subjectsForDay = Object.values(timetable).filter(s => s.day === dayOfWeek).sort((a, b) => sortTimetableSlots(a.time, b.time));
    if (subjectsForDay.length === 0) { scheduleDiv.innerHTML = `<p>No classes scheduled for ${dayOfWeek}.</p>`; return; }
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
            if (!stats[subject.code]) { stats[subject.code] = { name: subject.name, total: 0, present: 0 }; }
            stats[subject.code].total++;
            if (attendanceData[attKey] === 'present') { stats[subject.code].present++; }
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
  const gaugePercentageSpan = document.getElementById('gaugePercentage');
  
  const totalClasses = Object.keys(attendanceData).length;
  const presentCount = Object.values(attendanceData).filter(s => s === 'present').length;
  const absentCount = Object.values(attendanceData).filter(s => s === 'absent').length;
  const overallPercentage = totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0;

  // --- Update 3D Gauge ---
  if (gaugeForegroundRing) {
      const isBelowTarget = overallPercentage < attendanceTarget;
      gaugeForegroundRing.material.color.setHex(isBelowTarget ? COLOR_BAD : COLOR_GOOD);
      const newThetaLength = (overallPercentage / 100) * Math.PI * 2;
      gaugeForegroundRing.geometry.dispose(); // Important for performance
      gaugeForegroundRing.geometry = new THREE.RingGeometry(2, 2.3, 64, 1, 0, newThetaLength);
      gaugePercentageSpan.textContent = `${overallPercentage.toFixed(1)}%`;
      gaugePercentageSpan.style.color = isBelowTarget ? '#c62828' : '#2e7d32';
  }
  
  // --- Update Other Stat Cards ---
  let otherCardsHtml = `
    <div class="stat-card"><h4>📚 Total Classes</h4><p>${totalClasses}</p></div>
    <div class="stat-card"><h4>✔️ Classes Attended</h4><p>${presentCount}</p></div>
    <div class="stat-card"><h4>❌ Classes Missed</h4><p>${absentCount}</p></div>
  `;
  // We need a temporary container to inject these cards without replacing the gauge.
  const tempDiv = document.createElement('div');
  statsDiv.innerHTML = ''; // Clear the container first
  statsDiv.appendChild(document.getElementById('attendanceGaugeContainer'));
  tempDiv.innerHTML = otherCardsHtml;
  Array.from(tempDiv.children).forEach(child => statsDiv.appendChild(child));


  // --- Update Subject-wise Cards ---
  const subjectStats = calculateSubjectWiseStats();
  let subjectStatsHtml = '';
  if (Object.keys(subjectStats).length === 0) {
      subjectWiseStatsDiv.innerHTML = '<p>No attendance data recorded yet.</p>';
      return;
  }
  const sortedSubjectCodes = Object.keys(subjectStats).sort();
  sortedSubjectCodes.forEach(subjectCode => {
      const stat = subjectStats[subjectCode];
      const isBelowTarget = stat.total > 0 && parseFloat(stat.percentage) < attendanceTarget;
      const cardClass = isBelowTarget ? 'stat-card below-target' : 'stat-card';
      subjectStatsHtml += `<div class="${cardClass}"><h4>${subjectCode}</h4><p style="font-size: 1.5em; margin: 10px 0;">${stat.percentage}%</p><p style="font-size: 0.9em; color: #555;">${stat.present} / ${stat.total} classes</p></div>`;
  });
  subjectWiseStatsDiv.innerHTML = subjectStatsHtml;
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
  if (typeof THREE !== 'undefined') {
      initAttendanceGauge();
  }
  
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
  showTab('dashboard');
  renderTimetable();
  loadDailySchedule();
  updateDashboard();
  document.getElementById('attendanceDate').addEventListener('change', loadDailySchedule);
  document.getElementById('manualAddForm').addEventListener('submit', addManualClass);
});