// Types improved by ts-improve-types
/**
 * Type declarations for third-party libraries
 */

// Declare the LZString module
declare var LZString: {
  compressToBase64(input: string): string;
  decompressFromBase64(input: string): string | null;
  compressToUTF16(input: string): string;
  decompressFromUTF16(input: string): string | null;
  compressToUint8Array(input: string): Uint8Array;
  decompressFromUint8Array(input: Uint8Array): string | null;
  compressToEncodedURIComponent(input: string): string;
  decompressFromEncodedURIComponent(input: string): string | null;
  compress(input: string): string;
  decompress(input: string): string | null;
};

// Declare the JSONFormatter
declare class JSONFormatter {
  constructor(
    data: any[] | Record<string, unknown>,
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
  openAtDepth(depth: number): void;
  closeAtDepth(depth: number): void;
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