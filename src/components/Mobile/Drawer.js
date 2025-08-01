import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/images/logo.png';

function Drawer({ drawer, action, lang }) {
    const [itemSize, setSize] = useState('0px');
    const [item, setItem] = useState('home');
    const handler = (e, value) => {
        // e.preventDefault();
        const getItems = document.querySelectorAll(`#${value} li`).length;
        if (getItems > 0) {
            setSize(`${43 * getItems}px`);
            setItem(value);
        }
    };
    return (
            lang ? (
                <>
                    <div
                        onClick={(e) => action(e)}
                        className={`off_canvars_overlay ${drawer ? 'active' : ''}`}
                    ></div>
                    <div className="offcanvas_menu">
                        <div className="container-fluid">
                            <div className="row">
                                <div className="col-12">
                                    <div
                                        className={`offcanvas_menu_wrapper ${
                                            drawer ? 'active' : ''
                                        }`}
                                    >
                                        <div className="canvas_close">
                                            <a href="#" onClick={(e) => action(e)}>
                                                <i className="fa fa-times"></i>
                                            </a>
                                        </div>
                                        <div className="offcanvas-brand text-center mb-40">
                                            <img src={logo} alt="" />
                                        </div>
                                        <div id="menu" className="text-left ">
                                            <ul className="offcanvas_main_menu">
                                                <li
                                                    onClick={(e) => handler(e, 'home')}
                                                    id="home"
                                                    className="menu-item-has-children active"
                                                >
                                                    <span className="menu-expand">
                                                        <i className="fa fa-angle-down"></i>
                                                    </span>
                                                    <a href="#">أنا</a>
                                                    <ul
                                                        className="sub-menu"
                                                        style={{
                                                            height:
                                                                item === 'home' ? itemSize : '0px',
                                                        }}
                                                    >
                                                        <li>
                                                            <Link to="/">الصفحة الرئيسية 1</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-two">
                                                                الصفحة الرئيسية 2
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-three">المنزل 3</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-four">المنزل 4</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-five">المنزل 5</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-six">
                                                                الصفحة الرئيسية 6
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-seven">المنزل 7</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-eight">
                                                                الصفحة الرئيسية 8
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-dark">
                                                                الصفحة الرئيسية الظلام
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-rtl">
                                                                الصفحة الرئيسية Rtl
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </li>
                                                <li
                                                    onClick={(e) => handler(e, 'service')}
                                                    id="service"
                                                    className="menu-item-has-children active"
                                                >
                                                    <Link to="/service">خدمة</Link>
                                                </li>
                                                <li
                                                    onClick={(e) => handler(e, 'pages')}
                                                    id="pages"
                                                    className="menu-item-has-children active"
                                                >
                                                    <span className="menu-expand">
                                                        <i className="fa fa-angle-down"></i>
                                                    </span>
                                                    <a href="#">الصفحات</a>
                                                    <ul
                                                        className="sub-menu"
                                                        style={{
                                                            height:
                                                                item === 'pages' ? itemSize : '0px',
                                                        }}
                                                    >
                                                        <ul className="sub-menu">
                                                            <li>
                                                                <Link to="/about-us">عن</Link>
                                                            </li>
                                                            <li>
                                                                <Link to="/error">خطأ</Link>
                                                            </li>
                                                        </ul>
                                                    </ul>
                                                </li>
                                                <li
                                                    onClick={(e) => handler(e, 'news')}
                                                    id="news"
                                                    className="menu-item-has-children active"
                                                >
                                                    <span className="menu-expand">
                                                        <i className="fa fa-angle-down"></i>
                                                    </span>
                                                    <a href="#">أخبار</a>
                                                    <ul
                                                        className="sub-menu"
                                                        style={{
                                                            height:
                                                                item === 'news' ? itemSize : '0px',
                                                        }}
                                                    >
                                                        <ul className="sub-menu">
                                                            <li>
                                                                <Link to="/news">
                                                                    صفحة الأخبار{' '}
                                                                </Link>
                                                            </li>
                                                            <li>
                                                                <Link to="/news/single-news">
                                                                    أخبار واحدة
                                                                </Link>
                                                            </li>
                                                        </ul>
                                                    </ul>
                                                </li>
                                                <li
                                                    onClick={(e) => handler(e, 'contact')}
                                                    id="contact"
                                                    className="menu-item-has-children active"
                                                >
                                                    <Link to="/contact">اتصل</Link>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="offcanvas-social">
                                            <ul className="text-center">
                                                <li>
                                                    <a href="$">
                                                        <i className="fab fa-facebook-f"></i>
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="$">
                                                        <i className="fab fa-twitter"></i>
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="$">
                                                        <i className="fab fa-instagram"></i>
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="$">
                                                        <i className="fab fa-dribbble"></i>
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="footer-widget-info">
                                            <ul>
                                                <li>
                                                    <a href="#">
                                                        <i className="fal fa-envelope"></i>{' '}
                                                        support@appie.com
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="#">
                                                        <i className="fal fa-phone"></i> +(642) 342
                                                        762 44
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="#">
                                                        <i className="fal fa-map-marker-alt"></i>{' '}
                                                        442 Belle Terre St Floor 7, San Francisco,
                                                        AV 4206
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div
                        onClick={(e) => action(e)}
                        className={`off_canvars_overlay ${drawer ? 'active' : ''}`}
                    ></div>
                    <div className="offcanvas_menu">
                        <div className="container-fluid">
                            <div className="row">
                                <div className="col-12">
                                    <div
                                        className={`offcanvas_menu_wrapper ${
                                            drawer ? 'active' : ''
                                        }`}
                                    >
                                        <div className="canvas_close">
                                            <a href="#" onClick={(e) => action(e)}>
                                                <i className="fa fa-times"></i>
                                            </a>
                                        </div>
                                        <div className="offcanvas-brand text-center mb-40">
                                            <img src={logo} alt="" />
                                        </div>
                                        <div id="menu" className="text-left ">
                                            <ul className="offcanvas_main_menu">
                                                <li
                                                    onClick={(e) => handler(e, 'home')}
                                                    id="home"
                                                    className="menu-item-has-children active"
                                                >
                                                    <span className="menu-expand">
                                                        <i className="fa fa-angle-down"></i>
                                                    </span>
                                                    <a href="#">Home</a>
                                                    <ul
                                                        className="sub-menu"
                                                        style={{
                                                            height:
                                                                item === 'home' ? itemSize : '0px',
                                                        }}
                                                    >
                                                        <li>
                                                            <Link to="/">Home 1</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-two">Home 2</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-three">Home 3</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-four">Home 4</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-five">Home 5</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-six">Home 6</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-seven">Home 7</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-eight">Home 8</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-dark">Home Dark</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/home-rtl">Home Rtl</Link>
                                                        </li>
                                                    </ul>
                                                </li>
                                                <li
                                                    onClick={(e) => handler(e, 'service')}
                                                    id="service"
                                                    className="menu-item-has-children active"
                                                >
                                                    <a href="/service">Service</a>
                                                </li>
                                                <li
                                                    onClick={(e) => handler(e, 'pages')}
                                                    id="pages"
                                                    className="menu-item-has-children active"
                                                >
                                                    <span className="menu-expand">
                                                        <i className="fa fa-angle-down"></i>
                                                    </span>
                                                    <a href="#">Pages</a>
                                                    <ul
                                                        className="sub-menu"
                                                        style={{
                                                            height:
                                                                item === 'pages' ? itemSize : '0px',
                                                        }}
                                                    >
                                                        <li>
                                                            <Link to="/about-us">About</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/about-us-another">
                                                                About 2
                                                            </Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/error">Error</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/shops">Shops</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/shops/shop-details">
                                                                Shop details
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </li>
                                                <li
                                                    onClick={(e) => handler(e, 'news')}
                                                    id="news"
                                                    className="menu-item-has-children active"
                                                >
                                                    <span className="menu-expand">
                                                        <i className="fa fa-angle-down"></i>
                                                    </span>
                                                    <a href="#">News</a>
                                                    <ul
                                                        className="sub-menu"
                                                        style={{
                                                            height:
                                                                item === 'news' ? itemSize : '0px',
                                                        }}
                                                    >
                                                        <li>
                                                            <Link to="/news">News Page</Link>
                                                        </li>
                                                        <li>
                                                            <Link to="/news/single-news">
                                                                Single News
                                                            </Link>
                                                        </li>
                                                    </ul>
                                                </li>
                                                <li
                                                    onClick={(e) => handler(e, 'contact')}
                                                    id="contact"
                                                    className="menu-item-has-children active"
                                                >
                                                    <Link to="/contact">Contact</Link>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="offcanvas-social">
                                            <ul className="text-center">
                                                <li>
                                                    <a href="$">
                                                        <i className="fab fa-facebook-f"></i>
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="$">
                                                        <i className="fab fa-twitter"></i>
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="$">
                                                        <i className="fab fa-instagram"></i>
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="$">
                                                        <i className="fab fa-dribbble"></i>
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                        <div className="footer-widget-info">
                                            <ul>
                                                <li>
                                                    <a href="#">
                                                        <i className="fal fa-envelope"></i>{' '}
                                                        support@appie.com
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="#">
                                                        <i className="fal fa-phone"></i> +(642) 342
                                                        762 44
                                                    </a>
                                                </li>
                                                <li>
                                                    <a href="#">
                                                        <i className="fal fa-map-marker-alt"></i>{' '}
                                                        442 Belle Terre St Floor 7, San Francisco,
                                                        AV 4206
                                                    </a>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )
    );
}

export default Drawer;
