import os

# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code repo
# and add the `decky-loader/plugin/imports` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky
import asyncio

class Plugin:
    # A normal method. It can be called from the TypeScript side using @decky/api.
    async def add(self, left: int, right: int) -> int:
        return left + right

    async def long_running(self):
        await asyncio.sleep(15)
        # Passing through a bunch of random data, just as an example
        await decky.emit("timer_event", "Hello from the backend!", True, 2)

    # Asyncio-compatible long-running code, executed in a task when the plugin is loaded
    async def _main(self):
        decky.logger.info("HA Notify starting...")
        
        from aiohttp import web
        import time
        
        self.port = 8888
        self.notification_queue = []
        
        app = web.Application()
        app.router.add_post('/notify', self.handle_notification)
        app.router.add_get('/health', self.health_check)
        
        self.runner = web.AppRunner(app)
        await self.runner.setup()
        self.site = web.TCPSite(self.runner, '0.0.0.0', self.port)
        await self.site.start()
        
        decky.logger.info(f"Listening on port {self.port}")
    
    async def handle_notification(self, request):
        try:
            import time
            data = await request.json()
            title = data.get('title', 'Notification')
            message = data.get('message', '')
            
            decky.logger.info(f"Received: {title} - {message}")
            
            self.notification_queue.append({
                'title': title,
                'message': message,
                'timestamp': time.time()
            })
            
            from aiohttp import web
            return web.json_response({'status': 'ok'})
        except Exception as e:
            decky.logger.error(f"Error: {e}")
            from aiohttp import web
            return web.json_response({'status': 'error', 'message': str(e)}, status=500)
    
    async def health_check(self, request):
        from aiohttp import web
        return web.json_response({
            'status': 'healthy',
            'port': self.port,
            'pending': len(self.notification_queue)
        })
    
    async def get_pending_notifications(self):
        notifications = self.notification_queue.copy()
        self.notification_queue.clear()
        
        if notifications:
            decky.logger.info(f"Returning {len(notifications)} notification(s)")
        
        return notifications
    
    async def get_stats(self):
        return {
            "port": self.port,
            "status": "running",
            "pending_notifications": len(self.notification_queue)
        }
    
    # Function called first during the unload process, utilize this to handle your plugin being stopped, but not
    # completely removed
    async def _unload(self):
        decky.logger.info("Shutting down...")
        if hasattr(self, 'site'):
            await self.site.stop()
        if hasattr(self, 'runner'):
            await self.runner.cleanup()

    # Function called after `_unload` during uninstall, utilize this to clean up processes and other remnants of your
    # plugin that may remain on the system
    async def _uninstall(self):
        decky.logger.info("Goodbye World!")
        pass

    async def start_timer(self):
        self.loop.create_task(self.long_running())

    # Migrations that should be performed before entering `_main()`.
    async def _migration(self):
        decky.logger.info("Migrating")
        # Here's a migration example for logs:
        # - `~/.config/decky-template/template.log` will be migrated to `decky.decky_LOG_DIR/template.log`
        decky.migrate_logs(os.path.join(decky.DECKY_USER_HOME,
                                               ".config", "decky-template", "template.log"))
        # Here's a migration example for settings:
        # - `~/homebrew/settings/template.json` is migrated to `decky.decky_SETTINGS_DIR/template.json`
        # - `~/.config/decky-template/` all files and directories under this root are migrated to `decky.decky_SETTINGS_DIR/`
        decky.migrate_settings(
            os.path.join(decky.DECKY_HOME, "settings", "template.json"),
            os.path.join(decky.DECKY_USER_HOME, ".config", "decky-template"))
        # Here's a migration example for runtime data:
        # - `~/homebrew/template/` all files and directories under this root are migrated to `decky.decky_RUNTIME_DIR/`
        # - `~/.local/share/decky-template/` all files and directories under this root are migrated to `decky.decky_RUNTIME_DIR/`
        decky.migrate_runtime(
            os.path.join(decky.DECKY_HOME, "template"),
            os.path.join(decky.DECKY_USER_HOME, ".local", "share", "decky-template"))
