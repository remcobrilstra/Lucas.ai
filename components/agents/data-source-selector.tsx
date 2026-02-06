"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { FileText, Loader2, CheckCircle2 } from "lucide-react"

interface DataSource {
  id: string
  name: string
  description?: string
  fileType?: string
  status: string
  totalChunks: number
}

interface DataSourceSelectorProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
}

export function DataSourceSelector({ selectedIds, onSelectionChange }: DataSourceSelectorProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadDataSources()
  }, [])

  const loadDataSources = async () => {
    try {
      const response = await fetch("/api/data-sources?status=indexed")
      const data = await response.json()
      setDataSources(data)
    } catch (error) {
      console.error("Failed to load data sources:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDataSources = dataSources.filter((ds) =>
    ds.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ds.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="search">Search Data Sources</Label>
        <Input
          id="search"
          placeholder="Search by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="mt-2"
        />
      </div>

      {filteredDataSources.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {searchQuery
                ? "No data sources found matching your search"
                : "No indexed data sources available. Upload documents first."}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filteredDataSources.map((ds) => {
          const isSelected = selectedIds.includes(ds.id)

          return (
            <Card
              key={ds.id}
              className={`cursor-pointer transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
              onClick={() => toggleSelection(ds.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{ds.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {ds.fileType?.toUpperCase() || "FILE"}
                        </Badge>
                        <Badge className="text-xs bg-green-500/10 text-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Indexed
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelection(ds.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                {ds.description && (
                  <CardDescription className="mt-2">{ds.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  {ds.totalChunks} chunks available
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm font-medium">
            {selectedIds.length} data source{selectedIds.length !== 1 ? "s" : ""} selected
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Selected data sources will be available to this agent for retrieval
          </p>
        </div>
      )}
    </div>
  )
}
