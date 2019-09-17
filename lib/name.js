import { upperFirst, words } from 'lodash-es'
const pluralize = require('pluralize')

export default function generateApiName (path, method, isSingleResource) {
  return action(method) + resourceName(path, isSingleResource)
}

function action (method) {
  return {
    get: 'get',
    post: 'create',
    put: 'update',
    delete: 'delete'
  }[method]
}

function resourceName (path, isSingleResource) {
  return pathNames(path)
    .map(isSingleResource ? pluralize.singular : pluralizeLastOne)
    .join('')
}

/**
 * 切分路径为路径数组 /foo/bar -> ['Foo', 'Bar']
 * @param path
 * @returns {string[]}
 */
function pathNames (path) {
  // /course_schedule
  // /[course]_schedule，(/)<-[字符+]->(_)：(?<=\/)\w+(?=_)。
  // /course_[schedule]，(/字符+_)<-[字符+]：(?<=\/\w+_)
  return words(path, /(?<=\/)\w+(?=_)|(?<=\/\w+_)\w+|(?<=\/)\w+/g).map(upperFirst)
}

function pluralizeLastOne (str, index, arr) {
  return index === arr.length - 1 ? pluralize(str) : pluralize.singular(str)
}
