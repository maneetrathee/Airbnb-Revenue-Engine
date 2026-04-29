import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";

const DashboardLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content — full width on mobile, offset on desktop */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <Topbar />
        {/* pb-20 on mobile so content clears the bottom nav */}
        <main className="flex-1 p-4 md:p-8 pb-24 lg:pb-8">{children}</main>
      </div>

      {/* Bottom nav — mobile only */}
      <MobileNav />
    </div>
  );
};

export default DashboardLayout;
