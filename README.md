# HA Notify - Decky Plugin

Receive Home Assistant notifications directly in Steam Deck Gaming Mode via WebSocket - works anywhere with internet connection!

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-41BDF5?style=for-the-badge&logo=home-assistant&logoColor=white)
![Steam Deck](https://img.shields.io/badge/Steam%20Deck-1A1A1A?style=for-the-badge&logo=steam&logoColor=white)

## Features

- ✅ Receive notifications from Home Assistant in Gaming Mode
- ✅ WebSocket connection - works remotely (no local network required)
- ✅ Toast notifications with Home Assistant branding
- ✅ Real-time push notifications
- ✅ Works with Home Assistant Cloud (Nabu Casa) or self-hosted instances
- ✅ Automatic reconnection on network changes
- ✅ Easy integration with Home Assistant automations

## Installation

### Prerequisites

- Steam Deck with Decky Loader installed
- Home Assistant instance (local or cloud)
- Home Assistant Long-Lived Access Token

### Install via Decky Store (Recommended)

*Coming soon - plugin submission pending*

### Manual Installation

1. **Download the latest release:**
   ```bash
   cd ~/homebrew/plugins
   git clone https://github.com/KuzmaTolyanuch/decky-ha-notifcations.git ha-notify
   ```

2. **Build the plugin:**
   ```bash
   cd ha-notify
   pnpm install
   pnpm run build
   ```

3. **Install SSL certificates (required for HTTPS connections):**
   ```bash
   pip install certifi
   ```

4. **Configure environment variables:**
   ```bash
   # Create systemd override directory
   sudo mkdir -p /etc/systemd/system/plugin_loader.service.d
   
   # Create environment file
   sudo tee /etc/systemd/system/plugin_loader.service.d/override.conf <<EOF
   [Service]
   Environment="HA_TOKEN=YOUR_LONG_LIVED_ACCESS_TOKEN"
   Environment="HA_URL=https://your-instance.ui.nabu.casa"
   EOF
   
   # Reload systemd
   sudo systemctl daemon-reload
   ```

5. **Restart Decky Loader:**
   ```bash
   systemctl --user restart plugin_loader
   ```

6. **Verify installation:**
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
6. Copy the token (you won't be able to see it again!)

### Set Environment Variables

**Option 1: System-wide (Recommended)**

```bash
# SSH to Steam Deck
ssh deck@steamdeck

# Create override file
sudo mkdir -p /etc/systemd/system/plugin_loader.service.d
sudo nano /etc/systemd/system/plugin_loader.service.d/override.conf
```

Add:
```ini
[Service]
Environment="HA_TOKEN=your_ha_long_term_token_here
Environment="HA_URL=https://your-instance.ui.nabu.casa"
```

Save and apply:
```bash
sudo systemctl daemon-reload
systemctl --user restart plugin_loader
```

**Option 2: User Environment**

```bash
# Add to ~/.bashrc
echo 'export HA_TOKEN="your_ha_long_term_token_here"' >> ~/.bashrc
echo 'export HA_URL="https://your-instance.ui.nabu.casa"' >> ~/.bashrc
source ~/.bashrc
systemctl --user restart plugin_loader
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

#### Method 1: Using Automations

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

#### Method 2: Using Scripts

```yaml
script:
  notify_steamdeck:
    alias: "Send Steam Deck Notification"
    sequence:
      - event: steamdeck_notify
        event_data:
          title: "{{ title }}"
          message: "{{ message }}"
```

Usage:
```yaml
service: script.notify_steamdeck
data:
  title: "Alert"
  message: "Your message here"
```

#### Method 3: Developer Tools (Testing)

1. Go to **Developer Tools** → **Events**
2. Set Event Type: `steamdeck_notify`
3. Set Event Data:
   ```json
   {
     "title": "Test Alert",
     "message": "Hello from Home Assistant!"
   }
   ```
4. Click **Fire Event**

#### Method 4: Node-RED

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
        "message": "{{ msg.message }}"
      }
    }
  }
]
```

### Event Data Format

```json
{
  "title": "Notification Title",
  "message": "Notification message body"
}
```

**Fields:**
- `title` (required): Notification title
- `message` (required): Notification body text

## Configuration

### Notification Duration

Edit `src/index.tsx` to change how long notifications display:

```typescript
toaster.toast({
  title: notif.title,
  body: notif.message,
  duration: 8000,  // milliseconds (8 seconds)
  logo: <SiHomeassistant size={24} color="#41BDF5" />,
});
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
├── plugin.json            # Plugin metadata
├── package.json           # Node dependencies
├── rollup.config.js       # Build configuration
└── tsconfig.json          # TypeScript configuration
```

### Local Development

```bash
# Deploy to Steam Deck
scp -r dist main.py deck@steamdeck:~/homebrew/plugins/ha-notify/
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

1. **Check environment variables:**
   ```bash
   systemctl --user show plugin_loader | grep Environment
   ```

2. **Verify HA token is valid:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://your-instance.ui.nabu.casa/api/
   ```

3. **Check SSL certificates:**
   ```bash
   python3 -c "import certifi; print(certifi.where())"
   ```
   
   If missing:
   ```bash
   pip install --upgrade certifi
   ```

4. **Check plugin logs:**
   ```bash
   journalctl --user -u plugin_loader -f | grep "HA Notify"
   ```

   Look for:
   - `Authentication successful` - Good!
   - `Authentication failed` - Check token
   - `SSL: CERTIFICATE_VERIFY_FAILED` - Install certifi
   - `Connection error` - Check HA_URL

### Notifications not appearing

1. **Check WebSocket status** in plugin UI (should show "connected")

2. **Test event firing:**
   ```bash
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

### "HA_TOKEN environment variable not set" Error

The token wasn't loaded. Fix:

```bash
# Verify override file exists
cat /etc/systemd/system/plugin_loader.service.d/override.conf

# Should show:
# [Service]
# Environment="HA_TOKEN=..."
# Environment="HA_URL=..."

# If missing, recreate it
sudo nano /etc/systemd/system/plugin_loader.service.d/override.conf

# Then reload
sudo systemctl daemon-reload
systemctl --user restart plugin_loader
```

### SSL Certificate Errors

```bash
# Install/update certifi
pip install --upgrade certifi

# Verify installation
python3 -c "import certifi; print(certifi.where())"

# Restart plugin
systemctl --user restart plugin_loader
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

#### Door Open Alert
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
```

### Home Assistant Blueprint

```yaml
blueprint:
  name: Steam Deck Notification
  description: Send notifications to Steam Deck via HA Notify plugin
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

trigger:
  - platform: state
    entity_id: !input trigger_entity

action:
  - event: steamdeck_notify
    event_data:
      title: !input notification_title
      message: !input notification_message
```

### Python Script Example

```python
import requests

def notify_steamdeck(title, message, ha_url, ha_token):
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
    response = requests.post(url, json=payload, headers=headers)
    return response.json()

# Usage
notify_steamdeck(
    title="Test",
    message="Hello from Python!",
    ha_url="https://your-instance.ui.nabu.casa",
    ha_token="your_token_here"
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
- [ ] Submit to Decky Plugin Store
- [ ] Add notification history/log
- [ ] Support for notification actions/buttons
- [ ] Custom notification sounds
- [ ] Per-notification icon customization
- [ ] Multiple Home Assistant instances
- [ ] Notification priority levels

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

---

Made with ❤️ for Steam Deck and Home Assistant communities
