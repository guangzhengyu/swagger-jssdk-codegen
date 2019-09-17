import { renderDts, renderImpl } from './template'
import generateApis, { resolveDefinitions } from './resolver'

const Swagger = require('swagger-client')
const fse = require('fs-extra')
const prettier = require('prettier')
export default function codegen (url, path, name, opts = {}) {
  const { folder = true } = opts
  Swagger(url)
    .then(({ spec }) => {
      const apis = generateApis(spec)
      const defs = resolveDefinitions(spec)
      const format = { semi: false, singleQuote: true }
      let fullPath = `${path}/${name}`
      fse.ensureDir(fullPath, err => {
        if (err) throw err
        if (folder) fullPath += '/index'
        fse.writeFile(`${fullPath}.d.ts`, prettier.format(renderDts(apis, defs), { parser: 'typescript', ...format }), err => {
          if (err) throw err
        })
        fse.writeFile(`${fullPath}.js`, prettier.format(renderImpl(apis, defs), { parser: 'babel', ...format }), err => {
          if (err) throw err
        })
      })
    })
    .catch(err => console.error(err))
}
