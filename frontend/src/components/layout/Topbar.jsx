import { useState } from "react";
import { Bell, X } from "lucide-react";
import { useUser } from "@clerk/clerk-react";

const MOCK_NOTIFICATIONS = [];

export default function Topbar() {
  const { user } = useUser();
  const [notifOpen, setNotifOpen] = useState(false);

  const initials = user?.firstName?.[0]?.toUpperCase() ?? "U";
  const name = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : "Lead Engineer";

  const hasNotifs = MOCK_NOTIFICATIONS.length > 0;

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 transition-colors duration-300">
      <div className="lg:hidden flex items-center gap-2">
        <div className="w-7 h-7 bg-[#FF385C] rounded-lg flex items-center justify-center font-bold text-white text-sm">
          R
        </div>
        <span className="text-base font-bold tracking-tight text-gray-900 dark:text-white">
          RevEngine
        </span>
      </div>

      <div className="flex items-center gap-1 relative">
        <div className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
          >
            <Bell size={18} />
            {hasNotifs && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FF385C] rounded-full" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                  Notifications
                </span>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X size={15} />
                </button>
              </div>
              {hasNotifs ? (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-72 overflow-y-auto">
                  {MOCK_NOTIFICATIONS.map((n) => (
                    <li
                      key={n.id}
                      className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {n.body}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-8 text-center">
                  <Bell
                    size={28}
                    className="mx-auto text-gray-300 dark:text-gray-600 mb-2"
                  />
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    No notifications
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2 ml-1 pl-2 border-l border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 bg-[#FF385C] rounded-full flex items-center justify-center text-white text-sm font-bold">
            {initials}
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-none">
              {name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Admin Workspace</p>
          </div>
        </div>
      </div>
    </header>
  );
}
