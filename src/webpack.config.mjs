import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import webpack from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { merge } from 'webpack-merge';
import baseConfig from '@splunk/webpack-configs/base.config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distFolder = path.resolve(__dirname, '..', 'dist');

const config = merge(baseConfig.default, {
    entry: {
        whiteboard: './web/index.jsx',
    },
    output: {
        filename: '[name].bundle.js',
        chunkFilename: '[name].[contenthash].chunk.js',
        path: path.join(distFolder, 'appserver', 'static'),
        publicPath: 'auto',
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
            {
                test: /\.(png|svg|jpg|jpeg|gif|woff2?|ttf|otf)$/i,
                type: 'asset/inline',
            },
            {
                test: /\.excalidrawlib$/i,
                type: 'json',
            },
        ],
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.join(__dirname, 'package'),
                    to: path.join(__dirname, '..', 'dist'),
                },
            ],
        }),
        // Excalidraw 0.17 references process.env.IS_PREACT and process.env.NODE_ENV
        // at runtime; Webpack 5 no longer polyfills Node globals, so we substitute them.
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
            'process.env.IS_PREACT': JSON.stringify('false'),
        }),
        new webpack.ProvidePlugin({
            process: 'process/browser.js',
        }),
    ],
    resolve: {
        extensions: ['.js', '.jsx', '.json'],
        fallback: { querystring: false },
    },
    optimization: {
        splitChunks: false,
        runtimeChunk: false,
    },
});

export default config;
