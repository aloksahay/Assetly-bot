import { Button } from "@/components/ui/button"

export default function AIPortfolioManager() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">AI Portfolio Manager</h1>
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-medium mb-2">Portfolio Analysis</h2>
          <p className="text-gray-600">
            Analyze your portfolio and get AI-powered recommendations
          </p>
        </div>
      </div>
    </div>
  )
}