import * as path from "@std/path"
import "zx/globals"

function getConfigPath() {
	if (Deno.build.os == "windows") {
		return path.fromFileUrl(`file:///${os.homedir}/AppData/Local/rainwall`)
	} else if (Deno.build.os == "darwin") {
		return path.fromFileUrl(`file:///${os.homedir()}/Library/Preferences/rainwall`)
	} else {
		return process.env.XDG_CONFIG_HOME
			? path.fromFileUrl(`file:///${process.env.XDG_CONFIG_HOME}/rainwall`)
			: path.fromFileUrl(`file:///${os.homedir()}/.config/rainwall`)
	}
}

function getCachePath() {
	if (Deno.build.os == "windows") {
		return path.fromFileUrl(`file:///${os.homedir}/AppData/Local/Temp/rainwall`)
	} else if (Deno.build.os == "darwin") {
		return path.fromFileUrl(`file:///${os.homedir()}/Library/Caches/rainwall`)
	} else {
		return process.env.XDG_CACHE_HOME
			? path.fromFileUrl(`file:///${process.env.XDG_CACHE_HOME}/rainwall`)
			: path.fromFileUrl(`file:///${os.homedir()}/.cache/rainwall`)
	}
}

export const configDir = getConfigPath()

export const cacheDir = getCachePath()

if (!fs.statSync(configDir)) {
	fs.mkdirSync(configDir)
}

if (!fs.statSync(cacheDir)) {
	fs.mkdirSync(cacheDir)
}

export async function loadConfig(pathToConfig: string, defaultConfig: object) {
	let config: object | undefined
	try {
		const stringConfig = await fs.promises.readFile(`${pathToConfig}`, {
			encoding: "utf8",
		})
		if (stringConfig == undefined) {
			console.log(
				`Current config blank, generating a new one... you may need to stop this process and edit the config file.`,
			)
			config = defaultConfig
			writeDefaultConfig(pathToConfig, defaultConfig)
		} else {
			config = JSON.parse(stringConfig)
		}
	} catch (err) {
		console.warn(chalkWarn(
			`Got ${(err as Error).message} when trying to load config, generating a new one... 
			you may need to stop this process and edit the config file.`,
		))
		config = defaultConfig
		writeDefaultConfig(pathToConfig, defaultConfig)
	}
	console.info(`Loaded config from ${pathToConfig}!`)
	return config
}

async function writeDefaultConfig(path: string, data: object) {
	await fs.writeFile(`${path}`, JSON.stringify(data, null, 4))
	console.info(`Generated default config at ${path}!`)
}

export const chalkError = chalk.bold.red
export const chalkWarn = chalk.yellow
export const chalkDebug = chalk.gray

export function clamp(number: number, min: number, max: number) {
	return Math.max(min, Math.min(number, max))
}

export function map(number: number, min: number, max: number, newMin: number, newMax: number) {
	return ((number - min) / (max - min)) * (newMax - newMin) + newMin
}

function easeOutQuint(x: number): number {
	return 1 - Math.pow(1 - x, 5)
}

export function mapEaseOutQuint(number: number, min: number, max: number, newMin: number, newMax: number) {
	return easeOutQuint((number - min) / (max - min)) * (newMax - newMin) + newMin
}

function easeOutSqrt(x: number): number {
	return Math.sqrt(x)
}

export function mapEaseOutSqrt(number: number, min: number, max: number, newMin: number, newMax: number) {
	return easeOutSqrt((number - min) / (max - min)) * (newMax - newMin) + newMin
}