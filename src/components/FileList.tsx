import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Progress } from './ui/progress'
import { ImageIcon, Trash2Icon } from 'lucide-react'

interface File {
  id: string
  name: string
  path: string
  size: number
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

interface FileListProps {
  files: File[]
  selectedFiles: string[]
  onFileSelect: (fileId: string) => void
  onFileRemove: (fileId: string) => void
  onCompress: (fileId: string) => void
}

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFiles,
  onFileSelect,
  onFileRemove,
  onCompress,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>待处理文件</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between rounded-lg border p-2 hover:bg-accent"
            >
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedFiles.includes(file.id)}
                  onCheckedChange={() => onFileSelect(file.id)}
                />
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{file.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                {file.status === 'processing' && (
                  <Progress value={file.progress} className="w-20" />
                )}
                {file.status === 'completed' && (
                  <span className="text-sm text-green-600">已完成</span>
                )}
                {file.status === 'error' && (
                  <span className="text-sm text-red-600">{file.error}</span>
                )}
                {file.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCompress(file.id)}
                  >
                    压缩
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFileRemove(file.id)}
                >
                  <Trash2Icon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {files.length === 0 && (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              暂无文件
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 