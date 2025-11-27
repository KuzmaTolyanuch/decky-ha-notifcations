# HA Notify - Decky Plugin

Receive Home Assistant notifications directly in Steam Deck Gaming Mode.

![Home Assistant](https://img.shields.io/badge/Home%20Assistant-41BDF5?style=for-the-badge&logo=home-assistant&logoColor=white)
![Steam Deck](https://img.shields.io/badge/Steam%20Deck-1A1A1A?style=for-the-badge&logo=steam&logoColor=white)

## Features

- ✅ Receive notifications from Home Assistant in Gaming Mode
- ✅ Toast notifications with Home Assistant branding
- ✅ Simple HTTP API endpoint
- ✅ Real-time notification polling
- ✅ Easy integration with Home Assistant automations

## Installation

### Prerequisites

- Steam Deck with Decky Loader installed
- Home Assistant instance on your network

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

3. **Restart Decky Loader:**
   ```bash
   systemctl --user restart plugin_loader
   ```

4. **Verify installation:**
   - Open Quick Access Menu (`...` button)
   - Navigate to Decky tab (plug icon 🔌)
   - Look for "HA Notify" plugin

## Usage

### From Home Assistant

#### Using REST Command

Add to your `configuration.yaml`:

```yaml
rest_command:
  notify_steamdeck:
    url: "http://steamdeck.local:8888/notify"
    method: POST
    headers:
      Content-Type: "application/json"
    payload: '{"title":"{{ title }}","message":"{{ message }}"}'
```

Then use in automations:

```yaml
automation:
  - alias: "Notify Steam Deck - Motion Detected"
    trigger:
      - platform: state
        entity_id: binary_sensor.motion_living_room
        to: "on"
    action:
      - service: rest_command.notify_steamdeck
        data:
          title: "Motion Detected"
          message: "Movement in living room"
```

#### Using cURL

```bash
curl -X POST http://steamdeck.local:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Alert","message":"Hello from Home Assistant!"}'
```

#### Using Node-RED

```json
[
  {
    "id": "http_request_node",
    "type": "http request",
    "method": "POST",
    "url": "http://steamdeck.local:8888/notify",
    "payloadType": "json",
    "headers": {
      "Content-Type": "application/json"
    }
  }
]
```

Payload:
```json
{
  "title": "{{ msg.title }}",
  "message": "{{ msg.message }}"
}
```

### API Endpoints

#### POST `/notify`

Send a notification to Steam Deck.

**Request:**
```json
{
  "title": "Alert Title",
  "message": "Notification message"
}
```

**Response:**
```json
{
  "status": "ok"
}
```

#### GET `/health`

Check if the service is running.

**Response:**
```json
{
  "status": "healthy",
  "port": 8888,
  "pending": 0
}
```

## Configuration

### Change Port

Edit `main.py` and change the port:

```python
self.port = 8888  # Change to your desired port
```

Then rebuild:
```bash
pnpm run build
systemctl --user restart plugin_loader
```

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
├── main.py                # Backend Python server
├── plugin.json            # Plugin metadata
├── package.json           # Node dependencies
├── rollup.config.js       # Build configuration
└── tsconfig.json          # TypeScript configuration
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

### Notifications not appearing

1. Test the endpoint directly:
   ```bash
   curl http://steamdeck.local:8888/health
   ```

2. Check if port 8888 is accessible:
   ```bash
   netstat -tulpn | grep 8888
   ```

3. Verify Home Assistant can reach Steam Deck:
   ```bash
   ping steamdeck.local
   ```

### Check plugin logs

```bash
ssh deck@steamdeck
journalctl --user -u plugin_loader -f | grep "HA Notify"
```

## Network Configuration

### Find Your Steam Deck IP

```bash
# On Steam Deck
hostname -I

# Or use mDNS
ping steamdeck.local
```

### Firewall (if needed)

```bash
# Allow port 8888
sudo ufw allow 8888/tcp
```

## Examples

### Home Assistant Blueprint

Save this as a blueprint:

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
  - service: rest_command.notify_steamdeck
    data:
      title: !input notification_title
      message: !input notification_message
```

### Python Script Example

```python
import requests

def notify_steamdeck(title, message):
    url = "http://steamdeck.local:8888/notify"
    payload = {
        "title": title,
        "message": message
    }
    response = requests.post(url, json=payload)
    return response.json()

# Usage
notify_steamdeck("Test", "Hello from Python!")
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

## Support

- **Issues:** [GitHub Issues](https://github.com/KuzmaTolyanuch/decky-ha-notifcations/issues)
- **Discussions:** [GitHub Discussions](https://github.com/KuzmaTolyanuch/decky-ha-notifcations/discussions)

## Roadmap

- [ ] Submit to Decky Plugin Store
- [ ] Add notification history/log
- [ ] Support for notification actions/buttons
- [ ] Custom notification sounds
- [ ] Per-notification icon customization
- [ ] Authentication support
- [ ] HTTPS/TLS support

---

Made with ❤️ for Steam Deck and Home Assistant communities
