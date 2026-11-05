---
title: "AWS permite recoger logs json-file de contenedores ECS con daemons administrados"
author: Bramirezj
pubDatetime: 2026-11-04T21:29:00Z
slug: aws-ecs-logs-json-file
featured: false
draft: false
tags:
  - Cloud
  - DevOps
  - AWS
description: "ECS Managed Instances incorpora soporte para json-file y volúmenes de logs en Managed Daemons, sin bind mounts del host ni privilegios root"
---

Amazon Elastic Container Service incorporó soporte para que los contenedores de aplicaciones en **ECS Managed Instances** escriban logs con el driver `json-file`. La actualización también añade volúmenes de logs para **ECS Managed Daemons**, lo que permite que un daemon recopile los archivos y los envíe al agente de observabilidad o destino elegido.

## Qué cambia

Los agentes de observabilidad suelen leer directamente el formato JSON que Docker utiliza para sus logs. Con esta actualización, cada contenedor que use `json-file` mantiene sus registros en un directorio dedicado identificado por su ID de contenedor. Un daemon administrado puede leer esos archivos mediante un volumen montado y asociar cada registro con el contenedor que lo produjo.

AWS destaca dos diferencias frente a una configuración basada en rutas del host:

- El daemon no necesita especificar bind mounts con rutas del sistema anfitrión.
- La lectura de los archivos no requiere privilegios root.

Los logs permanecen mientras exista el contenedor y se eliminan cuando el contenedor se retira. Esto mantiene el ciclo de vida del almacenamiento alineado con el ciclo de vida de la tarea, aunque las organizaciones siguen necesitando una política de retención y envío para conservar información más allá de ese momento.

## Cómo se configura

El flujo documentado por AWS tiene dos partes. Primero, la definición de tarea de la aplicación debe establecer `json-file` en `logConfiguration`. Después, la definición del daemon debe declarar un volumen con `logDriverVolumeConfiguration` y montarlo en el contenedor del daemon mediante `mountPoints`.

AWS indica que la configuración se puede realizar desde la consola, la CLI, las APIs, los SDK o CloudFormation. La capacidad está disponible sin costo adicional en las regiones comerciales donde ECS Managed Instances y Managed Daemons estén disponibles.

## Implicaciones operativas

La actualización simplifica un patrón habitual: ejecutar un agente por instancia para recoger logs de todos los contenedores y enviarlos a una plataforma centralizada. Al evitar rutas de host y privilegios elevados, el diseño reduce parte de la configuración específica del nodo y el alcance de permisos del recolector.

Aun así, no elimina las decisiones de observabilidad. El equipo debe definir qué campos necesita, cómo se autentica el destino, qué ocurre cuando el agente no puede enviar datos y cuánto almacenamiento local puede consumir la cola. También conviene validar el impacto de escribir y leer archivos JSON cuando las tareas generan grandes volúmenes de eventos.

La característica está orientada a ECS Managed Instances; no debe interpretarse como un cambio general para cualquier modalidad de ECS o para cualquier runtime de contenedores. Antes de adoptarla, hay que confirmar la disponibilidad regional y probar la definición de tarea con el agente de observabilidad que se utilice.

## Fuentes

- [Anuncio oficial de AWS](https://aws.amazon.com/about-aws/whats-new/2026/11/amazon-ecs-managed-instances-json-file-log-driver/)
- [Documentación de ECS Managed Daemons](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/managed-daemons-task-definitions.html#managed-daemons-volumes)
- [ECS Managed Instances](https://aws.amazon.com/ecs/managed-instances/)
