import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const NavBar = () => {
  const [activeSection, setActiveSection] = useState("home");
  const [isScrolled, setIsScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "overview", label: "Overview" },
    {
      id: "project-scope",
      label: "Project Scope",
      dropdown: [
        { id: "literature", label: "Literature" },
        { id: "research-gap", label: "Research Gap" },
        { id: "research-problem", label: "Research Problem" },
        { id: "research-objectives", label: "Research Objectives" },
        { id: "methodology", label: "Methodology" },
        { id: "tools-and-technologies", label: "Tools and Technologies" },
      ],
    },
    { id: "milestones", label: "Milestones" },
    { id: "downloads", label: "Downloads" },
    { id: "achievements", label: "Achievements" },
    { id: "team", label: "Team" },
    { id: "contact", label: "Contact" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      // Determine active section
      const sections = navItems.flatMap((item) => {
        if (item.dropdown?.length > 0) {
          return item.dropdown?.map((d) => document.getElementById(d.id)) || [];
        }

        return [document.getElementById(item.id)];
      });

      const flatNavItems = navItems.flatMap((item) => {
        if (item.dropdown?.length > 0) {
          return item.dropdown?.map((d) => d) || [];
        }

        return [item];
      });

      const scrollPosition = window.scrollY + 100;

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(flatNavItems[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80;
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: "smooth",
      });
    }
  };

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${
        isScrolled ? "bg-white shadow-lg" : "bg-transparent"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <button
            onClick={() => scrollToSection("home")}
            className="transition-colors duration-500 group flex flex-col items-start -my-1"
          >
            <div className="text-3xl font-bold leading-none mb-0.5">
              <span
                className={`transition-colors duration-500 ${
                  isScrolled
                    ? "text-gray-900 group-hover:text-gray-700"
                    : "text-white group-hover:text-gray-100"
                }`}
              >
                HEAT
              </span>
              <span
                className={`transition-colors duration-500 ${
                  isScrolled
                    ? "text-primary-600 group-hover:text-primary-700"
                    : "text-primary-500 group-hover:text-primary-400"
                }`}
              >
                SCAPE
              </span>
            </div>
            <div
              className={`text-[0.6rem] font-medium tracking-widest uppercase transition-colors duration-500 ${
                isScrolled
                  ? "text-gray-600 group-hover:text-gray-800"
                  : "text-white/80 group-hover:text-white"
              }`}
            >
              Urban Heat Intelligence System
            </div>
          </button>

          <div className="hidden md:flex space-x-1">
            {navItems.map((item) =>
              item.dropdown ? (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => setDropdownOpen(true)}
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <button
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-500 flex items-center ${
                      activeSection &&
                      item.dropdown.some((d) => d.id === activeSection)
                        ? isScrolled
                          ? "text-primary-600 bg-primary-50"
                          : "text-white bg-white/20 backdrop-blur-sm"
                        : isScrolled
                        ? "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                        : "text-white/90 hover:text-white hover:bg-white/10"
                    }`}
                    tabIndex={0}
                  >
                    {item.label}
                    <svg
                      className="ml-1 w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <div className={`absolute left-0 mt-0 w-56 h-2`} />
                  <div
                    className={`absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg z-50 transition-all duration-300 ${
                      dropdownOpen
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <div className="py-2">
                      {item.dropdown.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setDropdownOpen(false);
                            scrollToSection(sub.id);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                            activeSection === sub.id
                              ? "text-primary-600 bg-primary-50"
                              : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-500 ${
                    activeSection === item.id
                      ? isScrolled
                        ? "text-primary-600 bg-primary-50"
                        : "text-white bg-white/20 backdrop-blur-sm"
                      : isScrolled
                      ? "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </button>
              )
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => {
                const mobileMenu = document.getElementById("mobile-menu");
                mobileMenu.classList.toggle("hidden");
              }}
              className={`transition-colors duration-500 ${
                isScrolled
                  ? "text-gray-700 hover:text-primary-600"
                  : "text-white hover:text-primary-300"
              }`}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        id="mobile-menu"
        className={`hidden md:hidden border-t transition-all duration-500 ${
          isScrolled ? "bg-white" : "bg-gray-900/95 backdrop-blur-md"
        }`}
      >
        <div className="px-2 pt-2 pb-3 space-y-1">
          {navItems.map((item) =>
            item.dropdown ? (
              <div key={item.id} className="space-y-1">
                {/* Dropdown Toggle Button */}
                <button
                  onClick={() => {
                    const dropdown = document.getElementById(
                      `mobile-dropdown-${item.id}`
                    );
                    dropdown.classList.toggle("hidden");
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-base font-medium transition-all duration-300 ${
                    activeSection &&
                    item.dropdown.some((d) => d.id === activeSection)
                      ? isScrolled
                        ? "text-primary-600 bg-primary-50"
                        : "text-white bg-white/20"
                      : isScrolled
                      ? "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Items */}
                <div
                  id={`mobile-dropdown-${item.id}`}
                  className="hidden bg-white rounded-md shadow-lg overflow-hidden"
                >
                  {item.dropdown.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        scrollToSection(sub.id);
                        document
                          .getElementById("mobile-menu")
                          .classList.add("hidden");
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm font-medium transition-colors duration-150 ${
                        activeSection === sub.id
                          ? "text-primary-600 bg-primary-50"
                          : "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                key={item.id}
                onClick={() => {
                  scrollToSection(item.id);
                  document
                    .getElementById("mobile-menu")
                    .classList.add("hidden");
                }}
                className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-all duration-300 ${
                  activeSection === item.id
                    ? isScrolled
                      ? "text-primary-600 bg-primary-50"
                      : "text-white bg-white/20"
                    : isScrolled
                    ? "text-gray-700 hover:text-primary-600 hover:bg-gray-50"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            )
          )}
        </div>
      </div>
    </motion.nav>
  );
};

export default NavBar;
