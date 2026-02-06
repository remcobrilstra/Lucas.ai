"use client"

import { use, useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Settings,
  Search as SearchIcon,
  Play,
} from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"

type DataSourceStatus = "pending" | "processing" | "indexed" | "failed"

interface DataSource {
  id: string
  name: string
  description?: string
  type: string
  fileType?: string
  filePath?: string
  fileSize?: number
  status: DataSourceStatus
  chunkingStrategy: string
  chunkSize: number
  chunkOverlap: number
  indexingStrategy: string
  embeddingModel: string
  totalChunks: number
  errorMessage?: string
  createdAt: string
  chunks: Array<{
    id: string
    content: string
    position: number
  }>
  agents: Array<{
    agent: {
      id: string
      name: string
    }
  }>
}

interface SearchResult {
  id: string
  content: string
  similarity: number
  position: number
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-gray-500/10 text-gray-500",
    icon: Clock,
  },
  processing: {
    label: "Processing",
    color: "bg-blue-500/10 text-blue-500",
    icon: Loader2,
  },
  indexed: {
    label: "Indexed",
    color: "bg-green-500/10 text-green-500",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "bg-red-500/10 text-red-500",
    icon: XCircle,
  },
}

export default function DataSourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [dataSource, setDataSource] = useState<DataSource | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Config form state
  const [configData, setConfigData] = useState({
    name: "",
    description: "",
    chunkingStrategy: "fixed-size",
    chunkSize: "1000",
    chunkOverlap: "200",
  })

  const loadDataSource = useCallback(async () => {
    try {
      const response = await fetch(`/api/data-sources/${id}`)
      if (!response.ok) {
        throw new Error("Failed to load data source")
      }
      const data = (await response.json()) as DataSource
      setDataSource(data)

      // Set config form data
      setConfigData({
        name: data.name,
        description: data.description || "",
        chunkingStrategy: data.chunkingStrategy,
        chunkSize: String(data.chunkSize),
        chunkOverlap: String(data.chunkOverlap),
      })
    } catch (error) {
      console.error("Failed to load data source:", error)
      toast({
        title: "Error",
        description: "Failed to load data source",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    loadDataSource()
    // Poll for updates every 5 seconds
    const interval = setInterval(loadDataSource, 5000)
    return () => clearInterval(interval)
  }, [loadDataSource])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please enter a search query",
        variant: "destructive",
      })
      return
    }

    setSearching(true)

    try {
      const response = await fetch(`/api/data-sources/${id}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery, topK: 5, threshold: 0.5 }),
      })

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = await response.json()
      setSearchResults(data.results)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to search data source",
        variant: "destructive",
      })
    } finally {
      setSearching(false)
    }
  }

  const handleUpdateConfig = async () => {
    try {
      const response = await fetch(`/api/data-sources/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: configData.name,
          description: configData.description || null,
          chunkingStrategy: configData.chunkingStrategy,
          chunkSize: parseInt(configData.chunkSize),
          chunkOverlap: parseInt(configData.chunkOverlap),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update configuration")
      }

      toast({
        title: "Success",
        description: "Configuration updated successfully",
      })

      setConfigDialogOpen(false)
      loadDataSource()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update configuration",
        variant: "destructive",
      })
    }
  }

  const handleReindex = async () => {
    setReindexing(true)

    try {
      const response = await fetch(`/api/data-sources/${id}/process`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to start reindexing")
      }

      toast({
        title: "Success",
        description: "Reindexing started",
      })

      loadDataSource()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start reindexing",
        variant: "destructive",
      })
    } finally {
      setReindexing(false)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!dataSource) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Data source not found</p>
          <Button asChild className="mt-4">
            <Link href="/data-sources">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Data Sources
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[dataSource.status]
  const StatusIcon = statusInfo.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/data-sources">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{dataSource.name}</h1>
              <Badge className={statusInfo.color}>
                <StatusIcon
                  className={`h-3 w-3 mr-1 ${dataSource.status === "processing" ? "animate-spin" : ""}`}
                />
                {statusInfo.label}
              </Badge>
            </div>
            {dataSource.description && (
              <p className="text-muted-foreground mt-1">{dataSource.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
          <Button
            variant="outline"
            onClick={handleReindex}
            disabled={reindexing || dataSource.status === "processing"}
          >
            {reindexing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Reindexing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Reindex
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {dataSource.errorMessage && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Processing Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{dataSource.errorMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">File Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataSource.fileType?.toUpperCase() || "N/A"}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">File Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatFileSize(dataSource.fileSize)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataSource.totalChunks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Agents Using</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dataSource.agents.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          <CardDescription>Current processing configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Chunking Strategy</Label>
              <p className="font-medium">{dataSource.chunkingStrategy}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Embedding Model</Label>
              <p className="font-medium">{dataSource.embeddingModel}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Chunk Size</Label>
              <p className="font-medium">{dataSource.chunkSize} characters</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Chunk Overlap</Label>
              <p className="font-medium">{dataSource.chunkOverlap} characters</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agents Using This Source */}
      {dataSource.agents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Agents Using This Source</CardTitle>
            <CardDescription>Agents that have access to this data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dataSource.agents.map((agentRel) => (
                <div
                  key={agentRel.agent.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="font-medium">{agentRel.agent.name}</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/agents/${agentRel.agent.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Retrieval */}
      {dataSource.status === "indexed" && (
        <Card>
          <CardHeader>
            <CardTitle>Test Retrieval</CardTitle>
            <CardDescription>Test vector search on this data source</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter search query..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SearchIcon className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  Results ({searchResults.length})
                </Label>
                {searchResults.map((result, index) => (
                  <div key={result.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">
                        Similarity: {(result.similarity * 100).toFixed(1)}%
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Chunk #{result.position + 1}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{result.content}</p>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && searchQuery && !searching && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No results found
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sample Chunks */}
      {dataSource.chunks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sample Chunks</CardTitle>
            <CardDescription>First 10 chunks from this document</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dataSource.chunks.map((chunk) => (
                <div key={chunk.id} className="border rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-2">
                    Chunk #{chunk.position + 1}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{chunk.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Data Source</DialogTitle>
            <DialogDescription>
              Update the configuration and reindex to apply changes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={configData.name}
                onChange={(e) => setConfigData({ ...configData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={configData.description}
                onChange={(e) => setConfigData({ ...configData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="chunkingStrategy">Chunking Strategy</Label>
                <Select
                  value={configData.chunkingStrategy}
                  onValueChange={(value) =>
                    setConfigData({ ...configData, chunkingStrategy: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed-size">Fixed Size</SelectItem>
                    <SelectItem value="sentence">Sentence</SelectItem>
                    <SelectItem value="recursive">Recursive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chunkSize">Chunk Size</Label>
                <Input
                  id="chunkSize"
                  type="number"
                  value={configData.chunkSize}
                  onChange={(e) => setConfigData({ ...configData, chunkSize: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
              <Input
                id="chunkOverlap"
                type="number"
                value={configData.chunkOverlap}
                onChange={(e) => setConfigData({ ...configData, chunkOverlap: e.target.value })}
              />
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Changing chunking configuration requires reindexing.
                Click "Save & Reindex" to apply changes.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await handleUpdateConfig()
                await handleReindex()
              }}
            >
              Save & Reindex
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
