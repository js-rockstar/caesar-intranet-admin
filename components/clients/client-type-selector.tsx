"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Building, User } from "lucide-react"

interface ClientTypeSelectorProps {
  value: "ORGANIZATION" | "PERSON"
  onValueChange: (value: "ORGANIZATION" | "PERSON") => void
  disabled?: boolean
}

export function ClientTypeSelector({ value, onValueChange, disabled = false }: ClientTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base font-medium">Client Type</Label>
      <RadioGroup
        value={value}
        onValueChange={onValueChange}
        className="grid grid-cols-2 gap-4"
        disabled={disabled}
      >
        <label htmlFor="ORGANIZATION" className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
          <RadioGroupItem value="ORGANIZATION" id="ORGANIZATION" />
          <div className="flex items-center space-x-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="cursor-pointer">
              Organization
            </span>
          </div>
        </label>
        <label htmlFor="PERSON" className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
          <RadioGroupItem value="PERSON" id="PERSON" />
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="cursor-pointer">
              Person
            </span>
          </div>
        </label>
      </RadioGroup>
    </div>
  )
}
