#!/usr/bin/env zx
/// <reference types="zx/globals" />

export interface ApplicationConfig {
    latitude: number,
    longitude: number,
    weatherModel: string,
    applyWallpaperCommand: string
}

export const defaultConfig: ApplicationConfig = {	
	latitude: 0,
    longitude: 0,
    weatherModel: "best_match",
    applyWallpaperCommand: "hyprctl hyprpaper wallpaper , %s"
}

export async function getOpenMeteoData(latitude: number, longitude: number, weatherModel: string = "best_match") {
    const openMeteoResponse = await fetch("https://api.open-meteo.com/v1/forecast", {
        method: "POST",
        body: new URLSearchParams({
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            models: weatherModel,
            current: "cloud_cover",
            minutely_15: "shortwave_radiation_instant"
        })
    })

    if (!openMeteoResponse.ok) {
        throw new Error(`Open-Meteo sent back an error: ${openMeteoResponse.status}`)
    }

    const openMeteoData = await openMeteoResponse.json()

    const cloudCover = openMeteoData.current.cloud_cover

    let index = 0
    openMeteoData.minutely_15.time.forEach((time: string) => {
        if (Date.parse(time) > Date.now()) {
            // if the data point has a time greater than right now, subtract one to find the one just before the current
            // time
            index = openMeteoData.minutely_15.time.indexOf(time) - 1
        }
    })
    const shortwaveRadiation = openMeteoData.minutely_15.shortwave_radiation_instant[index];

    return {
        cloudCover, shortwaveRadiation
    }
}