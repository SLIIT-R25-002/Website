import React, { useState } from 'react';
import heroThumb from '../../assets/images/heatscape-thumb.png';
import PopupVideo from '../PopupVideo';

function HeroHomeHeatScape() {
    const [showVideo, setVideoValue] = useState(false);
    const handleShowVideo = (e) => {
        e.preventDefault();
        setVideoValue(!showVideo);
    };
    return (
        <>
            {showVideo && (
                <PopupVideo
                    videoSrc="//www.youtube.com/embed/EE7NqzhMDms?autoplay=1"
                    handler={(e) => handleShowVideo(e)}
                />
            )}
            <section className="appie-hero-area appie-hero-3-area">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-10">
                            <div className="appie-hero-content text-center">
                                <h1 className="appie-title">Heat Island Detection and Mitigation System
                                </h1>
                                <p>
                                    Redefining urban living through heat intelligence.
                                </p>
                                <div className="hero-btns center">
                                    <a className="main-btn" href="#">
                                        Get Started
                                    </a>
                                </div>
                                <div
                                    className="thumb mt-100 wow animated fadeInUp"
                                    data-wow-duration="2000ms"
                                    data-wow-delay="400ms"
                                >
                                    <img src={heroThumb} alt="" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

export default HeroHomeHeatScape;
