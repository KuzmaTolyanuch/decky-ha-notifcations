import os
import sys
import logging
from aiohttp import web
import asyncio

# Add py_modules to path
py_modules_path = os.path.join(os.path.dirname(__file__), "py_modules")
sys.path.append(py_modules_path)

# Import decky_plugin
import decky_plugin

logging.basicConfig(
    level=logging.INFO,
    format='[HA Notify] %(asctime)s %(levelname)s %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger()

class Plugin:
    """
    Home Assistant Notification Plugin for Steam Deck
    Receives notifications from Home Assistant and displays them in Gaming Mode
    """
    
    async def _main(self):
        """Initialize the plugin"""
        logger.info("HA Notify plugin starting...")
        
        # Read port from settings or use default
        self.port = decky_plugin.get_setting("port", 8888)
        
        # Create web server for receiving notifications
        self.app = web.Application()
        self.app.router.add_post('/notify', self.handle_notification)
        self.app.router.add_get('/health', self.health_check)
        
        # Start server
        try:
            self.runner = web.AppRunner(self.app)
            await self.runner.setup()
            self.site = web.TCPSite(self.runner, '0.0.0.0', self.port)
            await self.site.start()
            logger.info(f"HA Notify listening on port {self.port}")
        except Exception as e:
            logger.error(f"Failed to start server: {e}")
            raise
    
    async def handle_notification(self, request):
        """
        Handle incoming notification from Home Assistant
        
        Expected JSON payload:
        {
            "title": "Notification Title",
            "message": "Notification message",
            "duration": 5000  # optional, milliseconds
        }
        """
        try:
            data = await request.json()
            title = data.get('title', 'Home Assistant')
            message = data.get('message', 'Notification')
            duration = data.get('duration', 5000)
            
            logger.info(f"Received notification - Title: {title}, Message: {message}")
            
            # Show notification via Decky's toast system
            decky_plugin.logger.info(f"Notification: {title} - {message}")
            
            return web.Response(
                text='{"status": "ok"}',
                content_type='application/json',
                status=200
            )
            
        except Exception as e:
            logger.error(f"Error handling notification: {e}")
            return web.Response(
                text=f'{{"status": "error", "message": "{str(e)}"}}',
                content_type='application/json',
                status=500
            )
    
    async def health_check(self, request):
        """Health check endpoint"""
        return web.Response(
            text='{"status": "healthy", "service": "HA Notify"}',
            content_type='application/json'
        )
    
    async def get_port(self) -> int:
        """Return the current port"""
        return self.port
    
    async def set_port(self, port: int) -> bool:
        """
        Change the listening port
        Requires plugin reload to take effect
        """
        try:
            decky_plugin.set_setting("port", port)
            logger.info(f"Port changed to {port}. Reload plugin to apply.")
            return True
        except Exception as e:
            logger.error(f"Failed to set port: {e}")
            return False
    
    async def get_stats(self) -> dict:
        """Return plugin statistics"""
        return {
            "port": self.port,
            "status": "running"
        }
    
    async def _unload(self):
        """Cleanup when plugin unloads"""
        logger.info("HA Notify plugin unloading...")
        try:
            if hasattr(self, 'site'):
                await self.site.stop()
            if hasattr(self, 'runner'):
                await self.runner.cleanup()
            logger.info("HA Notify plugin unloaded successfully")
        except Exception as e:
            logger.error(f"Error during unload: {e}")