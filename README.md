# HA Notify - Decky Plugin

Receive Home Assistant notifications directly in Steam Deck Gaming Mode via WebSocket - works anywhere with internet connection!

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-41BDF5?style=for-the-badge&logo=home-assistant&logoColor=white)
![Steam Deck](https://img.shields.io/badge/Steam%20Deck-1A1A1A?style=for-the-badge&logo=steam&logoColor=white)

## Features

- ✅ Receive notifications from Home Assistant in Gaming Mode
- ✅ WebSocket connection - works remotely (no local network required)
- ✅ Toast notifications with Home Assistant branding
- ✅ **Clickable notifications** - Open specific dashboards or URLs
- ✅ **Built-in dashboard viewer** - View HA in Steam's browser
- ✅ Real-time push notifications
- ✅ Works with Home Assistant Cloud (Nabu Casa) or self-hosted instances
- ✅ Automatic reconnection on network changes
- ✅ Easy integration with Home Assistant automations

## Installation

### Prerequisites

- Steam Deck with Decky Loader installed
- Home Assistant instance (local or cloud)
- Home Assistant Long-Lived Access Token

### Manual Installation

1. **Download the latest release:**
   ```bash
   cd ~/homebrew/plugins
   git clone https://github.com/KuzmaTolyanuch/decky-ha-notifications.git ha-notify
   ```

2. **Build the plugin:**
   ```bash
   cd ha-notify
   pnpm install
   pnpm run build
   ```

3. **Configure environment:**
   ```bash
   # Copy example config
   cp .env.example .env
   
   # Edit with your values
   nano .env
   ```
   
   Add your Home Assistant details:
   ```bash
   HA_URL=https://your-instance.ui.nabu.casa
   HA_TOKEN=your_long_lived_access_token
   ```

4. **Restart Decky Loader:**
   ```bash
   systemctl --user restart plugin_loader
   ```

5. **Verify installation:**
   - Open Quick Access Menu (`...` button)
   - Navigate to Decky tab (plug icon 🔌)
   - Look for "HA Notify" plugin
   - Check that WebSocket status shows "connected"

## Configuration

### Create Home Assistant Long-Lived Access Token

1. Open your Home Assistant instance
2. Click on your profile (bottom left corner)
3. Scroll to **"Long-Lived Access Tokens"**
4. Click **"Create Token"**
5. Name it "Steam Deck Notify"
6. Copy the token and paste it in `.env` file

### .env File Location

The `.env` file should be in the plugin directory:
```
~/homebrew/plugins/ha-notify/.env
```

### Example .env File

```bash
# Home Assistant URL (use https://)
HA_URL=https://your-instance.ui.nabu.casa

# Long-lived access token from HA
HA_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supported HA_URL Formats

- **Home Assistant Cloud:** `https://your-instance.ui.nabu.casa`
- **Local HTTP:** `http://homeassistant.local:8123`
- **Local HTTPS:** `https://homeassistant.local:8123`
- **Custom Domain:** `https://ha.yourdomain.com`
- **DuckDNS:** `https://yourhome.duckdns.org`

## Usage

### From Home Assistant

This plugin uses **custom events** instead of REST API. Fire the `steamdeck_notify` event from Home Assistant.

#### Basic Notification

```yaml
event: steamdeck_notify
event_data:
  title: "Notification Title"
  message: "Notification message"
```

#### Notification with Action (Click to Open URL)

```yaml
event: steamdeck_notify
event_data:
  title: "Motion Detected"
  message: "Front yard camera"
  action: "/lovelace/cameras"  # Opens specific dashboard
```

**Action Types:**
- **Dashboard path:** `/lovelace/cameras` - Opens that specific view
- **Full URL:** `https://example.com` - Opens external URL
- **No action:** Opens main Home Assistant dashboard

### Method 1: Using Automations

**Basic notification:**
```yaml
automation:
  - alias: "Notify Steam Deck - Motion Detected"
    trigger:
      - platform: state
        entity_id: binary_sensor.motion_living_room
        to: "on"
    action:
      - event: steamdeck_notify
        event_data:
          title: "Motion Detected"
          message: "Movement in living room"
```

**With clickable action:**
```yaml
automation:
  - alias: "Notify Steam Deck - Door Opened"
    trigger:
      - platform: state
        entity_id: binary_sensor.front_door
        to: "on"
    action:
      - event: steamdeck_notify
        event_data:
          title: "🚪 Front Door"
          message: "Door opened at {{ now().strftime('%I:%M %p') }}"
          action: "/lovelace/security"  # Click opens security dashboard
```

### Method 2: Using Scripts

```yaml
script:
  notify_steamdeck:
    alias: "Send Steam Deck Notification"
    sequence:
      - event: steamdeck_notify
        event_data:
          title: "{{ title }}"
          message: "{{ message }}"
          action: "{{ action | default('') }}"
```

Usage:
```yaml
service: script.notify_steamdeck
data:
  title: "Alert"
  message: "Your message here"
  action: "/lovelace/cameras"  # Optional
```

### Method 3: Developer Tools (Testing)

1. Go to **Developer Tools** → **Events**
2. Set Event Type: `steamdeck_notify`
3. Set Event Data:
   ```json
   {
     "title": "Test Alert",
     "message": "Hello from Home Assistant!",
     "action": "/lovelace/0"
   }
   ```
4. Click **Fire Event**

### Method 4: Node-RED

```json
[
  {
    "id": "fire_event_node",
    "type": "api-call-service",
    "name": "Notify Steam Deck",
    "server": "home_assistant",
    "service_domain": "homeassistant",
    "service": "fire_event",
    "data": {
      "event_type": "steamdeck_notify",
      "event_data": {
        "title": "{{ msg.title }}",
        "message": "{{ msg.message }}",
        "action": "{{ msg.action }}"
      }
    }
  }
]
```

### Event Data Format

```json
{
  "title": "Notification Title",     // Required
  "message": "Notification message", // Required
  "action": "/lovelace/cameras"      // Optional - URL or path to open on click
}
```

**Fields:**
- `title` (required): Notification title
- `message` (required): Notification body text
- `action` (optional): Dashboard path or URL to open when notification is clicked

## Dashboard Viewer

The plugin includes a built-in dashboard viewer accessible from the Quick Access menu:

1. Open Quick Access Menu (`...` button)
2. Navigate to Decky → HA Notify
3. Click **"Open Dashboard"**
4. Dashboard opens in Steam's CEF browser
5. Use **right trackpad** as mouse
6. Press **Steam button → X** to close

**First time setup:**
- You'll need to log in to Home Assistant once
- Steam browser saves your login session
- Subsequent opens are automatic (no login needed)

## Configuration

### Notification Duration

Edit `src/index.tsx` to change how long notifications display:

```typescript
toaster.toast({
  title: notif.title,
  body: notif.message,
  duration: 8000,  // milliseconds (8 seconds)
  logo: <SiHomeassistant size={32} color="#41BDF5" />,
});
```

### Notification Icon Size

Edit `src/index.tsx` to adjust icon size:

```typescript
logo: <SiHomeassistant size={32} color="#41BDF5" style={{ marginRight: "10px" }} />
//                      ^^^ Change size (24, 32, 40, etc.)
```

### WebSocket Reconnection

The plugin automatically reconnects if the connection is lost. Default retry interval: 10 seconds.

To change, edit `main.py`:

```python
await asyncio.sleep(10)  # Change retry delay
```

## Development

### Building from Source

```bash
# Clone repository
git clone https://github.com/KuzmaTolyanuch/decky-ha-notifcations.git
cd decky-ha-notifcations

# Install dependencies
pnpm install

# Build
pnpm run build

# Watch mode (auto-rebuild on changes)
pnpm run watch
```

### Project Structure

```
decky-ha-notifcations/
├── src/
│   ├── index.tsx          # Frontend React component
│   └── types.d.ts         # TypeScript declarations
├── main.py                # Backend WebSocket client
├── .env                   # Configuration (not in git)
├── .env.example           # Configuration template
├── plugin.json            # Plugin metadata
├── package.json           # Node dependencies
├── rollup.config.js       # Build configuration
└── tsconfig.json          # TypeScript configuration
```

### Local Development

```bash
# Deploy to Steam Deck
scp -r dist main.py .env deck@steamdeck:~/homebrew/plugins/ha-notify/
ssh deck@steamdeck "systemctl --user restart plugin_loader"

# Watch logs
ssh deck@steamdeck "journalctl --user -u plugin_loader -f | grep 'HA Notify'"
```

## Troubleshooting

### Plugin doesn't appear in Decky

1. Check if plugin is installed:
   ```bash
   ls ~/homebrew/plugins/ha-notify
   ```

2. Check Decky logs:
   ```bash
   journalctl --user -u plugin_loader -f
   ```

3. Restart Decky:
   ```bash
   systemctl --user restart plugin_loader
   ```

### WebSocket shows "disconnected"

1. **Check .env file exists:**
   ```bash
   cat ~/homebrew/plugins/ha-notify/.env
   ```

2. **Verify HA token is valid:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://your-instance.ui.nabu.casa/api/
   ```

3. **Check plugin logs:**
   ```bash
   journalctl --user -u plugin_loader -f | grep "HA Notify"
   ```

   Look for:
   - `Loading config from .env` - Config file found
   - `Loaded HA_URL: https://...` - URL loaded successfully
   - `Authentication successful` - Connected!
   - `Authentication failed` - Check token
   - `.env file not found` - Create .env file
   - `HA_URL or HA_TOKEN not set` - Fill in .env file

### Notifications not appearing

1. **Check WebSocket status** in plugin UI (should show "connected")

2. **Test event firing:**
   ```yaml
   # In Home Assistant Developer Tools → Events
   event_type: steamdeck_notify
   event_data:
     title: "Test"
     message: "Testing!"
   ```

3. **Check notification queue:**
   - Open plugin UI
   - Look at "Pending" count
   - If count increases but no toast, check frontend logs

4. **Check browser console:**
   - Press `Ctrl+Shift+I` in desktop mode
   - Look for JavaScript errors

### ".env file not found" Error

Create the configuration file:

```bash
cd ~/homebrew/plugins/ha-notify
cp .env.example .env
nano .env
```

Add your credentials:
```bash
HA_URL=https://your-instance.ui.nabu.casa
HA_TOKEN=your_long_lived_access_token
```

Then restart:
```bash
systemctl --user restart plugin_loader
```

### Dashboard won't open

1. **Check HA URL in .env** - Must be accessible from Steam Deck
2. **Try opening in Desktop Mode browser first** - Verify URL works
3. **Check CEF browser logs:**
   ```bash
   journalctl --user -u plugin_loader -f
   ```

### Notification clicks don't work

1. **Verify action format:**
   - Dashboard path: `/lovelace/cameras` (starts with `/`)
   - Full URL: `https://example.com` (starts with `http`)
   
2. **Check logs when clicking:**
   ```bash
   journalctl --user -u plugin_loader -f | grep "HA Notify"
   ```

## Network Configuration

### Works Anywhere!

Unlike local HTTP servers, this plugin uses WebSocket connections to Home Assistant, so it works:

- ✅ At home on local network
- ✅ Away from home (on any WiFi/mobile network)
- ✅ Behind NAT/firewall
- ✅ On VPN
- ✅ With Home Assistant Cloud (Nabu Casa)
- ✅ With DuckDNS/custom domains

**No port forwarding or firewall configuration needed!**

### Firewall

No incoming firewall rules needed - plugin makes outbound WebSocket connection to Home Assistant.

## Examples

### Complete Automation Examples

#### Door Open Alert with Camera View
```yaml
automation:
  - alias: "Steam Deck - Front Door Opened"
    trigger:
      - platform: state
        entity_id: binary_sensor.front_door
        to: "on"
    action:
      - event: steamdeck_notify
        event_data:
          title: "🚪 Front Door"
          message: "Door opened at {{ now().strftime('%I:%M %p') }}"
          action: "/lovelace/cameras"  # Click to view cameras
```

#### Low Battery Warning
```yaml
automation:
  - alias: "Steam Deck - Phone Battery Low"
    trigger:
      - platform: numeric_state
        entity_id: sensor.phone_battery
        below: 20
    action:
      - event: steamdeck_notify
        event_data:
          title: "🔋 Battery Low"
          message: "Phone battery at {{ states('sensor.phone_battery') }}%"
          action: "/config/devices"  # Click to view device
```

#### Person Arrives Home
```yaml
automation:
  - alias: "Steam Deck - Welcome Home"
    trigger:
      - platform: state
        entity_id: person.john
        to: "home"
    action:
      - event: steamdeck_notify
        event_data:
          title: "👋 Welcome Home"
          message: "{{ trigger.to_state.attributes.friendly_name }} arrived"
          action: "/lovelace/presence"  # Click to view presence dashboard
```

#### Security Alert with Action
```yaml
automation:
  - alias: "Steam Deck - Security Alert"
    trigger:
      - platform: state
        entity_id: binary_sensor.motion_backyard
        to: "on"
    condition:
      - condition: state
        entity_id: alarm_control_panel.home
        state: "armed_away"
    action:
      - event: steamdeck_notify
        event_data:
          title: "🚨 Security Alert"
          message: "Motion detected in backyard while armed"
          action: "/lovelace/security"  # Click to view security dashboard
```

### Home Assistant Blueprint

```yaml
blueprint:
  name: Steam Deck Notification with Action
  description: Send notifications to Steam Deck via HA Notify plugin with clickable actions
  domain: automation
  input:
    trigger_entity:
      name: Trigger Entity
      selector:
        entity: {}
    notification_title:
      name: Notification Title
      default: "Home Assistant Alert"
    notification_message:
      name: Notification Message
      default: "{{ trigger.to_state.state }}"
    notification_action:
      name: Action URL (optional)
      description: Dashboard path (/lovelace/cameras) or full URL
      default: ""

trigger:
  - platform: state
    entity_id: !input trigger_entity

action:
  - event: steamdeck_notify
    event_data:
      title: !input notification_title
      message: !input notification_message
      action: !input notification_action
```

### Python Script Example

```python
import requests

def notify_steamdeck(title, message, ha_url, ha_token, action=None):
    """Fire steamdeck_notify event via Home Assistant API"""
    url = f"{ha_url}/api/events/steamdeck_notify"
    headers = {
        "Authorization": f"Bearer {ha_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "title": title,
        "message": message
    }
    if action:
        payload["action"] = action
        
    response = requests.post(url, json=payload, headers=headers)
    return response.json()

# Usage - Basic notification
notify_steamdeck(
    title="Test",
    message="Hello from Python!",
    ha_url="https://your-instance.ui.nabu.casa",
    ha_token="your_token_here"
)

# Usage - With clickable action
notify_steamdeck(
    title="Motion Detected",
    message="Front yard camera",
    ha_url="https://your-instance.ui.nabu.casa",
    ha_token="your_token_here",
    action="/lovelace/cameras"  # Opens cameras dashboard on click
)
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the BSD-3-Clause License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) - Plugin loader for Steam Deck
- [Home Assistant](https://www.home-assistant.io/) - Open source home automation
- [React Icons](https://react-icons.github.io/react-icons/) - Icon library
- [certifi](https://github.com/certifi/python-certifi) - SSL certificate bundle

## Support

- **Issues:** [GitHub Issues](https://github.com/KuzmaTolyanuch/decky-ha-notifcations/issues)
- **Discussions:** [GitHub Discussions](https://github.com/KuzmaTolyanuch/decky-ha-notifcations/discussions)

## Roadmap

- [x] WebSocket-based push notifications
- [x] Remote access support (works outside LAN)
- [x] Home Assistant Cloud (Nabu Casa) support
- [x] Automatic reconnection
- [x] Clickable notifications with actions
- [x] Built-in dashboard viewer
- [x] .env file configuration
- [ ] Submit to Decky Plugin Store
- [ ] Add notification history/log
- [ ] Custom notification sounds
- [ ] Per-notification icon customization
- [ ] Multiple Home Assistant instances
- [ ] Notification priority levels
- [ ] Entity control from notifications (toggle lights, etc.)

## FAQ

**Q: Do I need to open ports on my router?**  
A: No! The plugin connects to Home Assistant via WebSocket, so no port forwarding is needed.

**Q: Will this work if I'm away from home?**  
A: Yes! As long as Steam Deck has internet access, it will receive notifications from Home Assistant Cloud or your publicly accessible instance.

**Q: How much battery does this use?**  
A: Minimal. WebSocket connections are efficient and the plugin only wakes up when notifications arrive.

**Q: Can I use this without Home Assistant Cloud?**  
A: Yes! You can use DuckDNS, Tailscale, or any method to make your Home Assistant accessible via HTTPS.

**Q: What happens if WiFi disconnects?**  
A: The plugin will automatically reconnect when the connection is restored.

**Q: Can I click on notifications to do something?**  
A: Yes! Add an `action` field to your event data with a dashboard path or URL, and clicking the notification will open it in Steam's browser.

**Q: How do I view my Home Assistant dashboard?**  
A: Open the plugin in Quick Access menu and click "Open Dashboard". It opens in Steam's browser. You'll log in once, then sessions are saved.

**Q: Do I need to configure environment variables in systemd?**  
A: No! Just create a `.env` file in the plugin directory with your HA_URL and HA_TOKEN.

**Q: Where do I put the .env file?**  
A: In `~/homebrew/plugins/ha-notify/.env` (same directory as main.py)

---

Made with ❤️ for Steam Deck and Home Assistant communities
