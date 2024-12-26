from http.server import BaseHTTPRequestHandler
from datetime import datetime
import yfinance as yf
import pandas as pd
import json
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.outlook.src.train import train
from app.outlook.src.infer import infer

FEATURE_KERNEL_SIZES = [5, 10]
MAX_HOLDING = 100
MAX_HISTORY = 200

def get_outlook(tkr, date='2017-01-01'):
    test_train_split = pd.Timestamp(date)
    prices = yf.download(tkr)['Adj Close'][tkr][:test_train_split + pd.Timedelta(days=1)].to_list()
    
    if not prices:
        raise ValueError(f"No historical data found for {tkr}")

    model = train(prices, FEATURE_KERNEL_SIZES, MAX_HOLDING, MAX_HISTORY)
    p_outlook = infer(model, prices, FEATURE_KERNEL_SIZES, MAX_HISTORY)[-1]
    
    return p_outlook

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse query parameters
            from urllib.parse import parse_qs, urlparse
            query_params = parse_qs(urlparse(self.path).query)
            
            ticker = query_params.get('ticker', [None])[0]
            date = query_params.get('date', [datetime.now().strftime('%Y-%m-%d')])[0]
            
            if not ticker:
                raise ValueError("Ticker parameter is required")
            
            outlook = get_outlook(ticker, date)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            response = {
                "ticker": ticker,
                "date": date,
                "outlook": float(outlook)
            }
            
            self.wfile.write(json.dumps(response).encode())
            
        except Exception as e:
            self.send_response(400)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode()) 