import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes as RouterRoutes, Route } from 'react-router-dom';
// import AboutUs from './components/AboutUs';
// import AboutUsTwo from './components/AboutUs/AboutUsTwo';
// import Contact from './components/Contact';
import Error from './components/Error';
import Loader from './components/Helper/Loader';
import ScrollToTop from './components/Helper/ScrollToTop';
// import HomeDark from './components/HomeDark';
// import HomeEight from './components/HomeEight';
// import HomeFive from './components/HomeFive';
// import HomeFour from './components/HomeFour';
// import HomeOne from './components/HomeOne';
// import HomeRtl from './components/HomeRtl';
// import HomeSeven from './components/HomeSeven';
// import HomeSix from './components/HomeSix';
// import HomeThree from './components/HomeThree';
// import Hometwo from './components/HomeTwo';
// import News from './components/News';
// import SingleNews from './components/News/SingleNews';
// import Service from './components/Service';
// import Shops from './components/Shops';
// import ShopDetails from './components/Shops/Details';
import HeatScape from './components/App';
import ModelViewer from './components/SimulationModule/ModelViewer';

function Routes() {
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        window.scrollTo(0, 0);
    });
    useEffect(() => {
        setTimeout(() => {
            setLoading(false);
        }, 2000);
    });
    return (
        <>
            {loading && (
                <div className={`appie-loader ${loading ? 'active' : ''}`}>
                    <Loader />
                </div>
            )}
            <div className={`appie-visible ${loading === false ? 'active' : ''}`}>
                <Router>
                    <ScrollToTop>
                        <RouterRoutes>
                            {/* <Route path="/" element={<HomeOne />} />
                            <Route path="/home-two" element={<Hometwo />} />
                            <Route path="/home-three" element={<HomeThree />} />
                            <Route path="/home-four" element={<HomeFour />} />
                            <Route path="/home-five" element={<HomeFive />} />
                            <Route path="/home-six" element={<HomeSix />} />
                            <Route path="/home-seven" element={<HomeSeven />} />
                            <Route path="/home-eight" element={<HomeEight />} />
                            <Route path="/home-dark" element={<HomeDark />} />
                            <Route path="/home-rtl" element={<HomeRtl />} />
                            <Route path="/news" element={<News />} />
                            <Route path="/news/single-news" element={<SingleNews />} />
                            <Route path="/service" element={<Service />} />
                            <Route path="/about-us" element={<AboutUs />} />
                            <Route path="/contact" element={<Contact />} />
                            <Route path="/error" element={<Error />} />
                            <Route path="/about-us-another" element={<AboutUsTwo />} />
                            <Route path="/shops" element={<Shops />} />
                            <Route path="/shops/shop-details" element={<ShopDetails />} /> */}
                            <Route path="/app" element={<HeatScape />} />
                            <Route path="/modelviewer" element={<ModelViewer />} />
                            <Route path="*" element={<Error />} />
                        </RouterRoutes>
                    </ScrollToTop>
                </Router>
            </div>
        </>
    );
}

export default Routes;
