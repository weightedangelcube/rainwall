#!/usr/bin/env zx
/// <reference types="zx/globals" />

import { analyzeImages, Config, ImageAnalysisData, runPreAnalysis, setupConfig } from "./grade.mts";

const configDir = process.env.XDG_CONFIG_HOME ? `${process.env.XDG_CONFIG_HOME}/rainwall` : `${os.homedir()}/.config/rainwall`
const cacheDir = process.env.XDG_CACHE_HOME ? `${process.env.XDG_CACHE_HOME}/rainwall` : `${os.homedir()}/.cache/rainwall`

fs.mkdir(configDir)
fs.mkdir(cacheDir)

let config : Config | undefined


fs.readFile(`${configDir}/config.jsonc`, (err: Error, data: string) => {
	if (err) {
        console.warn(`Got ${err.message} when trying to load config, generating a new one...`)
		config = setupConfig(configDir)
	} else {
        config = JSON.parse(data)
    }
})

if (config == undefined) {
    throw new Error("Couldn't initialize config!")
}

let imageData = new ImageAnalysisData(config.lightnessStep, config.chromaStep, config.hueStep)

runPreAnalysis(config.preAnalysisCommands)

await analyzeImages(config.imageDir, imageData, `${cacheDir}/cache.json`, config.lightnessStep, config.chromaStep, config.hueStep)