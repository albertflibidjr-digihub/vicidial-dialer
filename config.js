// VICIdial Configuration
const VICIDIAL_CONFIG = {
    // Default server URL - can be changed in login form
    defaultServerUrl: 'https://vicidial.projems.com',
    
    // Campaign settings
    campaignId: 'TELE',
    protocol: 'SIP',
    phoneCode: '1',
    
    // API endpoint
    apiPath: '/agc/api.php',
    
    // Cache duration (30 minutes)
    cacheDuration: 30 * 60 * 1000
};

// Disposition codes
const DISPOSITIONS = [
    { code: 'SALE', description: 'Appointment Set' },
    { code: 'N', description: 'No Answer' },
    { code: 'A', description: 'Voice Message' },
    { code: 'DNC', description: 'Do Not Call' },
    { code: 'CALLBK', description: 'Call Back' },
    { code: 'NI', description: 'Not Interested' }
];