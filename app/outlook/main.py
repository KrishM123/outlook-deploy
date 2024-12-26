import yfinance as yf
import pandas as pd
import sys
import os
import argparse
import json
import traceback

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.ml_util import *
from outlook.src.train import train
from outlook.src.infer import infer

FEATURE_KERNEL_SIZES = [5, 10]
MAX_HOLDING = 100
MAX_HISTORY = 200

def print_progress(status):
    sys.stderr.write(json.dumps({"status": status}) + "\n")
    sys.stderr.flush()

def print_error(error_msg):
    sys.stderr.write(json.dumps({"error": error_msg}) + "\n")
    sys.stderr.flush()

def get_outlook(tkr, date='2017-01-01'):
    try:
        test_train_split = pd.Timestamp(date)
        
        print_progress("Downloading historical data...")
        prices = yf.download(tkr)['Adj Close'][tkr][:test_train_split + pd.Timedelta(days=1)].to_list()
        if not prices:
            raise ValueError(f"No historical data found for {tkr}")
        print_progress("Downloaded historical data")

        print_progress("Training model...")
        try:
            model = train(prices, FEATURE_KERNEL_SIZES, MAX_HOLDING, MAX_HISTORY)
            print_progress("Model training complete")
        except Exception as e:
            print_error(f"Model training failed: {str(e)}")
            raise

        print_progress("Generating outlook prediction...")
        p_outlook = infer(model, prices, FEATURE_KERNEL_SIZES, MAX_HISTORY)[-1]
        print_progress("Prediction complete")
        
        print(p_outlook)
        return p_outlook
    except Exception as e:
        print_error(f"Error: {str(e)}")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Get market outlook for a stock')
    parser.add_argument('--ticker', type=str, required=True, help='Stock ticker symbol')
    parser.add_argument('--date', type=str, required=True, help='Date for prediction (YYYY-MM-DD)')
    
    args = parser.parse_args()
    
    try:
        outlook = get_outlook(args.ticker, args.date)
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)
