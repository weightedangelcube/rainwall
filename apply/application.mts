#!/usr/bin/env zx
/// <reference types="zx/globals" />

export interface ApplicationConfig {
    latitude: number,
    longitude: number,
    applyWallpaperCommand: string
}

export const defaultConfig = {	
	latitude: 0,
    longitude: 0,
    applyWallpaperCommand: "hyprctl hyprpaper wallpaper , %s"
}