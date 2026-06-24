import * as path from "@std/path"
import "zx/globals"

function getConfigPath() {
	if (Deno.build.os == "windows") {
		return `${os.homedir}/AppData/Local/rainwall`
	} else if (Deno.build.os == "darwin") {
		return `${os.homedir()}/Library/Preferences/rainwall`
	} else {
		return process.env.XDG_CONFIG_HOME
			? `${process.env.XDG_CONFIG_HOME}/rainwall`
			: `${os.homedir()}/.config/rainwall`
	}
}

function getCachePath() {
	if (Deno.build.os == "windows") {
		return `${os.homedir}/AppData/Local/Temp/rainwall`
	} else if (Deno.build.os == "darwin") {
		return `${os.homedir()}/Library/Caches/rainwall`
	} else {
		return process.env.XDG_CACHE_HOME ? `${process.env.XDG_CACHE_HOME}/rainwall` : `${os.homedir()}/.cache/rainwall`
	}
}

// ensure the config and cache directories exist
if (!fs.statSync(path.fromFileUrl(`file:///${getConfigPath()}`), { throwIfNoEntry: false })) {
	fs.mkdirSync(path.fromFileUrl(`file:///${getConfigPath()}`), { recursive: true })
}

if (!fs.statSync(path.fromFileUrl(`file:///${getCachePath()}`), { throwIfNoEntry: false })) {
	fs.mkdirSync(path.fromFileUrl(`file:///${getCachePath()}`), { recursive: true })
}

export const applyConfigPath = path.fromFileUrl(`file:///${getConfigPath()}/apply-config.json`)
export const analyzeConfigPath = path.fromFileUrl(`file:///${getConfigPath()}/analyze-config.json`)
export const cachePath = path.fromFileUrl(`file:///${getCachePath()}/analysis.json`)

export async function loadConfig(pathToConfig: string, defaultConfig: object) {
	let tries = 0
	const maxTries = 3

	while (tries < maxTries) {
		try {
			const stringConfig = await fs.promises.readFile(`${pathToConfig}`, {
				encoding: "utf8",
			})
			const config = JSON.parse(stringConfig)
			console.info(`Loaded config from ${pathToConfig}!`)
			return config
		} catch (err) {
			console.warn(chalkWarn(
				`Got ${(err as Error).message} when trying to load config, generating a new one... 
				you may need to stop this process and edit the config file.`,
			))
			writeConfig(pathToConfig, defaultConfig)
			tries++
			if (tries == maxTries) throw new Error(`Couldn't read config in ${maxTries} tries`)
		}
	}
}

async function writeConfig(path: string, data: object) {
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

export function easeOutQuint(x: number): number {
	return 1 - Math.pow(1 - x, 5)
}

export function mapEased(
	number: number,
	min: number,
	max: number,
	newMin: number,
	newMax: number,
	func: (n: number) => number,
) {
	return func((number - min) / (max - min)) * (newMax - newMin) + newMin
}
