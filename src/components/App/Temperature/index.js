import React, { useState } from 'react';
import { Button, Layout, Space, Typography, Card } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import CollectTemperature from './CollectTemperature';

const { Content } = Layout;
const { Title } = Typography;

const Temperature = () => {
    const [showCollectTemperature, setShowCollectTemperature] = useState(false);

    if (showCollectTemperature) {
        return <CollectTemperature />;
    }

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Content
                style={{
                    padding: 0,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {/* Main Content Area */}
                <Space direction="vertical" align="center" size="large">
                    <Card
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            backdropFilter: 'blur(10px)',
                            border: 'none',
                            borderRadius: '16px',
                            color: 'white',
                            textAlign: 'center'
                        }}
                        bodyStyle={{ padding: '40px' }}
                    >
                        <Title level={2} style={{ color: 'white', margin: 0 }}>
                            HeatScape Temperature Monitor
                        </Title>
                        <Typography.Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px' }}>
                            System is ready for temperature data collection
                        </Typography.Text>
                    </Card>
                </Space>

                {/* Manual Override Button in corner */}
                <Button
                    type="primary"
                    size="large"
                    icon={<SettingOutlined />}
                    onClick={() => setShowCollectTemperature(true)}
                    style={{
                        position: 'absolute',
                        top: '24px',
                        right: '24px',
                        zIndex: 1000,
                        borderRadius: '8px',
                        height: '48px',
                        paddingLeft: '16px',
                        paddingRight: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                >
                    Manual Override
                </Button>
            </Content>
        </Layout>
    );
};

export default Temperature;