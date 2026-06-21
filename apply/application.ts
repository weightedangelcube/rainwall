import type { ImageAnalysisData } from "../analyze/analysis.ts"

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
				past_minutely_15: "1"
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
	const targetColour = [lightnessValue, chromaValue, hueValue]
	let closestColour = imagesData.files[0]

	for (const file of imagesData.files) {
		if (
			Math.abs(file.oklch[0] - targetColour[0]) <= Math.abs(closestColour.oklch[0] - targetColour[0]) &&
			Math.abs(file.oklch[1] - targetColour[1]) <= Math.abs(closestColour.oklch[1] - targetColour[1]) &&
			Math.abs(file.oklch[2] - targetColour[2]) <= Math.abs(closestColour.oklch[2] - targetColour[2])
		) {
			closestColour = file
		}
	}
	console.info(`Found target image ${closestColour.path} with colour oklch(${closestColour.oklch[0]} ${closestColour.oklch[1]} ${closestColour.oklch[2]})!`)

	return closestColour
}
