'use client'

export default function Dashboard() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-rose-400 bg-clip-text text-transparent">
            MEMORIII Dashboard
          </h1>
          <p className="text-gray-600 mt-2">Welcome to your health companion</p>
        </header>

        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Dashboard Coming Soon
          </h2>
          <p className="text-gray-600">
            Your personalized health dashboard will be available here.
          </p>
        </div>
      </div>
    </div>
  )
}