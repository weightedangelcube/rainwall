#!/usr/bin/env zx

import { cacheDir, chalkDebug, configDir, loadConfig } from "../utils.ts"
import { type AnalysisConfig, analyzeImages, defaultConfig, type ImageAnalysisData, runPreAnalysis } from "./analysis.ts"
import "zx/globals"

const pathToConfig = `${configDir}/analyze-config.json`

console.debug(chalkDebug(`Trying to load config from ${pathToConfig}...`))

const config = await loadConfig(pathToConfig, defaultConfig) as AnalysisConfig

if (config == undefined) {
	throw new Error("Couldn't initialize config!")
}

console.debug(chalkDebug(`Config: \n${JSON.stringify(config, null, 4)}`))

await fs.cp(`${cacheDir}/analysis.json`, `${cacheDir}/analysis.json.prev`, { force: true }, (err: Error) => {
	if (err) {
		console.log(err)
	}
})

const imageData = { files: [] } as ImageAnalysisData

await runPreAnalysis(config.preAnalysisCommands)

await analyzeImages(config.imageDir, imageData, `${cacheDir}/analysis.json`)

await fs.rm(`${cacheDir}/analysis.json.prev`, { force: true })
