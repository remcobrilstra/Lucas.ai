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
  Globe,
  Upload,
  Trash2,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type DataSourceStatus = "pending" | "processing" | "indexed" | "failed"

interface DataSource {
  id: string
  name: string
  description?: string
  type: string
  fileType?: string
  filePath?: string
  fileSize?: number
  websiteUrl?: string
  crawlDepth: number
  maxPages: number
  crawlFrequency?: string
  lastCrawledAt?: string
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
  documents?: Document[]
  crawlJobs?: CrawlJob[]
}

interface Document {
  id: string
  name: string
  type: string
  fileType?: string
  pageUrl?: string
  pageTitle?: string
  status: DataSourceStatus
  totalChunks: number
  errorMessage?: string
  createdAt: string
}

interface CrawlJob {
  id: string
  status: string
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  pagesDiscovered: number
  pagesProcessed: number
  pagesFailed: number
  createdAt: string
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
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [crawling, setCrawling] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const { toast } = useToast()

  // Config form state
  const [configData, setConfigData] = useState({
    name: "",
    description: "",
    chunkingStrategy: "fixed-size",
    chunkSize: "1000",
    chunkOverlap: "200",
    websiteUrl: "",
    crawlDepth: "1",
    maxPages: "100",
    crawlFrequency: "",
  })

  const mapDataSourceToConfig = (data: DataSource) => ({
    name: data.name,
    description: data.description || "",
    chunkingStrategy: data.chunkingStrategy,
    chunkSize: String(data.chunkSize),
    chunkOverlap: String(data.chunkOverlap),
    websiteUrl: data.websiteUrl || "",
    crawlDepth: String(data.crawlDepth ?? 1),
    maxPages: String(data.maxPages ?? 100),
    crawlFrequency: data.crawlFrequency || "",
  })

  const loadDataSource = useCallback(async () => {
    try {
      const response = await fetch(`/api/data-sources/${id}`)
      if (!response.ok) {
        throw new Error("Failed to load data source")
      }
      const data = (await response.json()) as DataSource
      setDataSource(data)
      if (!configDialogOpen) {
        setConfigData(mapDataSourceToConfig(data))
      }
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
  }, [configDialogOpen, id, toast])

  const loadDocuments = useCallback(async () => {
    try {
      const response = await fetch(`/api/data-sources/${id}/documents`)
      if (response.ok) {
        const data = (await response.json()) as Document[]
        setDocuments(data)
      }
    } catch (error) {
      console.error("Failed to load documents:", error)
    }
  }, [id])

  useEffect(() => {
    loadDataSource()
    loadDocuments()
    // Poll for updates every 5 seconds
    const interval = setInterval(() => {
      loadDataSource()
      loadDocuments()
    }, 5000)
    return () => clearInterval(interval)
  }, [loadDataSource, loadDocuments])

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
          ...(dataSource?.type === "website"
            ? {
                websiteUrl: configData.websiteUrl,
                crawlDepth: parseInt(configData.crawlDepth),
                maxPages: parseInt(configData.maxPages),
                crawlFrequency: configData.crawlFrequency || null,
              }
            : {}),
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

  const handleCrawl = async () => {
    setCrawling(true)

    try {
      const response = await fetch(`/api/data-sources/${id}/crawl`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to start crawl")
      }

      toast({
        title: "Success",
        description: "Website crawl started",
      })

      loadDataSource()
      loadDocuments()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start crawl",
        variant: "destructive",
      })
    } finally {
      setCrawling(false)
    }
  }

  const handleUploadMore = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      const form = new FormData()
      selectedFiles.forEach((file) => {
        form.append("files", file)
      })

      const response = await fetch(`/api/data-sources/${id}/documents`, {
        method: "POST",
        body: form,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to upload files")
      }

      toast({
        title: "Success",
        description: "Files uploaded successfully",
      })

      setUploadDialogOpen(false)
      setSelectedFiles([])
      loadDocuments()

      // Trigger processing
      await fetch(`/api/data-sources/${id}/process`, {
        method: "POST",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) {
      return
    }

    try {
      const response = await fetch(`/api/data-sources/${id}/documents/${documentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete document")
      }

      toast({
        title: "Success",
        description: "Document deleted successfully",
      })

      loadDocuments()
      loadDataSource()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleString()
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
          <Button
            variant="outline"
            onClick={() => {
              if (dataSource) {
                setConfigData(mapDataSourceToConfig(dataSource))
              }
              setConfigDialogOpen(true)
            }}
          >
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
            <CardTitle className="text-sm font-medium">Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {dataSource.type === "website" ? (
                <><Globe className="h-6 w-6" /> Website</>
              ) : (
                <><FileText className="h-6 w-6" /> Files</>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {dataSource.type === "website" ? "Pages" : "Documents"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
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

      {/* Website Info */}
      {dataSource.type === "website" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Website Configuration</CardTitle>
                <CardDescription>Crawl settings and information</CardDescription>
              </div>
              <Button
                onClick={handleCrawl}
                disabled={crawling || dataSource.status === "processing"}
              >
                {crawling || dataSource.status === "processing" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Crawling...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Re-crawl Now
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Website URL</Label>
                <p className="font-medium break-all">{dataSource.websiteUrl}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Last Crawled</Label>
                <p className="font-medium">{formatDate(dataSource.lastCrawledAt)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Crawl Depth</Label>
                <p className="font-medium">{dataSource.crawlDepth} levels</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Max Pages</Label>
                <p className="font-medium">{dataSource.maxPages}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Auto Re-crawl</Label>
                <p className="font-medium">{dataSource.crawlFrequency || "Manual only"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents Table */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {dataSource.type === "website" ? "Pages" : "Documents"}
                </CardTitle>
                <CardDescription>
                  {dataSource.type === "website"
                    ? "All pages crawled from the website"
                    : "All files in this data source"
                  }
                </CardDescription>
              </div>
              {dataSource.type === "files" && (
                <Button onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Add More Files
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => {
                  const docStatusInfo = statusConfig[doc.status]
                  const DocStatusIcon = docStatusInfo.icon

                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        {doc.type === "webpage" ? (
                          <a href={doc.pageUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            {doc.name}
                          </a>
                        ) : (
                          doc.name
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {doc.type === "webpage" ? "Webpage" : doc.fileType?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={docStatusInfo.color}>
                          <DocStatusIcon
                            className={`h-3 w-3 mr-1 ${doc.status === "processing" ? "animate-spin" : ""}`}
                          />
                          {docStatusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{doc.totalChunks}</TableCell>
                      <TableCell className="text-right">
                        {dataSource.type === "files" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDocument(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Configuration</CardTitle>
          <CardDescription>Default settings for document processing</CardDescription>
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

            {dataSource.type === "website" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="configWebsiteUrl">Website URL</Label>
                  <Input
                    id="configWebsiteUrl"
                    type="url"
                    value={configData.websiteUrl}
                    onChange={(e) => setConfigData({ ...configData, websiteUrl: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="configCrawlDepth">Crawl Depth</Label>
                    <Input
                      id="configCrawlDepth"
                      type="number"
                      min="1"
                      max="5"
                      value={configData.crawlDepth}
                      onChange={(e) => setConfigData({ ...configData, crawlDepth: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      How many levels deep to crawl (1-5)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="configMaxPages">Max Pages</Label>
                    <Input
                      id="configMaxPages"
                      type="number"
                      min="1"
                      max="1000"
                      value={configData.maxPages}
                      onChange={(e) => setConfigData({ ...configData, maxPages: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum pages to crawl
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="configCrawlFrequency">Auto Re-crawl</Label>
                  <Select
                    value={configData.crawlFrequency}
                    onValueChange={(value) =>
                      setConfigData({
                        ...configData,
                        crawlFrequency: value === "manual" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger id="configCrawlFrequency">
                      <SelectValue placeholder="Manual only" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">Manual only</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

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
                Click &quot;Save & Reindex&quot; to apply changes.
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

      {/* Upload More Files Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add More Files</DialogTitle>
            <DialogDescription>
              Upload additional files to this data source
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="files">Files</Label>
              <Input
                id="files"
                type="file"
                accept=".pdf,.docx,.txt,.md"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  setSelectedFiles(files)
                }}
              />
              <p className="text-xs text-muted-foreground">
                Supported: PDF, DOCX, TXT, MD (max 50MB per file)
              </p>
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                      <span className="truncate">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newFiles = selectedFiles.filter((_, i) => i !== index)
                          setSelectedFiles(newFiles)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadMore} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
