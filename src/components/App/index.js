import { useState } from 'react';
import { Layout, Steps, Button } from 'antd';
import {
    FileImageOutlined,
    PartitionOutlined,
    // AimOutlined,
    FireOutlined,
    CheckCircleOutlined,
} from '@ant-design/icons';
import CollectTemperature from './CollectTemperature';

const { Header, Content, Footer } = Layout;

const HeatScape = () => {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            title: 'Capture Images',
            icon: <FileImageOutlined />,
            content: 'Capture images from the thermal camera.',
        },
        {
            title: 'Segmentation',
            icon: <PartitionOutlined />,
            content: 'Capture images from the thermal camera.',
        },
        {
            title: 'Collect Temperatures',
            icon: <FireOutlined />,
            content: <CollectTemperature />,
        },
        {
            title: 'VLM Analysis',
            icon: <CheckCircleOutlined />,
            content: 'Capture images from the thermal camera.',
        },
    ];

    const next = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    const prev = () => setCurrentStep((prevs) => Math.max(prevs - 1, 0));

    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Header style={{ color: 'white', fontSize: '20px' }}>HeatScape Control Panel</Header>
            <Content style={{ padding: '20px 50px' }}>
                <Steps current={currentStep} items={steps} />
                <div
                    style={{
                        minHeight: '260px',
                        textAlign: 'center',
                        color: '#898989',
                        backgroundColor: '#fafafa',
                        borderRadius: '8px',
                        border: `1px dashed #d9d9d9`,
                        marginTop: 16,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    {steps[currentStep].content}
                </div>
                <div style={{ marginTop: '20px' }}>
                    {currentStep > 0 && (
                        <Button onClick={prev} style={{ marginRight: '8px' }}>
                            Previous
                        </Button>
                    )}
                    {currentStep < steps.length - 1 && (
                        <Button type="primary" onClick={next}>
                            Next
                        </Button>
                    )}
                </div>
            </Content>
            <Footer style={{ textAlign: 'center' }}>HeatScape ©2025</Footer>
        </Layout>
    );
};

export default HeatScape;
