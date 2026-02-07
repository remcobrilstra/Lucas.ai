"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, Database, Wrench, TrendingUp, DollarSign, Activity } from "lucide-react"
import { useEffect, useState } from "react"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts"

interface AnalyticsData {
  summary: {
    totalInputTokens: number
    totalOutputTokens: number
    totalTokens: number
    totalCost: number
    totalMessages: number
    agentCount: number
    dataSourceCount: number
    toolCount: number
    sessionCount: number
  }
  modelUsage: Array<{
    modelId: string
    modelName: string
    providerName: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    cost: number
    messageCount: number
  }>
  dailyUsage: Array<{
    date: string
    inputTokens: number
    outputTokens: number
    totalTokens: number
    cost: number
  }>
}

const CHART_COLORS = [
  "hsl(15 75% 55%)",
  "hsl(32 98% 56%)",
  "hsl(45 95% 52%)",
  "hsl(20 85% 48%)",
  "hsl(10 70% 50%)",
  "hsl(25 80% 45%)",
]

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState(30)

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dashboard/analytics?days=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg font-medium" style={{ color: "hsl(20 50% 35%)" }}>
          Loading analytics...
        </div>
      </div>
    )
  }

  const summary = analytics?.summary || {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalTokens: 0,
    totalCost: 0,
    totalMessages: 0,
    agentCount: 0,
    dataSourceCount: 0,
    toolCount: 0,
    sessionCount: 0,
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold"
            style={{
              background: "linear-gradient(135deg, hsl(22 60% 18%) 0%, hsl(15 70% 48%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Analytics Dashboard
          </h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base font-medium" style={{ color: "hsl(20 50% 35%)" }}>
            Token usage and cost insights across all models
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeRange(days)}
              className="px-3 sm:px-4 py-2 rounded-lg font-medium text-sm transition-all touch-manipulation"
              style={{
                background:
                  timeRange === days
                    ? "linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)"
                    : "hsl(0 0% 100%)",
                color: timeRange === days ? "white" : "hsl(20 50% 35%)",
                border: timeRange === days ? "none" : "1px solid hsl(30 45% 88%)",
              }}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className="shadow-lg border-amber-200"
          style={{
            background: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)",
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold" style={{ color: "hsl(20 50% 35%)" }}>
              Total Tokens
            </CardTitle>
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)",
              }}
            >
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "hsl(15 70% 48%)" }}>
              {formatNumber(summary.totalTokens)}
            </div>
            <p className="text-xs font-medium" style={{ color: "hsl(20 50% 45%)" }}>
              {formatNumber(summary.totalInputTokens)} in / {formatNumber(summary.totalOutputTokens)} out
            </p>
          </CardContent>
        </Card>

        <Card
          className="shadow-lg border-amber-200"
          style={{
            background: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)",
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold" style={{ color: "hsl(20 50% 35%)" }}>
              Total Cost
            </CardTitle>
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)",
              }}
            >
              <DollarSign className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "hsl(15 70% 48%)" }}>
              {formatCost(summary.totalCost)}
            </div>
            <p className="text-xs font-medium" style={{ color: "hsl(20 50% 45%)" }}>
              Across {summary.sessionCount} test sessions
            </p>
          </CardContent>
        </Card>

        <Card
          className="shadow-lg border-amber-200"
          style={{
            background: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)",
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold" style={{ color: "hsl(20 50% 35%)" }}>
              Active Agents
            </CardTitle>
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)",
              }}
            >
              <Bot className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "hsl(15 70% 48%)" }}>
              {summary.agentCount}
            </div>
            <p className="text-xs font-medium" style={{ color: "hsl(20 50% 45%)" }}>
              {summary.dataSourceCount} data sources
            </p>
          </CardContent>
        </Card>

        <Card
          className="shadow-lg border-amber-200"
          style={{
            background: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)",
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold" style={{ color: "hsl(20 50% 35%)" }}>
              API Messages
            </CardTitle>
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)",
              }}
            >
              <Activity className="h-5 w-5 text-white" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" style={{ color: "hsl(15 70% 48%)" }}>
              {summary.totalMessages}
            </div>
            <p className="text-xs font-medium" style={{ color: "hsl(20 50% 45%)" }}>
              In last {timeRange} days
            </p>
          </CardContent>
        </Card>
      </div>

      {analytics && analytics.modelUsage.length > 0 ? (
        <>
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            <Card
              className="shadow-lg border-amber-200"
              style={{
                background: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)",
              }}
            >
              <CardHeader className="border-b" style={{ borderColor: "hsl(30 45% 88%)" }}>
                <CardTitle className="text-xl font-bold" style={{ color: "hsl(22 60% 18%)" }}>
                  Token Usage by Model
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="min-w-[500px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.modelUsage}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 45% 88%)" />
                        <XAxis
                          dataKey="modelName"
                          tick={{ fill: "hsl(20 50% 35%)", fontSize: 12 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fill: "hsl(20 50% 35%)", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            background: "white",
                            border: "1px solid hsl(30 45% 88%)",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number | undefined) => formatNumber(value || 0)}
                        />
                        <Legend />
                        <Bar dataKey="inputTokens" name="Input Tokens" fill="hsl(15 75% 55%)" />
                        <Bar dataKey="outputTokens" name="Output Tokens" fill="hsl(32 98% 56%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card
              className="shadow-lg border-amber-200"
              style={{
                background: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)",
              }}
            >
              <CardHeader className="border-b" style={{ borderColor: "hsl(30 45% 88%)" }}>
                <CardTitle className="text-xl font-bold" style={{ color: "hsl(22 60% 18%)" }}>
                  Cost Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.modelUsage}
                      dataKey="cost"
                      nameKey="modelName"
                      cx="50%"
                      cy="50%"
                      outerRadius={window.innerWidth < 640 ? 80 : 100}
                      label={window.innerWidth >= 640}
                    >
                      {analytics.modelUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number | undefined) => formatCost(value || 0)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {analytics.dailyUsage.length > 0 && (
            <Card
              className="shadow-lg border-amber-200"
              style={{
                background: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)",
              }}
            >
              <CardHeader className="border-b" style={{ borderColor: "hsl(30 45% 88%)" }}>
                <CardTitle className="text-xl font-bold" style={{ color: "hsl(22 60% 18%)" }}>
                  Token Usage Over Time
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6">
                <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="min-w-[500px]">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analytics.dailyUsage}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(30 45% 88%)" />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "hsl(20 50% 35%)", fontSize: 12 }}
                          tickFormatter={formatDate}
                        />
                        <YAxis tick={{ fill: "hsl(20 50% 35%)", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            background: "white",
                            border: "1px solid hsl(30 45% 88%)",
                            borderRadius: "8px",
                          }}
                          labelFormatter={(label) => formatDate(String(label))}
                          formatter={(value: number | undefined) => formatNumber(value || 0)}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="inputTokens"
                          name="Input Tokens"
                          stackId="1"
                          stroke="hsl(15 75% 55%)"
                          fill="hsl(15 75% 55%)"
                          fillOpacity={0.6}
                        />
                        <Area
                          type="monotone"
                          dataKey="outputTokens"
                          name="Output Tokens"
                          stackId="1"
                          stroke="hsl(32 98% 56%)"
                          fill="hsl(32 98% 56%)"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card
            className="shadow-lg border-amber-200"
            style={{
              background: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)",
            }}
          >
            <CardHeader className="border-b" style={{ borderColor: "hsl(30 45% 88%)" }}>
              <CardTitle className="text-xl font-bold" style={{ color: "hsl(22 60% 18%)" }}>
                Model Performance Details
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              <div className="space-y-3 sm:space-y-4">
                {analytics.modelUsage.map((model, index) => (
                  <div
                    key={model.modelId}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg"
                    style={{ background: "hsl(30 60% 97%)" }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div
                        className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: CHART_COLORS[index % CHART_COLORS.length],
                        }}
                      >
                        <Bot className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate" style={{ color: "hsl(22 60% 18%)" }}>
                          {model.modelName}
                        </p>
                        <p className="text-sm font-medium truncate" style={{ color: "hsl(20 50% 45%)" }}>
                          {model.providerName}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:gap-6 text-right sm:text-right">
                      <div>
                        <p className="text-base sm:text-lg font-bold" style={{ color: "hsl(15 70% 48%)" }}>
                          {formatNumber(model.totalTokens)}
                        </p>
                        <p className="text-[10px] sm:text-xs font-medium" style={{ color: "hsl(20 50% 45%)" }}>
                          Tokens
                        </p>
                      </div>
                      <div>
                        <p className="text-base sm:text-lg font-bold" style={{ color: "hsl(15 70% 48%)" }}>
                          {formatCost(model.cost)}
                        </p>
                        <p className="text-[10px] sm:text-xs font-medium" style={{ color: "hsl(20 50% 45%)" }}>
                          Cost
                        </p>
                      </div>
                      <div>
                        <p className="text-base sm:text-lg font-bold" style={{ color: "hsl(15 70% 48%)" }}>
                          {model.messageCount}
                        </p>
                        <p className="text-[10px] sm:text-xs font-medium" style={{ color: "hsl(20 50% 45%)" }}>
                          Messages
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card
          className="shadow-lg border-amber-200"
          style={{
            background: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)",
          }}
        >
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium" style={{ color: "hsl(20 50% 35%)" }}>
              No usage data available for the selected time range
            </p>
            <p className="text-sm font-medium mt-2" style={{ color: "hsl(20 50% 45%)" }}>
              Start testing your agents to see analytics here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
