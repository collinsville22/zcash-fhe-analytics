"""
WebSocket Support for Real-Time Updates
Pushes swap data and metrics to connected clients
"""

from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
import logging

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manage WebSocket connections and real-time updates"""
    
    def __init__(self, app):
        self.app = app
        self.socketio = SocketIO(
            app,
            cors_allowed_origins=["http://localhost:5000", "http://127.0.0.1:5000"],
            async_mode='threading',
            logger=False,
            engineio_logger=False
        )
        
        self.connected_clients = set()
        self._setup_handlers()
        
        logger.info("WebSocket manager initialized")
    
    def _setup_handlers(self):
        """Setup WebSocket event handlers"""
        
        @self.socketio.on('connect')
        def handle_connect():
            client_id = request.sid
            self.connected_clients.add(client_id)
            logger.info(f"Client connected: {client_id} (total: {len(self.connected_clients)})")
            
            emit('connected', {
                'status': 'connected',
                'client_id': client_id,
                'message': 'Connected to Zcash FHE Analytics'
            })
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            client_id = request.sid
            self.connected_clients.discard(client_id)
            logger.info(f"Client disconnected: {client_id} (total: {len(self.connected_clients)})")
        
        @self.socketio.on('subscribe')
        def handle_subscribe(data):
            room = data.get('channel', 'general')
            join_room(room)
            logger.info(f"Client {request.sid} subscribed to {room}")
            
            emit('subscribed', {
                'channel': room,
                'status': 'subscribed'
            })
        
        @self.socketio.on('unsubscribe')
        def handle_unsubscribe(data):
            room = data.get('channel', 'general')
            leave_room(room)
            logger.info(f"Client {request.sid} unsubscribed from {room}")
    
    def broadcast_new_swap(self, swap_data):
        """Broadcast new swap to all connected clients"""
        self.socketio.emit('new_swap', {
            'type': 'new_swap',
            'data': swap_data,
            'timestamp': swap_data.get('ingested_at')
        }, room='swaps', broadcast=True)
        
        logger.debug(f"Broadcasted new swap to 'swaps' room")
    
    def broadcast_metric_update(self, metric_name, value):
        """Broadcast metric update"""
        self.socketio.emit('metric_update', {
            'type': 'metric_update',
            'metric': metric_name,
            'value': value
        }, room='metrics', broadcast=True)
        
        logger.debug(f"Broadcasted metric update: {metric_name}")
    
    def broadcast_decryption(self, metric_name, decrypted_value):
        """Broadcast threshold decryption result"""
        self.socketio.emit('decryption', {
            'type': 'decryption',
            'metric': metric_name,
            'value': decrypted_value
        }, broadcast=True)
        
        logger.info(f"Broadcasted decryption: {metric_name} = {decrypted_value}")
    
    def get_client_count(self):
        """Get number of connected clients"""
        return len(self.connected_clients)
