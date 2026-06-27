import { colordx } from "@colordx/core"
import type { ImageAnalysisData } from "../analyze/analysis.ts"
import { applyConfigPath, cachePath, chalkDebug, easeOutQuint, loadConfig, map, mapEased, shuffle } from "../utils.ts"
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

const sunriseDegrees = SunCalc.times.find((element) => element.includes("sunrise"))![0]
const dawnDegrees = SunCalc.times.find((element) => element.includes("dawn"))![0]

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
console.info(`Current shortwave radiation is ${openMeteoData.shortwaveRadiation} W/m²!`)
console.info(`Current sun altitude is ${currentSunData.altitude}°!`)

const hueValue = Number(currentSunData.altitude) >= sunriseDegrees
	? mapEased(
		Number(currentSunData.altitude),
		sunriseDegrees,
		zenithSunData.altitude,
		0,
		config.targetSkyHue,
		(x: number) => easeOutQuint(x),
	)
	: mapEased(
		Number(currentSunData.altitude),
		nadirSunData.altitude,
		sunriseDegrees,
		config.targetSkyHue,
		360,
		(x: number) => easeOutQuint(x),
	)

console.log(hueValue)
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
	config.lightnessRange.dawn,
	config.lightnessRange.noon,
	(x) => Math.pow(x, 1 / 4)
)

// if the current sun altitude is less than that of dawn/dusk
if (currentSunData.altitude < dawnDegrees) {
	// no light, the sun hasn't even risen yet
	lightnessValue = config.lightnessRange.night
}

const targetColour = colordx({ l: lightnessValue, c: chromaValue, h: hueValue })

console.info(`Calculated target colour ${targetColour.toOklchString()}!`)

console.debug(chalkDebug(`Trying to open cache file ${cachePath}...`))
const cacheFile = await fs.promises.readFile(`${cachePath}`, {
	encoding: "utf8",
})
const imagesData = JSON.parse(cacheFile) as ImageAnalysisData
console.debug(chalkDebug(`Opened cache file ${cachePath}!`))

const matchingImages = shuffle(findMatchingImages(imagesData, targetColour, config.numberOfWallpapers)).slice(
	0,
	config.numberOfWallpapers,
)

matchingImages.forEach((image) =>
	console.info(
		`Found matching image ${image.path} with colour ${colordx(image.colour).toOklchString()}!`,
	)
)

// TODO: implement setting more than one wallpaper. for ppl with multiple monitors

console.info(`Setting wallpaper...`)

	
if (Deno.build.os == "windows") {
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

[Wallpaper]::SetWallpaper("${matchingImages[0].path}")
`
	usePowerShell()
	// await $`Write-Host ${command}`
	await $`${command} | iex`
} else if (Deno.build.os == "darwin") {
	const command = `tell application "System Events" to set picture of (reference to current desktop) to "${matchingImages[0].path}"`
	await $`osascript -e ${command}`
} else {
	await $`eval ${config.applyWallpaperCommand.replace("%s", matchingImages[0].path)}`
}

console.info(`Success! Enjoy :)`)