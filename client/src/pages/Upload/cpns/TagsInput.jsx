import { useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { XIcon } from "lucide-react"

export default function TagsInput({
  value = [],
  onChange,
  placeholder = "输入后按回车添加",
  className,
}) {
  const [draft, setDraft] = useState("")
  const inputRef = useRef(null)

  const addTag = () => {
    const next = draft.trim()
    if (!next) return
    if (value.includes(next)) {
      setDraft("")
      return
    }
    onChange?.([...value, next])
    setDraft("")
  }

  const removeTag = (tag) => {
    onChange?.(value.filter((t) => t !== tag))
  }

  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 py-1.5 transition-colors",
        "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        "dark:bg-input/30",
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            aria-label={`移除 ${tag}`}
            className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(tag)
            }}
          >
            <XIcon className="size-3" />
          </button>
        </Badge>
      ))}

      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            addTag()
          }
          if (e.key === "Backspace" && !draft && value.length) {
            onChange?.(value.slice(0, -1))
          }
        }}
        placeholder={value.length ? "" : placeholder}
        className={cn(
          "h-6 min-w-[7rem] flex-1 border-0 bg-transparent p-0 text-sm text-foreground shadow-none outline-none",
          "placeholder:text-muted-foreground",
          "appearance-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none"
        )}
        style={{ border: "none", boxShadow: "none", outline: "none" }}
      />
    </div>
  )
}
