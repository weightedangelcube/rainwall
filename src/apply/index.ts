import type { ImageAnalysisData } from "../analyze/analysis.ts"
import {
	applyConfigPath,
	cachePath,
	chalkDebug,
	loadConfig,
	map,
	mapEaseOutExp,
	mapEaseOutQuint,
	windowsApplyScriptPath,
} from "../utils.ts"
import { type ApplicationConfig, defaultConfig, findMatchingImages, getOpenMeteoData } from "./application.ts"
import * as SunCalc from "suncalc"
import "zx/globals"

console.debug(chalkDebug(`Trying to load application config from ${applyConfigPath}...`))
const config = await loadConfig(
	applyConfigPath,
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

const lightnessValue = mapEaseOutExp(
	Number(openMeteoData.shortwaveRadiation),
	1 / 4,
	0,
	1000,
	config.lightnessRange.start,
	config.lightnessRange.end,
)

console.info(`Calculated target colour oklch(${lightnessValue} ${chromaValue} ${hueValue})!`)

console.debug(chalkDebug(`Trying to open cache file ${cachePath}...`))
const cacheFile = await fs.promises.readFile(`${cachePath}`, {
	encoding: "utf8",
})
const imagesData = JSON.parse(cacheFile) as ImageAnalysisData
console.debug(chalkDebug(`Opened cache file ${cachePath}!`))

const targetImages = findMatchingImages(imagesData, hueValue, chromaValue, lightnessValue)
const targetImage = targetImages[Math.floor(Math.random() * targetImages.length)]
console.info(
	`Found target image ${targetImage.path} with colour oklch(${targetImage.oklch[0]} ${targetImage.oklch[1]} ${
		targetImage.oklch[2]
	})!`,
)

console.info(`Setting wallpaper...`)

if (Deno.build.os != "windows") {
	await $`eval ${config.applyWallpaperCommand.replace("%s", targetImage.path)}`
} else {
	const command = new Deno.Command(`pwsh`, { args: [ windowsApplyScriptPath, targetImage.path ], stdout: "piped" } )
	command.spawn()
}
console.info(`Success! Enjoy :)`)
