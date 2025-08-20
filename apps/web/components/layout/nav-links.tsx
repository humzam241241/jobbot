import { Home, Bot, Globe, ClipboardList, Library, Users, Settings, Coins, FileText } from 'lucide-react';
import { pathOf } from "@/lib/routes";

// Define NavItem type
export type NavItem = { 
  label: string; 
  href: string; 
  icon: React.ReactNode; 
  adminOnly?: boolean;
  showInLibrary?: boolean;
};

// Define navigation items
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",     href: pathOf("dashboard"),    icon: <Home className="h-4 w-4" /> },
  { label: "JobBot",        href: pathOf("jobbot"),       icon: <Bot className="h-4 w-4" /> },
  { label: "Scraper",       href: pathOf("scraper"),      icon: <Globe className="h-4 w-4" /> },
  { label: "Applications",  href: pathOf("applications"), icon: <ClipboardList className="h-4 w-4" /> },
  { label: "Library",       href: pathOf("library"),      icon: <Library className="h-4 w-4" /> },
  { 
    label: "File Manager",  
    href: pathOf("fileManager"),  
    icon: <FileText className="h-4 w-4" />,
    showInLibrary: true
  },
  { label: "Tokens",        href: pathOf("tokens"),       icon: <Coins className="h-4 w-4" /> },
  { label: "Admin Users",   href: pathOf("adminUsers"),   icon: <Users className="h-4 w-4" />, adminOnly: true },
  { label: "Settings",      href: pathOf("settings"),     icon: <Settings className="h-4 w-4" /> },
];
