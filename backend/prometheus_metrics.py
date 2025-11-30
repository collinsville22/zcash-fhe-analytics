"""
Prometheus Metrics Collection
System monitoring and observability
"""

from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY
from flask import Response
import time
from functools import wraps
import logging

logger = logging.getLogger(__name__)

swap_ingestion_total = Counter(
    'zcash_fhe_swaps_ingested_total',
    'Total number of encrypted swaps ingested',
    ['destination_asset']
)

swap_ingestion_errors = Counter(
    'zcash_fhe_swap_ingestion_errors_total',
    'Total number of swap ingestion failures'
)

threshold_decryptions_total = Counter(
    'zcash_fhe_threshold_decryptions_total',
    'Total number of threshold decryptions performed',
    ['metric_name']
)

api_request_duration = Histogram(
    'zcash_fhe_api_request_duration_seconds',
    'API request duration in seconds',
    ['method', 'endpoint', 'status']
)

api_requests_total = Counter(
    'zcash_fhe_api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

database_query_duration = Histogram(
    'zcash_fhe_database_query_duration_seconds',
    'Database query duration in seconds',
    ['operation']
)

connected_websocket_clients = Gauge(
    'zcash_fhe_websocket_clients_connected',
    'Number of connected WebSocket clients'
)

fhe_operations_total = Counter(
    'zcash_fhe_operations_total',
    'Total FHE operations performed',
    ['operation_type']
)

fhe_operation_duration = Histogram(
    'zcash_fhe_operation_duration_seconds',
    'FHE operation duration in seconds',
    ['operation_type']
)

system_health = Gauge(
    'zcash_fhe_system_health',
    'System health status (1=healthy, 0=unhealthy)'
)

system_health.set(1)


class PrometheusMetrics:
    """Prometheus metrics manager"""
    
    def __init__(self, app):
        self.app = app
        
        @app.route('/metrics')
        def metrics():
            return Response(generate_latest(REGISTRY), mimetype='text/plain')
        
        logger.info("Prometheus metrics initialized")
    
    @staticmethod
    def track_swap_ingestion(destination_asset: str):
        swap_ingestion_total.labels(destination_asset=destination_asset).inc()
    
    @staticmethod
    def track_swap_error():
        swap_ingestion_errors.inc()
    
    @staticmethod
    def track_decryption(metric_name: str):
        threshold_decryptions_total.labels(metric_name=metric_name).inc()
    
    @staticmethod
    def track_fhe_operation(operation_type: str, duration: float):
        fhe_operations_total.labels(operation_type=operation_type).inc()
        fhe_operation_duration.labels(operation_type=operation_type).observe(duration)
    
    @staticmethod
    def update_websocket_clients(count: int):
        connected_websocket_clients.set(count)
    
    @staticmethod
    def set_health_status(healthy: bool):
        system_health.set(1 if healthy else 0)


def track_api_request(f):
    """Decorator to track API request metrics"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import request
        
        start_time = time.time()
        method = request.method
        endpoint = request.endpoint or 'unknown'
        
        try:
            response = f(*args, **kwargs)
            status = response[1] if isinstance(response, tuple) else 200
            
            duration = time.time() - start_time
            api_request_duration.labels(
                method=method,
                endpoint=endpoint,
                status=str(status)
            ).observe(duration)
            
            api_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status=str(status)
            ).inc()
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            api_request_duration.labels(
                method=method,
                endpoint=endpoint,
                status='500'
            ).observe(duration)
            
            api_requests_total.labels(
                method=method,
                endpoint=endpoint,
                status='500'
            ).inc()
            
            raise
    
    return decorated_function


def track_db_query(operation: str):
    """Context manager to track database query duration"""
    class DBQueryTimer:
        def __enter__(self):
            self.start = time.time()
            return self
        
        def __exit__(self, *args):
            duration = time.time() - self.start
            database_query_duration.labels(operation=operation).observe(duration)
    
    return DBQueryTimer()
