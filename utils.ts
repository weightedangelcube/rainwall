import "zx/globals"

export const configDir = process.env.XDG_CONFIG_HOME
	? `${process.env.XDG_CONFIG_HOME}/rainwall`
	: `${os.homedir()}/.config/rainwall`
export const cacheDir = process.env.XDG_CACHE_HOME
	? `${process.env.XDG_CACHE_HOME}/rainwall`
	: `${os.homedir()}/.cache/rainwall`

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
			console.warn(
				`Current config blank, generating a new one... you may need to stop this process and edit the config file.`,
			)
			config = defaultConfig
			writeDefaultConfig(pathToConfig, defaultConfig)
		} else {
			config = JSON.parse(stringConfig)
		}
	} catch (err) {
		console.warn(
			`Got ${
				(err as Error).message
			} when trying to load config, generating a new one... you may need to stop this process and edit the config file.`,
		)
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
