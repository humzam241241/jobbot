export const STYLE_GUIDE = {
  page: { 
    marginsInches: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 } 
  },
  fonts: { 
    baseFamily: "Calibri, Arial, Helvetica", 
    baseSizePt: 11.5, 
    headingSizePt: 13.5 
  },
  spacing: { 
    line: 1.12, 
    sectionTopPt: 6, 
    sectionBottomPt: 2, 
    bulletGapPt: 1 
  },
  bullets: { 
    prefix: "•", 
    maxWords: 22, 
    minWords: 10, 
    avoidStopWords: true 
  },
  header: { 
    nameSizePt: 18, 
    bold: true, 
    includeLinks: true 
  },
  rules: {
    singleColumn: true, 
    tables: false, 
    images: false, 
    hyphenation: false,
    dateFormat: "MMM YYYY", 
    keepToOnePage: true, 
    allowTwoPagesCL: true
  }
};
