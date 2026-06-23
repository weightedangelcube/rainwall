import type { ImageAnalysisData } from "../analyze/analysis.ts"
import * as colourDiff from "color-diff"

export interface ApplicationConfig {
	latitude: number
	longitude: number
	weatherModel: string
	lightnessRange: { start: number; end: number }
	chromaRange: { start: number; end: number }
	applyWallpaperCommand: string
}

export const defaultConfig: ApplicationConfig = {
	latitude: 0,
	longitude: 0,
	weatherModel: "best_match",
	lightnessRange: {
		start: 0,
		end: 1,
	},
	chromaRange: {
		start: 0,
		end: 1,
	},
	applyWallpaperCommand: "hyprctl hyprpaper wallpaper , %s",
}

export async function getOpenMeteoData(
	latitude: number,
	longitude: number,
	weatherModel: string = "best_match",
) {
	const openMeteoResponse = await fetch(
		"https://api.open-meteo.com/v1/forecast",
		{
			method: "POST",
			body: new URLSearchParams({
				latitude: latitude.toString(),
				longitude: longitude.toString(),
				models: weatherModel,
				current: "cloud_cover",
				minutely_15: "shortwave_radiation_instant",
				forecast_minutely_15: "1",
				past_minutely_15: "1",
			}),
		},
	)

	if (!openMeteoResponse.ok) {
		throw new Error(
			`Open-Meteo sent back an error: ${openMeteoResponse.status}`,
		)
	}

	const openMeteoData = await openMeteoResponse.json()

	const cloudCover: string = openMeteoData.current.cloud_cover

	let index = 0
	openMeteoData.minutely_15.time.forEach((time: string) => {
		if (Date.parse(time) > Date.now()) {
			// if the data point has a time greater than right now, subtract one to find the one just before the current
			// time
			index = openMeteoData.minutely_15.time.indexOf(time) - 1
		}
	})
	const shortwaveRadiation: string = openMeteoData.minutely_15.shortwave_radiation_instant[index]

	return {
		cloudCover,
		shortwaveRadiation,
	}
}

export function findMatchingImages(
	imagesData: ImageAnalysisData,
	hueValue: number,
	chromaValue: number,
	lightnessValue: number,
) {
	// let's convert Oklch to CIELAB first:
	const aValue = chromaValue * Math.cos(hueValue)
	const bValue = chromaValue * Math.sin(hueValue)

	const matchingImages = []

	let targetDifference = 0.05
	while (matchingImages.length == 0) {
		for (const image of imagesData.files) {
			const targetAValue = image.oklch[1] * Math.cos(image.oklch[2])
			const targetBValue = image.oklch[1] * Math.sin(image.oklch[2])

			// then use the CIEDE2000 algorithm to calculate the difference between the colours
			const difference = colourDiff.diff({
				L: lightnessValue,
				a: aValue,
				b: bValue,
			}, {
				L: image.oklch[0],
				a: targetAValue,
				b: targetBValue,
			})

			if (difference <= targetDifference) {
				matchingImages.push(image)
			}
		}
		targetDifference += 0.01
	}
	return matchingImages
}
