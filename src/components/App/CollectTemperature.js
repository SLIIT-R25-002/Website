const CollectTemperature = () => {
    const texxt = 'ssd';
    return (
        <div style={{ padding: '20px', backgroundColor: '#f0f2f5', borderRadius: '8px' }}>
            <h2>Collect Temperature</h2>
            <p>Use the thermal camera to capture temperature data.</p>
            <p>Ensure the camera is properly calibrated and positioned for accurate readings.</p>
            <p>Follow the on-screen instructions to complete the temperature collection process.</p>
            {texxt}
        </div>
    );
};

export default CollectTemperature;
