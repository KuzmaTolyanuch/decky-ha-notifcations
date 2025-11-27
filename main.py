import os
import sys
import logging
from aiohttp import web
import json

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
        
        # Use a fixed port (or load from file if needed)
        self.port = 8888
        self.notification_queue = []  # Store notifications for frontend to poll
        
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
            "message": "Notification message"
        }
        """
        try:
            data = await request.json()
            title = data.get('title', 'Home Assistant')
            message = data.get('message', 'Notification')
            
            logger.info(f"Received notification - Title: {title}, Message: {message}")
            
            # Add to queue for frontend to pick up
            import time
            self.notification_queue.append({
                'title': title,
                'message': message,
                'timestamp': time.time()
            })
            
            return web.json_response({'status': 'ok'})
            
        except Exception as e:
            logger.error(f"Error handling notification: {e}", exc_info=True)
            return web.json_response(
                {'status': 'error', 'message': str(e)},
                status=500
            )
    
    async def health_check(self, request):
        """Health check endpoint"""
        try:
            return web.json_response({
                'status': 'healthy',
                'service': 'HA Notify',
                'port': self.port,
                'pending': len(self.notification_queue)
            })
        except Exception as e:
            logger.error(f"Health check error: {e}", exc_info=True)
            return web.json_response(
                {'status': 'error', 'message': str(e)},
                status=500
            )
    
    async def get_port(self):
        """Return the current port - called by frontend"""
        return self.port
    
    async def set_port(self, port: int):
        """Change the listening port"""
        self.port = port
        logger.info(f"Port changed to {port}. Reload plugin to apply.")
        return True
    
    async def get_pending_notifications(self):
        """
        Get pending notifications and clear the queue
        Called by frontend to poll for new notifications
        """
        try:
            notifications = self.notification_queue.copy()
            self.notification_queue.clear()
            logger.info(f"Returning {len(notifications)} notifications to frontend")
            return notifications
        except Exception as e:
            logger.error(f"Error getting notifications: {e}", exc_info=True)
            return []
    
    async def get_stats(self):
        """Return plugin statistics - called by frontend"""
        try:
            return {
                "port": self.port,
                "status": "running",
                "pending_notifications": len(self.notification_queue)
            }
        except Exception as e:
            logger.error(f"Error getting stats: {e}", exc_info=True)
            return {
                "port": self.port,
                "status": "error",
                "pending_notifications": 0
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
            logger.error(f"Error during unload: {e}", exc_info=True)