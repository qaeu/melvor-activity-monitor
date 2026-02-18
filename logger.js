/**
 * Logger utility for Activity Monitor
 */
class ConsoleLogger {
    constructor() {
        this.prefix = '[Activity Monitor]';
        this.config = null;
    }
    setConfig(config) {
        this.config = config;
    }
    debug(...args) {
        // Only log debug messages when config.debug is true
        if (this.config && this.config.debug) {
            console.log(this.prefix, '[DEBUG]', ...args);
        }
    }
    info(...args) {
        console.log(this.prefix, '[INFO]', ...args);
    }
    warn(...args) {
        console.warn(this.prefix, '[WARN]', ...args);
    }
    error(...args) {
        console.error(this.prefix, '[ERROR]', ...args);
    }
}
export const logger = new ConsoleLogger();
//# sourceMappingURL=logger.js.map