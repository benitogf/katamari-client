import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'samo.js',
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