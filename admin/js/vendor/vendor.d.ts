// Types improved by ts-improve-types
/**
 * Type declarations for third-party libraries
 */

// Declare the LZString module
declare var LZString: {
  compressToBase64(inpu: string): string;
  decompressFromBase64(inpu: string): string | null;
  compressToUTF16(inpu: string): string;
  decompressFromUTF16(inpu: string): string | null;
  compressToUint8Array(inpu: string): Uint8Array;
  decompressFromUint8Array(inpu: Uint8Array): string | null;
  compressToEncodedURIComponent(inpu: string): string;
  decompressFromEncodedURIComponent(inpu: string): string | null;
  compress(inpu: string): string;
  decompress(inpu: string): string | null;
};

// Declare the JSONFormatter
declare class JSONFormatter {
  constructor(
    data[] | Record<string, unknown>,
    open?: number,
    options?: {
      hoverPreviewEnabled?: boolean;
      hoverPreviewArrayCount?: number;
      hoverPreviewFieldCount?: number;
      theme?: string;
      animateOpen?: boolean;
      animateClose?: boolean;
    }
  );
  render(): HTMLElement;
  openAtDepth(dept: number): void;
  closeAtDepth(dept: number): void;
  openAll(): void;
  closeAll(): void;
}

// AMD define function (used in some libraries)
declare function define(
  moduleId: string | string[] | Function,
  dependencies?: string[] | Function,
  factory?: Function
): void;

// Define AMD
declare namespace define {
  export const amd: {
    jQuery?: boolean;
    [key: string]: any;
  };
} 