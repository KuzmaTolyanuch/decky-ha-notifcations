import decky
import aiohttp
import asyncio
import ssl
import certifi
import os

class Plugin:
    async def _main(self):
        decky.logger.info("HA Notify starting...")
        
        # Configuration from environment variables
        self.ha_url = os.getenv("HA_URL")
        self.ha_token = os.getenv("HA_TOKEN")
        
        if not self.ha_token:
            decky.logger.error("HA_TOKEN environment variable not set!")
            return
        
        self.notification_queue = []
        self.websocket_task = None
        
        # Start WebSocket connection to HA
        self.websocket_task = asyncio.create_task(self.connect_to_ha())
        
        decky.logger.info("Plugin initialized")
    
    async def connect_to_ha(self):
        """Connect to Home Assistant via WebSocket"""
        # Create SSL context with proper certificates
        ssl_context = ssl.create_default_context(cafile=certifi.where())
        
        while True:
            try:
                decky.logger.info("Connecting to Home Assistant WebSocket...")
                
                # Create connector with SSL context
                connector = aiohttp.TCPConnector(ssl=ssl_context)
                
                async with aiohttp.ClientSession(connector=connector) as session:
                    # Connect to WebSocket
                    ws_url = f"{self.ha_url}/api/websocket"
                    decky.logger.info(f"Connecting to {ws_url}")
                    
                    async with session.ws_connect(ws_url) as ws:
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
                            
                            # Listen for notifications
                            async for msg in ws:
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
                
            except aiohttp.ClientConnectorError as e:
                decky.logger.error(f"Connection error: {e}, retrying in 10s...")
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                decky.logger.info("WebSocket task cancelled")
                break
            except Exception as e:
                decky.logger.error(f"WebSocket error: {e}, retrying in 10s...")
                await asyncio.sleep(10)
    
    async def handle_ha_event(self, data):
        """Handle event from Home Assistant"""
        try:
            event = data.get("event", {})
            event_data = event.get("data", {})
            
            title = event_data.get("title", "Notification")
            message = event_data.get("message", "")
            
            decky.logger.info(f"Received: {title} - {message}")
            
            import time
            self.notification_queue.append({
                'title': title,
                'message': message,
                'timestamp': time.time()
            })
            
        except Exception as e:
            decky.logger.error(f"Error handling event: {e}")
    
    async def get_pending_notifications(self):
        """Get pending notifications and clear the queue"""
        notifications = self.notification_queue.copy()
        self.notification_queue.clear()
        
        if notifications:
            decky.logger.info(f"Returning {len(notifications)} notification(s)")
        
        return notifications
    
    async def get_stats(self):
        """Return plugin statistics"""
        ws_status = "disconnected"
        if self.websocket_task and not self.websocket_task.done():
            ws_status = "connected"
        
        return {
            "status": "running",
            "pending_notifications": len(self.notification_queue),
            "websocket_status": ws_status,
            "ha_url": self.ha_url
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
