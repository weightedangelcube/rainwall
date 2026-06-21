#!/usr/bin/env zx
/// <reference types="zx/globals" />

import { configDir, loadConfig } from "../utils.mts";
import { ApplicationConfig, defaultConfig, getOpenMeteoData } from "./application.mts";
import  * as SunCalc from "npm:suncalc"

const pathToConfig = `${configDir}/apply-config.json`

console.debug(`Trying to load config from ${pathToConfig}...`)
const config = await loadConfig(pathToConfig, defaultConfig) as ApplicationConfig
if (config == undefined) {
    throw new Error("Couldn't initialize config!")
}

console.debug(`Config: \n${JSON.stringify(config, null, 4)}`)

const openMeteoData = await getOpenMeteoData(config.latitude, config.longitude, config.weatherModel)
const sunCalcData = SunCalc.getPosition(new Date(), config.latitude, config.longitude)
console.info(`Current cloud cover percentage is ${openMeteoData.cloudCover}%!`)
console.info(`Current shortwave radiation is ${openMeteoData.shortwaveRadiation} W/m²!`)
console.info(`Current sun altitude is ${sunCalcData.altitude}°!`)

