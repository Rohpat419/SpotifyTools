"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"

interface CustomWordsModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (words: string[]) => void
  initialWords?: string[]
}

export function CustomWordsModal({ isOpen, onClose, onConfirm, initialWords = [] }: CustomWordsModalProps) {
  const [customWords, setCustomWords] = useState<string[]>(initialWords)
  const [newWord, setNewWord] = useState("")

  const addWord = () => {
    const word = newWord.trim().toLowerCase()
    if (word && !customWords.includes(word)) {
      setCustomWords([...customWords, word])
      setNewWord("")
    }
  }

  const removeWord = (wordToRemove: string) => {
    setCustomWords(customWords.filter((word) => word !== wordToRemove))
  }

  const handleConfirm = () => {
    onConfirm(customWords)
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addWord()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Words</DialogTitle>
          <DialogDescription>
            Add additional words to check for in lyrics analysis. These will be used alongside the default explicit
            content detection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-word">Add Word</Label>
            <div className="flex gap-2">
              <Input
                id="new-word"
                placeholder="Enter a word..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button onClick={addWord} size="sm" disabled={!newWord.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {customWords.length > 0 && (
            <div className="space-y-2">
              <Label>Custom Words ({customWords.length})</Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {customWords.map((word) => (
                  <Badge key={word} variant="secondary" className="flex items-center gap-1">
                    {word}
                    <button onClick={() => removeWord(word)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Use {customWords.length} Custom Words</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
