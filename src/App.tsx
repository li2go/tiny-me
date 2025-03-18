import { useState } from "react";
import { Layout, Typography, Card, Space, Button, message, Slider, Form, InputNumber, Select, Modal, Collapse, Tag, theme, Alert, Empty } from "antd";
import { InboxOutlined, SettingOutlined, PictureOutlined } from "@ant-design/icons";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from '@tauri-apps/plugin-fs';
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
  compressedPreview?: string;
  originalSize: number;
  compressedSize?: number;
  status: 'pending' | 'processing' | 'done' | 'error';
  path: string;
}

interface CustomFile extends File {
  path?: string;
}

function App() {
  const { token } = theme.useToken();
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [compressOptions, setCompressOptions] = useState<CompressOptions>({
    quality: 80,
    maxWidth: undefined,
    maxHeight: undefined,
    format: undefined,
    preset: undefined,
  });
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [outputDir, setOutputDir] = useState<string>();

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
        for (const filePath of selected) {
          const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
          
          try {
            const fileStats: any = await invoke('get_file_stats', { 
              path: filePath 
            });
            
            // 读取文件内容并转换为 base64
            const fileContent = await readFile(filePath);
            const base64 = btoa(
              new Uint8Array(fileContent)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            const dataUrl = `data:image/${fileName.split('.').pop()};base64,${base64}`;
            
            const newImage: ImageFile = {
              id: Math.random().toString(36).substr(2, 9),
              file: new File([], fileName),
              preview: dataUrl,
              originalSize: fileStats.size,
              status: 'pending',
              path: filePath,
            };
            
            setImageFiles(prev => [...prev, newImage]);
          } catch (error) {
            console.error(`Error processing file ${fileName}:`, error);
            message.error(`处理文件 ${fileName} 时出错`);
          }
        }
        message.success('文件添加成功');
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

      // 读取压缩后的图片
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
    } catch (error) {
      setImageFiles(prev =>
        prev.map(img =>
          img.id === imageFile.id ? { ...img, status: 'error' } : img
        )
      );
      message.error(`压缩失败: ${error}`);
    }
  };

  const compressAll = async () => {
    if (!outputDir) {
      message.error('请先选择输出目录');
      return;
    }

    const pendingFiles = imageFiles.filter(img => img.status === 'pending');
    if (pendingFiles.length === 0) {
      message.info('没有待压缩的图片');
      return;
    }

    try {
      const result = await invoke('batch_compress', {
        inputPaths: pendingFiles.map(img => img.path),
        outputDir,
        options: compressOptions,
      });

      const results = result as any[];
      for (const img of imageFiles) {
        const resultItem = results.find(r => r.output_path.includes(img.file.name));
        if (resultItem) {
          try {
            // 读取压缩后的图片
            const compressedContent = await readFile(resultItem.output_path);
            const base64 = btoa(
              new Uint8Array(compressedContent)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
            );
            const dataUrl = `data:image/${img.file.name.split('.').pop()};base64,${base64}`;

            setImageFiles(prev =>
              prev.map(prevImg =>
                prevImg.id === img.id
                  ? {
                      ...prevImg,
                      status: 'done',
                      compressedSize: resultItem.compressed_size,
                      compressedPreview: dataUrl,
                    }
                  : prevImg
              )
            );
          } catch (error) {
            console.error(`Error loading compressed image: ${img.file.name}`, error);
          }
        }
      }

      message.success('批量压缩完成');
    } catch (error) {
      message.error(`批量压缩失败: ${error}`);
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
          <PictureOutlined style={{ fontSize: '28px', color: token.colorPrimary }} />
          <Title level={3} style={{ margin: 0 }}>
            TinyMe
          </Title>
        </Space>
        <Button 
          icon={<SettingOutlined />} 
          onClick={() => setIsSettingsVisible(true)}
        >
          压缩设置
        </Button>
      </Header>
      
      <Content className="mainContent">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card className="actionCard">
            <Space size="middle" wrap>
              <Button 
                type="primary" 
                icon={<InboxOutlined />} 
                onClick={handleUpload}
                size="large"
              >
                选择图片
              </Button>
              <Button 
                type="default" 
                onClick={selectOutputDir} 
                size="large"
              >
                选择输出目录
              </Button>
              <Button 
                type="default" 
                onClick={compressAll} 
                size="large"
                disabled={!outputDir || imageFiles.length === 0}
              >
                批量压缩
              </Button>
            </Space>
            {outputDir && (
              <Alert
                message={`输出目录: ${outputDir}`}
                type="info"
                showIcon
                style={{ marginTop: 16 }}
              />
            )}
          </Card>

          {imageFiles.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={'点击"选择图片"开始压缩'}
            />
          ) : (
            <div className="imageGrid">
              {imageFiles.map(image => (
                <Card
                  key={image.id}
                  hoverable
                  className="imageCard"
                  extra={
                    <div>
                      <Button type="primary" danger onClick={() => removeImage(image.id)}>删除</Button>
                    </div>
                  }
                  cover={
                    <div className="imagePreview">
                      {
                        image.preview && (
                          <div>
                            <div>原始</div>
                            <img
                              src={image.preview}
                              alt="preview"
                            />
                          </div>
                        )
                      }
                      {
                        image.compressedPreview && (
                         <div>
                          <div>压缩后</div>
                           <img
                            src={image.compressedPreview}
                            alt="preview"
                          />
                         </div>
                        )
                      }
                      {image.status === 'processing' && (
                        <div className="compressionProgress" />
                      )}
                      {image.status === 'done' && (
                        <Tag className="modern-tag" style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                        }}>
                          已完成
                        </Tag>
                      )}
                    </div>
                  }
                >
                  <Card.Meta
                    description={
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text>原始大小: {(image.originalSize / 1024).toFixed(2)} KB</Text>
                        {image.compressedSize && (
                          <Text type="success">
                            压缩后: {(image.compressedSize / 1024).toFixed(2)} KB
                            {' '}
                            <span>
                              ({((1 - image.compressedSize / image.originalSize) * 100).toFixed(1)}% 压缩率)
                            </span>
                          </Text>
                        )}
                        <Button
                          type="primary"
                          onClick={() => compressImage(image)}
                          loading={image.status === 'processing'}
                          disabled={image.status === 'done'}
                          block
                        >
                          {image.status === 'done' ? '已完成' : '压缩'}
                        </Button>
                      </Space>
                    }
                  />
                </Card>
              ))}
            </div>
          )}
        </Space>

        <div className="statsCard">
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
              {((imageFiles.reduce((acc, img) => acc + (img.compressedSize || 0), 0) / 
                imageFiles.reduce((acc, img) => acc + img.originalSize, 0)) * 100).toFixed(1)}%
            </div>
            <div className="statLabel">平均压缩率</div>
          </div>
        </div>
      </Content>

      <Footer style={{ textAlign: 'center', background: 'transparent', color: 'rgba(0,0,0,0.45)' }}>
        Image Compress Tool ©{new Date().getFullYear()}
      </Footer>

      <Modal
        title="压缩设置"
        open={isSettingsVisible}
        onOk={() => setIsSettingsVisible(false)}
        onCancel={() => setIsSettingsVisible(false)}
        width={600}
        className="settingsModal"
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div className="presetSection">
            <Title level={5}>预设方案</Title>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div className="presetGroup">
                <Text type="secondary">通用预设：</Text>
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
                <Text type="secondary">iOS 设备：</Text>
                <Space wrap style={{ marginTop: 8 }}>
                  {['mobile1x', 'mobile2x', 'mobile3x', 'ipadRetina'].map(key => (
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
                <Text type="secondary">Android 设备：</Text>
                <Space wrap style={{ marginTop: 8 }}>
                  {['androidHD', 'androidFHD'].map(key => (
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

          <Collapse defaultActiveKey={['basic']} className="settingsCollapse">
            <Collapse.Panel header="基本设置" key="basic">
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
              </Form>
            </Collapse.Panel>

            <Collapse.Panel header="高级设置" key="advanced">
              <Form layout="vertical">
                <Form.Item label="最大宽度">
                  <InputNumber
                    value={compressOptions.maxWidth}
                    onChange={value => setCompressOptions(prev => ({ ...prev, maxWidth: value || undefined, preset: undefined }))}
                    min={1}
                    style={{ width: '100%' }}
                    placeholder="保持原始尺寸"
                  />
                </Form.Item>
                <Form.Item label="最大高度">
                  <InputNumber
                    value={compressOptions.maxHeight}
                    onChange={value => setCompressOptions(prev => ({ ...prev, maxHeight: value || undefined, preset: undefined }))}
                    min={1}
                    style={{ width: '100%' }}
                    placeholder="保持原始尺寸"
                  />
                </Form.Item>
              </Form>
            </Collapse.Panel>
          </Collapse>

          {compressOptions.preset && (
            <Alert
              message={presets[compressOptions.preset as keyof typeof presets].description}
              type="info"
              showIcon
              className="presetAlert"
            />
          )}
        </Space>
      </Modal>
    </Layout>
  );
}

export default App;
