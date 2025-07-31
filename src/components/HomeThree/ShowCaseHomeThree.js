import React, { useRef, useState } from 'react';
import Slider from 'react-slick';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import 'slick-carousel/slick/slick-theme.css';
import 'slick-carousel/slick/slick.css';
import shape12 from '../../assets/images/shape/shape-12.png';
import shape13 from '../../assets/images/shape/shape-13.png';
import shape14 from '../../assets/images/shape/shape-14.png';
import shape15 from '../../assets/images/shape/shape-15.png';
import showCaseOne from '../../assets/images/showcase-1.png';
import showCaseTwo from '../../assets/images/showcase-2.png';
import showCaseThree from '../../assets/images/showcase-3.png';
import showCaseFour from '../../assets/images/showcase-4.png';
import showCaseFive from '../../assets/images/showcase-5.png';

function ShowCaseHomeThree() {
    const sliderRef = useRef();
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    const images = [
        { src: showCaseOne },
        { src: showCaseTwo },
        { src: showCaseThree },
        { src: showCaseFour },
        { src: showCaseFive },
    ];

    const openLightbox = (index) => {
        setCurrentIndex(index);
        setLightboxOpen(true);
    };
    // const sliderNext = () => {
    //     sliderRef.current.slickNext();
    // };
    // const sliderPrev = () => {
    //     sliderRef.current.slickPrev();
    // };
    const settings = {
        autoplay: false,
        arrows: false,
        dots: true,
        slidesToShow: 4,
        responsive: [
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 3,
                },
            },
            {
                breakpoint: 480,
                settings: {
                    slidesToShow: 1,
                },
            },
        ],
    };
    return (
        <>
            <section className="appie-showcase-area">
                <div className="container">
                    <div className="row">
                        <div className="col-lg-12">
                            <div className="appie-section-title text-center">
                                <h3 className="appie-title">Creative app showcase</h3>
                                <p>The app provides design and digital marketing.</p>
                            </div>
                        </div>
                    </div>
                    <div className="row appie-showcase-slider">
                        <div className="col-lg-12">
                            <Slider ref={sliderRef} {...settings}>
                                {images.map((image, index) => (
                                    <div key={index}>
                                        <div className="appie-showcase-item mt-30">
                                            <a 
                                                className="appie-image-popup"
                                                onClick={() => openLightbox(index)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <img src={image.src} alt="" />
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </Slider>
                        </div>
                    </div>
                </div>
                <div className="showcase-shape-1">
                    <img src={shape14} alt="" />
                </div>
                <div className="showcase-shape-2">
                    <img src={shape13} alt="" />
                </div>
                <div className="showcase-shape-3">
                    <img src={shape12} alt="" />
                </div>
                <div className="showcase-shape-4">
                    <img src={shape15} alt="" />
                </div>
            </section>
            
            <Lightbox
                open={lightboxOpen}
                close={() => setLightboxOpen(false)}
                slides={images}
                index={currentIndex}
            />
        </>
    );
}

export default ShowCaseHomeThree;
