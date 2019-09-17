# swagger-jssdk-codegen
Generate axios request api and type definitions.

## Installing
Using npm:
```shell
npm install swagger-jssdk-codegen --save-dev
```
## API
codegen(url, dir, dirname)
```javascript
const path = require('path')
const codegen = require('swagger-jssdk-codegen')
const URL1 = '' // swagger json doc url
const URL2 = '' // swagger json doc url
codegen(URL1, path.resolve(__dirname, './apis'), 'api1')
codegen(URL2, path.resolve(__dirname, './apis'), 'api2')

```
```
.
+-- apis
|   +-- api1
|       +-- index.js
|       +-- index.d.ts
|   +-- api2
|       +-- index.js
|       +-- index.d.ts
```
