# VICIdial Web Dialpad

A modern, web-based dialpad application for VICIdial that allows agents to make calls directly from their browser. This standalone application can be hosted on GitHub Pages or any web server.

![VICIdial Dialpad](https://img.shields.io/badge/VICIdial-Web%20Dialpad-blue)

## Features

- 🔐 **Secure Login** - Agent credentials stored locally in browser
- 📞 **Click-to-Dial** - Make calls with a single click
- ⌨️ **Keyboard Support** - Type or paste phone numbers
- 📋 **Dispositions** - Set call outcomes easily
- ⏸️ **Agent Pause** - Pause/unpause agent status
- 📊 **Call Timer** - Track call duration in real-time
- 💾 **Session Memory** - Stays logged in (30-minute cache)
- 📱 **Responsive Design** - Works on desktop and mobile

## Quick Start

### Option 1: Host on GitHub Pages

1. **Fork this repository** or create a new repository with these files

2. **Enable GitHub Pages**:
   - Go to repository Settings
   - Navigate to "Pages" section
   - Select "main" branch as source
   - Click Save

3. **Access your dialpad**:
   - Visit: `https://yourusername.github.io/repository-name/`

### Option 2: Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/vicidial-dialpad.git
   cd vicidial-dialpad
   ```

2. **Start a local server**:
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using PHP
   php -S localhost:8000
   
   # Using Node.js (if you have http-server installed)
   npx http-server
   ```

3. **Open in browser**:
   - Navigate to `http://localhost:8000`

### Option 3: Deploy to Any Web Server

Simply upload all files to your web server:
- `index.html`
- `styles.css`
- `app.js`
- `config.js`

## Configuration

### VICIdial Server Settings

Edit `config.js` to customize default settings:

```javascript
const VICIDIAL_CONFIG = {
    defaultServerUrl: 'https://your-vicidial-server.com',
    campaignId: 'YOUR_CAMPAIGN',
    protocol: 'SIP',
    phoneCode: '1',
    // ... other settings
};
```

### Disposition Codes

Customize disposition codes in `config.js`:

```javascript
const DISPOSITIONS = [
    { code: 'SALE', description: 'Appointment Set' },
    { code: 'N', description: 'No Answer' },
    { code: 'A', description: 'Voice Message' },
    { code: 'DNC', description: 'Do Not Call' },
    // Add your custom dispositions here
];
```

## Usage

### First Time Login

1. Click the application URL
2. Enter your VICIdial credentials:
   - **Agent Name**: Your display name
   - **VICIdial Username**: Your VICIdial user ID
   - **VICIdial Password**: Your VICIdial password
   - **Extension Number**: Your phone extension
   - **Server URL**: Your VICIdial server URL

3. Click "🔐 Login"

### Making Calls

1. **Enter Phone Number**:
   - Type directly using keyboard
   - Paste from clipboard
   - Use dialpad buttons (if added)

2. **Dial**:
   - Click "📞 DIAL" button
   - Or press Enter key

3. **During Call**:
   - View call duration
   - Click "📵 HANGUP" to end call
   - Click "⏸️ PAUSE" to pause agent

4. **After Call**:
   - Disposition modal appears automatically
   - Select appropriate disposition
   - Agent is automatically paused

### Keyboard Shortcuts

- **0-9, *, #**: Add digits to number
- **Enter**: Dial current number
- **Backspace/Delete**: Clear number
- **Type in input field**: Direct number entry

## Security Notes

⚠️ **Important Security Considerations**:

1. **Credentials Storage**: Agent credentials are stored in browser's localStorage
2. **HTTPS Required**: Always use HTTPS in production
3. **CORS**: Ensure your VICIdial server allows CORS from your domain
4. **Session Timeout**: Auto-logout after 30 minutes of inactivity

### Recommended Security Practices

- Use HTTPS for both the dialpad and VICIdial server
- Implement additional authentication if needed
- Clear browser data when using shared computers
- Use strong passwords
- Regularly update credentials

## CORS Configuration

If you encounter CORS errors, you may need to configure your VICIdial server:

### Apache Configuration

Add to your Apache config or `.htaccess`:

```apache
Header set Access-Control-Allow-Origin "https://yourdomain.com"
Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type"
```

### Nginx Configuration

Add to your Nginx config:

```nginx
add_header Access-Control-Allow-Origin "https://yourdomain.com";
add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
add_header Access-Control-Allow-Headers "Content-Type";
```

## Troubleshooting

### Login Failed

- Verify VICIdial credentials are correct
- Check server URL format (include https://)
- Ensure VICIdial API is enabled
- Check browser console for errors

### Call Not Connecting

- Verify extension is registered
- Check VICIdial agent status
- Ensure campaign is active
- Review VICIdial server logs

### CORS Errors

- Configure CORS on VICIdial server
- Use browser with CORS disabled (dev only)
- Contact server administrator

### Browser Compatibility

Tested on:
- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Internet Explorer (Not supported)

## File Structure

```
vicidial-dialpad/
├── index.html          # Main HTML structure
├── styles.css          # All styling
├── app.js             # Application logic
├── config.js          # Configuration settings
└── README.md          # Documentation
```

## API Endpoints Used

The application uses VICIdial's API (`/agc/api.php`) with these functions:

- `version` - Test connection
- `external_dial` - Make outbound call
- `external_hangup` - End call
- `external_status` - Set disposition
- `external_pause` - Pause agent

## Customization

### Change Colors

Edit the CSS variables in `styles.css`:

```css
body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn-call {
    background: #4CAF50;  /* Green */
}

.btn-hangup {
    background: #f44336;  /* Red */
}
```

### Add More Dispositions

Edit `config.js`:

```javascript
const DISPOSITIONS = [
    { code: 'CUSTOM', description: 'Custom Status' },
    // ... add more
];
```

## License

MIT License - Feel free to modify and use for your organization.

## Support

For issues and questions:
- VICIdial Documentation: http://www.vicidial.org/docs/
- VICIdial Forums: http://www.vicidial.org/VICIDIALforum/

## Credits

Created for use with VICIdial contact center software.

---

**Note**: This is an independent project and is not officially affiliated with VICIdial.