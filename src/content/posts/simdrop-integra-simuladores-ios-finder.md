---
title: "SimDrop integra los simuladores de iOS en la barra lateral del Finder"
author: Bramirezj
pubDatetime: 2026-11-26T16:51:38Z
slug: simdrop-integra-simuladores-ios-finder
featured: false
draft: false
tags:
  - Movil
  - Programacion
  - Software Libre
description: "La utilidad SimDrop expone archivos y fotos de simuladores de iOS desde la barra lateral del Finder de macOS"
ogImage: "../../assets/images/simdrop-integra-simuladores-ios-finder-cover.png"
---
![Imagen de referencia](../../assets/images/simdrop-integra-simuladores-ios-finder-cover.png)

SimDrop es una utilidad para macOS que coloca los simuladores de iOS activos en la barra lateral del Finder. El proyecto, presentado en Hacker News y publicado en GitHub, nace para resolver dos tareas habituales del desarrollo: mover archivos hacia y desde un simulador y trabajar con imágenes cuando el arrastre directo sobre la ventana no resulta práctico.

La aplicación muestra cada simulador cuando arranca y lo retira cuando se apaga. El repositorio describe dos carpetas virtuales por dispositivo: «Downloads», asociada a la carpeta de archivos del iPhone simulado, y «Photos and Videos», conectada a la biblioteca de fotos del simulador.

## Qué implica

El flujo evita tener que navegar manualmente por carpetas con identificadores UUID de CoreSimulator o recurrir siempre a `simctl` para operaciones sencillas. Para equipos que prueban aplicaciones con frecuencia, presentar los dispositivos como ubicaciones del Finder puede reducir la fricción al intercambiar datos de prueba.

La herramienta no sustituye las capacidades de automatización de la línea de comandos. Su utilidad está en ofrecer una interfaz gráfica para acciones concretas y mantener los simuladores visibles solo mientras están disponibles. El repositorio indica además una ruta en el terminal bajo `~/Library/CloudStorage/SimDrop-SimDrop/`, desde la que también se puede acceder a los contenidos expuestos.

## Hechos confirmados

- SimDrop está dirigido a macOS y a los simuladores de iOS.
- Los simuladores en ejecución aparecen en la barra lateral del Finder.
- La utilidad expone carpetas para descargas y para fotos y vídeos.
- Los simuladores desaparecen de la barra lateral cuando se apagan.
- El proyecto también ofrece acceso desde una ruta de terminal bajo `~/Library/CloudStorage/SimDrop-SimDrop/`.

## Análisis

La propuesta es pequeña, pero ataca un punto de fricción concreto del desarrollo móvil: el intercambio de fixtures y capturas entre el equipo y el entorno simulado. Su valor dependerá de la compatibilidad con las versiones de macOS y Xcode que use cada equipo, una comprobación que debe hacerse en el repositorio antes de incorporarla a un flujo de trabajo.

**Fuente:** [repositorio de SimDrop en GitHub](https://github.com/rxliuli/sim-drop).
