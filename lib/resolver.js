import { flatMap, find, camelCase } from 'lodash-es'
// import generateApiName from './name'

export default function generateApis (spec) {
  return flatMap(spec.paths, (methods, path) => flatMap(methods, ({ responses, parameters, summary, operationId }, method) => {
    const api = {}
    api.path = spec.basePath + path
    api.method = method
    api.responses = resolveResponses(responses)
    api.parameters = resolveParameters(parameters)
    api.name = operationId
    return api
  }))
}

export function resolveParameters (parameters = []) {
  return parameters.map(param => {
    if (param.in === 'body') {
      return Object.assign(
        mapProperty(param.schema, param.name),
        { in: param.in },
        // 如果body里没有参数必传，那么body也非必传
        { required: param.required && !!param.schema.required },
        param.schema.properties && { props: flatMap(param.schema.properties, mapProperty) }
      )
    }
    return { in: param.in, ...mapProperty(param, param.name, false) }
  })
}

export function resolveResponses (responses = []) {
  // spec.paths -> responses
  const { schema } = find(responses, (resp, statusCode) => isRespSuccess(statusCode)) || {}
  if (!schema) return {}
  return mapProperty(schema)

  function isRespSuccess (statusCode) {
    return statusCode.match(/^2\d{2}$/)
  }
}

export function resolveDefinitions (spec) {
  return Array.prototype.concat.call([], definitions()/*, parameters()*/)

  // spec.definitions
  function definitions () {
    return flatMap(spec.definitions, mapProperty)
  }

  // spec.parameters
  function parameters () {
    return flatMap(spec.parameters, mapProperty)
  }
}

/**
 * @namespace PropertyDefinition
 * @property {'ref'|'object'|'enum'|'number'|'string'} type 属性的类型
 * @property {string} name 属性原本name
 * @property {string} camelCaseName 属性的驼峰name
 * @property {boolean} isArray 是否是数组集合
 * @property {boolean} required 是否必须属性
 * @property {array} [props] object类型的子属性集合
 */

/**
 *
 * @param prop swagger-client解析出来的原始属性
 * @param {string} [name] 属性名
 * @param {boolean = true} useRef 是否使用ref关联到属性定义。默认为
 * @returns {PropertyDefinition} 解析后的属性
 */
function mapProperty (prop, name, useRef = true) {
  let result = { type: propType(prop) }
  if (name) {
    result.name = name
    result.camelCaseName = camelCase(name)
  }
  result.required = !!prop.required
  switch (result.type) {
    case 'ref':
      result.ref = extractRef(prop.$$ref)
      break
    case 'object':
      if (Array.isArray(prop.required)) {
        prop.required.forEach(propName => {
          prop.properties[propName].required = true
        })
      }
      result.props = flatMap(prop.properties, mapProperty)
      break
    case 'enum':
      result.enum = prop.enum
      break
    case 'array':
      result = mapProperty(prop.items, name)
      result.isArray = true
      break
    default:
      break
  }
  return result

  function propType (prop) {
    if (prop.$$ref && useRef) return 'ref'
    if (prop.properties) return 'object'
    if (prop.items) return 'array'
    if (prop.enum) return 'enum'
    if (prop.type === 'integer') return 'number'
    return prop.type
  }

  function extractRef (ref) {
    return ref.match(/(?<=\/)\w+$/g).pop()
  }
}
