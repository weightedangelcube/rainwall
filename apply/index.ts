#!/usr/bin/env zx

import { ImageAnalysisData } from "../analyze/analysis.ts"
import { cacheDir, configDir, loadConfig, map, mapEaseOutQuint } from "../utils.ts"
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
const currentSunData = SunCalc.getPosition(
	new Date(),
	config.latitude,
	config.longitude,
)
const zenithSunData = SunCalc.getPosition(
	SunCalc.getTimes(new Date(), config.latitude, config.longitude).solarNoon,
	config.latitude,
	config.longitude,
)
const nadirSunData = SunCalc.getPosition(
	SunCalc.getTimes(new Date(), config.latitude, config.longitude).nadir,
	config.latitude,
	config.longitude,
)

console.info(`Current cloud cover percentage is ${openMeteoData.cloudCover}%!`)
console.info(
	`Current shortwave radiation is ${openMeteoData.shortwaveRadiation} W/m²!`,
)
console.info(`Current sun altitude is ${currentSunData.altitude}°!`)

const hueValue = Number(currentSunData.altitude) >= -0.833
	? mapEaseOutQuint(Number(currentSunData.altitude), -0.833, zenithSunData.altitude, 0, 264)
	: mapEaseOutQuint(Number(currentSunData.altitude), nadirSunData.altitude, -0.833, 264, 360)
	
const chromaValue = map(
	100 - Number(openMeteoData.cloudCover), // gotta invert this one
	0,
	100,
	config.chromaRange.start,
	config.chromaRange.end,
)

const lightnessValue = map(
	Number(openMeteoData.shortwaveRadiation),
	0,
	1000,
	config.lightnessRange.start,
	config.lightnessRange.end,
)

console.info(`Calculated target colour oklch(${lightnessValue} ${chromaValue} ${hueValue})!`)

console.debug(`Trying to open cache file ${pathToCache}...`)
const cacheFile = await fs.promises.readFile(`${pathToCache}`, {
	encoding: "utf8",
})
const imagesData = JSON.parse(cacheFile) as ImageAnalysisData
console.debug(`Opened cache file ${pathToCache}!`)

const targetFile = findMatchingImages(imagesData, hueValue, chromaValue, lightnessValue)

console.info(`Setting wallpaper...`)
await $`eval ${config.applyWallpaperCommand.replace("%s", targetFile.path)}`
console.info(`Success! Enjoy :)`)
