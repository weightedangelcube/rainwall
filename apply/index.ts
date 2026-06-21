#!/usr/bin/env zx

import { ImageAnalysisData } from "../analyze/analysis.ts"
import { cacheDir, configDir, loadConfig, map, mapEaseInExpo, mapEaseOutExpo } from "../utils.ts"
import { ApplicationConfig, defaultConfig, findMatchingImages, getOpenMeteoData } from "./application.ts"
import * as SunCalc from "suncalc"
import "zx/globals"

const pathToConfig = `${configDir}/apply-config.json`
const pathToCache = `${cacheDir}/analysis.json`

console.debug(`Trying to load application config from ${pathToConfig}...`)
const config = await loadConfig(
	pathToConfig,
	defaultConfig,
) as ApplicationConfig
if (config == undefined) {
	throw new Error("Couldn't initialize config!")
}

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

const hueValue = Number(sunCalcData.altitude) >= 0
	? mapEaseOutExpo(Number(sunCalcData.altitude), 0, 90, 0, 264)
	: mapEaseInExpo(Number(sunCalcData.altitude), 0, -90, 360, 264)
const chromaValue = map(
	Number(openMeteoData.cloudCover),
	0,
	100,
	config.chromaRange.end,
	config.chromaRange.start,
)
const lightnessValue = map(
	Number(openMeteoData.shortwaveRadiation),
	0,
	1000,
	config.lightnessRange.start,
	config.lightnessRange.end,
)

console.info(`Got hue value ${hueValue}°!`)
console.info(`Got chroma value ${chromaValue}%!`)
console.info(`Got lightness value ${lightnessValue}%!`)

console.debug(`Trying to open cache file ${pathToCache}...`)
const cacheFile = await fs.promises.readFile(`${pathToCache}`, {
	encoding: "utf8",
})
const imagesData = JSON.parse(cacheFile) as ImageAnalysisData
console.debug(`Opened cache file ${pathToCache}!`)

const targetFile = findMatchingImages(imagesData, hueValue, chromaValue, lightnessValue)

console.info(`Found target image ${targetFile.path}!`)
console.info(`Setting wallpaper...`)
await $`eval ${config.applyWallpaperCommand.replace("%s", targetFile.path)}`
