#!/usr/bin/env zx

import { floorToStep } from "../utils.mts";

/// <reference types="zx/globals" />

export interface AnalysisConfig {
	imageDir: string
	lightnessStep: number
	chromaStep: number
	hueStep: number
	preAnalysisCommands: string[]
}

export class ImageAnalysisData {
	lightnessData: { lightness: number, paths: string[] }[]
	chromaData: { chroma: number, paths: string[] }[]
	hueData: { hue: number, paths: string[] }[]

	constructor(lightnessStep: number, chromaStep: number, hueStep: number) {
		this.lightnessData = []
		this.chromaData = []
		this.hueData = []

		for (let i = 0; i < 100; i += lightnessStep) {
			this.lightnessData.push({ lightness: i, paths: [] })
		}

		for (let i = 0; i < 100; i += chromaStep) {
			this.chromaData.push({ chroma: i, paths: [] })
		}
		for (let i = 0; i < 360; i += hueStep) {
			this.hueData.push({ hue: i, paths: [] })
		}
	}
}

export const defaultConfig: AnalysisConfig = {
	imageDir: `${os.homedir()}/Pictures`,
	lightnessStep: 10,
	chromaStep: 1,
	hueStep: 90,
	preAnalysisCommands: []
}

export async function runPreAnalysis(hooks: string[]) {
	for await (const hook of hooks) {
		await $`eval ${hook}` // Scary!
	}
}

export async function analyzeImages(imageDir: string, analysisOutput: ImageAnalysisData, outputPath: string, lightnessStep: number, chromaStep: number, hueStep: number) {
	const images = await fs.promises.opendir(`${imageDir}`)

	for await (const image of images) {
		const path = `${imageDir}/${image.name}`
		const stat = await fs.promises.stat(path)
		if (stat.isFile()) {
			let output =
				await $`magick ${path} -colorspace Oklch -kmeans 10 -format "%c" histogram:info:`.then(
					(s) =>
						s.stdout
							.split("\n")
							.map((substr) => substr.trim())
							.filter((n) => n),
				) as string[]

			if (output.length < 5) {
				// do it again but with more violence
				console.log(
					`-kmeans 10 of ${image.name} didn't give enough colours, trying again with a higher value...`,
				)
				output =
					await $`magick ${path} -colorspace Oklch -kmeans 40 -format "%c" histogram:info:`.then(
						(s) =>
							s.stdout
								.split("\n")                         // split the output by newlines
								.map((substr) => substr.trim())      // trim the whitespace on each line
								.filter((n) => n),                   // and then filter out any blank elements generated
					)
			}

			const colours = output.map((entry) => {
				const arr = entry.split(" ")
				arr.pop()
				// [# of pixels, oklab colour, hex code]
				return {
					pixels: parseInt(arr[0]),
					oklab: arr[1].replace(/[()]/g, "").split(","), // (0,0,0) -> Array [0, 0, 0]
					hex: arr[2]
				}
			})

			colours.sort((a, b) => (b.pixels) - (a.pixels))

			const dominantColour = colours[0].oklab

			console.log(
				`Got oklch(${dominantColour}) as dominant colour of ${image.name}!`,
			)
			const lightness = Number(dominantColour[0]) * 100
			const chroma = Number(dominantColour[1]) * 100
			const hue = Number(dominantColour[2])

			analysisOutput.lightnessData.forEach((n) => {
				const targetLightness = floorToStep(lightness, lightnessStep)
				if (n.lightness == targetLightness) {
					n.paths.push(path)
					return
				}
			})

			analysisOutput.chromaData.forEach((n) => {
				const targetChroma = floorToStep(chroma, chromaStep)
				if (n.chroma == targetChroma) {
					n.paths.push(path)
					return
				}
			})

			analysisOutput.hueData.forEach((n) => {
				const targetHue = floorToStep(hue, hueStep)
				if (n.hue == targetHue) {
					n.paths.push(path)
					return
				}
			})

			// flush every time we finish analyzing a file, because it just takes so long
			fs.writeFile(outputPath, JSON.stringify(analysisOutput, null, 4), (err: Error) => {
				if (err) throw new Error(err.message)
			})
		}
	}
}

