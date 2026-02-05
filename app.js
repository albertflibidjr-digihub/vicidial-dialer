// VICIdial Dialpad Application
// Main JavaScript Logic

// State Management
let agentInfo = null;
let currentNumber = '';
let callStartTime = null;
let callTimer = null;
let isPaused = false;

// CORS Proxy URL - Set this to your Cloudflare Worker URL
// Leave empty to make direct requests (requires VICIdial CORS configuration)
const CORS_PROXY_URL = 'https://throbbing-snow-1357.albertflibidjr.workers.dev/'; // e.g., 'https://your-worker.workers.dev'

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
        console.error('Login error:', error);

        // Provide helpful error message based on error type
        if (error.message.includes('CORS') || error.message.includes('fetch')) {
            showLoginStatus(
                'CORS Error: Cannot connect to VICIdial server. ' +
                'Please configure CORS or use a proxy. See CORS_FIX.md for solutions.',
                'error'
            );
        } else {
            showLoginStatus('Connection error: ' + error.message, 'error');
        }
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

    // Show which server is connected
    const serverName = agentInfo.serverUrl.includes('maingreen') ? 'MAINGREEN' : 'BLESSED';
    document.getElementById('serverInfo').textContent = `Server: ${serverName}`;

    // Update Google Sheets status indicator
    updateGoogleSheetsStatus();

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

async function makeApiRequest(url) {
    // If CORS proxy is configured, use it
    if (CORS_PROXY_URL) {
        const proxyUrl = `${CORS_PROXY_URL}?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        return response;
    } else {
        // Direct request (requires CORS configuration on VICIdial server)
        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        });
        return response;
    }
}

async function testConnection(credentials = agentInfo) {
    try {
        const params = {
            source: 'webdialpad',
            function: 'version',
            user: credentials.user,
            pass: credentials.password
        };

        const url = buildApiUrl(credentials.serverUrl, params);
        const response = await makeApiRequest(url);
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
        throw error;
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
        const response = await makeApiRequest(url);
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
        const response = await makeApiRequest(url);
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

async function setDisposition(code) {
    closeDispositionModal();
    updateStatus('Setting...', 'status-calling');

    // Get the phone number that was called
    const calledNumber = document.getElementById('callingNumber').textContent;
    const cleanNumber = calledNumber.replace(/\D/g, '');

    // Set disposition in VICIdial
    const result = await setDispositionApi(code);

    if (result.success) {
        updateStatus('Ready', 'status-ready');
        document.getElementById('callBtn').disabled = false;
        document.getElementById('dispositionBtn').disabled = true;
        document.getElementById('callInfo').classList.remove('active');

        showNotification(`Disposition set: ${code}`, 'success');

        // Update Google Sheets (only if enabled for this server)
        if (isGoogleSheetsEnabled()) {
            const sheetsResult = await updateGoogleSheets(
                cleanNumber,
                code,
                agentInfo.agentName
            );

            if (sheetsResult.success) {
                showNotification(`✓ Google Sheets updated: ${code}`, 'success');
            } else if (!sheetsResult.skipped) {
                console.warn('Google Sheets update failed:', sheetsResult.message);
                showNotification(`⚠ Disposition set but Sheets update failed`, 'warning');
            }
            // If skipped, don't show any notification - it's expected
        } else {
            // Google Sheets not enabled for this server
            console.log('Google Sheets integration disabled for this server');
        }

        clearNumber();

        // Auto-pause after disposition (with delay)
        setTimeout(() => {
            pauseAgent();
        }, 2000);
    } else {
        showNotification('Failed to set disposition: ' + result.message, 'error');
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
        const response = await makeApiRequest(url);
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
    });

    displayInput.addEventListener('blur', function (e) {
        if (currentNumber) {
            updateDisplay();
        }
    });

    displayInput.addEventListener('focus', function (e) {
        if (currentNumber) {
            e.target.value = currentNumber;
        }
    });

    displayInput.addEventListener('paste', function (e) {
        setTimeout(() => {
            currentNumber = cleanPhoneNumber(e.target.value);
            updateDisplay();
            showNotification('Number pasted', 'success');
        }, 10);
    });

    displayInput.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            setTimeout(() => {
                currentNumber = cleanPhoneNumber(e.target.value);
            }, 10);
        }
    });
}

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function (e) {
        const activeElement = document.activeElement;
        const isInputField = activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA';

        if (isInputField) {
            if (e.key === 'Enter' && activeElement === displayInput) {
                e.preventDefault();
                makeCall();
            }
            return;
        }

        if (/^[0-9*#]$/.test(e.key)) {
            e.preventDefault();
            addDigit(e.key);
            displayInput.focus();
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
    displayInput.value = '';
    displayInput.focus();
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

    let cleanNumber = currentNumber.replace(/\D/g, '');

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

        setTimeout(() => {
            pauseAgent();
        }, 2000);
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

function updateGoogleSheetsStatus() {
    const statusElement = document.getElementById('sheetsStatus');

    if (statusElement && agentInfo) {
        const config = GOOGLE_SHEETS_CONFIG[agentInfo.serverUrl];
        const serverName = agentInfo.serverUrl.includes('maingreen') ? 'MAINGREEN' : 'BLESSED';

        if (config && config.enabled && config.apiUrl) {
            statusElement.textContent = `📊 Sheets: ON (${serverName})`;
            statusElement.className = 'sheets-status enabled';
        } else {
            statusElement.textContent = `📊 Sheets: OFF (${serverName})`;
            statusElement.className = 'sheets-status disabled';
        }
    }
}

/**
 * These are the complete helper functions - ADD TO YOUR app.js:
 */

// Get Google Sheets configuration for current server
function getGoogleSheetsConfig() {
    if (!agentInfo || !agentInfo.serverUrl) {
        return null;
    }

    const config = GOOGLE_SHEETS_CONFIG[agentInfo.serverUrl];
    return config;
}

// Check if Google Sheets integration is enabled for current server
function isGoogleSheetsEnabled() {
    const config = getGoogleSheetsConfig();
    return config && config.enabled && config.apiUrl;
}

// Get the Google Sheets API URL for current server
function getGoogleSheetsUrl() {
    const config = getGoogleSheetsConfig();
    return config && config.enabled ? config.apiUrl : null;
}

// Send disposition update to Google Sheets (if enabled for this server)
async function updateGoogleSheets(phoneNumber, dispositionCode, agentName) {
    // Check if Google Sheets integration is enabled for this server
    if (!isGoogleSheetsEnabled()) {
        console.log('Google Sheets integration not enabled for server:', agentInfo.serverUrl);
        return {
            success: false,
            message: 'Google Sheets not configured for this server',
            skipped: true
        };
    }

    const apiUrl = getGoogleSheetsUrl();

    if (!apiUrl) {
        console.log('Google Sheets API URL not configured');
        return {
            success: false,
            message: 'API URL not configured',
            skipped: true
        };
    }

    try {
        const payload = {
            phoneNumber: phoneNumber,
            disposition: dispositionCode,
            agentName: agentName,
            server: agentInfo.serverUrl,
            timestamp: new Date().toISOString()
        };

        console.log('Sending to Google Sheets:', payload);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('Google Sheets update result:', result);

        return result;

    } catch (error) {
        console.error('Google Sheets update error:', error);
        return { success: false, message: error.message };
    }
}
