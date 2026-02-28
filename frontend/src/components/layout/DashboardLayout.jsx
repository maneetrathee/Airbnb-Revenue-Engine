import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// We pass { children } into the layout now
const DashboardLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area (Offset by the 64-width sidebar = ml-64) */}
      <div className="flex-1 ml-64 flex flex-col">
        <Topbar />

        {/* We render the children (the active page) right here */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
