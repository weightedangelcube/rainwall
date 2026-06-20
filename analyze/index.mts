#!/usr/bin/env zx
/// <reference types="zx/globals" />

import { analyzeImages, Config, ImageAnalysisData, runPreAnalysis, setupConfig } from "./analysis.mts";

const configDir = process.env.XDG_CONFIG_HOME ? `${process.env.XDG_CONFIG_HOME}/rainwall` : `${os.homedir()}/.config/rainwall`
const cacheDir = process.env.XDG_CACHE_HOME ? `${process.env.XDG_CACHE_HOME}/rainwall` : `${os.homedir()}/.cache/rainwall`

if (!fs.statSync(configDir)){
    fs.mkdirSync(configDir);
}

if (!fs.statSync(cacheDir)){
    fs.mkdirSync(cacheDir);
}

let config: Config | undefined

console.debug(`Trying to load config from ${configDir}/analyze-config.json...`)

let fsConfig: string | undefined

try {
    fsConfig = await fs.promises.readFile(`${configDir}/analyze-config.json`, { encoding: 'utf8' })
} catch (err) {
    console.warn(`Got ${(err as Error).message} when trying to load config, generating a new one... you may need to stop this process and edit the config file.`)
    fsConfig = await setupConfig(configDir)
} finally {
    if (fsConfig == undefined) {
        console.warn(`Current config file blank, generating a new one... you may need to stop this process and edit the config file.`)
        fsConfig = await setupConfig(configDir)
    }
    config = JSON.parse(fsConfig)
    console.info(`Loaded config from ${configDir}/analyze-config.json!`)
}

if (config == undefined) {
    throw new Error("Couldn't initialize config!")
}

console.debug(`Config: \n${JSON.stringify(config, null, 4)}`)

fs.rm(`${cacheDir}/analysis.json`, { force: true })

const imageData = new ImageAnalysisData(config.lightnessStep, config.chromaStep, config.hueStep)

await runPreAnalysis(config.preAnalysisCommands)

await analyzeImages(config.imageDir, imageData, `${cacheDir}/analysis.json`, config.lightnessStep, config.chromaStep, config.hueStep)