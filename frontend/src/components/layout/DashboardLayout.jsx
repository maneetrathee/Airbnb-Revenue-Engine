import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Sidebar — desktop always visible */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-8 pb-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
