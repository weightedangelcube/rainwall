import { analyzeConfigPath, cachePath, chalkDebug, loadConfig } from "../utils.ts"
import {
	type AnalysisConfig,
	analyzeImages,
	defaultConfig,
	type ImageAnalysisData,
	runPreAnalysis,
} from "./analysis.ts"
import "zx/globals"

console.debug(chalkDebug(`Trying to load config from ${analyzeConfigPath}...`))

const config = await loadConfig(analyzeConfigPath, defaultConfig) as AnalysisConfig

if (config == undefined) {
	throw new Error("Couldn't initialize config!")
}

console.debug(chalkDebug(`Config: \n${JSON.stringify(config, null, 4)}`))

if (fs.statSync(cachePath, { throwIfNoEntry: false })) {
	await fs.cp(cachePath, `${cachePath}.bak`, { force: true })
}

const imageData = { files: [] } as ImageAnalysisData

await runPreAnalysis(config.preAnalysisCommands)

await analyzeImages(config.imageDir, imageData, cachePath)

if (fs.statSync(`${cachePath}.bak`, { throwIfNoEntry: false })) {
	await fs.rm(`${cachePath}.bak`, { force: true })
}
