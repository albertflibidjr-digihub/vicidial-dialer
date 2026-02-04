// VICIdial Dialpad Application
// Main JavaScript Logic

// State Management
let agentInfo = null;
let currentNumber = '';
let callStartTime = null;
let callTimer = null;
let isPaused = false;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const dialpadScreen = document.getElementById('dialpadScreen');
const loginForm = document.getElementById('loginForm');
const displayInput = document.getElementById('displayNumber');

// Initialize app on load
document.addEventListener('DOMContentLoaded', function () {
    // Check for saved credentials
    loadSavedCredentials();

    // Setup login form
    loginForm.addEventListener('submit', handleLogin);

    // Setup dialpad input
    setupDialpadInput();

    // Load dispositions
    loadDispositions();

    // Keyboard shortcuts
    setupKeyboardShortcuts();
});

// ============================================
// Authentication & Session Management
// ============================================

function loadSavedCredentials() {
    const saved = localStorage.getItem('vicidial_agent');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            const cacheAge = Date.now() - data.timestamp;

            // If cache is still valid (30 minutes)
            if (cacheAge < VICIDIAL_CONFIG.cacheDuration) {
                agentInfo = data;
                showDialpad();
                return;
            }
        } catch (e) {
            console.error('Error loading saved credentials:', e);
        }
    }
    showLogin();
}

function saveCredentials(credentials) {
    credentials.timestamp = Date.now();
    localStorage.setItem('vicidial_agent', JSON.stringify(credentials));
    agentInfo = credentials;
}

function clearCredentials() {
    localStorage.removeItem('vicidial_agent');
    agentInfo = null;
}

async function handleLogin(e) {
    e.preventDefault();

    const credentials = {
        agentName: document.getElementById('agentName').value.trim(),
        user: document.getElementById('username').value.trim(),
        password: document.getElementById('password').value,
        extension: document.getElementById('extension').value.trim(),
        serverUrl: document.getElementById('serverUrl').value.trim()
    };

    // Validate
    if (!credentials.agentName || !credentials.user || !credentials.password ||
        !credentials.extension || !credentials.serverUrl) {
        showLoginStatus('Please fill in all fields', 'error');
        return;
    }

    showLoginStatus('Verifying credentials...', 'info');

    try {
        const result = await testConnection(credentials);

        if (result.success) {
            saveCredentials(credentials);
            showLoginStatus('Login successful!', 'success');
            setTimeout(() => {
                showDialpad();
            }, 500);
        } else {
            showLoginStatus('Login failed: ' + result.message, 'error');
        }
    } catch (error) {
        showLoginStatus('Connection error: ' + error.message, 'error');
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        clearCredentials();
        resetDialpad();
        showLogin();
    }
}

function showLogin() {
    loginScreen.classList.add('active');
    dialpadScreen.classList.remove('active');
}

function showDialpad() {
    loginScreen.classList.remove('active');
    dialpadScreen.classList.add('active');

    // Update UI with agent info
    document.getElementById('agentNameDisplay').textContent =
        `👤 Agent: ${agentInfo.agentName}`;

    // Focus on number input
    displayInput.focus();
}

function showLoginStatus(message, type) {
    const statusDiv = document.getElementById('loginStatus');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message ' + type + ' active';

    if (type === 'success') {
        setTimeout(() => {
            statusDiv.classList.remove('active');
        }, 2000);
    }
}

// ============================================
// VICIdial API Functions
// ============================================

async function testConnection(credentials = agentInfo) {
    try {
        const params = {
            source: 'webdialpad',
            function: 'version',
            user: credentials.user,
            pass: credentials.password
        };

        const url = buildApiUrl(credentials.serverUrl, params);
        const response = await fetch(url);
        const text = await response.text();

        console.log('VICIdial test response:', text);

        if (text.includes('VERSION') || text.includes('SUCCESS') || response.ok) {
            return { success: true, message: 'Connected' };
        } else if (text.includes('INVALID') || text.includes('ERROR')) {
            return { success: false, message: 'Invalid credentials' };
        } else {
            return { success: false, message: text };
        }
    } catch (error) {
        console.error('Connection test error:', error);
        return { success: false, message: error.message };
    }
}

async function makeCallApi(phoneNumber) {
    try {
        const params = {
            source: 'webdialpad',
            user: agentInfo.user,
            pass: agentInfo.password,
            agent_user: agentInfo.user,
            function: 'external_dial',
            value: phoneNumber,
            phone_code: VICIDIAL_CONFIG.phoneCode,
            search: 'NO',
            preview: 'NO',
            focus: 'YES'
        };

        const url = buildApiUrl(agentInfo.serverUrl, params);
        const response = await fetch(url);
        const text = await response.text();

        console.log('VICIdial dial response:', text);

        if (text.includes('SUCCESS')) {
            return { success: true, message: 'Call connected' };
        } else {
            return { success: false, message: text };
        }
    } catch (error) {
        console.error('Dial error:', error);
        return { success: false, message: error.message };
    }
}

async function hangupCallApi() {
    try {
        const params = {
            source: 'webdialpad',
            user: agentInfo.user,
            pass: agentInfo.password,
            agent_user: agentInfo.user,
            function: 'external_hangup',
            value: '1'
        };

        const url = buildApiUrl(agentInfo.serverUrl, params);
        const response = await fetch(url);
        const text = await response.text();

        console.log('VICIdial hangup response:', text);

        if (text.includes('SUCCESS')) {
            return { success: true, message: 'Call ended' };
        } else {
            return { success: false, message: text };
        }
    } catch (error) {
        console.error('Hangup error:', error);
        return { success: false, message: error.message };
    }
}

async function setDispositionApi(code) {
    try {
        const params = {
            source: 'webdialpad',
            user: agentInfo.user,
            pass: agentInfo.password,
            agent_user: agentInfo.user,
            function: 'external_status',
            value: code
        };

        const url = buildApiUrl(agentInfo.serverUrl, params);
        const response = await fetch(url);
        const text = await response.text();

        console.log('VICIdial status response:', text);

        if (text.includes('SUCCESS')) {
            return { success: true, message: 'Disposition set' };
        } else {
            return { success: false, message: text };
        }
    } catch (error) {
        console.error('Disposition error:', error);
        return { success: false, message: error.message };
    }
}

async function pauseAgentApi() {
    try {
        const params = {
            source: 'webdialpad',
            user: agentInfo.user,
            pass: agentInfo.password,
            agent_user: agentInfo.user,
            function: 'external_pause',
            value: 'PAUSE'
        };

        const url = buildApiUrl(agentInfo.serverUrl, params);
        const response = await fetch(url);
        const text = await response.text();

        console.log('VICIdial pause response:', text);

        if (text.includes('SUCCESS')) {
            return { success: true, message: 'Agent paused' };
        } else {
            return { success: false, message: text };
        }
    } catch (error) {
        console.error('Pause error:', error);
        return { success: false, message: error.message };
    }
}

function buildApiUrl(serverUrl, params) {
    const queryString = Object.keys(params)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
        .join('&');

    return `${serverUrl}${VICIDIAL_CONFIG.apiPath}?${queryString}`;
}

// ============================================
// Dialpad UI Functions
// ============================================

function setupDialpadInput() {
    displayInput.addEventListener('input', function (e) {
        currentNumber = cleanPhoneNumber(e.target.value);
        updateDisplay();
    });

    displayInput.addEventListener('paste', function (e) {
        setTimeout(() => {
            currentNumber = cleanPhoneNumber(e.target.value);
            updateDisplay();
            showNotification('Number pasted', 'success');
        }, 10);
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
        // If typing in input, allow normal behavior
        if (document.activeElement === displayInput) {
            if (e.key === 'Enter') {
                e.preventDefault();
                makeCall();
            }
            return;
        }

        // Global shortcuts
        if (/^[0-9*#]$/.test(e.key)) {
            e.preventDefault();
            addDigit(e.key);
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            clearNumber();
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            makeCall();
        }
    });
}

function addDigit(digit) {
    currentNumber += digit;
    updateDisplay();
}

function clearNumber() {
    currentNumber = '';
    updateDisplay();
}

function updateDisplay() {
    displayInput.value = formatPhoneNumber(currentNumber);
}

function cleanPhoneNumber(value) {
    return value.replace(/[^\d*#+]/g, '');
}

function formatPhoneNumber(number) {
    const cleaned = number.replace(/\D/g, '');

    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 11 && cleaned[0] === '1') {
        return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }

    return number;
}

function updateStatus(text, className) {
    const badge = document.getElementById('statusBadge');
    badge.textContent = text;
    badge.className = 'status-badge ' + className;
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} active`;

    setTimeout(() => {
        notification.classList.remove('active');
    }, 3000);
}

// ============================================
// Call Control Functions
// ============================================

async function makeCall() {
    if (!currentNumber) {
        showNotification('Enter a phone number', 'error');
        return;
    }

    // Clean and validate phone number
    let cleanNumber = currentNumber.replace(/\D/g, '');

    // Remove leading 1 if 11 digits
    if (cleanNumber.length === 11 && cleanNumber[0] === '1') {
        cleanNumber = cleanNumber.substring(1);
    }

    if (cleanNumber.length !== 10) {
        showNotification('Phone number must be 10 digits', 'error');
        return;
    }

    updateStatus('Calling...', 'status-calling');
    document.getElementById('callBtn').disabled = true;

    const result = await makeCallApi(cleanNumber);

    if (result.success) {
        updateStatus('Connected', 'status-connected');
        document.getElementById('hangupBtn').disabled = false;
        document.getElementById('dispositionBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = false;

        // Show call info
        document.getElementById('callInfo').classList.add('active');
        document.getElementById('callingNumber').textContent = formatPhoneNumber(cleanNumber);

        startCallTimer();
        showNotification(`Call connected! (${agentInfo.agentName})`, 'success');
    } else {
        updateStatus('Failed', 'status-error');
        document.getElementById('callBtn').disabled = false;
        showNotification('Call failed: ' + result.message, 'error');
    }
}

async function hangupCall() {
    updateStatus('Hanging up...', 'status-calling');

    const result = await hangupCallApi();

    if (result.success) {
        updateStatus('Call Ended', 'status-ready');
        document.getElementById('hangupBtn').disabled = true;

        stopCallTimer();
        showNotification(result.message, 'success');

        // Auto-show disposition modal
        showDispositionModal();
    } else {
        showNotification('Hangup failed: ' + result.message, 'error');
    }
}

async function pauseAgent() {
    const pauseBtn = document.getElementById('pauseBtn');
    pauseBtn.disabled = true;

    updateStatus('Pausing...', 'status-calling');

    const result = await pauseAgentApi();

    if (result.success) {
        updateStatus('Paused', 'status-paused');
        pauseBtn.textContent = '⏸️ PAUSED';
        isPaused = true;
        showNotification(result.message, 'success');
    } else {
        updateStatus('Ready', 'status-ready');
        showNotification('Failed to pause: ' + result.message, 'error');
        pauseBtn.disabled = false;
    }
}

function startCallTimer() {
    callStartTime = Date.now();
    callTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        document.getElementById('callDuration').textContent =
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function stopCallTimer() {
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    callStartTime = null;
}

// ============================================
// Disposition Functions
// ============================================

function loadDispositions() {
    const list = document.getElementById('dispositionList');
    list.innerHTML = '';

    DISPOSITIONS.forEach(disp => {
        const btn = document.createElement('div');
        btn.className = 'disposition-btn';
        btn.onclick = () => setDisposition(disp.code);
        btn.innerHTML = `
            <div class="disposition-code">${disp.code}</div>
            <div class="disposition-desc">${disp.description}</div>
        `;
        list.appendChild(btn);
    });
}

function showDispositionModal() {
    document.getElementById('dispositionModal').classList.add('active');
}

function closeDispositionModal() {
    document.getElementById('dispositionModal').classList.remove('active');
}

async function setDisposition(code) {
    closeDispositionModal();
    updateStatus('Setting...', 'status-calling');

    const result = await setDispositionApi(code);

    if (result.success) {
        updateStatus('Ready', 'status-ready');
        document.getElementById('callBtn').disabled = false;
        document.getElementById('dispositionBtn').disabled = true;
        document.getElementById('callInfo').classList.remove('active');

        clearNumber();
        showNotification(`Disposition set: ${code}`, 'success');

        // Auto-pause after disposition
        setTimeout(() => {
            pauseAgent();
        }, 500);
    } else {
        showNotification('Failed to set disposition: ' + result.message, 'error');
    }
}

// ============================================
// Reset & Cleanup
// ============================================

function resetDialpad() {
    clearNumber();
    stopCallTimer();
    updateStatus('Ready', 'status-ready');

    document.getElementById('callBtn').disabled = false;
    document.getElementById('hangupBtn').disabled = true;
    document.getElementById('dispositionBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('callInfo').classList.remove('active');

    isPaused = false;
}