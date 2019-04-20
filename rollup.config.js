import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'Samo.js',
  output: {
    name: 'Samo',
    file: 'bundle.js',
    format: 'iife'
  },
  plugins: [
    resolve(),
    commonjs()
  ]
};