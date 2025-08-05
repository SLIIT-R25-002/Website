import React, { useState } from 'react';
import { Button } from 'antd';
import { SettingOutlined, RobotOutlined } from '@ant-design/icons';
import CollectTemperature from './CollectTemperature';
import AutonomousNavigation from './AutonomousNavigation';

const Temperature = () => {
    const [currentMode, setCurrentMode] = useState('manual'); // Default to manual mode

    if (currentMode === 'autonomous') {
        return (
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                <Button
                    type="primary"
                    size="large"
                    icon={<SettingOutlined />}
                    onClick={() => setCurrentMode('manual')}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        zIndex: 1000,
                        borderRadius: '8px',
                        height: '48px',
                        paddingLeft: '16px',
                        paddingRight: '16px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}
                >
                    Switch to Manual
                </Button>
                <AutonomousNavigation />
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Button
                type="default"
                size="large"
                icon={<RobotOutlined />}
                onClick={() => setCurrentMode('autonomous')}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    zIndex: 1000,
                    borderRadius: '8px',
                    height: '48px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    backgroundColor: '#52c41a',
                    borderColor: '#52c41a',
                    color: 'white'
                }}
            >
                Switch to Autonomous
            </Button>
            <CollectTemperature />
        </div>
    );
};

export default Temperature;