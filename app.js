// VICIdial Dialer App - JavaScript
// Progressive Web App with offline support

// App State
let currentNumber = '';
let callStartTime = null;
let callTimer = null;
let deferredPrompt = null;

// Default dispositions
const DISPOSITIONS = [
    { code: 'SALE', description: 'Successful Sale' },
    { code: 'CALLBK', description: 'Call Back Later' },
    { code: 'NI', description: 'Not Interested' },
    { code: 'DNC', description: 'Do Not Call' },
    { code: 'NA', description: 'No Answer' },
    { code: 'BUSY', description: 'Line Busy' },
    { code: 'VM', description: 'Voicemail' },
    { code: 'DROP', description: 'Dropped Call' },
    { code: 'DISC', description: 'Disconnected Number' },
    { code: 'LANG', description: 'Language Barrier' }
];

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    loadContacts();
    loadDispositions();
    checkInstallPrompt();
    registerServiceWorker();
});

// Settings Management
function loadSettings() {
    const settings = localStorage.getItem('vicidialSettings');
    if (settings) {
        const data = JSON.parse(settings);
        document.getElementById('serverUrl').value = data.serverUrl || '';
        document.getElementById('username').value = data.username || '';
        document.getElementById('password').value = data.password || '';
        document.getElementById('campaignId').value = data.campaignId || '';
        document.getElementById('agentExtension').value = data.agentExtension || '';
        document.getElementById('phoneCode').value = data.phoneCode || '1';
    }
}

function saveSettings() {
    const settings = {
        serverUrl: document.getElementById('serverUrl').value,
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
        campaignId: document.getElementById('campaignId').value,
        agentExtension: document.getElementById('agentExtension').value,
        phoneCode: document.getElementById('phoneCode').value
    };
    
    localStorage.setItem('vicidialSettings', JSON.stringify(settings));
    closeModal('settingsModal');
    showToast('Settings saved successfully!', 'success');
}

function getSettings() {
    const settings = localStorage.getItem('vicidialSettings');
    return settings ? JSON.parse(settings) : {};
}

// Dialpad Functions
function addDigit(digit) {
    currentNumber += digit;
    updateDisplay();
}

function backspace() {
    currentNumber = currentNumber.slice(0, -1);
    updateDisplay();
}

function clearNumber() {
    currentNumber = '';
    updateDisplay();
}

function updateDisplay() {
    const display = document.getElementById('displayNumber');
    if (currentNumber === '') {
        display.textContent = 'Enter Number';
        display.classList.add('empty');
    } else {
        display.textContent = formatPhoneNumber(currentNumber);
        display.classList.remove('empty');
    }
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

// Call Functions
async function makeCall() {
    if (currentNumber === '') {
        showToast('Please enter a phone number', 'error');
        return;
    }

    const settings = getSettings();
    if (!settings.serverUrl || !settings.username) {
        showToast('Please configure VICIdial settings first', 'error');
        showSettingsModal();
        return;
    }

    const phoneNumber = currentNumber.replace(/\D/g, '');
    if (phoneNumber.length < 10) {
        showToast('Phone number must be at least 10 digits', 'error');
        return;
    }

    const fullNumber = phoneNumber.length === 10 
        ? settings.phoneCode + phoneNumber 
        : phoneNumber;

    updateStatus('Calling...', 'status-calling');
    document.getElementById('callBtn').disabled = true;
    showSpinner();

    try {
        const apiUrl = settings.serverUrl + '/agc/api.php';
        const params = new URLSearchParams({
            source: 'vicidial_app',
            function: 'external_dial',
            user: settings.username,
            pass: settings.password,
            agent_user: settings.username,
            value: fullNumber,
            phone_code: settings.phoneCode,
            search: 'NO',
            preview: 'NO',
            focus: 'YES',
            vendor_lead_code: 'APP_' + Date.now(),
            list_id: '999',
            phone_number: fullNumber,
            campaign: settings.campaignId
        });

        const response = await fetch(apiUrl + '?' + params.toString());
        const text = await response.text();

        console.log('VICIdial Response:', text);
        hideSpinner();

        if (text.includes('SUCCESS')) {
            updateStatus('Connected', 'status-connected');
            document.getElementById('hangupBtn').disabled = false;
            document.getElementById('dispositionBtn').disabled = false;
            
            document.getElementById('callInfo').classList.add('active');
            document.getElementById('callingNumber').textContent = formatPhoneNumber(fullNumber);
            
            startCallTimer();
            saveCallHistory(fullNumber, 'Connected');
            showToast('Call connected successfully!', 'success');
        } else {
            updateStatus('Call Failed', 'status-error');
            document.getElementById('callBtn').disabled = false;
            saveCallHistory(fullNumber, 'Failed');
            showToast('Call failed: ' + text, 'error');
        }
    } catch (error) {
        hideSpinner();
        updateStatus('Error', 'status-error');
        document.getElementById('callBtn').disabled = false;
        showToast('Error: ' + error.message, 'error');
    }
}

async function hangupCall() {
    const settings = getSettings();
    updateStatus('Hanging up...', 'status-calling');

    try {
        const apiUrl = settings.serverUrl + '/agc/api.php';
        const params = new URLSearchParams({
            source: 'vicidial_app',
            function: 'external_hangup',
            user: settings.username,
            pass: settings.password,
            agent_user: settings.username,
            value: 'HANGUP',
            campaign: settings.campaignId
        });

        const response = await fetch(apiUrl + '?' + params.toString());
        const text = await response.text();

        console.log('VICIdial Hangup Response:', text);

        if (text.includes('SUCCESS')) {
            updateStatus('Call Ended', 'status-ready');
            document.getElementById('hangupBtn').disabled = true;
            stopCallTimer();
            showToast('Call hung up successfully', 'success');
        } else {
            showToast('Hangup failed: ' + text, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function setDisposition(code) {
    const settings = getSettings();
    const phoneNumber = currentNumber;
    
    closeModal('dispositionModal');
    updateStatus('Setting disposition...', 'status-calling');

    try {
        const apiUrl = settings.serverUrl + '/agc/api.php';
        const params = new URLSearchParams({
            source: 'vicidial_app',
            function: 'external_status',
            user: settings.username,
            pass: settings.password,
            agent_user: settings.username,
            value: code,
            campaign: settings.campaignId
        });

        const response = await fetch(apiUrl + '?' + params.toString());
        const text = await response.text();

        console.log('VICIdial Status Response:', text);

        if (text.includes('SUCCESS')) {
            updateStatus('Ready', 'status-ready');
            document.getElementById('callBtn').disabled = false;
            document.getElementById('dispositionBtn').disabled = true;
            document.getElementById('callInfo').classList.remove('active');
            
            updateCallHistory(phoneNumber, code);
            clearNumber();
            showToast('Disposition set to: ' + code, 'success');
        } else {
            showToast('Failed to set disposition: ' + text, 'error');
        }
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

// Status and Timer
function updateStatus(text, className) {
    const badge = document.getElementById('statusBadge');
    badge.textContent = text;
    badge.className = 'status-badge ' + className;
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

// UI Functions
function toggleMenu() {
    document.getElementById('sideMenu').classList.toggle('active');
    document.getElementById('menuOverlay').classList.toggle('active');
}

function switchTab(tab) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    event.currentTarget.classList.add('active');

    if (tab === 'contacts') {
        document.getElementById('callListSection').classList.add('active');
    } else {
        document.getElementById('callListSection').classList.remove('active');
    }

    if (tab === 'history') {
        viewHistory();
    }
}

function showSettingsModal() {
    toggleMenu();
    document.getElementById('settingsModal').classList.add('active');
}

function showDispositionModal() {
    document.getElementById('dispositionModal').classList.add('active');
}

function showAddContactModal() {
    document.getElementById('addContactModal').classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showToast(message, type) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} active`;
    
    setTimeout(() => {
        toast.classList.remove('active');
    }, 3000);
}

function showSpinner() {
    document.getElementById('spinner').classList.add('active');
}

function hideSpinner() {
    document.getElementById('spinner').classList.remove('active');
}

// Dispositions
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

// Contacts Management
function loadContacts() {
    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    const list = document.getElementById('contactList');
    list.innerHTML = '';

    if (contacts.length === 0) {
        list.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No contacts yet. Add your first contact!</p>';
        return;
    }

    contacts.forEach((contact, index) => {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.innerHTML = `
            <div class="contact-info">
                <div class="contact-name">${contact.name}</div>
                <div class="contact-phone">${formatPhoneNumber(contact.phone)}</div>
            </div>
            <div class="contact-actions">
                <button class="icon-btn" onclick="dialContact('${contact.phone}')">📞</button>
                <button class="icon-btn" onclick="deleteContact(${index})">🗑️</button>
            </div>
        `;
        list.appendChild(item);
    });
}

function addContact() {
    const name = document.getElementById('contactName').value;
    const phone = document.getElementById('contactPhone').value;
    const notes = document.getElementById('contactNotes').value;

    if (!name || !phone) {
        showToast('Please enter name and phone number', 'error');
        return;
    }

    const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
    contacts.push({ name, phone, notes, added: new Date().toISOString() });
    localStorage.setItem('contacts', JSON.stringify(contacts));

    document.getElementById('contactName').value = '';
    document.getElementById('contactPhone').value = '';
    document.getElementById('contactNotes').value = '';

    closeModal('addContactModal');
    loadContacts();
    showToast('Contact added successfully!', 'success');
}

function dialContact(phone) {
    currentNumber = phone;
    updateDisplay();
    switchTab('dialpad');
    document.querySelector('.nav-item').click();
}

function deleteContact(index) {
    if (confirm('Delete this contact?')) {
        const contacts = JSON.parse(localStorage.getItem('contacts') || '[]');
        contacts.splice(index, 1);
        localStorage.setItem('contacts', JSON.stringify(contacts));
        loadContacts();
        showToast('Contact deleted', 'info');
    }
}

// Call History
function saveCallHistory(phone, status) {
    const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
    history.unshift({
        phone,
        status,
        timestamp: new Date().toISOString(),
        disposition: null
    });
    
    // Keep only last 100 calls
    if (history.length > 100) {
        history.pop();
    }
    
    localStorage.setItem('callHistory', JSON.stringify(history));
}

function updateCallHistory(phone, disposition) {
    const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
    const call = history.find(c => c.phone.includes(phone.replace(/\D/g, '')));
    if (call) {
        call.disposition = disposition;
        localStorage.setItem('callHistory', JSON.stringify(history));
    }
}

function viewHistory() {
    const history = JSON.parse(localStorage.getItem('callHistory') || '[]');
    
    if (history.length === 0) {
        showToast('No call history yet', 'info');
        return;
    }

    const historyHtml = history.slice(0, 20).map(call => {
        const date = new Date(call.timestamp);
        return `
            <div class="contact-item">
                <div class="contact-info">
                    <div class="contact-name">${formatPhoneNumber(call.phone)}</div>
                    <div class="contact-phone">${date.toLocaleString()} - ${call.disposition || call.status}</div>
                </div>
                <div class="contact-actions">
                    <button class="icon-btn" onclick="dialContact('${call.phone}')">📞</button>
                </div>
            </div>
        `;
    }).join('');

    const list = document.getElementById('contactList');
    list.innerHTML = historyHtml;
    document.getElementById('callListSection').classList.add('active');
}

// Test Connection
async function testConnection() {
    const settings = getSettings();
    
    if (!settings.serverUrl) {
        showToast('Please configure server URL first', 'error');
        showSettingsModal();
        return;
    }

    toggleMenu();
    showSpinner();

    try {
        const response = await fetch(settings.serverUrl + '/agc/api.php', {
            method: 'GET'
        });
        
        hideSpinner();
        
        if (response.ok || response.status === 404) {
            showToast('✅ Connected to VICIdial server!', 'success');
        } else {
            showToast('⚠️ Server responded with status: ' + response.status, 'error');
        }
    } catch (error) {
        hideSpinner();
        showToast('❌ Could not connect: ' + error.message, 'error');
    }
}

// Clear All Data
function clearAllData() {
    if (confirm('This will delete all contacts and call history. Continue?')) {
        localStorage.removeItem('contacts');
        localStorage.removeItem('callHistory');
        loadContacts();
        toggleMenu();
        showToast('All data cleared', 'info');
    }
}

// About
function showAbout() {
    toggleMenu();
    alert('VICIdial Dialer App\nVersion 1.0\n\nA Progressive Web App for VICIdial manual calling.\n\nFeatures:\n• Offline support\n• Contact management\n• Call history\n• Installable on mobile');
}

// PWA Installation
function checkInstallPrompt() {
    // Check if running on iOS
    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator.standalone);
    
    if (isIos && !isInStandaloneMode) {
        setTimeout(() => {
            document.getElementById('iosBanner').classList.add('active');
        }, 3000);
    }

    // For Android and other platforms
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('installPrompt').classList.add('active');
    });

    document.getElementById('installBtn').addEventListener('click', async () => {
        if (!deferredPrompt) {
            return;
        }

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            showToast('App installed successfully!', 'success');
        }
        
        deferredPrompt = null;
        document.getElementById('installPrompt').classList.remove('active');
    });
}

// Service Worker Registration
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.log('Service Worker registration failed', err));
    }
}

// Keyboard Support
document.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') {
        addDigit(e.key);
    } else if (e.key === '*' || e.key === '#') {
        addDigit(e.key);
    } else if (e.key === 'Backspace') {
        backspace();
    } else if (e.key === 'Enter') {
        if (!document.getElementById('callBtn').disabled) {
            makeCall();
        }
    }
});
