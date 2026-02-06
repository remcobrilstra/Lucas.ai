import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"

export default function DataSourcesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Sources</h1>
          <p className="text-muted-foreground mt-2">
            Upload and manage documents for your agents
          </p>
        </div>
        <Button asChild>
          <Link href="/data-sources/new">
            <Plus className="mr-2 h-4 w-4" />
            Upload Data
          </Link>
        </Button>
      </div>

      <div className="text-center py-12">
        <p className="text-muted-foreground">No data sources yet. Upload your first document to get started.</p>
      </div>
    </div>
  )
}
