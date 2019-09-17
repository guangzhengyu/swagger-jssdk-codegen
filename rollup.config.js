import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

export default {
  input: 'lib/main.js',
  output: {
    file: 'dist/index.js',
    format: 'cjs'
  },
  plugins: [
    nodeResolve()
  ]
}
