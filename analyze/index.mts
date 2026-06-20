#!/usr/bin/env zx
/// <reference types="zx/globals" />

import { configDir, cacheDir, loadConfig } from "../utils.mts";
import { analyzeImages, AnalysisConfig, ImageAnalysisData, runPreAnalysis, defaultConfig } from "./analysis.mts";

const pathToConfig = `${configDir}/analyze-config.json`

console.debug(`Trying to load config from ${pathToConfig}...`)

const config = await loadConfig(pathToConfig, defaultConfig) as AnalysisConfig

if (config == undefined) {
    throw new Error("Couldn't initialize config!")
}

console.debug(`Config: \n${JSON.stringify(config, null, 4)}`)

fs.rm(`${cacheDir}/analysis.json`, { force: true })

const imageData = new ImageAnalysisData(config.lightnessStep, config.chromaStep, config.hueStep)

await runPreAnalysis(config.preAnalysisCommands)

await analyzeImages(config.imageDir, imageData, `${cacheDir}/analysis.json`, config.lightnessStep, config.chromaStep, config.hueStep)