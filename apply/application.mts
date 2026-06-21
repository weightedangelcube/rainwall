#!/usr/bin/env zx

import { ImageAnalysisData } from "../analyze/analysis.mts"
import _ from "npm:underscore"

/// <reference types="zx/globals" />

export interface ApplicationConfig {
	latitude: number
	longitude: number
	weatherModel: string
	lightnessRange: { start: number; end: number }
	chromaRange: { start: number; end: number }
	hueRange: { start: number; end: number }
	applyWallpaperCommand: string
}

export const defaultConfig: ApplicationConfig = {
	latitude: 0,
	longitude: 0,
	weatherModel: "best_match",
	lightnessRange: {
		start: 0,
		end: 100,
	},
	chromaRange: {
		start: 0,
		end: 100,
	},
	hueRange: {
		start: 0,
		end: 360,
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
	let result = []
	let i = 0
	const chromaIndex = imagesData.chromaData.indexOf(
		imagesData.chromaData.find((data) => data.chroma === chromaValue)!,
	)
	const lightnessIndex = imagesData.lightnessData.indexOf(
		imagesData.lightnessData.find((data) => data.lightness === lightnessValue)!,
	)

	do {
		const matches = [
			imagesData.chromaData[chromaIndex + i].paths || imagesData.chromaData[chromaIndex - i].paths,
			imagesData.lightnessData[lightnessIndex + i].paths || imagesData.lightnessData[lightnessIndex - i].paths,
		]
		console.log(matches)
		result = matches.reduce((a, b) => a.filter((c) => b.includes(c)))

		i++
	} while (result.length === 0)
}
