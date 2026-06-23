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
export const windowsApplyScriptPath = path.fromFileUrl(`file:///${getConfigPath()}/setWallpaper.ps1`)

if (!fs.statSync(windowsApplyScriptPath, { throwIfNoEntry: false })) {
	// C# in TypeScript. who would've thought
	const command = `
$imagePath = $args[0]
$setwallpapersrc = @"
using System.Runtime.InteropServices;
public class wallpaper {
	public const int SetDesktopWallpaper = 20;
	public const int UpdateIniFile = 0x01;
	public const int SendWinIniChange = 0x02;

	[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
	private static extern int SystemParametersInfo (int uAction, int uParam, string lpvParam, int fuWinIni);

	public static void SetWallpaper (string path) {
		SystemParametersInfo(SetDesktopWallpaper, 0, path, UpdateIniFile | SendWinIniChange);
	}
}
"@
Add-Type -TypeDefinition $setwallpapersrc

[wallpaper]::SetWallpaper("$imagePath")
	`
	await fs.writeFile(windowsApplyScriptPath, command)
	console.info(`Wrote Windows wallpaper apply script at ${windowsApplyScriptPath}!`)
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

function easeOutExp(x: number, exp: number): number {
	return Math.pow(x, exp)
}

export function mapEaseOutExp(number: number, exp: number, min: number, max: number, newMin: number, newMax: number) {
	return easeOutExp((number - min) / (max - min), exp) * (newMax - newMin) + newMin
}
