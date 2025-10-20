import React from 'react';
import useToggle from '../../Hooks/useToggle';
import BackToTop from '../BackToTop';
import Drawer from '../Mobile/Drawer';
import BlogHomeOne from './BlogHomeOne';
import FaqHomeOne from './FaqHomeOne';
import FeaturesHomeOne from './FeaturesHomeOne';
import FooterHomeOne from './FooterHomeOne';
import PricingHomeOne from './PricingHomeOne';
import ProjectHomeOne from './ProjectHomeOne';
import LiteratureSurveyHome from './LiteratureSurveyHome';
import TeamHomeOne from './TeamHomeOne';
import TestimonialHomeOne from './TestimonialHomeOne';
import TrafficHomeOne from './TrafficHomeOne';
import HeroHomeHeatScape from "./HeroHomeHeatScape";
import HomeHeatScapeHeader from "./HomeHeatScapeHeader";

function HomeHeatScape() {
    const [drawer, drawerAction] = useToggle(false);

    return (
        <>
            <Drawer drawer={drawer} action={drawerAction.toggle} />
            <HomeHeatScapeHeader action={drawerAction.toggle} />
            <HeroHomeHeatScape />
            <LiteratureSurveyHome style={{ backgroundColor: '#EEF1F6' }}/>
            <FeaturesHomeOne />
            <TrafficHomeOne />
            <TestimonialHomeOne />
            <TeamHomeOne />
            <PricingHomeOne />
            <FaqHomeOne />
            <BlogHomeOne />
            <ProjectHomeOne />
            <FooterHomeOne />
            <BackToTop />
        </>
    );
}

export default HomeHeatScape;
