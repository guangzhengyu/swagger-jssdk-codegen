import { upperFirst } from 'lodash-es'

export function renderDts (apis, defs) {
  return `${renderDefinitions(defs)}
  ${renderInterfaceFunctions(apis)}
  ${apis.map(api => renderParamDefs(`Param_${api.name}`, api.parameters)).join('\n')}
  interface SwaggerApi {
    ${apis.map(api => `${api.name}: ${api.name}`)}
  }
  declare const swaggerApi: SwaggerApi
  export default swaggerApi
  `
}

function renderDefinitions (defs) {
  return defs
    .map(def => (def.type === 'object' ? interfaceTemplate(def) : typeTemplate(def)) + '\n')
    .join('')
}

function renderInterfaceFunctions (apis) {
  return apis.map(functionInterfaceTemplate).join('\n')
}

function functionInterfaceTemplate (api) {
  const { name, parameters, responses } = api
  return `interface ${name} {
    ${
    hasParam()
      ? `/**
      * @param param
      ${parameters.map(paramJsdocTemplate).join('\n')}
      */`
      : ''}
    
    (${hasParam() ? `param: Param_${name}` : ''}): Promise<{data: ${responses ? typeValue(responses): '{}'}}>
  }
  export const ${name}: ${name}`

  function hasParam () {
    return parameters.filter(param => param.in !== 'header').length > 0
  }
}

export function renderImpl (apis, defs) {
  return `${apis.map(functionImplTemplate).join('\n')}
  const nameDict = ${JSON.stringify(mapAllNames(apis, defs))}
  function extract (source = {}, keys = []) {
    const result = {}
    keys.forEach((key) => {
      if (source[key] !== undefined ) result[nameDict[key] || key] = source[key]
    })
    return result
  }`
}

function mapAllNames (apis, defs) {
  const result = {}
  assign(Array.prototype.concat.apply(defs, apis.map(api => api.parameters)))
  return result

  function assign (props) {
    props.forEach(prop => {
      if (prop.props) assign(prop.props)
      else if (prop.name !== prop.camelCaseName && prop.in !== 'path') result[prop.camelCaseName] = prop.name
    })
  }
}

function functionImplTemplate (api) {
  const url = api.path.replace(/{(\w+)}/g, '${$1}')
  const headers = paramsIn('header')
  const params = paramsIn('query')
  const body = paramsIn('body')[0] || {}
  return `export function ${api.name} (arg = {}, config = {}) {
        ${renderAssignment(body.props, `arg.${body.camelCaseName}`, 'data')}
        ${renderAssignment(params, 'arg', 'params')}
        ${renderAssignment(headers, 'arg', 'headers')}
        ${renderPathAssignment(paramsIn('path'), 'arg')}
        return this.request({ 
          ...config, 
          url: \`${url}\`, 
          method: '${api.method}'${renderConfigs({ params, headers, body })}
        })
      }`

  function paramsIn (..._in) {
    return api.parameters.filter(param => _in.includes(param.in))
  }
}

function renderAssignment (params, from, to) {
  if (!params || params.length === 0) return ''
  return `const ${to} = extract(${from}, ${nameOf(params)})`
}

function renderPathAssignment (paramsInPath, from) {
  if (paramsInPath.length === 0) return ''
  return `const { ${paramsInPath.map(({ name, camelCaseName }) => name === camelCaseName ? `${name}` : `${camelCaseName}: ${name}`).join(',')}} = ${from}`
}

function renderConfigs ({ params, headers, body }) {
  let result = ''
  if (body && body.camelCaseName) result += ',\ndata'
  if (params && params.length > 0) result += ',\nparams: {...config.params, ...params}'
  if (headers && headers.length > 0) result += ',\nheaders: {...config.headers, ...headers}'
  return result
}

function nameOf (params) {
  return JSON.stringify(params.map(param => param.camelCaseName))
}

function interfaceTemplate (def, name) {
  const objToRefProps = filter('object').map(prop => toRefProp(prop, def.name + upperFirst(prop.name)))
  const allProps = objToRefProps.concat(filter('object', true))
  return `${objToRefProps.map(prop => interfaceTemplate(prop, prop.ref)).join('\n')}
  /**
  ${allProps.map(propertyJsdocTemplate).join('\n')}
  */
  interface  ${name || def.name} {
    ${renderProps(allProps)}
  }`

  function filter (type, opposite = false) {
    return def.props.filter(prop => opposite ? prop.type !== type : prop.type === type)
  }
}

function toRefProp (prop, ref) {
  if (prop.type !== 'object') return prop
  return { ...prop, type: 'ref', ref, props: prop.props }
}

function propertyJsdocTemplate (prop) {
  return `* @property {${typeValue(prop)}} ${prop.camelCaseName}`
}

function paramJsdocTemplate (prop) {
  return `* @param {${typeValue(prop)}} ${prop.required ? `param.${prop.camelCaseName}` : `[param.${prop.camelCaseName}]`}`
}

function typeTemplate (prop) {
  return `type ${prop.name} = ${typeValue(prop)}`
}

function renderParamDefs (name, parameters) {
  return interfaceTemplate({ props: parameters, name })
}

function typeValue (prop) {
  switch (prop.type) {
    case 'ref':
      return `${prop.ref}${arrSuffix(prop)}`
    case 'object':
      return `{
        ${renderProps(prop.props)}
      }${arrSuffix(prop)}`
    case 'enum':
      return `${enumValue(prop.enum)}`
    default:
      return `${prop.type}${arrSuffix(prop)}`
  }
}

function renderProps (props) {
  if (!props || props.length === 0) return ''
  return props
    .map(prop => `${prop.camelCaseName || prop.name}${requiredMark(prop)}: ${typeValue(prop)}`)
    .join('\n')

  function requiredMark (prop) {
    // header里的参数不强制，因为会有interceptor统一注入
    if (prop.in === 'header') return '?'
    if (prop.required !== undefined) return prop.required ? '' : '?'
    return ''
  }
}

function enumValue (enums) {
  return enums.map(e => `'${e}'`).join('|')
}

function arrSuffix (def) {
  return def.isArray ? '[]' : ''
}
