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

await fs.cp(cachePath, `${cachePath}.bak`, { force: true }, (err: Error) => {
	if (err) {
		console.log(err)
	}
})

const imageData = { files: [] } as ImageAnalysisData

await runPreAnalysis(config.preAnalysisCommands)

await analyzeImages(config.imageDir, imageData, cachePath)

await fs.rm(`${cachePath}.bak`, { force: true })
