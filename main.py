import decky
import aiohttp
import ssl
import certifi
import asyncio
import os

class Plugin:
    async def _main(self):
        decky.logger.info("HA Notify starting...")
        
        # Load configuration from .env file
        self.ha_url = None
        self.ha_token = None
        
        env_file = os.path.join(decky.DECKY_PLUGIN_DIR, '.env')
        
        try:
            if os.path.exists(env_file):
                decky.logger.info(f"Loading config from {env_file}")
                with open(env_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith('#'):
                            continue
                        
                        if '=' in line:
                            key, value = line.split('=', 1)
                            key = key.strip()
                            value = value.strip().strip('"').strip("'")
                            
                            if key == 'HA_URL':
                                self.ha_url = value
                            elif key == 'HA_TOKEN':
                                self.ha_token = value
                
                decky.logger.info(f"Loaded HA_URL: {self.ha_url}")
            else:
                decky.logger.warning(f".env file not found at {env_file}")
        except Exception as e:
            decky.logger.error(f"Error loading .env file: {e}")

        if not self.ha_url or not self.ha_token:
            decky.logger.error("HA_URL or HA_TOKEN not set in .env file!")
            decky.logger.error(f"Please create {env_file} with:")
            decky.logger.error("HA_URL=https://your-instance.ui.nabu.casa")
            decky.logger.error("HA_TOKEN=your_long_lived_token")
            return
        
        self.notification_queue = []
        self.websocket_task = None
        self.last_message_time = asyncio.get_event_loop().time()
        self.ws_connected = False
        
        # Start WebSocket connection to HA for notifications
        self.websocket_task = asyncio.create_task(self.connect_to_ha())
        
        decky.logger.info("Plugin initialized")

    async def connect_to_ha(self):
        """Connect to Home Assistant via WebSocket for notifications"""
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        
        while True:
            try:
                decky.logger.info("Connecting to Home Assistant WebSocket...")
                self.ws_connected = False
                
                connector = aiohttp.TCPConnector(ssl=ssl_context)
                
                async with aiohttp.ClientSession(connector=connector) as session:
                    ws_url = f"{self.ha_url}/api/websocket"
                    decky.logger.info(f"Connecting to {ws_url}")
                    
                    async with session.ws_connect(
                        ws_url,
                        heartbeat=30,
                        timeout=aiohttp.ClientTimeout(total=60)
                    ) as ws:
                        decky.logger.info("WebSocket connected, waiting for auth...")
                        
                        # Wait for auth_required message
                        auth_msg = await ws.receive_json()
                        decky.logger.info(f"Received: {auth_msg.get('type')}")
                        
                        if auth_msg.get("type") == "auth_required":
                            # Send authentication
                            await ws.send_json({
                                "type": "auth",
                                "access_token": self.ha_token
                            })
                            
                            # Wait for auth response
                            auth_response = await ws.receive_json()
                            decky.logger.info(f"Auth response: {auth_response.get('type')}")
                            
                            if auth_response.get("type") != "auth_ok":
                                decky.logger.error(f"Authentication failed: {auth_response}")
                                await asyncio.sleep(10)
                                continue
                            
                            decky.logger.info("Authentication successful")
                            
                            # Subscribe to custom event
                            await ws.send_json({
                                "id": 1,
                                "type": "subscribe_events",
                                "event_type": "steamdeck_notify"
                            })
                            
                            decky.logger.info("Subscribed to steamdeck_notify events")
                            self.ws_connected = True
                            self.last_message_time = asyncio.get_event_loop().time()
                            
                            # Create healthcheck task
                            healthcheck_task = asyncio.create_task(self._healthcheck(ws))
                            
                            try:
                                # Listen for notifications
                                async for msg in ws:
                                    self.last_message_time = asyncio.get_event_loop().time()
                                    
                                    if msg.type == aiohttp.WSMsgType.TEXT:
                                        data = msg.json()
                                        
                                        if data.get("type") == "event":
                                            await self.handle_ha_event(data)
                                        
                                    elif msg.type == aiohttp.WSMsgType.ERROR:
                                        decky.logger.error(f"WebSocket error: {ws.exception()}")
                                        break
                                    elif msg.type == aiohttp.WSMsgType.CLOSED:
                                        decky.logger.warning("WebSocket closed, reconnecting...")
                                        break
                            finally:
                                healthcheck_task.cancel()
                                try:
                                    await healthcheck_task
                                except asyncio.CancelledError:
                                    pass
                
            except aiohttp.ClientConnectorError as e:
                decky.logger.error(f"Connection error: {e}, retrying in 10s...")
                self.ws_connected = False
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                decky.logger.info("WebSocket task cancelled")
                self.ws_connected = False
                break
            except asyncio.TimeoutError:
                decky.logger.error("Connection timeout, reconnecting...")
                self.ws_connected = False
                await asyncio.sleep(5)
            except Exception as e:
                decky.logger.error(f"WebSocket error: {e}, retrying in 10s...")
                self.ws_connected = False
                await asyncio.sleep(10)

    async def _healthcheck(self, ws):
        """Monitor connection health and force reconnect if stale"""
        while True:
            await asyncio.sleep(60)
            
            current_time = asyncio.get_event_loop().time()
            time_since_last_message = current_time - self.last_message_time
            
            if time_since_last_message > 90:
                decky.logger.warning(f"Connection stale ({time_since_last_message:.0f}s since last message), forcing reconnect")
                await ws.close()
                break

    async def handle_ha_event(self, data):
        """Handle event from Home Assistant"""
        try:
            event = data.get("event", {})
            event_data = event.get("data", {})
            
            title = event_data.get("title", "Notification")
            message = event_data.get("message", "")
            action = event_data.get("action")  # Optional action URL
            
            decky.logger.info(f"Received: {title} - {message}")
            if action:
                decky.logger.info(f"Action: {action}")
            
            import time
            notification = {
                'title': title,
                'message': message,
                'timestamp': time.time()
            }
            
            # Only add action if it exists
            if action:
                notification['action'] = action
            
            self.notification_queue.append(notification)
            
        except Exception as e:
            decky.logger.error(f"Error handling event: {e}")
    
    async def get_pending_notifications(self):
        """Get pending notifications and clear the queue"""
        notifications = self.notification_queue.copy()
        self.notification_queue.clear()
        
        if notifications:
            decky.logger.info(f"Returning {len(notifications)} notification(s)")
            for notif in notifications:
                decky.logger.info(f"  - {notif.get('title')}: action={notif.get('action', 'None')}")
        
        return notifications

    async def get_stats(self):
        """Return plugin statistics"""
        ws_status = "disconnected"
        if self.ws_connected and self.websocket_task and not self.websocket_task.done():
            ws_status = "connected"
        
        return {
            "status": "running",
            "pending_notifications": len(self.notification_queue),
            "websocket_status": ws_status,
            "ha_url": self.ha_url
        }
    
    async def get_dashboard_url(self):
        """Return direct HA URL - user logs in once, CEF saves cookies"""
        try:
            # CEF browser will save login cookies after first login
            return f"{self.ha_url}/lovelace/0"
        except Exception as e:
            decky.logger.error(f"Error getting dashboard URL: {e}")
            return None
    
    async def verify_connection(self):
        """Verify connection to Home Assistant"""
        try:
            ssl_context = ssl.create_default_context(cafile=certifi.where())
            connector = aiohttp.TCPConnector(ssl=ssl_context)
            
            async with aiohttp.ClientSession(connector=connector) as session:
                headers = {"Authorization": f"Bearer {self.ha_token}"}
                
                async with session.get(f"{self.ha_url}/api/", headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return {
                            "connected": True,
                            "message": data.get("message", "API running")
                        }
                    else:
                        return {
                            "connected": False,
                            "message": f"HTTP {resp.status}"
                        }
        except Exception as e:
            return {
                "connected": False,
                "message": str(e)
            }
    
    async def _unload(self):
        """Cleanup when plugin unloads"""
        decky.logger.info("Shutting down...")
        
        if self.websocket_task:
            self.websocket_task.cancel()
            try:
                await self.websocket_task
            except asyncio.CancelledError:
                pass
        
        decky.logger.info("Plugin shutdown complete")
