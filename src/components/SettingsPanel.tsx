import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Label } from './ui/label'
import { Slider } from './ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

interface SettingsPanelProps {
  quality: number
  onQualityChange: (value: number) => void
  format: string
  onFormatChange: (value: string) => void
  maxWidth: number
  onMaxWidthChange: (value: number) => void
  maxHeight: number
  onMaxHeightChange: (value: number) => void
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  quality,
  onQualityChange,
  format,
  onFormatChange,
  maxWidth,
  onMaxWidthChange,
  maxHeight,
  onMaxHeightChange,
}) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>压缩设置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>压缩质量</Label>
          <div className="flex items-center space-x-2">
            <Slider
              value={[quality]}
              onValueChange={(value) => onQualityChange(value[0])}
              min={1}
              max={100}
              step={1}
              className="flex-1"
            />
            <span className="w-12 text-sm text-muted-foreground">{quality}%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>输出格式</Label>
          <Select value={format} onValueChange={onFormatChange}>
            <SelectTrigger>
              <SelectValue placeholder="选择输出格式" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="jpeg">JPEG</SelectItem>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="webp">WebP</SelectItem>
              <SelectItem value="avif">AVIF</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>最大宽度</Label>
          <div className="flex items-center space-x-2">
            <Slider
              value={[maxWidth]}
              onValueChange={(value) => onMaxWidthChange(value[0])}
              min={100}
              max={4000}
              step={100}
              className="flex-1"
            />
            <span className="w-16 text-sm text-muted-foreground">{maxWidth}px</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label>最大高度</Label>
          <div className="flex items-center space-x-2">
            <Slider
              value={[maxHeight]}
              onValueChange={(value) => onMaxHeightChange(value[0])}
              min={100}
              max={4000}
              step={100}
              className="flex-1"
            />
            <span className="w-16 text-sm text-muted-foreground">{maxHeight}px</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 