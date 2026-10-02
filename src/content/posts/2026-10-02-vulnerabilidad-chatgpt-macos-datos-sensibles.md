---
title: "Una vulnerabilidad en la aplicación de ChatGPT para Mac pudo exponer datos sensibles"
author: Carlos
pubDatetime: 2026-10-02T09:45:00Z
slug: vulnerabilidad-chatgpt-macos-datos-sensibles
featured: false
draft: false
tags:
  - Seguridad
  - IA
  - macOS
description: "Una vulnerabilidad corregida en la aplicación de ChatGPT para macOS podía exponer chats, sesiones del navegador y otras aplicaciones"
---

Una vulnerabilidad corregida en la aplicación de ChatGPT para macOS muestra que las herramientas de inteligencia artificial también se han convertido en objetivos de alto valor para los atacantes. El fallo podía permitir que código local no privilegiado tomara control del proceso principal de la aplicación y accediera a información almacenada en el equipo.

## Qué implica

El problema afectaba a la forma en que los componentes de la aplicación verificaban que las solicitudes procedían de procesos legítimos de OpenAI. La aplicación realizaba comprobaciones de firma digital en varios niveles, incluso revisando procesos ascendientes, pero investigadores de Objective-See encontraron un intérprete de scripts confiable que podía aceptar comandos no confiables.

La explotación descrita no dependía de engañar al usuario para que aprobara cada acción. El código malicioso podía encadenar varias ejecuciones del intérprete hasta satisfacer las comprobaciones de parentesco de procesos y entregar instrucciones al proceso principal de ChatGPT. Por eso el fallo era relevante aunque el atacante necesitara primero una vía de ejecución local.

El escenario de explotación requería que el atacante ya pudiera ejecutar código local en el Mac. Aun así, el fallo ampliaba de forma importante el alcance de ese código: podía permitir el acceso a los registros de conversación de ChatGPT, a sesiones del navegador y a otras aplicaciones sensibles conectadas al entorno del usuario.

## Hechos confirmados

- OpenAI reconoció públicamente el fallo y su corrección en el registro de cambios del sistema el 25 de septiembre.
- El investigador Patrick Wardle describió una prueba de concepto de aproximadamente una docena de líneas de código.
- La vulnerabilidad podía hacer que instrucciones maliciosas parecieran solicitudes legítimas emitidas por componentes de OpenAI.
- El problema refleja el nivel de acceso que algunas aplicaciones de IA necesitan para integrarse con otras herramientas del sistema.

## Análisis

El caso refuerza una regla conocida de seguridad: cuanto más capaz es una aplicación, mayor es el impacto de una intrusión. Un asistente que solo procesa texto aislado tiene una superficie distinta de otro que puede consultar archivos, sesiones web o aplicaciones conectadas.

Para equipos que despliegan asistentes de IA en sus estaciones de trabajo, la prioridad no debería ser únicamente activar funciones nuevas. También conviene revisar permisos locales, mantener las aplicaciones actualizadas y limitar las integraciones al mínimo necesario. La seguridad de un agente no depende solo del modelo; también depende de los procesos, credenciales y datos a los que puede acceder.

**Fuente:** [WIRED](https://www.wired.com/story/a-flaw-in-chatgpts-mac-app-could-have-let-hackers-grab-sensitive-data/).
