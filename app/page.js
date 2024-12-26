'use client';

import { useState } from 'react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

export default function Home() {
  const [ticker, setTicker] = useState('');
  const [date, setDate] = useState(new Date('2017-01-01'));
  const [outlook, setOutlook] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOutlook(null);
    setProgress('Initializing analysis...');
    
    try {
      const response = await fetch('/api/outlook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          date: date.toISOString().split('T')[0],
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to start analysis');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.error) {
              throw new Error(data.error);
            }
            if (data.status) {
              setProgress(data.status);
            } else if (typeof data.outlook === 'number') {
              setOutlook(data.outlook);
            }
          } catch (e) {
            if (e.message.includes('JSON')) {
              continue;
            }
            throw e;
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setOutlook(null);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="glass-card p-8 space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold animate-gradient">Stock Market Outlook</h1>
        </div>

        <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-lg space-y-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div className="form-group">
                <div className="flex items-center h-8">
                  <label htmlFor="ticker" className="label-field w-32 m-0">Stock Ticker</label>
                </div>
                <input
                  type="text"
                  id="ticker"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value)}
                  className="input-field"
                  placeholder="e.g., AAPL"
                  required
                />
              </div>

              <div className="form-group">
                <div className="flex items-center h-8">
                  <label className="label-field w-32 m-0">Analysis Date</label>
                </div>
                <DatePicker
                  selected={date}
                  onChange={(date) => setDate(date)}
                  dateFormat="yyyy-MM-dd"
                  maxDate={new Date()}
                  className="input-field"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="submit-button w-full"
            >
              {loading ? 'Analyzing...' : 'Get Outlook'}
            </button>
          </form>

          {loading && progress && (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 shadow-md">
              <div className="flex items-center space-x-4">
                <div className="loading-spinner">
                  <div className="spinner-ring"></div>
                  <div className="spinner-core"></div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-indigo-600">Analysis in Progress</h3>
                  <p className="mt-1 text-sm text-gray-600">{progress}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 rounded-lg p-6 border border-red-200 shadow-md">
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {outlook !== null && !error && (
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
              <p className="text-lg text-gray-700">
                Outlook score from -1 (bad) to 1 (good): <span className="font-semibold">{outlook.toFixed(2)}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}