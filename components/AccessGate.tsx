'use client';

import { useState } from 'react';

const ACCESS_CODE = '1234';

interface AccessGateProps {
  onAccessGranted: () => void;
}

export default function AccessGate({ onAccessGranted }: AccessGateProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code === ACCESS_CODE) {
      onAccessGranted();
      setError('');
    } else {
      setError('Incorrect access code');
      setCode('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="glass rounded-2xl shadow-2xl p-12 max-w-md w-full border-2 border-white/30">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold mb-4 gradient-text">
            🔒 Access Required
          </h1>
          <p className="text-gray-600 text-lg">
            Please enter the access code to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              placeholder="Enter access code"
              className="w-full px-5 py-4 border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300 focus:border-purple-500 transition-all text-lg bg-white/90 text-center font-mono text-2xl tracking-widest"
              autoFocus
              maxLength={4}
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 text-red-700 px-5 py-4 rounded-xl font-medium text-center">
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white py-4 px-6 rounded-xl font-bold text-lg hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
          >
            Unlock 🔓
          </button>
        </form>
      </div>
    </div>
  );
}

