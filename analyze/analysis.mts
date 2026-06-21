#!/usr/bin/env zx

/// <reference types="zx/globals" />

export interface AnalysisConfig {
	imageDir: string
	preAnalysisCommands: string[]
}

export interface ImageAnalysisData {
	files: { path: string; oklch: number[] }[]
}

export const defaultConfig: AnalysisConfig = {
	imageDir: `${os.homedir()}/Pictures`,
	preAnalysisCommands: [],
}

export async function runPreAnalysis(hooks: string[]) {
	for await (const hook of hooks) {
		await $`eval ${hook}` // Scary!
	}
}

export async function analyzeImages(imageDir: string, analysisOutput: ImageAnalysisData, outputPath: string) {
	const images = await fs.promises.opendir(`${imageDir}`)

	for await (const image of images) {
		const path = `${imageDir}/${image.name}`
		const stat = await fs.promises.stat(path)
		if (stat.isFile()) {
			let output = await $`magick ${path} -colorspace Oklch -kmeans 10 -format "%c" histogram:info:`.then(
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
				output = await $`magick ${path} -colorspace Oklch -kmeans 40 -format "%c" histogram:info:`.then(
					(s) =>
						s.stdout
							.split("\n") // split the output by newlines
							.map((substr) => substr.trim()) // trim the whitespace on each line
							.filter((n) => n), // and then filter out any blank elements generated
				)
			}

			const colours = output.map((entry) => {
				const arr = entry.split(" ")
				arr.pop()
				// [# of pixels, oklab colour, hex code]
				return {
					pixels: parseInt(arr[0]),
					oklab: arr[1].replace(/[()]/g, "").split(","), // (0,0,0) -> Array [0, 0, 0]
					hex: arr[2],
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

			analysisOutput.files.push({ path: path, oklch: [hue, chroma, lightness] })

			// flush every time we finish analyzing a file, because it just takes so long
			fs.writeFile(outputPath, JSON.stringify(analysisOutput, null, 4), (err: Error) => {
				if (err) throw new Error(err.message)
			})
		}
	}
}
