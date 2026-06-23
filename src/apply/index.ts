#!/usr/bin/env zx

import type { ImageAnalysisData } from "../analyze/analysis.ts"
import { cacheDir, chalkDebug, configDir, loadConfig, map, mapEaseOutQuint, mapEaseOutSqrt } from "../utils.ts"
import { type ApplicationConfig, defaultConfig, findMatchingImages, getOpenMeteoData } from "./application.ts"
import * as SunCalc from "suncalc"
import "zx/globals"

const pathToConfig = `${configDir}/apply-config.json`
const pathToCache = `${cacheDir}/analysis.json`

console.debug(chalkDebug(`Trying to load application config from ${pathToConfig}...`))
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

const lightnessValue = mapEaseOutSqrt(
	Number(openMeteoData.shortwaveRadiation),
	0,
	1000,
	config.lightnessRange.start,
	config.lightnessRange.end,
)

console.info(`Calculated target colour oklch(${lightnessValue} ${chromaValue} ${hueValue})!`)

console.debug(chalkDebug(`Trying to open cache file ${pathToCache}...`))
const cacheFile = await fs.promises.readFile(`${pathToCache}`, {
	encoding: "utf8",
})
const imagesData = JSON.parse(cacheFile) as ImageAnalysisData
console.debug(chalkDebug(`Opened cache file ${pathToCache}!`))

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
	// C# in TypeScript. who would've thought
	// uiAction: SPI_SetDeskWallpaper = 0x0014 = 20
	// uiParam: unused = 0
	// pvParam: path to the image
	// fWinIni: SPIF_SENDCHANGE (update user profile + broadcast setting change) = 0x02 = 2
	const command = `
		$code = @' 
		using System.Runtime.InteropServices; 
			namespace Win32 { 
				public class Wallpaper { 
					[DllImport("user32.dll", CharSet=CharSet.Auto)] 
					static extern int SystemParametersInfoA(int uiAction, int uiParam, string pvParam, int fWinIni);
					
					public static void SetWallpaper(string imagePath){ 
						SystemParametersInfo(20, 0, imagePath, 2);
					}
				}
			}
		'@

		add-type $code 
		[Win32.Wallpaper]::SetWallpaper(${targetImage.path})
	`
	await $`pwsh ${command}`
}
console.info(`Success! Enjoy :)`)
