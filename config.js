// VICIdial Configuration
const VICIDIAL_CONFIG = {
    // Default server URL - can be changed in login form
    defaultServerUrl: 'https://maingreendialer.projems.com',
    
    // Campaign settings
    campaignId: 'TELE',
    protocol: 'SIP',
    phoneCode: '1',
    
    // API endpoint
    apiPath: '/agc/api.php',
    
    // Cache duration (30 minutes)
    cacheDuration: 30 * 60 * 1000
};

// Google Sheets Integration - SEPARATED BY SERVER
const GOOGLE_SHEETS_CONFIG = {
    // BLESSED Server Google Sheets Integration
    'https://vicidial.projems.com': {
        enabled: true,
        apiUrl: 'https://throbbing-snow-1357.albertflibidjr.workers.dev'
    },
    
    // MAINGREEN Server Google Sheets Integration
    'https://maingreendialer.projems.com': {
        enabled: false, // Disabled for now
        apiUrl: '' // Will add MAINGREEN Google Sheets URL later
    }
};

// Disposition codes
const DISPOSITIONS = [
    { code: 'SALE', description: 'Appointment Set' },
    { code: 'N', description: 'No Answer' },
    { code: 'A', description: 'Voice Message' },
    { code: 'DNC', description: 'Do Not Call' },
    { code: 'CALLBK', description: 'Call Back' },
    { code: 'NI', description: 'Not Interested' },
    { code: 'ESP', description: 'Spanish' },
    { code: 'HU', description: 'Hangup' },
    { code: 'DNQ', description: 'Does Not Qualified' },
    { code: 'WN', description: 'Wrong Number' },
    { code: 'DC', description: 'Disconnected' }
];



