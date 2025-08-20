export const routes = {
  home: "/dashboard",
  dashboard: "/dashboard", 
  jobbot: "/jobbot",
  scraper: "/scraper",
  applications: "/applications",
  library: "/library",
  fileManager: "/file-manager",
  adminUsers: "/admin/users",
  settings: "/settings",
  tokens: "/tokens",
  login: "/login",
  generate: "/generate",
} as const;

export type AppRouteKey = keyof typeof routes;
export const pathOf = (k: AppRouteKey) => routes[k];
