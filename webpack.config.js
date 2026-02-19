const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = {
	mode: 'production',
	entry: {
		setup: './setup.js',
		config: './config.js',
		logger: './logger.js',
		compression: './compression.js',
		settings: './settings.js',
		capture: './capture.js',
		storage: './storage.js',
		'ui/index': './ui/index.js',
		'ui/components/NotificationCard': './ui/components/NotificationCard.js',
		'ui/components/NotificationPanel':
			'./ui/components/NotificationPanel.js',
	},
	experiments: {
		outputModule: true,
	},
	resolve: {
		extensions: ['.tsx', '.ts', '.js'],
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		library: {
			type: 'module',
		},
		clean: true,
	},
	optimization: {
		minimize: true,
		minimizer: [
			new TerserPlugin({
				terserOptions: {
					compress: {
						drop_console: false,
					},
					format: {
						comments: false,
					},
				},
				extractComments: false,
			}),
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: [
				{ from: 'manifest.json', to: 'manifest.json' },
				{ from: 'libs', to: 'libs' },
				{ from: 'assets', to: 'assets' },
				{ from: 'ui/styles.css', to: 'ui/styles.css' },
			],
		}),
	],
	module: {
		generator: {
			'asset/resource': {
				publicPath: 'img/',
				outputPath: 'img/',
				filename: '[name][ext]',
			},
		},
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/i,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.(png|svg|jpg|jpeg|gif)$/i,
				type: 'asset/resource',
			},
		],
	},
};
