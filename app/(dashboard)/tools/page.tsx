"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import {
  Wrench,
  Calculator,
  Clock,
  Search,
  Plus,
  Edit,
  Trash2,
  Server,
  Cloud,
  Code,
  type LucideIcon,
} from "lucide-react"

type ToolType = "built-in" | "mcp-local" | "mcp-remote" | "custom"

interface Tool {
  id: string
  name: string
  displayName: string
  description: string
  category: string
  type: ToolType
  config: Record<string, unknown> | null
  schema: Record<string, unknown>
  isActive: boolean
}

const iconMap: Record<string, LucideIcon> = {
  math: Calculator,
  datetime: Clock,
  search: Search,
  code: Code,
}

const typeColors: Record<ToolType, string> = {
  "built-in": "bg-blue-500/10 text-blue-500",
  "mcp-local": "bg-green-500/10 text-green-500",
  "mcp-remote": "bg-purple-500/10 text-purple-500",
  custom: "bg-orange-500/10 text-orange-500",
}

const typeIcons: Record<ToolType, LucideIcon> = {
  "built-in": Code,
  "mcp-local": Server,
  "mcp-remote": Cloud,
  custom: Wrench,
}

interface ToolFormData {
  name: string
  displayName: string
  description: string
  category: string
  type: ToolType
  config: string
  schema: string
}

const buildPlaceholderSchema = (name: string, description: string) => {
  return {
    type: "function",
    function: {
      name,
      description,
      parameters: {
        type: "object",
        properties: {},
      },
    },
  }
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTool, setEditingTool] = useState<Tool | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [toolToDelete, setToolToDelete] = useState<Tool | null>(null)
  const { toast } = useToast()

  // Form state
  const [formData, setFormData] = useState<ToolFormData>({
    name: "",
    displayName: "",
    description: "",
    category: "",
    type: "built-in",
    config: "",
    schema: "",
  })

  const loadTools = useCallback(async () => {
    try {
      const response = await fetch("/api/tools?includeInactive=true")
      const data = (await response.json()) as Tool[]
      setTools(data)
    } catch (error) {
      console.error("Failed to load tools:", error)
      toast({
        title: "Error",
        description: "Failed to load tools",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadTools()
  }, [loadTools])

  const filteredTools = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()
    if (!normalizedQuery) return tools

    return tools.filter((tool) => {
      const searchable = [
        tool.name,
        tool.displayName,
        tool.description,
        tool.category,
        tool.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()

      return searchable.includes(normalizedQuery)
    })
  }, [searchQuery, tools])

  const handleCreate = () => {
    setEditingTool(null)
    setFormData({
      name: "",
      displayName: "",
      description: "",
      category: "",
      type: "built-in",
      config: "",
      schema: JSON.stringify(
        {
          type: "function",
          function: {
            name: "",
            description: "",
            parameters: {
              type: "object",
              properties: {},
              required: [],
            },
          },
        },
        null,
        2
      ),
    })
    setDialogOpen(true)
  }

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool)
    setFormData({
      name: tool.name,
      displayName: tool.displayName,
      description: tool.description,
      category: tool.category,
      type: tool.type,
      config: tool.config ? JSON.stringify(tool.config, null, 2) : "",
      schema: JSON.stringify(tool.schema, null, 2),
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      // Parse JSON fields
      let parsedConfig: Record<string, unknown> | null = null
      if (formData.config.trim()) {
        try {
          parsedConfig = JSON.parse(formData.config)
        } catch {
          toast({
            title: "Error",
            description: "Invalid JSON in config field",
            variant: "destructive",
          })
          return
        }
      }

      let parsedSchema: Record<string, unknown>
      if (formData.type === "mcp-remote" && !formData.schema.trim()) {
        parsedSchema = buildPlaceholderSchema(formData.name, formData.description)
      } else {
        try {
          parsedSchema = JSON.parse(formData.schema)
        } catch {
          toast({
            title: "Error",
            description: "Invalid JSON in schema field",
            variant: "destructive",
          })
          return
        }
      }

      const payload = {
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description,
        category: formData.category,
        type: formData.type,
        config: parsedConfig,
        schema: parsedSchema,
      }

      const url = editingTool ? `/api/tools/${editingTool.id}` : "/api/tools"
      const method = editingTool ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save tool")
      }

      toast({
        title: "Success",
        description: `Tool ${editingTool ? "updated" : "created"} successfully`,
      })

      setDialogOpen(false)
      loadTools()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save tool",
        variant: "destructive",
      })
    }
  }

  const handleDeleteClick = (tool: Tool) => {
    setToolToDelete(tool)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!toolToDelete) return

    try {
      const response = await fetch(`/api/tools/${toolToDelete.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete tool")
      }

      toast({
        title: "Success",
        description: "Tool deleted successfully",
      })

      setDeleteDialogOpen(false)
      loadTools()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete tool",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tools</h1>
          <p className="text-muted-foreground mt-2">
            Manage built-in, MCP, and custom tools for your agents
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Tool
        </Button>
      </div>

      {tools.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tools available</p>
          <Button onClick={handleCreate} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Create your first tool
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tools by name, category, or type"
                className="pl-9"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredTools.length} of {tools.length}
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTools.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No tools match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTools.map((tool) => {
                  const Icon = iconMap[tool.category] || Wrench
                  const TypeIcon = typeIcons[tool.type] || Wrench

                  return (
                    <TableRow key={tool.id} className={!tool.isActive ? "opacity-60" : ""}>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{tool.displayName}</div>
                            <div className="text-sm text-muted-foreground">{tool.description}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {tool.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${typeColors[tool.type]}`}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {tool.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {tool.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(tool)}>
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteClick(tool)}>
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTool ? "Edit Tool" : "Create Tool"}</DialogTitle>
            <DialogDescription>
              {editingTool
                ? "Update the tool configuration"
                : "Create a new tool for your agents to use"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name (ID)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="calculator"
                  disabled={!!editingTool}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="Calculator"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Perform mathematical calculations"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="math, search, datetime, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as ToolType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="built-in">Built-in</SelectItem>
                    <SelectItem value="mcp-local">MCP Local</SelectItem>
                    <SelectItem value="mcp-remote">MCP Remote</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type !== "built-in" && (
              <div className="space-y-2">
                <Label htmlFor="config">Configuration (JSON)</Label>
                <Textarea
                  id="config"
                  value={formData.config}
                  onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                  placeholder={
                    formData.type === "mcp-local"
                      ? '{\n  "serverPath": "/path/to/server",\n  "args": ["--port", "8080"]\n}'
                      : '{\n  "endpoint": "https://api.example.com",\n  "apiKey": "your-key"\n}'
                  }
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="schema">
                OpenAI Function Schema (JSON)
                {formData.type === "mcp-remote" ? " - optional" : ""}
              </Label>
              <Textarea
                id="schema"
                value={formData.schema}
                onChange={(e) => setFormData({ ...formData, schema: e.target.value })}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingTool ? "Update" : "Create"} Tool
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the tool &quot;{toolToDelete?.displayName}&quot;. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
