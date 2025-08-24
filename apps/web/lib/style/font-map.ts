type MapEntry = { family: string; faces: { weight: number; file: string }[] };

export const FONT_MAP: Record<string, MapEntry> = {
  // Proprietary → substitutes
  "Calibri": {
    family: "Carlito",
    faces: [
      { weight: 400, file: "/fonts/Carlito-Regular.ttf" },
      { weight: 600, file: "/fonts/Carlito-Bold.ttf" }
    ]
  },
  "Cambria": {
    family: "Caladea",
    faces: [
      { weight: 400, file: "/fonts/Caladea-Regular.ttf" },
      { weight: 600, file: "/fonts/Caladea-Bold.ttf" }
    ]
  },
  "Arial": {
    family: "LiberationSans",
    faces: [
      { weight: 400, file: "/fonts/LiberationSans-Regular.ttf" },
      { weight: 600, file: "/fonts/LiberationSans-Bold.ttf" }
    ]
  },
  "Helvetica": {
    family: "LiberationSans",
    faces: [
      { weight: 400, file: "/fonts/LiberationSans-Regular.ttf" },
      { weight: 600, file: "/fonts/LiberationSans-Bold.ttf" }
    ]
  },
  "Times New Roman": {
    family: "LiberationSerif",
    faces: [
      { weight: 400, file: "/fonts/LiberationSerif-Regular.ttf" },
      { weight: 600, file: "/fonts/LiberationSerif-Bold.ttf" }
    ]
  },

  // Open families (often used)
  "Inter": {
    family: "Inter",
    faces: [
      { weight: 400, file: "/fonts/Inter-Regular.ttf" },
      { weight: 600, file: "/fonts/Inter-SemiBold.ttf" }
    ]
  },
  "Open Sans": {
    family: "OpenSans",
    faces: [
      { weight: 400, file: "/fonts/OpenSans-Regular.ttf" },
      { weight: 600, file: "/fonts/OpenSans-SemiBold.ttf" }
    ]
  },
  "Lato": {
    family: "Lato",
    faces: [
      { weight: 400, file: "/fonts/Lato-Regular.ttf" },
      { weight: 600, file: "/fonts/Lato-Bold.ttf" }
    ]
  },
  "Roboto": {
    family: "Roboto",
    faces: [
      { weight: 400, file: "/fonts/Roboto-Regular.ttf" },
      { weight: 600, file: "/fonts/Roboto-Bold.ttf" }
    ]
  }
};

export function resolveFamily(preferred: string | undefined): MapEntry {
  if (preferred && FONT_MAP[preferred]) return FONT_MAP[preferred];
  // Fallback chain
  return FONT_MAP["Inter"];
}
