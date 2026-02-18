/// <reference path="../types/melvor.d.ts" />
/**
 * Compression utility using native browser API
 * Requires Chrome 80+, Firefox 113+, Safari 16.4+, Edge 80+
 */
export class CompressionUtil {
	/**
	 * Check if compression is supported in current browser
	 */
	static isSupported() {
		return 'CompressionStream' in window && 'DecompressionStream' in window;
	}
	/**
	 * Compress notification store using DEFLATE
	 */
	static async compress(data) {
		if (!this.isSupported()) {
			logger.warn(
				'CompressionStream not supported - storing uncompressed',
			);
			const json = JSON.stringify(data);
			const encoder = new TextEncoder();
			const compressed = encoder.encode(json);
			return {
				compressed,
				uncompressedSize: json.length,
				version: this.VERSION,
			};
		}
		try {
			const json = JSON.stringify(data);
			const blob = new Blob([json]);
			const stream = blob.stream();
			// Apply DEFLATE compression
			const compressedStream = stream.pipeThrough(
				new CompressionStream('deflate'),
			);
			const compressedBlob = await new Response(compressedStream).blob();
			const arrayBuffer = await compressedBlob.arrayBuffer();
			const compressed = new Uint8Array(arrayBuffer);
			const ratio = ((1 - compressed.length / json.length) * 100).toFixed(
				1,
			);
			logger.debug(
				`Compressed ${json.length} bytes → ${compressed.length} bytes (${ratio}% reduction)`,
			);
			return {
				compressed,
				uncompressedSize: json.length,
				version: this.VERSION,
			};
		} catch (error) {
			logger.error('Compression failed:', error);
			throw error;
		}
	}
	/**
	 * Decompress notification store
	 */
	static async decompress(store) {
		if (!this.isSupported()) {
			logger.warn(
				'DecompressionStream not supported - reading uncompressed',
			);
			const decoder = new TextDecoder();
			const json = decoder.decode(store.compressed);
			return JSON.parse(json);
		}
		try {
			// Create blob from Uint8Array (type assertion needed for strict TS)
			const blob = new Blob([store.compressed]);
			const stream = blob.stream();
			// Apply DEFLATE decompression
			const decompressedStream = stream.pipeThrough(
				new DecompressionStream('deflate'),
			);
			const text = await new Response(decompressedStream).text();
			const result = JSON.parse(text);
			logger.debug(
				`Decompressed ${store.compressed.length} bytes → ${text.length} bytes`,
			);
			return result;
		} catch (error) {
			logger.error('Decompression failed:', error);
			throw error;
		}
	}
	/**
	 * Convert Uint8Array to base64 string for storage.
	 * Processes in 32KB chunks to avoid exceeding the JS engine's maximum
	 * argument count limit when spreading large arrays into String.fromCharCode.
	 */
	static toBase64(data) {
		let binary = '';
		const chunkSize = 0x8000; // 32KB per chunk
		for (let i = 0; i < data.length; i += chunkSize) {
			binary += String.fromCharCode(...data.subarray(i, i + chunkSize));
		}
		return btoa(binary);
	}
	/**
	 * Convert base64 string back to Uint8Array
	 */
	static fromBase64(base64) {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) {
			bytes[i] = binary.charCodeAt(i);
		}
		return bytes;
	}
	/**
	 * Estimate compressed size without actually compressing
	 * Useful for UI display before compression
	 */
	static estimateCompressedSize(data) {
		const json = JSON.stringify(data);
		// Approximate 70% compression ratio based on typical notification data
		return Math.floor(json.length * 0.3);
	}
}
CompressionUtil.VERSION = 1;
//# sourceMappingURL=compression.js.map
