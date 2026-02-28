import { Bell, Search } from "lucide-react";
import { UserButton } from "@clerk/clerk-react";

const Topbar = () => {
  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Global Search */}
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search properties or postcodes..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-400 hover:text-gray-600 relative transition-colors">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand rounded-full border border-white"></span>
        </button>

        <div className="w-px h-6 bg-gray-200 mx-2"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <div className="text-sm font-bold text-gray-900">Lead Engineer</div>
            <div className="text-xs text-gray-500 font-medium">
              Admin Workspace
            </div>
          </div>

          {/* Clerk's pre-built interactive user profile and logout button */}
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-50 border border-gray-200 hover:shadow-md transition-all">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
