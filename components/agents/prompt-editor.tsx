"use client"

import { useEffect, useState } from "react"
import Editor from "@monaco-editor/react"
import { Badge } from "@/components/ui/badge"
import { countTokens } from "@/lib/utils/token-counter"

interface PromptEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function PromptEditor({ value, onChange, disabled }: PromptEditorProps) {
  const [tokens, setTokens] = useState(0)

  useEffect(() => {
    setTokens(countTokens(value))
  }, [value])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">System Prompt</label>
        <Badge variant="secondary">
          {tokens.toLocaleString()} tokens
        </Badge>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Editor
          height="400px"
          defaultLanguage="markdown"
          value={value}
          onChange={(value) => onChange(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            wordWrap: "on",
            scrollBeyondLastLine: false,
            readOnly: disabled,
          }}
          theme="vs-light"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Define how your agent should behave and respond. Supports markdown formatting.
      </p>
    </div>
  )
}
