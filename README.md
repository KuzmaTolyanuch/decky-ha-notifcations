# Home Assistant Notifications for Steam Deck

Receive Home Assistant notifications directly in Steam Deck Gaming Mode.

## Features

- 🎮 **Gaming Mode Support** - Works seamlessly in Gaming Mode
- 🔔 **Real-time Notifications** - Instant alerts from Home Assistant
- ⚙️ **Configurable** - Adjust port and settings via UI
- 🧪 **Built-in Testing** - Test notifications without HA

## Installation

### Prerequisites

- Steam Deck with Decky Loader installed
- Home Assistant instance on your network

### Install Decky Loader

```bash
curl -L https://github.com/SteamDeckHomebrew/decky-installer/releases/latest/download/install_release.sh | sh
```

### Install Plugin

1. Clone this repository:
```bash
git clone https://github.com/yourusername/decky-ha-notifications.git
cd decky-ha-notifications
```

2. Build the plugin:
```bash
pnpm install
pnpm run build
```

3. Deploy to Steam Deck:
```bash
# Copy to plugins directory
cp -r . ~/homebrew/plugins/ha-notify/

# Restart Decky
systemctl --user restart plugin_loader
```

## Home Assistant Configuration

Add this to your `configuration.yaml`:

```yaml
rest_command:
  notify_steamdeck:
    url: "http://STEAMDECK_IP:8888/notify"
    method: POST
    content_type: "application/json"
    payload: >
      {
        "title": "{{ title }}",
        "message": "{{ message }}"
      }
```

### Example Automation

```yaml
automation:
  - alias: "Alert on Door Open"
    trigger:
      - platform: state
        entity_id: binary_sensor.front_door
        to: "on"
    action:
      - service: rest_command.notify_steamdeck
        data:
          title: "Security"
          message: "Front door opened"
```

## Usage

### Send Notification from Command Line

```bash
curl -X POST http://steamdeck.local:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Hello World"}'
```

### Check Health

```bash
curl http://steamdeck.local:8888/health
```

## Configuration

Access plugin settings via:
1. Gaming Mode → Quick Access (... button)
2. Click Decky icon (🔌)
3. Select "HA Notify"

## Troubleshooting

### Plugin not loading
```bash
# Check logs
journalctl --user -u plugin_loader -f
```

### Notifications not appearing
```bash
# Test locally
curl -X POST http://localhost:8888/notify \
  -H "Content-Type: application/json" \
  -d '{"title":"Local Test","message":"Testing"}'
```

### Find Steam Deck IP
```bash
ip addr show | grep inet
```

## Development

### Build
```bash
pnpm install
pnpm run build
```

### Watch Mode
```bash
pnpm run watch
```

## License

GPL-3.0-or-later

## Credits

Built with [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader)
```