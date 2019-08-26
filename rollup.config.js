import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';

export default {
  input: 'katamari.js',
  output: {
    name: 'Katamari',
    file: 'bundle.js',
    format: 'iife'
  },
  plugins: [
    resolve(),
    commonjs()
  ]
};