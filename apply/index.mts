#!/usr/bin/env zx
/// <reference types="zx/globals" />

import { AnalysisConfig, defaultConfig as analysisDefaultConfig, ImageAnalysisData } from "../analyze/analysis.mts"
import { cacheDir, configDir, floorToStep, loadConfig, map } from "../utils.mts"
import { ApplicationConfig, defaultConfig, findMatchingImages, getOpenMeteoData } from "./application.mts"
import * as SunCalc from "npm:suncalc"

const pathToConfig = `${configDir}/apply-config.json`
const pathToAnalysisConfig = `${configDir}/analyze-config.json`
const pathToCache = `${cacheDir}/analysis.json`

console.debug(`Trying to load application config from ${pathToConfig}...`)
const config = await loadConfig(
	pathToConfig,
	defaultConfig,
) as ApplicationConfig
if (config == undefined) {
	throw new Error("Couldn't initialize config!")
}

// we also need the analysis config to load the steps
console.debug(`Trying to load analysis config from ${pathToAnalysisConfig}...`)
const analysisConfig = await loadConfig(
	pathToAnalysisConfig,
	analysisDefaultConfig,
) as AnalysisConfig
if (analysisConfig == undefined) {
	throw new Error("Couldn't initialize config!")
}

console.debug(`Config: \n${JSON.stringify(config, null, 4)}`)

const openMeteoData = await getOpenMeteoData(
	config.latitude,
	config.longitude,
	config.weatherModel,
)
const sunCalcData = SunCalc.getPosition(
	new Date(),
	config.latitude,
	config.longitude,
)

console.info(`Current cloud cover percentage is ${openMeteoData.cloudCover}%!`)
console.info(
	`Current shortwave radiation is ${openMeteoData.shortwaveRadiation} W/m²!`,
)
console.info(`Current sun altitude is ${sunCalcData.altitude}°!`)

// const hueValue = clamp()
const chromaValue = floorToStep(
	map(
		Number(openMeteoData.cloudCover),
		0,
		100,
		config.chromaRange.end,
        config.chromaRange.start,
	),
	analysisConfig.chromaStep,
)

const lightnessValue = floorToStep(
	map(
		Number(openMeteoData.shortwaveRadiation),
		0,
		1000,
		config.lightnessRange.start,
		config.lightnessRange.end,
	),
	analysisConfig.lightnessStep,
)

console.info(`Got chroma value ${chromaValue}!`)
console.info(`Got lightness value ${lightnessValue}!`)

console.debug(`Trying to open cache file ${pathToCache}...`)
const cacheFile = await fs.promises.readFile(`${pathToCache}`, {
	encoding: "utf8",
})
const imagesData = JSON.parse(cacheFile) as ImageAnalysisData
console.debug(`Opened cache file ${pathToCache}!`)



findMatchingImages(imagesData, 0, chromaValue, lightnessValue)