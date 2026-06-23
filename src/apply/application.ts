import { type Colordx, extend } from "@colordx/core"
import lab from "@colordx/core/plugins/lab"
import type { ImageAnalysisData } from "../analyze/analysis.ts"
import { chalkDebug } from "../utils.ts"

extend([lab])

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

export function findMatchingImages(imagesData: ImageAnalysisData, targetColor: Colordx) {
	const matchingImages = []

	let targetDelta = 0.06
	while (matchingImages.length == 0) {
		console.debug(`Finding matching image with delta E ${targetDelta.toFixed(2)}...`)
		for (const image of imagesData.files) {
			if (targetColor.delta(image.colour) <= targetDelta) {
				matchingImages.push(image)
			}
		}
		console.info(chalkDebug(`Couldn't find matching image with delta E ${targetDelta.toFixed(2)}! Increasing...`))
		targetDelta += 0.01
	}
	return matchingImages
}
