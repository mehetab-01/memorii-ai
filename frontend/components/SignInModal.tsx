'use client'

import { useState } from 'react'

interface SignInModalProps {
  onClose: () => void
  onSuccess?: () => void
}

export default function SignInModal({ onClose, onSuccess }: SignInModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Here you would typically validate credentials
    // For now, we'll just trigger success callback
    if (username && password) {
      if (onSuccess) {
        onSuccess()
      } else {
        onClose()
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>

        <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
          Sign In
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="signin-username" className="block text-gray-700 font-medium mb-2">
              Username
            </label>
            <input
              id="signin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={10}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 transition-colors"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label htmlFor="signin-password" className="block text-gray-700 font-medium mb-2">
              Password
            </label>
            <input
              id="signin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-blue-200 rounded-lg focus:outline-none focus:border-blue-400 transition-colors"
              placeholder="Enter password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 mt-6"
          >
            Sign In
          </button>
        </form>
      </div>
    </div>
  )
}