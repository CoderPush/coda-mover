import { defineConfig, type Options } from 'tsup'
import path from 'path'
import rootPath from 'app-root-path'

const resolvePath = (...paths: string[]): string =>
  path.resolve(...paths).replace(/\\/g, '/')

let envName: string
const createBuildConfigs = async (name: string): Promise<Options[]> => {
  const basePath = `${__dirname}/${name}`.replace(/\\/g, '/') // eslint-disable-line n/no-path-concat
  const jsBanner = '/*! Copyright (c) 2023 Coderpush. All rights reserved. */'

  const configs: Options[] = []
  const packageMain = 'index.ts'
  const ignoredPatterns = [
    '!node_modules/**',
    `!${basePath}/node_modules`,
    `!${basePath}/node_modules/**`,
    `!${basePath}/dist`,
    `!${basePath}/**/*.spec.ts`,
    `!${basePath}/**/*.test.ts`,
    `!${basePath}/tests/**`,
  ]

  const cjsBaseConfig: Options = {
    clean: true,
    tsconfig: `${basePath}/tsconfig.json`,
    format: ['cjs'],
    external: [/^[^./D@]/], // only bundle entry modules and relative modules
    outDir: rootPath.resolve(`dist/${name}`),
    splitting: false,
    dts: false,
    minify: envName === 'production',
    banner: {
      js: jsBanner,
    },
  }

  if (packageMain) {
    const mainImportPath = resolvePath(basePath, packageMain)

    configs.push({
      ...cjsBaseConfig,
      entry: [mainImportPath, ...ignoredPatterns],
      dts: false,
    })
  }

  return configs
}

const packages = [
  'electron',
  'electron/preload',
]

export default defineConfig(async (options) => {
  envName = options.env?.NODE_ENV || process.env.NODE_ENV || 'development'

  const configs = await Promise.all(packages.map(createBuildConfigs))

  return configs.flat()
})
