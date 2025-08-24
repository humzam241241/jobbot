import { TextItem, Block, Rect } from './types';
import _ from 'lodash';

/**
 * Group text items into lines based on y-position proximity
 * @param textItems Array of text items
 * @returns Map of lineId to array of text items
 */
export function groupIntoLines(textItems: TextItem[]): Map<string, TextItem[]> {
  // Sort by page and y-position
  const sortedItems = [...textItems].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    return a.y - b.y;
  });
  
  const lines = new Map<string, TextItem[]>();
  let currentLineY = -1;
  let currentLineId = '';
  let currentPage = -1;
  
  // Group items by proximity on y-axis
  for (const item of sortedItems) {
    // If we're on a new page, reset
    if (item.page !== currentPage) {
      currentLineY = -1;
      currentPage = item.page;
    }
    
    // Determine if this item belongs to the current line
    const yTolerance = item.fontSize * 0.5; // Half the font size as tolerance
    const isNewLine = currentLineY === -1 || Math.abs(item.y - currentLineY) > yTolerance;
    
    if (isNewLine) {
      // Create a new line
      currentLineId = `p${item.page}_y${Math.round(item.y)}_${Date.now().toString(36)}`;
      currentLineY = item.y;
      lines.set(currentLineId, []);
    }
    
    // Add the item to the current line
    const lineItems = lines.get(currentLineId) || [];
    lineItems.push({
      ...item,
      lineId: currentLineId
    });
    lines.set(currentLineId, lineItems);
  }
  
  // Sort items within each line by x-position
  for (const [lineId, lineItems] of lines.entries()) {
    lines.set(lineId, lineItems.sort((a, b) => a.x - b.x));
  }
  
  return lines;
}

/**
 * Group lines into blocks based on x-position proximity
 * @param lines Map of lineId to array of text items
 * @returns Array of blocks
 */
export function groupIntoBlocks(lines: Map<string, TextItem[]>): Block[] {
  // Convert map to array of line arrays
  const lineArrays = Array.from(lines.values());
  
  // Group lines by page
  const linesByPage = _.groupBy(lineArrays, lineArray => lineArray[0]?.page);
  
  const blocks: Block[] = [];
  
  // Process each page separately
  for (const [pageStr, pageLines] of Object.entries(linesByPage)) {
    const page = parseInt(pageStr, 10);
    
    // Sort lines by y-position
    const sortedLines = [...pageLines].sort((a, b) => {
      const aY = a[0]?.y || 0;
      const bY = b[0]?.y || 0;
      return aY - bY;
    });
    
    let currentBlock: TextItem[] = [];
    let prevLineY = -1;
    
    // Group lines into blocks based on vertical spacing
    for (const line of sortedLines) {
      if (line.length === 0) continue;
      
      const lineY = line[0].y;
      const lineHeight = line[0].fontSize * 1.2;
      
      // Check if this line is part of the current block
      const verticalGap = prevLineY !== -1 ? lineY - prevLineY : 0;
      const isNewBlock = prevLineY === -1 || verticalGap > lineHeight * 1.8;
      
      if (isNewBlock && currentBlock.length > 0) {
        // Create a new block from the current items
        const blockRect = calculateBoundingRect(currentBlock);
        blocks.push({
          page,
          rect: blockRect,
          lines: currentBlock
        });
        currentBlock = [];
      }
      
      // Add the current line to the block
      currentBlock.push(...line);
      prevLineY = lineY;
    }
    
    // Add the last block if not empty
    if (currentBlock.length > 0) {
      const blockRect = calculateBoundingRect(currentBlock);
      blocks.push({
        page,
        rect: blockRect,
        lines: currentBlock
      });
    }
  }
  
  return blocks;
}

/**
 * Calculate the bounding rectangle for a set of text items
 * @param items Array of text items
 * @returns Bounding rectangle
 */
export function calculateBoundingRect(items: TextItem[]): Rect {
  if (items.length === 0) {
    throw new Error('Cannot calculate bounding rect for empty items array');
  }
  
  const page = items[0].page;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const item of items) {
    minX = Math.min(minX, item.x);
    minY = Math.min(minY, item.y);
    maxX = Math.max(maxX, item.x + item.w);
    maxY = Math.max(maxY, item.y + item.h);
  }
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    page
  };
}

/**
 * Detect columns in a page based on text item positions
 * @param blocks Array of blocks on a page
 * @returns Number of columns detected (1, 2, or 3)
 */
export function detectColumns(blocks: Block[]): 1 | 2 | 3 {
  if (blocks.length < 3) return 1;
  
  // Extract x-positions
  const xPositions = blocks.map(block => block.rect.x);
  
  // Use k-means to cluster x-positions
  const clusters = kMeansClustering(xPositions, 3);
  
  // Count non-empty clusters
  const nonEmptyClusters = clusters.filter(cluster => cluster.length > 0).length;
  
  return nonEmptyClusters as 1 | 2 | 3;
}

/**
 * Simple k-means clustering algorithm
 * @param data Array of data points
 * @param k Number of clusters
 * @returns Array of clusters, each containing indices of data points
 */
function kMeansClustering(data: number[], k: number): number[][] {
  if (data.length <= k) {
    // If we have fewer data points than clusters, each point is its own cluster
    return data.map((_, i) => [i]);
  }
  
  // Initialize centroids
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min;
  
  const centroids = Array.from({ length: k }, (_, i) => min + (range * i) / (k - 1));
  
  // Maximum iterations
  const maxIterations = 10;
  let iterations = 0;
  let previousAssignments: number[] = [];
  
  while (iterations < maxIterations) {
    // Assign each data point to the nearest centroid
    const assignments = data.map(point => {
      const distances = centroids.map(centroid => Math.abs(point - centroid));
      return distances.indexOf(Math.min(...distances));
    });
    
    // Check if assignments have changed
    if (iterations > 0 && _.isEqual(assignments, previousAssignments)) {
      break;
    }
    
    previousAssignments = [...assignments];
    
    // Update centroids
    for (let i = 0; i < k; i++) {
      const clusterPoints = data.filter((_, j) => assignments[j] === i);
      if (clusterPoints.length > 0) {
        centroids[i] = clusterPoints.reduce((sum, p) => sum + p, 0) / clusterPoints.length;
      }
    }
    
    iterations++;
  }
  
  // Create clusters
  const clusters: number[][] = Array.from({ length: k }, () => []);
  previousAssignments.forEach((cluster, i) => {
    clusters[cluster].push(i);
  });
  
  return clusters;
}
