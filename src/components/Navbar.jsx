import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 p-6 h-24"> {/* <-- h-24 sets height = 96px */}
      <div className="flex justify-between items-center max-w-7xl mx-auto h-full">
        {/* Logo Area */}
        <div className="flex items-center">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-[#A8E6CE] drop-shadow-lg"
              style={{ filter: 'drop-shadow(0 0 8px rgba(168, 230, 206, 0.6))' }}
            >
              <path
                d="M12 2L13.09 8.26L19 7L14.74 12L19 17L13.09 15.74L12 22L10.91 15.74L5 17L9.26 12L5 7L10.91 8.26L12 2Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex space-x-10">
          <Link
            to="/"
            className="text-[#A8E6CE] hover:text-[#A8E6CE] transition-colors duration-300 text-base font-medium"
            style={{
              fontFamily: 'Inter, sans-serif',
              textShadow: '0 0 10px rgba(168, 230, 206, 0.8), 0 0 20px rgba(168, 230, 206, 0.4)',
              filter: 'drop-shadow(0 0 6px rgba(168, 230, 206, 0.6))'
            }}
          >
            Home
          </Link>

          <Link
            to="/dashboard"
            className="text-[#A8E6CE] hover:text-[#A8E6CE] transition-colors duration-300 text-base font-medium"
            style={{
              fontFamily: 'Inter, sans-serif',
              textShadow: '0 0 10px rgba(168, 230, 206, 0.8), 0 0 20px rgba(168, 230, 206, 0.4)',
              filter: 'drop-shadow(0 0 6px rgba(168, 230, 206, 0.6))'
            }}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
