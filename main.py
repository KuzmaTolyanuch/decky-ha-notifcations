import os
import sys
import logging
from aiohttp import web
import time

logging.basicConfig(
    level=logging.INFO,
    format='[HA Notify] %(asctime)s %(levelname)s %(message)s'
)

logger = logging.getLogger()

class Plugin:
    """
    Home Assistant Notification Plugin for Steam Deck
    Receives notifications from Home Assistant and displays them in Gaming Mode
    """
    
    async def _main(self):
        """Initialize the plugin"""
        logger.info("Starting HA Notify plugin...")
        
        # Use a fixed port (or load from file if needed)
        self.port = 8888
        self.notification_queue = []  # Store notifications for frontend to poll
        
        # Create web server for receiving notifications
        app = web.Application()
        app.router.add_post('/notify', self.handle_notification)
        app.router.add_get('/health', self.health_check)
        
        # Start server
        try:
            self.runner = web.AppRunner(app)
            await self.runner.setup()
            self.site = web.TCPSite(self.runner, '0.0.0.0', self.port)
            await self.site.start()
            
            logger.info(f"Listening on port {self.port}")
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
            title = data.get('title', 'Notification')
            message = data.get('message', '')
            
            logger.info(f"Received: {title} - {message}")
            
            # Add to queue for frontend to pick up
            self.notification_queue.append({
                'title': title,
                'message': message,
                'timestamp': time.time()
            })
            
            return web.json_response({'status': 'ok'})
        except Exception as e:
            logger.error(f"Error: {e}")
            return web.json_response(
                {'status': 'error', 'message': str(e)},
                status=500
            )
    
    async def health_check(self, request):
        """Health check endpoint"""
        try:
            return web.json_response({
                'status': 'healthy',
                'port': self.port,
                'pending': len(self.notification_queue)
            })
        except Exception as e:
            logger.error(f"Health check error: {e}", exc_info=True)
            return web.json_response(
                {'status': 'error', 'message': str(e)},
                status=500
            )
    
    async def get_pending_notifications(self):
        """
        Get pending notifications and clear the queue
        Called by frontend to poll for new notifications
        """
        try:
            notifications = self.notification_queue.copy()
            self.notification_queue.clear()
            
            # Only log when there are actual notifications
            if notifications:
                logger.info(f"Returning {len(notifications)} notification(s) to frontend")
            
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
        logger.info("Shutting down...")
        try:
            if hasattr(self, 'site'):
                await self.site.stop()
            if hasattr(self, 'runner'):
                await self.runner.cleanup()
        except Exception as e:
            logger.error(f"Error during unload: {e}", exc_info=True)