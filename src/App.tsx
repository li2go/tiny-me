import { useState, useCallback } from "react";
import { Layout, Typography, Card, Space, Button, message, Slider, Form, InputNumber, Select, Modal, Collapse, Tag, theme, Alert, Empty, Checkbox, Divider, Tabs } from "antd";
import { InboxOutlined, SettingOutlined, PictureOutlined, FolderOutlined, SaveOutlined, DownloadOutlined, InfoCircleOutlined, GithubOutlined } from "@ant-design/icons";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from '@tauri-apps/plugin-fs';
import { listen } from '@tauri-apps/api/event';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { useTranslation } from 'react-i18next';
import LanguageSwitch from './components/LanguageSwitch';
import "./styles/index.css";

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

interface CompressOptions {
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: string;
  preset?: string;
}

interface PresetConfig {
  name: string;
  quality: number;
  maxWidth?: number;
  maxHeight?: number;
  format: string;
  description: string;
}

const presets: Record<string, PresetConfig> = {
  web: {
    name: '网页图片',
    quality: 75,
    maxWidth: 1920,
    maxHeight: 1080,
    format: 'webp',
    description: '适合网页使用的图片，压缩率高，画质好'
  },
  social: {
    name: '社交媒体',
    quality: 85,
    maxWidth: 1200,
    maxHeight: 1200,
    format: 'jpg',
    description: '适合社交媒体分享，平衡大小和质量'
  },
  archive: {
    name: '图片存档',
    quality: 95,
    format: 'png',
    description: '高质量存档，保持原始尺寸'
  },
  mobile1x: {
    name: '移动端 1x',
    quality: 80,
    maxWidth: 375,
    maxHeight: 812,
    format: 'webp',
    description: '适用于 iPhone X/11/12/13/14 等设备的 1x 分辨率'
  },
  mobile2x: {
    name: '移动端 2x',
    quality: 85,
    maxWidth: 750,
    maxHeight: 1624,
    format: 'webp',
    description: '适用于 iPhone X/11/12/13/14 等设备的 2x 分辨率'
  },
  mobile3x: {
    name: '移动端 3x',
    quality: 90,
    maxWidth: 1125,
    maxHeight: 2436,
    format: 'webp',
    description: '适用于 iPhone X/11/12/13/14 等设备的 3x 分辨率'
  },
  androidHD: {
    name: 'Android HD',
    quality: 85,
    maxWidth: 1080,
    maxHeight: 1920,
    format: 'webp',
    description: '适用于大多数 Android 设备的 HD 分辨率'
  },
  androidFHD: {
    name: 'Android FHD',
    quality: 90,
    maxWidth: 1440,
    maxHeight: 2560,
    format: 'webp',
    description: '适用于高端 Android 设备的 FHD+ 分辨率'
  },
  ipadRetina: {
    name: 'iPad Retina',
    quality: 85,
    maxWidth: 2048,
    maxHeight: 2732,
    format: 'webp',
    description: '适用于 iPad Pro 等设备的 Retina 分辨率'
  }
};

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  originalSize: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  path: string;
  compressedSize?: number;
  compressedPreview?: string;
}

function App() {
  const { t } = useTranslation();
  const { token } = theme.useToken();
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [compressOptions, setCompressOptions] = useState<CompressOptions>({
    quality: 80,
    maxWidth: undefined,
    maxHeight: undefined,
    format: undefined,
    preset: undefined,
  });
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [outputDir, setOutputDir] = useState<string>();
  const [activeTab, setActiveTab] = useState('1');
  const [isAboutVisible, setIsAboutVisible] = useState(false);

  // 处理文件拖拽
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    await processFiles(files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 处理文件选择
  const processFiles = async (files: File[]) => {
    for (const file of files) {
      try {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
          message.warning(`不支持的文件类型: ${file.name}`);
          continue;
        }

        // 获取文件路径
        const filePath = (file as any).path;
        if (!filePath) {
          message.warning(`无法获取文件路径: ${file.name}`);
          continue;
        }

        const fileStats: any = await invoke('get_file_stats', { 
          path: filePath 
        });
        
        const fileContent = await readFile(filePath);
        const base64 = btoa(
          new Uint8Array(fileContent)
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        const dataUrl = `data:image/${file.name.split('.').pop()};base64,${base64}`;
        
        const newImage: ImageFile = {
          id: Math.random().toString(36).substr(2, 9),
          file: file,
          preview: dataUrl,
          originalSize: fileStats.size,
          status: 'pending',
          path: filePath,
        };
        
        setImageFiles(prev => [...prev, newImage]);
      } catch (error) {
        console.error(`处理文件 ${file.name} 时出错:`, error);
        message.error(`处理文件 ${file.name} 时出错`);
      }
    }
    if (files.length > 0) {
      message.success('文件添加成功');
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
      console.error('选择文件失败:', error);
      message.error('选择文件失败');
    }
  };

  const selectOutputDir = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });
      if (selected) {
        setOutputDir(selected as string);
        message.success('输出目录已选择');
      }
    } catch (error) {
      console.error(error);
      message.error('选择目录失败');
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
          message.warning('未选择输出目录，操作已取消');
          return;
        }
        setOutputDir(selected as string);
      }

      setImageFiles(prev =>
        prev.map(img =>
          img.id === imageFile.id ? { ...img, status: 'processing' } : img
        )
      );

      const result = await invoke('compress_image', {
        inputPath: imageFile.path,
        outputDir,
        options: compressOptions,
      });

      const compressedContent = await readFile((result as any).output_path);
      const base64 = btoa(
        new Uint8Array(compressedContent)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      const dataUrl = `data:image/${imageFile.file.name.split('.').pop()};base64,${base64}`;

      setImageFiles(prev =>
        prev.map(img =>
          img.id === imageFile.id
            ? {
                ...img,
                status: 'done',
                compressedSize: (result as any).compressed_size,
                compressedPreview: dataUrl,
              }
            : img
        )
      );

      message.success(`压缩完成: ${imageFile.file.name}`);
      setActiveTab('3');
    } catch (error) {
      setImageFiles(prev =>
        prev.map(img =>
          img.id === imageFile.id ? { ...img, status: 'error' } : img
        )
      );
      message.error(`压缩失败: ${error}`);
    }
  };

  const handleFileSelect = (id: string) => {
    setSelectedFiles(prev => 
      prev.includes(id) 
        ? prev.filter(fileId => fileId !== id)
        : [...prev, id]
    );
  };

  const handleBatchSave = async () => {
    if (selectedFiles.length === 0) {
      message.warning('请先选择要保存的文件');
      return;
    }

    try {
      const selectedImages = imageFiles.filter(img => selectedFiles.includes(img.id));
      for (const img of selectedImages) {
        if (img.status === 'done') {
          await compressImage(img);
        }
      }
      message.success('批量保存完成');
    } catch (error) {
      message.error('批量保存失败');
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
    });
  };

  const removeImage = (id: string) => {
    setImageFiles(prev => prev.filter(img => img.id !== id));
  };

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
        <div className="uploadContainer">
          {imageFiles.length === 0 ? (
            <div 
              className="dropZone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
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
            </div>
          ) : (
            <div className="imageList">
              <div className="imageListHeader">
                <Space>
                  <Button 
                    type="primary" 
                    icon={<InboxOutlined />} 
                    onClick={handleUpload}
                  >
                    {t('upload.addMore')}
                  </Button>
                  <Button 
                    type="text"
                    onClick={() => setImageFiles([])}
                  >
                    {t('upload.clearList')}
                  </Button>
                </Space>
              </div>
              
              <div className="imageGrid">
                {imageFiles.map(image => (
                  <div key={image.id} className="imageCard">
                    <div className="imagePreview">
                      <img src={image.preview} alt={image.file.name} />
                      {image.status === 'done' && image.compressedPreview && (
                        <div className="compressedPreview">
                          <img src={image.compressedPreview} alt={image.file.name} />
                        </div>
                      )}
                    </div>
                    <div className="imageInfo">
                      <Text ellipsis style={{ maxWidth: '200px' }}>{image.file.name}</Text>
                      <Space direction="vertical" size="small">
                        <Text type="secondary">原始: {(image.originalSize / 1024).toFixed(2)} KB</Text>
                        {image.status === 'done' && image.compressedSize && (
                          <Text type="success">
                            压缩后: {(image.compressedSize / 1024).toFixed(2)} KB
                            ({((1 - image.compressedSize / image.originalSize) * 100).toFixed(1)}%)
                          </Text>
                        )}
                      </Space>
                      <div className="imageActions">
                        {image.status === 'pending' && (
                          <Button
                            type="primary"
                            onClick={() => compressImage(image)}
                            loading={image.status === 'processing'}
                          >
                            压缩
                          </Button>
                        )}
                        {image.status === 'done' && (
                          <Space>
                            <Button
                              type="primary"
                              icon={<DownloadOutlined />}
                              onClick={() => compressImage(image)}
                            >
                              保存
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
          )}
        </div>

        {imageFiles.length > 0 && (
          <div className="settingsPanel">
            <Collapse defaultActiveKey={['basic']} className="settingsCollapse">
              <Collapse.Panel header="压缩设置" key="basic">
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <div className="presetSection">
                    <Space direction="vertical" style={{ width: '100%' }} size="middle">
                      <div className="presetGroup">
                        <Text type="secondary">快速预设：</Text>
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
                        <Text type="secondary">设备预设：</Text>
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

                  <Form layout="vertical">
                    <Form.Item label="压缩质量">
                      <Slider
                        value={compressOptions.quality}
                        onChange={value => setCompressOptions(prev => ({ ...prev, quality: value, preset: undefined }))}
                        min={1}
                        max={100}
                        marks={{
                          1: '低',
                          50: '中',
                          100: '高',
                        }}
                      />
                    </Form.Item>
                    <Form.Item label="输出格式">
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
                    <Form.Item label="最大尺寸">
                      <Space>
                        <InputNumber
                          value={compressOptions.maxWidth}
                          onChange={value => setCompressOptions(prev => ({ ...prev, maxWidth: value || undefined, preset: undefined }))}
                          min={1}
                          placeholder="宽度"
                        />
                        <Text type="secondary">×</Text>
                        <InputNumber
                          value={compressOptions.maxHeight}
                          onChange={value => setCompressOptions(prev => ({ ...prev, maxHeight: value || undefined, preset: undefined }))}
                          min={1}
                          placeholder="高度"
                        />
                      </Space>
                    </Form.Item>
                  </Form>

                  {compressOptions.preset && (
                    <Alert
                      message={presets[compressOptions.preset as keyof typeof presets].description}
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

        {imageFiles.length > 0 && (
          <div className="statsBar">
            <div className="statItem">
              <div className="statValue">{imageFiles.length}</div>
              <div className="statLabel">总图片数</div>
            </div>
            <div className="statItem">
              <div className="statValue">
                {imageFiles.filter(img => img.status === 'done').length}
              </div>
              <div className="statLabel">已压缩</div>
            </div>
            <div className="statItem">
              <div className="statValue">
                {(() => {
                  const totalOriginalSize = imageFiles.reduce((acc, img) => acc + img.originalSize, 0);
                  const totalCompressedSize = imageFiles.reduce((acc, img) => acc + (img.compressedSize || 0), 0);
                  if (totalOriginalSize === 0) return '0%';
                  return `${((1 - totalCompressedSize / totalOriginalSize) * 100).toFixed(1)}%`;
                })()}
              </div>
              <div className="statLabel">平均压缩率</div>
            </div>
          </div>
        )}
      </Content>

      <Footer className="footer">
        <Text type="secondary">TinyMe ©{new Date().getFullYear()}</Text>
      </Footer>

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
