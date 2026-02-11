"use client"

import { useCallback, useEffect, useState } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  Play,
  Search,
  Globe,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"

type DataSourceStatus = "pending" | "processing" | "indexed" | "failed"

interface DataSource {
  id: string
  name: string
  description?: string
  type: string
  fileType?: string
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

export default function DataSourcesPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  // Form state
  const [dataSourceType, setDataSourceType] = useState<"files" | "website">("files")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    files: [] as File[],
    websiteUrl: "",
    crawlDepth: "1",
    maxPages: "100",
    crawlFrequency: "" as string,
    chunkingStrategy: "fixed-size",
    chunkSize: "1000",
    chunkOverlap: "200",
    indexingStrategy: "vector",
    embeddingModel: "text-embedding-3-small",
  })

  const loadDataSources = useCallback(async () => {
    try {
      const response = await fetch("/api/data-sources")
      const data = (await response.json()) as unknown

      if (!response.ok) {
        const message =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error?: string }).error)
            : "Failed to load data sources"
        throw new Error(message)
      }

      if (Array.isArray(data)) {
        setDataSources(data as DataSource[])
      } else {
        setDataSources([])
      }
    } catch (error) {
      console.error("Failed to load data sources:", error)
      toast({
        title: "Error",
        description: "Failed to load data sources",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadDataSources()
    // Poll for updates every 5 seconds
    const interval = setInterval(loadDataSources, 5000)
    return () => clearInterval(interval)
  }, [loadDataSources])

  const handleUpload = async () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please provide a name",
        variant: "destructive",
      })
      return
    }

    if (dataSourceType === "files" && formData.files.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive",
      })
      return
    }

    if (dataSourceType === "website" && !formData.websiteUrl) {
      toast({
        title: "Error",
        description: "Please provide a website URL",
        variant: "destructive",
      })
      return
    }

    setUploading(true)

    try {
      const form = new FormData()
      form.append("type", dataSourceType)
      form.append("name", formData.name)
      if (formData.description) form.append("description", formData.description)
      form.append("chunkingStrategy", formData.chunkingStrategy)
      form.append("chunkSize", formData.chunkSize)
      form.append("chunkOverlap", formData.chunkOverlap)
      form.append("indexingStrategy", formData.indexingStrategy)
      form.append("embeddingModel", formData.embeddingModel)

      if (dataSourceType === "files") {
        formData.files.forEach((file) => {
          form.append("files", file)
        })
      } else {
        form.append("websiteUrl", formData.websiteUrl)
        form.append("crawlDepth", formData.crawlDepth)
        form.append("maxPages", formData.maxPages)
        if (formData.crawlFrequency) form.append("crawlFrequency", formData.crawlFrequency)
      }

      const response = await fetch("/api/data-sources", {
        method: "POST",
        body: form,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create data source")
      }

      const result = await response.json()
      const newDataSourceId = result.dataSource?.id || result.id

      toast({
        title: "Success",
        description: dataSourceType === "files"
          ? "Files uploaded successfully"
          : "Website added successfully",
      })

      // Trigger processing
      await fetch(`/api/data-sources/${newDataSourceId}/process`, {
        method: "POST",
      })

      setUploadDialogOpen(false)
      setFormData({
        name: "",
        description: "",
        files: [],
        websiteUrl: "",
        crawlDepth: "1",
        maxPages: "100",
        crawlFrequency: "",
        chunkingStrategy: "fixed-size",
        chunkSize: "1000",
        chunkOverlap: "200",
        indexingStrategy: "vector",
        embeddingModel: "text-embedding-3-small",
      })
      loadDataSources()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create data source",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this data source?")) {
      return
    }

    try {
      const response = await fetch(`/api/data-sources/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete data source")
      }

      toast({
        title: "Success",
        description: "Data source deleted successfully",
      })

      loadDataSources()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete data source",
        variant: "destructive",
      })
    }
  }

  const handleReprocess = async (id: string) => {
    try {
      const response = await fetch(`/api/data-sources/${id}/process`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to start processing")
      }

      toast({
        title: "Success",
        description: "Processing started",
      })

      loadDataSources()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start processing",
        variant: "destructive",
      })
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A"
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Sources</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage documents for your agents to use
          </p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Add Data Source
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {dataSources.map((ds) => {
          const statusInfo = statusConfig[ds.status]
          const StatusIcon = statusInfo.icon

          return (
            <Card key={ds.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {ds.type === "website" ? (
                        <Globe className="h-5 w-5 text-primary" />
                      ) : (
                        <FileText className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{ds.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {ds.type === "website" ? "WEBSITE" : ds.fileType?.toUpperCase() || "FILES"}
                        </Badge>
                        <Badge className={`text-xs ${statusInfo.color}`}>
                          <StatusIcon
                            className={`h-3 w-3 mr-1 ${ds.status === "processing" ? "animate-spin" : ""}`}
                          />
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                {ds.description && (
                  <CardDescription className="mt-2">{ds.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm space-y-1 text-muted-foreground mb-4">
                  <div>Size: {formatFileSize(ds.fileSize)}</div>
                  <div>Chunks: {ds.totalChunks}</div>
                  <div>Strategy: {ds.chunkingStrategy}</div>
                </div>

                {ds.errorMessage && (
                  <div className="text-sm text-destructive mb-4">{ds.errorMessage}</div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/data-sources/${ds.id}`)}
                  >
                    <Search className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {ds.status === "failed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReprocess(ds.id)}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Retry
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(ds.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {dataSources.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No data sources yet</p>
          <Button onClick={() => setUploadDialogOpen(true)} className="mt-4">
            <Upload className="h-4 w-4 mr-2" />
            Upload your first document
          </Button>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Data Source</DialogTitle>
            <DialogDescription>
              Upload files or add a website to create a new data source
            </DialogDescription>
          </DialogHeader>

          <Tabs value={dataSourceType} onValueChange={(value) => setDataSourceType(value as "files" | "website")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="files">
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </TabsTrigger>
              <TabsTrigger value="website">
                <Globe className="h-4 w-4 mr-2" />
                Add Website
              </TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Document Collection"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of the documents"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="files">Files</Label>
                <Input
                  id="files"
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setFormData({
                      ...formData,
                      files,
                      name: formData.name || (files.length === 1 ? files[0].name.replace(/\.[^/.]+$/, "") : "")
                    })
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Supported: PDF, DOCX, TXT, MD (max 50MB per file)
                </p>
                {formData.files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {formData.files.map((file, index) => (
                      <div key={index} className="flex items-center justify-between text-sm bg-muted p-2 rounded">
                        <span className="truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newFiles = formData.files.filter((_, i) => i !== index)
                            setFormData({ ...formData, files: newFiles })
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="website" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="websiteName">Name</Label>
                <Input
                  id="websiteName"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Company Documentation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteDescription">Description (optional)</Label>
                <Textarea
                  id="websiteDescription"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description of the website"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="crawlDepth">Crawl Depth</Label>
                  <Input
                    id="crawlDepth"
                    type="number"
                    min="1"
                    max="5"
                    value={formData.crawlDepth}
                    onChange={(e) => setFormData({ ...formData, crawlDepth: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    How many levels deep to crawl (1-5)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxPages">Max Pages</Label>
                  <Input
                    id="maxPages"
                    type="number"
                    min="1"
                    max="1000"
                    value={formData.maxPages}
                    onChange={(e) => setFormData({ ...formData, maxPages: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum pages to crawl
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="crawlFrequency">Auto Re-crawl</Label>
                <Select
                  value={formData.crawlFrequency}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      crawlFrequency: value === "manual" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
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
            </TabsContent>

            {/* Shared ingestion settings */}
            <div className="space-y-4 pt-4 border-t">

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chunkingStrategy">Chunking Strategy</Label>
                  <Select
                    value={formData.chunkingStrategy}
                    onValueChange={(value) =>
                      setFormData({ ...formData, chunkingStrategy: value })
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
                  <Label htmlFor="embeddingModel">Embedding Model</Label>
                  <Select
                    value={formData.embeddingModel}
                    onValueChange={(value) =>
                      setFormData({ ...formData, embeddingModel: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text-embedding-3-small">
                        OpenAI Small (1536d)
                      </SelectItem>
                      <SelectItem value="text-embedding-3-large">
                        OpenAI Large (3072d)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="chunkSize">Chunk Size</Label>
                  <Input
                    id="chunkSize"
                    type="number"
                    value={formData.chunkSize}
                    onChange={(e) => setFormData({ ...formData, chunkSize: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chunkOverlap">Chunk Overlap</Label>
                  <Input
                    id="chunkOverlap"
                    type="number"
                    value={formData.chunkOverlap}
                    onChange={(e) => setFormData({ ...formData, chunkOverlap: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {dataSourceType === "files" ? "Uploading..." : "Adding..."}
                </>
              ) : (
                <>
                  {dataSourceType === "files" ? (
                    <><Upload className="h-4 w-4 mr-2" />Upload</>
                  ) : (
                    <><Globe className="h-4 w-4 mr-2" />Add Website</>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
