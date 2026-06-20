#!/usr/bin/env zx
/// <reference types="zx/globals" />

import { configDir, loadConfig } from "../utils.mts";
import { ApplicationConfig, defaultConfig } from "./application.mts";

const pathToConfig = `${configDir}/apply-config.json`

console.debug(`Trying to load config from ${pathToConfig}...`)

const config = await loadConfig(pathToConfig, defaultConfig) as ApplicationConfig

if (config == undefined) {
    throw new Error("Couldn't initialize config!")
}

console.debug(`Config: \n${JSON.stringify(config, null, 4)}`)
