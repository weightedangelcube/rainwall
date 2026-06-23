import { colordx } from "@colordx/core"
import type { ImageAnalysisData } from "../analyze/analysis.ts"
import {
	applyConfigPath,
	cachePath,
	chalkDebug,
	easeOutQuint,
	loadConfig,
	map,
	mapEased,
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
	? mapEased(Number(currentSunData.altitude), -0.833, zenithSunData.altitude, 0, 264, (x: number) => easeOutQuint(x))
	: mapEased(Number(currentSunData.altitude), nadirSunData.altitude, -0.833, 264, 360, (x: number) => easeOutQuint(x))

const chromaValue = map(
	100 - Number(openMeteoData.cloudCover), // gotta invert this one
	0,
	100,
	config.chromaRange.start,
	config.chromaRange.end,
)

let lightnessValue = mapEased(
	Number(openMeteoData.shortwaveRadiation),
	0,
	1000,
	config.lightnessRange.start,
	config.lightnessRange.end,
	(x: number) => Math.pow(x, 1/4),
)

// if the current sun altitude is less than that of dawn/dusk
if (currentSunData.altitude < SunCalc.times.find((element) => element.includes("dawn"))![0]) {
	// no light, the sun hasn't even risen yet
	lightnessValue = config.lightnessRange.start
}

const targetColour = colordx({ l: lightnessValue, c: chromaValue, h: hueValue })

console.info(`Calculated target colour ${targetColour.toOklchString()}!`)

console.debug(chalkDebug(`Trying to open cache file ${cachePath}...`))
const cacheFile = await fs.promises.readFile(`${cachePath}`, {
	encoding: "utf8",
})
const imagesData = JSON.parse(cacheFile) as ImageAnalysisData
console.debug(chalkDebug(`Opened cache file ${cachePath}!`))

const matchingImages = findMatchingImages(imagesData, targetColour)
const matchingImage = matchingImages[Math.floor(Math.random() * matchingImages.length)]
console.info(
	`Found matching image ${matchingImage.path} with colour ${colordx(matchingImage.colour).toOklchString()}!`,
)

console.info(`Setting wallpaper...`)

if (Deno.build.os != "windows") {
	await $`eval ${config.applyWallpaperCommand.replace("%s", matchingImage.path)}`
} else {
	const command = `
$setwallpapersrc = @"
using System.Runtime.InteropServices;
public class Wallpaper {
	public const int SetDesktopWallpaper = 20;
	public const int UpdateIniFile = 0x01;
	public const int SendWinIniChange = 0x02;

	[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
	private static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);

	public static void SetWallpaper (string path) {
		SystemParametersInfo(SetDesktopWallpaper, 0, path, UpdateIniFile | SendWinIniChange);
	}
}
"@
Add-Type -TypeDefinition $setwallpapersrc

[Wallpaper]::SetWallpaper("${matchingImage.path}")
`
	usePowerShell()
	// await $`Write-Host ${command}`
	await $`${command} | iex`
}

console.info(`Success! Enjoy :)`)
