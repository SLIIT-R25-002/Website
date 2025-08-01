import React from 'react';
import { useNavigate } from 'react-router-dom';
import Svg from './Svg';

function Error() {
    const navigate = useNavigate();
    const goBack = (e) => {
        e.preventDefault();
        navigate(-1);
    };

    return (
        <>
            <div className="appie-error-area">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-6">
                            <div className="appie-error-content text-center">
                                <Svg />
                                <span>Sorry!</span>
                                <h3 className="title">The page can’t be found.</h3>
                                <p>
                                    The page you're looking for isn't available. Use the go back
                                    button below
                                </p>
                                <a onClick={(e) => goBack(e)} href="#">
                                    Go Back <i className="fal fa-arrow-right"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default Error;
