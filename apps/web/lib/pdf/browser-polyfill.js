// Polyfills for browser APIs needed by pdfjs-dist in Node.js environment

// DOMMatrix polyfill
if (typeof DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    constructor(transform) {
      // Simple implementation that's enough for pdfjs to work
      this.a = 1; this.b = 0;
      this.c = 0; this.d = 1;
      this.e = 0; this.f = 0;
      
      if (transform && typeof transform === 'string') {
        // Parse matrix() or translate() CSS transforms
        const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
        if (matrixMatch && matrixMatch[1]) {
          const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
          if (values.length === 6) {
            [this.a, this.b, this.c, this.d, this.e, this.f] = values;
          }
        }
        
        const translateMatch = transform.match(/translate\(([^)]+)\)/);
        if (translateMatch && translateMatch[1]) {
          const values = translateMatch[1].split(',').map(v => parseFloat(v.trim()));
          if (values.length >= 1) {
            this.e = values[0];
            if (values.length >= 2) {
              this.f = values[1];
            }
          }
        }
      } else if (transform && transform.length === 6) {
        // Handle numeric array input
        [this.a, this.b, this.c, this.d, this.e, this.f] = transform;
      }
    }
    
    // Basic transformation methods
    translate(x, y) {
      return new DOMMatrix([this.a, this.b, this.c, this.d, this.e + x, this.f + y]);
    }
    
    scale(scaleX, scaleY) {
      scaleY = scaleY === undefined ? scaleX : scaleY;
      return new DOMMatrix([
        this.a * scaleX, this.b * scaleX,
        this.c * scaleY, this.d * scaleY,
        this.e, this.f
      ]);
    }
    
    multiply(other) {
      return new DOMMatrix([
        this.a * other.a + this.c * other.b,
        this.b * other.a + this.d * other.b,
        this.a * other.c + this.c * other.d,
        this.b * other.c + this.d * other.d,
        this.a * other.e + this.c * other.f + this.e,
        this.b * other.e + this.d * other.f + this.f
      ]);
    }
    
    inverse() {
      const det = this.a * this.d - this.b * this.c;
      if (Math.abs(det) < 1e-10) {
        throw new Error("Matrix is not invertible");
      }
      
      const invDet = 1 / det;
      return new DOMMatrix([
        this.d * invDet, -this.b * invDet,
        -this.c * invDet, this.a * invDet,
        (this.c * this.f - this.d * this.e) * invDet,
        (this.b * this.e - this.a * this.f) * invDet
      ]);
    }
    
    // Getters for transform values
    get isIdentity() {
      return (
        this.a === 1 && this.b === 0 &&
        this.c === 0 && this.d === 1 &&
        this.e === 0 && this.f === 0
      );
    }
  };
}

// DOMMatrixReadOnly polyfill if needed
if (typeof DOMMatrixReadOnly === 'undefined') {
  global.DOMMatrixReadOnly = global.DOMMatrix;
}

// Path2D polyfill (minimal implementation)
if (typeof Path2D === 'undefined') {
  global.Path2D = class Path2D {
    constructor() {
      this.commands = [];
    }
    
    moveTo(x, y) {
      this.commands.push(['moveTo', x, y]);
    }
    
    lineTo(x, y) {
      this.commands.push(['lineTo', x, y]);
    }
    
    arc(x, y, radius, startAngle, endAngle, anticlockwise) {
      this.commands.push(['arc', x, y, radius, startAngle, endAngle, anticlockwise]);
    }
    
    rect(x, y, width, height) {
      this.commands.push(['rect', x, y, width, height]);
    }
    
    closePath() {
      this.commands.push(['closePath']);
    }
  };
}

// ImageData polyfill
if (typeof ImageData === 'undefined') {
  global.ImageData = class ImageData {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

// TextDecoder polyfill (if needed)
if (typeof TextDecoder === 'undefined') {
  const { TextDecoder: NodeTextDecoder } = require('util');
  global.TextDecoder = NodeTextDecoder;
}

// TextEncoder polyfill (if needed)
if (typeof TextEncoder === 'undefined') {
  const { TextEncoder: NodeTextEncoder } = require('util');
  global.TextEncoder = NodeTextEncoder;
}

// URL polyfill (if needed)
if (typeof URL === 'undefined') {
  global.URL = require('url').URL;
}

// HTMLCanvasElement stub (for server-side rendering)
if (typeof HTMLCanvasElement === 'undefined') {
  global.HTMLCanvasElement = class HTMLCanvasElement {};
}

// OffscreenCanvas stub
if (typeof OffscreenCanvas === 'undefined') {
  global.OffscreenCanvas = class OffscreenCanvas {
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }
    
    getContext() {
      return null;
    }
  };
}

module.exports = {
  // Export any utilities if needed
};
