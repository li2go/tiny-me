import { useState, useCallback, useEffect } from "react";
import { Layout, Typography, Space, Button, message, Slider, Form, InputNumber, Select, Modal, Collapse, Tag, theme, Alert, Checkbox, Divider, Input, Spin, Progress } from "antd";
import { InboxOutlined, SettingOutlined, PictureOutlined,  InfoCircleOutlined, GithubOutlined, FolderOpenOutlined, UnorderedListOutlined, AppstoreOutlined, ArrowLeftOutlined, PlayCircleOutlined, FileAddOutlined } from "@ant-design/icons";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from '@tauri-apps/plugin-fs';
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useTranslation } from 'react-i18next';
import LanguageSwitch from './components/LanguageSwitch';
import "./styles/index.css";
import { listen } from "@tauri-apps/api/event";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface CompressOptions {
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: string;
  preset?: string;
  maintainAspectRatio?: boolean;
}

interface PresetConfig {
  name: string;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format: string;
  description: string;
}

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  originalSize: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  path: string;
  compressedSize?: number;
  compressedPreview?: string;
  outputPath?: string;
  progress?: number;
}

function App() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unlisten, setUnlisten] = useState<(() => void) | null>(null);
  
  const presets: Record<string, PresetConfig> = {
    web: {
      name: t('settings.presets.web'),
      quality: 75,
      maxWidth: 1920,
      maxHeight: 1080,
      format: 'webp',
      description: t('settings.presets.descriptions.web')
    },
    social: {
      name: t('settings.presets.social'),
      quality: 85,
      maxWidth: 1200,
      maxHeight: 1200,
      format: 'jpg',
      description: t('settings.presets.descriptions.social')
    },
    archive: {
      name: t('settings.presets.archive'),
      quality: 95,
      format: 'png',
      description: t('settings.presets.descriptions.archive')
    },
    mobile1x: {
      name: t('settings.presets.mobile1x'),
      quality: 80,
      maxWidth: 375,
      maxHeight: 812,
      format: 'webp',
      description: t('settings.presets.descriptions.mobile1x')
    },
    mobile2x: {
      name: t('settings.presets.mobile2x'),
      quality: 85,
      maxWidth: 750,
      maxHeight: 1624,
      format: 'webp',
      description: t('settings.presets.descriptions.mobile2x')
    },
    mobile3x: {
      name: t('settings.presets.mobile3x'),
      quality: 90,
      maxWidth: 1125,
      maxHeight: 2436,
      format: 'webp',
      description: t('settings.presets.descriptions.mobile3x')
    },
    androidHD: {
      name: t('settings.presets.androidHD'),
      quality: 85,
      maxWidth: 1080,
      maxHeight: 1920,
      format: 'webp',
      description: t('settings.presets.descriptions.androidHD')
    },
    androidFHD: {
      name: t('settings.presets.androidFHD'),
      quality: 90,
      maxWidth: 1440,
      maxHeight: 2560,
      format: 'webp',
      description: t('settings.presets.descriptions.androidFHD')
    },
    ipadRetina: {
      name: t('settings.presets.ipadRetina'),
      quality: 85,
      maxWidth: 2048,
      maxHeight: 2732,
      format: 'webp',
      description: t('settings.presets.descriptions.ipadRetina')
    }
  };

  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [compressOptions, setCompressOptions] = useState<CompressOptions>({
    quality: 80,
    maxWidth: undefined,
    maxHeight: undefined,
    format: undefined,
    preset: undefined,
    maintainAspectRatio: true,
  });
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [outputDir, setOutputDir] = useState<string>();
  const [isSelectingOutputDir, setIsSelectingOutputDir] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [isAboutVisible, setIsAboutVisible] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    let isMounted = true;
    
    // 监听压缩进度事件
    const setupProgressListener = async () => {
      const unlistenProgress = await listen('compress-progress', (event) => {
        if (!isMounted) return;
        
        const { file_path, progress } = event.payload as { file_path: string; progress: number };
        
        setImageFiles(prev =>
          prev.map(img =>
            img.path === file_path
              ? { ...img, progress }
              : img
          )
        );
      });

      if (isMounted) {
        setUnlisten(prev => {
          if (prev) {
            return () => {
              prev();
              unlistenProgress();
            };
          }
          return unlistenProgress;
        });
      }
    };

    setupProgressListener();

    // 使用 getCurrentWebview 监听拖放事件
    const setupDragDrop = async () => {
      const webview = getCurrentWebview();
      const unlistenFn = await webview.onDragDropEvent(async (event) => {
        if (!isMounted) return;
        
        if (event.payload.type === 'over') {
          setIsDragging(true);
        } else if (event.payload.type === 'drop') {
          setIsDragging(false);
          setIsLoading(true);
          
          try {
            // 过滤文件类型
            const paths = event.payload.paths.filter(path => {
              const ext = path.split('.').pop()?.toLowerCase();
              return ['jpg', 'jpeg', 'png', 'webp'].includes(ext || '');
            });

            if (paths.length === 0) {
              message.warning(t('message.noValidImageFiles'));
              return;
            }

            if (paths.length < event.payload.paths.length) {
              message.warning(t('message.someFilesSkipped'));
            }
            
            // 处理拖放的文件
            const files = await Promise.all(paths.map(async (path) => {
              const fileStats = await invoke('get_file_stats', { path });
              const fileContent = await readFile(path);
              const blob = new Blob([fileContent], { type: `image/${path.split('.').pop()?.toLowerCase()}` });
              const previewUrl = URL.createObjectURL(blob);
              
              return {
                name: path.split('/').pop() || path.split('\\').pop() || '',
                path: path,
                type: `image/${path.split('.').pop()?.toLowerCase()}`,
                stats: fileStats,
                preview: previewUrl
              };
            }));

            // 处理文件
            for (const file of files) {
              try {
                // 检查文件是否已存在
                const isDuplicate = imageFiles.some(img => img.path === file.path);
                if (isDuplicate) {
                  message.warning(t('message.fileAlreadyExists', { filename: file.name }));
                  continue;
                }

                const newImage: ImageFile = {
                  id: Math.random().toString(36).substr(2, 9),
                  file: file as unknown as File,
                  preview: file.preview,
                  originalSize: (file.stats as any).size,
                  status: 'pending',
                  path: file.path,
                };
                
                setImageFiles(prev => [...prev, newImage]);
              } catch (error) {
                console.error(`处理文件 ${file.name} 时出错:`, error);
                message.error(t('message.errorProcessingFile', { filename: file.name }));
              }
            }

            if (files.length > 0) {
              message.success(t('message.fileAddedSuccessfully'));
              setActiveTab('2');
            }
          } finally {
            if (isMounted) {
              setIsLoading(false);
            }
          }
        } else {
          setIsDragging(false);
        }
      });

      if (isMounted) {
        setUnlisten(() => unlistenFn);
      }
    };

    setupDragDrop();

    return () => {
      isMounted = false;
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const processFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          message.warning(t('message.unsupportedFileType', { filename: file.name }));
          continue;
        }

        // 获取文件路径
        const filePath = (file as any).path;
        if (!filePath) {
          message.warning(t('message.cannotGetFilePath', { filename: file.name }));
          continue;
        }

        const fileStats: any = await invoke('get_file_stats', { 
          path: filePath 
        });
        
        const fileContent = await readFile(filePath);
        const blob = new Blob([fileContent], { type: `image/${file.name.split('.').pop()?.toLowerCase()}` });
        const previewUrl = URL.createObjectURL(blob);
        
        const newImage: ImageFile = {
          id: Math.random().toString(36).substr(2, 9),
          file: file,
          preview: previewUrl,
          originalSize: fileStats.size,
          status: 'pending',
          path: filePath,
        };
        
        setImageFiles(prev => [...prev, newImage]);
      } catch (error) {
        console.error(`处理文件 ${file.name} 时出错:`, error);
        message.error(t('message.errorProcessingFile', { filename: file.name }));
      }
    }
    if (files.length > 0) {
      message.success(t('message.fileAddedSuccessfully'));
      setActiveTab('2');
    }
  };

  const handleUpload = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [{
          name: 'Image',
          extensions: ['png', 'jpg', 'jpeg', 'webp']
        }]
      });

      if (Array.isArray(selected)) {
        const files = selected.map(path => ({
          name: path.split('/').pop() || path.split('\\').pop() || '',
          path: path,
          type: `image/${path.split('.').pop()?.toLowerCase()}`
        })) as unknown as File[];
        
        await processFiles(files);
      }
    } catch (error) {
      message.error(t('message.fileSelectFailed'));
    }
  };
  const openDir = async (path: string | undefined) => {
    if (!path) {
      message.warning(t('message.noOutputDir'));
      return;
    }
    try {
      await invoke('open_dir', { path });
    } catch (error) {
      message.error(t('message.cannotOpenDir', { error }));
    }
  };
  const selectOutputDir = async () => {
    try {
      setIsSelectingOutputDir(true);
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected) {
        setOutputDir(selected as string);
        message.success(t('message.dirSelected'));
      }
    } catch (error) {
      console.error(error);
      message.error(t('message.dirSelectFailed'));
    } finally {
      setIsSelectingOutputDir(false);
    }
  };

  const compressImage = async (imageFile: ImageFile) => {
    try {
      if (!outputDir) {
        const selected = await open({
          directory: true,
          multiple: false,
        });
        if (!selected) {
          message.warning(t('message.noOutputDir'));
          return;
        }
        setOutputDir(selected as string);
      }

      setImageFiles(prev =>
        prev.map(img =>
          img.id === imageFile.id ? { ...img, status: 'processing', progress: 0 } : img
        )
      );
      
      const backendOptions = {
        quality: compressOptions.quality,
        max_width: compressOptions.maxWidth,
        max_height: compressOptions.maxHeight,
        format: compressOptions.format,
        maintain_aspect_ratio: compressOptions.maintainAspectRatio
      };

      const result = await invoke('compress_image', {
        inputPath: imageFile.path,
        outputDir: outputDir,
        options: backendOptions,
      });

      const compressedContent = await readFile((result as any).output_path);
      const blob = new Blob([compressedContent], { type: `image/${imageFile.file.name.split('.').pop()?.toLowerCase()}` });
      const previewUrl = URL.createObjectURL(blob);

      setImageFiles(prev =>
        prev.map(img =>
          img.id === imageFile.id
            ? {
                ...img,
                status: 'done',
                progress: 100,
                compressedSize: (result as any).compressed_size,
                compressedPreview: previewUrl,
                outputPath: (result as any).output_path,
              }
            : img
        )
      );

      message.success(t('message.compressionComplete', { filename: imageFile.file.name }));
      setActiveTab('3');
    } catch (error) {
      setImageFiles(prev =>
        prev.map(img =>
          img.id === imageFile.id ? { ...img, status: 'error', progress: 0 } : img
        )
      );
      message.error(t('message.compressionFailed', { error }));
    }
  };

  const handlePresetSelect = (presetKey: keyof typeof presets) => {
    const preset = presets[presetKey];
    setCompressOptions({
      quality: preset.quality,
      maxWidth: preset.maxWidth,
      maxHeight: preset.maxHeight,
      format: preset.format,
      preset: presetKey,
      maintainAspectRatio: true,
    });
  };

  const removeImage = (id: string) => {
    setImageFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file) {
        if (file.preview) URL.revokeObjectURL(file.preview);
        if (file.compressedPreview) URL.revokeObjectURL(file.compressedPreview);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const locateFile = async (path: string) => {
    try {
      await invoke('open_file_location', { path });
    } catch (error) {
      message.error(t('message.cannotOpenLocation'));
    }
  };

  // 修改批量压缩函数
  const compressAllPending = async () => {
    const pendingFiles = imageFiles.filter(img => img.status === 'pending');
    
    if (pendingFiles.length === 0) {
      return;
    }

    let currentOutputDir = outputDir;
    
    if (!currentOutputDir) {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (!selected) {
        message.warning(t('message.noOutputDir'));
        return;
      }
      currentOutputDir = selected as string;
      setOutputDir(currentOutputDir);
    }
    
    const backendOptions = {
      quality: compressOptions.quality,
      max_width: compressOptions.maxWidth,
      max_height: compressOptions.maxHeight,
      format: compressOptions.format,
      maintain_aspect_ratio: compressOptions.maintainAspectRatio
    };
    
    try {
      setImageFiles(prev =>
        prev.map(img =>
          img.status === 'pending' ? { ...img, status: 'processing', progress: 0 } : img
        )
      );
      
      const inputPaths = pendingFiles.map(file => file.path);
      const results = await invoke('batch_compress', {
        inputPaths,
        outputDir: currentOutputDir,
        options: backendOptions
      }) as any[];
      
      if (results && results.length > 0) {
        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const file = pendingFiles[i];
          
          try {
            const compressedContent = await readFile(result.output_path);
            const blob = new Blob([compressedContent], { type: `image/${file.file.name.split('.').pop()?.toLowerCase()}` });
            const previewUrl = URL.createObjectURL(blob);
            
            setImageFiles(prev =>
              prev.map(img =>
                img.id === file.id
                  ? {
                      ...img,
                      status: 'done',
                      progress: 100,
                      compressedSize: result.compressed_size,
                      compressedPreview: previewUrl,
                      outputPath: result.output_path,
                    }
                  : img
              )
            );
          } catch (error) {
            console.error(`处理压缩结果时出错: ${error}`);
            setImageFiles(prev =>
              prev.map(img =>
                img.id === file.id ? { ...img, status: 'error', progress: 0 } : img
              )
            );
          }
        }
        message.success(t('message.batchComplete', { count: results.length }));
      }
    } catch (error) {
      console.error(`批量压缩失败: ${error}`);
      message.error(t('message.batchFailed', { error }));
      setImageFiles(prev =>
        prev.map(img =>
          img.status === 'processing' ? { ...img, status: 'error', progress: 0 } : img
        )
      );
    }
  };

  // 添加重置列表状态函数
  const resetAllStatus = () => {
    setImageFiles(prev =>
      prev.map(img => ({
        ...img,
        status: 'pending',
        progress: 0,
        compressedSize: undefined,
        compressedPreview: undefined,
        outputPath: undefined,
      }))
    );
  };

  // 添加清理函数
  useEffect(() => {
    return () => {
      // 清理所有创建的 URL 对象
      imageFiles.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
        if (file.compressedPreview) URL.revokeObjectURL(file.compressedPreview);
      });
    };
  }, [imageFiles]);

  return (
    <Layout className="appContainer">
      <Header className="header">
        <Space>
          <PictureOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />
          <Title level={4} style={{ margin: 0, color: token.colorPrimary }}>
            {t('app.title')}
          </Title>
        </Space>
        <Space>
          <LanguageSwitch />
          <Button 
            type="text" 
            icon={<InfoCircleOutlined />}
            onClick={() => setIsAboutVisible(true)}
          >
            {t('app.about')}
          </Button>
        </Space>
      </Header>
      
      <Content className="mainContent">
        {!isSettingsVisible ? (
          <>
            <div className="uploadContainer">
              {imageFiles.length === 0 ? (
                <div 
                  className={`dropZone ${isDragging ? 'dragover' : ''} ${isLoading ? 'loading' : ''}`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  {isLoading ? (
                    <Space direction="vertical" align="center">
                      <Spin size="large" />
                      <Text>{t('message.processingFiles')}</Text>
                    </Space>
                  ) : (
                    <>
                      <InboxOutlined style={{ color: token.colorPrimary }} />
                      <Title level={3}>{t('upload.dragText')}</Title>
                      <Text type="secondary">{t('upload.or')}</Text>
                      <Button 
                        type="primary" 
                        icon={<InboxOutlined />}
                        onClick={handleUpload}
                        size="large"
                      >
                        {t('upload.selectButton')}
                      </Button>
                      <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                        {t('upload.supportText')}
                      </Text>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <div className="settingsSummary">
                    <div className="settingsSummaryContent">
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div className="settingsSummaryHeader">
                          <Space>
                            <SettingOutlined style={{ color: token.colorPrimary }} />
                            <Text strong>{t('settings.currentSettings')}</Text>
                          </Space>
                          <Button 
                            type="link" 
                            onClick={() => setIsSettingsVisible(true)}
                          >
                            {t('settings.modifySettings')}
                          </Button>
                        </div>
                        <div className="settingsSummaryBody">
                          <Space wrap>
                            <Tag color="blue">
                              {t('settings.quality')}: {compressOptions.quality}%
                            </Tag>
                            {compressOptions.maxWidth && compressOptions.maxHeight && (
                              <Tag color="blue">
                                {t('settings.maxSize')}: {compressOptions.maxWidth}×{compressOptions.maxHeight}
                                {compressOptions.maintainAspectRatio && ` (${t('settings.maintainAspectRatio')})`}
                              </Tag>
                            )}
                            {compressOptions.format && (
                              <Tag color="blue">
                                {t('settings.format')}: {compressOptions.format.toUpperCase()}
                              </Tag>
                            )}
                            {compressOptions.preset && (
                              <Tag color="blue">
                                {t('settings.presets.title')}: {presets[compressOptions.preset as keyof typeof presets].name}
                              </Tag>
                            )}
                            {outputDir && (
                              <Tag color="blue">
                                {t('settings.outputDir')}: {outputDir.split('/').pop() || outputDir.split('\\').pop()}
                              </Tag>
                            )}
                          </Space>
                        </div>
                      </Space>
                    </div>
                  </div>
                  <div className={`imageList ${viewMode === 'grid' ? 'grid-view' : 'list-view'}`}>
                    <div className="imageListHeader">
                      <Space>
                        <Button 
                          type="primary" 
                          icon={<FileAddOutlined />} 
                          onClick={handleUpload}
                        >
                          {t('upload.addMore')}
                        </Button>
                        <Button
                          type="primary"
                          icon={<PlayCircleOutlined />}
                          onClick={compressAllPending}
                          disabled={!imageFiles.some(img => img.status === 'pending')}
                        >
                          {t('imageInfo.start')}{imageFiles.filter(img => img.status === 'pending').length}{t('message.tasks')}
                        </Button>
                      </Space>
                      <Space>
                        <Button 
                          type="text"
                          onClick={() => {
                            Modal.confirm({
                              title: t('confirm.resetTitle'),
                              content: t('confirm.resetList'),
                              onOk: () => resetAllStatus()
                            })
                          }}
                        >
                          {t('upload.resetList')}
                        </Button>
                        <Button 
                          type="text"
                          danger
                          onClick={() => {
                            Modal.confirm({
                              title: t('confirm.title'),
                              content: t('confirm.clearList'),
                              onOk: () => setImageFiles([])
                            })
                          }}
                        >
                          {t('upload.clearList')}
                        </Button>
                      </Space>
                    </div>
                    <Button
                          type="text"
                          style={
                            viewMode === 'list' ? {
                              color: token.colorPrimary
                            } : {}
                          }
                          icon={<UnorderedListOutlined />}
                          onClick={() => setViewMode('list')}
                        >
                         {t('view.list')}
                        </Button>
                        <Button
                          type="text"
                          style={
                            viewMode === 'grid' ? {
                              color: token.colorPrimary
                            } : {}
                          }
                          icon={<AppstoreOutlined />}
                          onClick={() => setViewMode('grid')}
                        >
                         {t('view.grid')}
                        </Button>
                    <div className="imageContainer">
                      {imageFiles.map(image => (
                        <div key={image.id} className={`imageCard ${viewMode === 'grid' ? 'grid-item' : 'list-item'}`}>
                          <div className="imagePreview">
                            <img src={image.preview} alt={image.file.name} />
                            {image.status === 'done' && image.compressedPreview && (
                              <div className="compressedPreview">
                                <img src={image.compressedPreview} alt={image.file.name} />
                              </div>
                            )}
                          </div>
                          <div className="imageInfo">
                            <Text ellipsis style={{ maxWidth: viewMode === 'grid' ? '200px' : '400px' }}>{image.file.name}</Text>
                            <Space direction="vertical" size="small">
                              <Text type="secondary">{t('imageInfo.original')}: {(image.originalSize / 1024).toFixed(2)} KB</Text>
                              {image.status === 'done' && image.compressedSize && (
                                <Text type="success">
                                  压缩后: {(image.compressedSize / 1024).toFixed(2)} KB
                                  ({((1 - image.compressedSize / image.originalSize) * 100).toFixed(1)}%)
                                </Text>
                              )}
                              {image.status === 'processing' && (
                                <Progress 
                                  percent={image.progress} 
                                  size="small" 
                                  status="active"
                                  showInfo={false}
                                />
                              )}
                            </Space>
                            <div className="imageActions">
                              {image.status === 'pending' && (
                                <>
                                  <Button
                                    type="primary"
                                    onClick={() => compressImage(image)}
                                  >
                                    {t('imageInfo.start')}
                                  </Button>
                                  <Button
                                    type="text"
                                    danger
                                    onClick={() => removeImage(image.id)}
                                  >
                                    {t('imageInfo.remove')}
                                  </Button>
                                </>
                              )}

                              {image.status === 'done' && (
                                <Space>
                                  <Button
                                    type="primary"
                                    icon={<FolderOpenOutlined />}
                                    onClick={() => image.outputPath && locateFile(image.outputPath)}
                                  >
                                    查看
                                  </Button>
                                  <Button
                                    type="text"
                                    onClick={() => resetAllStatus()}
                                  >
                                    重新压缩
                                  </Button>
                                  <Button
                                    type="text"
                                    danger
                                    onClick={() => removeImage(image.id)}
                                  >
                                    移除
                                  </Button>
                                </Space>
                              )}

                              {image.status === 'error' && (
                                <Space>
                                  <Button
                                    type="primary"
                                    onClick={() => resetAllStatus()}
                                  >
                                    重试
                                  </Button>
                                  <Button
                                    type="text"
                                    danger
                                    onClick={() => removeImage(image.id)}
                                  >
                                    移除
                                  </Button>
                                </Space>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>


          </>
        ) : (
          <div className="settingsPanel">
            <div className="settingsHeader">
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />}
                onClick={() => setIsSettingsVisible(false)}
              >
                {t('settings.back')}
              </Button>
              <Title level={4} style={{ margin: 0 }}>{t('settings.title')}</Title>
            </div>
            <Collapse defaultActiveKey={['basic']} className="settingsCollapse">
              <Collapse.Panel header={t('settings.title')} key="basic">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Form layout="vertical">
                    <Form.Item label={t('settings.outputDir')}>
                      <Space>
                        <Input 
                          value={outputDir || ''} 
                          readOnly 
                          placeholder={t('settings.selectDir')}
                          style={{ width: '300px' }}
                        />
                        <Button 
                          type="primary"
                          onClick={selectOutputDir}
                          loading={isSelectingOutputDir}
                        >
                          {t('settings.selectDir')}
                        </Button>
                        <Button
                          type="primary"
                          onClick={() => openDir(outputDir)}
                        >
                          {t('settings.openDir')}
                        </Button>
                      </Space>
                    </Form.Item>
                    <Form.Item label={t('settings.quality')}>
                      <Slider
                        value={compressOptions.quality}
                        onChange={value => setCompressOptions(prev => ({ ...prev, quality: value, preset: undefined }))}
                        min={1}
                        max={100}
                        marks={{
                          1: t('settings.qualityLow'),
                          50: t('settings.qualityMedium'),
                          100: t('settings.qualityHigh'),
                        }}
                      />
                    </Form.Item>
                    <Form.Item label={t('settings.format')}>
                      <Select
                        value={compressOptions.format}
                        onChange={value => setCompressOptions(prev => ({ ...prev, format: value, preset: undefined }))}
                        allowClear
                        style={{ width: '100%' }}
                      >
                        <Select.Option value="jpg">JPG</Select.Option>
                        <Select.Option value="png">PNG</Select.Option>
                        <Select.Option value="webp">WebP</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item label={t('settings.maxSize')}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Space>
                          <InputNumber
                            value={compressOptions.maxWidth}
                            onChange={value => setCompressOptions(prev => ({ ...prev, maxWidth: value || undefined, preset: undefined }))}
                            min={1}
                            placeholder={t('settings.width')}
                          />
                          <Text type="secondary">×</Text>
                          <InputNumber
                            value={compressOptions.maxHeight}
                            onChange={value => setCompressOptions(prev => ({ ...prev, maxHeight: value || undefined, preset: undefined }))}
                            min={1}
                            placeholder={t('settings.height')}
                          />
                        </Space>
                        <Checkbox
                          checked={compressOptions.maintainAspectRatio}
                          onChange={e => setCompressOptions(prev => ({ ...prev, maintainAspectRatio: e.target.checked }))}
                        >
                          {t('settings.maintainAspectRatio')}
                        </Checkbox>
                      </Space>
                    </Form.Item>
                  </Form>

                  <div className="presetSection">
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div className="presetGroup">
                        <Text type="secondary">{t('settings.presets.title')}：</Text>
                        <Space wrap style={{ marginTop: 8 }}>
                          {['web', 'social', 'archive'].map(key => (
                            <Tag
                              key={key}
                              color={compressOptions.preset === key ? 'blue' : 'default'}
                              className="modern-tag"
                              onClick={() => handlePresetSelect(key as keyof typeof presets)}
                            >
                              {presets[key].name}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                      
                      <div className="presetGroup">
                        <Text type="secondary">{t('settings.presets.deviceTitle')}：</Text>
                        <Space wrap style={{ marginTop: 8 }}>
                          {['mobile1x', 'mobile2x', 'mobile3x', 'ipadRetina', 'androidHD', 'androidFHD'].map(key => (
                            <Tag
                              key={key}
                              color={compressOptions.preset === key ? 'blue' : 'default'}
                              className="modern-tag"
                              onClick={() => handlePresetSelect(key as keyof typeof presets)}
                            >
                              {presets[key].name}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    </Space>
                  </div>

                  {compressOptions.preset && (
                    <Alert
                      message={
                        <>
                          {presets[compressOptions.preset as keyof typeof presets].description}
                          {(compressOptions.maxWidth || compressOptions.maxHeight) && (
                            <div className={`aspect-ratio-info ${compressOptions.maintainAspectRatio ? 'maintain' : 'ignore'}`}>
                              {compressOptions.maintainAspectRatio 
                                ? t('settings.aspectRatioInfo.maintain')
                                : t('settings.aspectRatioInfo.ignore')}
                            </div>
                          )}
                        </>
                      }
                      type="info"
                      showIcon
                      className="presetAlert"
                    />
                  )}
                </Space>
              </Collapse.Panel>
            </Collapse>
          </div>
        )}
      </Content>



      {!isSettingsVisible && (
        <Button
          type="primary"
          shape="circle"
          icon={<SettingOutlined />}
          className="settingsFloatButton"
          onClick={() => setIsSettingsVisible(true)}
        />
      )}

      <Modal
        title={t('about.title')}
        open={isAboutVisible}
        onCancel={() => setIsAboutVisible(false)}
        footer={[
          <Button 
            key="github" 
            type="link" 
            icon={<GithubOutlined />}
            href="https://github.com/li2go/tiny-me"
            target="_blank"
          >
            {t('about.buttons.github')}
          </Button>,
          <Button 
            key="close" 
            type="primary" 
            onClick={() => setIsAboutVisible(false)}
          >
            {t('about.buttons.close')}
          </Button>
        ]}
      >
        <div className="about-content">
          <p>{t('about.description')}</p>
          
          <Divider />
          
          <div className="about-section">
            <h4>{t('about.features.title')}</h4>
            <ul>
              {(t('about.features.list', { returnObjects: true }) as string[]).map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>

          <Divider />
          
          <div className="about-section">
            <h4>{t('about.developer.title')}</h4>
            <p>{t('about.developer.author')}: li2go</p>
            <p>{t('about.developer.version')}: 1.0.0</p>
          </div>

          <Divider />
          
          <div className="about-section">
            <h4>{t('about.techStack.title')}</h4>
            <p>{t('about.techStack.description')}</p>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

export default App;
